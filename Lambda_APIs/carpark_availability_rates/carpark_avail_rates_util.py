import os, io, csv, json, time, sqlite3, requests, boto3

#############################################################
# Config
#############################################################
API_URL   = "https://api.data.gov.sg/v1/transport/carpark-availability"
API_KEY   = os.getenv("API_KEY")
S3_BUCKET = os.getenv("S3_BUCKET", "cs5224-group-08")
INFO_PREFIX = os.getenv("INFO_PREFIX", "dumps/carpark_lot_information_combined")
OPS_DB    = os.getenv("OPS_DB", "/mnt/efs/ops/ops.sqlite")
SNAPSHOT_STRICT_MIRROR = os.getenv("SNAPSHOT_STRICT_MIRROR", "true").lower() == "true"

s3 = boto3.client("s3")
conn = None
use_legacy_upsert = False

#############################################################
# SQLite helpers
#############################################################
def ensure_schema(conn: sqlite3.Connection) -> None:
    """Create/patch tables and indexes"""
    cur = conn.cursor()

    # Availability (current snapshot)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_availability(
        carpark_number   TEXT,
        lot_type         TEXT,
        lots_available   INTEGER,
        update_datetime  TEXT,
        last_seen_at     TEXT,
        total_lots       INTEGER,
        PRIMARY KEY (carpark_number, lot_type)
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_avail_cp ON carpark_availability(carpark_number);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_avail_seen ON carpark_availability(last_seen_at);")

    # History (append-only)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_availability_history(
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        carpark_number   TEXT,
        lot_type         TEXT,
        lots_available   INTEGER,
        update_datetime  TEXT,
        retrieved_at     TEXT
    );
    """)
    cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_hist_unique
    ON carpark_availability_history(carpark_number, lot_type, update_datetime);
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hist_time ON carpark_availability_history(update_datetime);")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_info(
        carpark_number TEXT PRIMARY KEY,
        address TEXT,
        x_coord TEXT,
        y_coord TEXT,
        car_park_type TEXT,
        type_of_parking_system TEXT,
        short_term_parking TEXT,
        free_parking TEXT,
        night_parking TEXT,
        car_park_decks TEXT,
        gantry_height TEXT,
        car_park_basement TEXT,
        updated_at TEXT
    );
    """)

    # Helper to add columns if missing
    def add_col(table, col, coltype):
        cur.execute(f"PRAGMA table_info({table});")
        if not any(r[1] == col for r in cur.fetchall()):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype};")

    add_col("carpark_info", "is_central", "INTEGER")
    add_col("carpark_info", "carpark_rate", "REAL")
    add_col("carpark_info", "current_rate_30min", "REAL")
    add_col("carpark_info", "active_cap_type", "TEXT")
    add_col("carpark_info", "active_cap_amount", "REAL")
    add_col("carpark_info", "rate_updated_at", "TEXT")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_availability_join(
      carpark_number TEXT,
      lot_type TEXT,
      lots_available INTEGER,
      total_lots INTEGER,
      update_datetime TEXT,
      address TEXT,
      x_coord TEXT,
      y_coord TEXT,
      car_park_type TEXT,
      type_of_parking_system TEXT,
      short_term_parking TEXT,
      free_parking TEXT,
      night_parking TEXT,
      car_park_decks TEXT,
      gantry_height TEXT,
      car_park_basement TEXT,
      carpark_rate REAL,           -- base rate (0.6/1.2)
      current_rate_30min REAL,     -- time-aware 30-min rate snapshot
      active_cap_type TEXT,        -- e.g. NPS_NIGHT_CAP or DAY_CAP
      active_cap_amount REAL,      -- 5 / 12 / 20 etc
      ev_lot_location TEXT,        -- curated elsewhere; to be preserved
      has_info INTEGER,
      PRIMARY KEY (carpark_number, lot_type)
    );
    """)

    # Ensure all columns exist (if table created earlier without some)
    add_col("carpark_availability_join", "x_coord", "TEXT")
    add_col("carpark_availability_join", "y_coord", "TEXT")
    add_col("carpark_availability_join", "total_lots", "INTEGER")
    add_col("carpark_availability_join", "carpark_rate", "REAL")
    add_col("carpark_availability_join", "current_rate_30min", "REAL")
    add_col("carpark_availability_join", "active_cap_type", "TEXT")
    add_col("carpark_availability_join", "active_cap_amount", "REAL")
    add_col("carpark_availability_join", "ev_lot_location", "TEXT")
    add_col("carpark_availability_join", "has_info", "INTEGER")

def get_db() -> sqlite3.Connection:
    global conn
    if conn is None:
        os.makedirs(os.path.dirname(OPS_DB), exist_ok=True)
        conn = sqlite3.connect(OPS_DB, timeout=30, isolation_level=None)  # autocommit
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA wal_autocheckpoint=1000;")
        conn.execute("PRAGMA busy_timeout=5000;")
        ensure_schema(conn)
    return conn

#############################################################
# Network / S3
#############################################################
def fetch_payload():
    resp = requests.get(API_URL, headers={"X-Api-Key": API_KEY}, timeout=30)
    resp.raise_for_status()
    return resp.json()

def upload_json_to_s3(payload, ts):
    key = f"{INFO_PREFIX}/lot_update_combined_{ts}.json"
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=json.dumps(payload, indent=2, ensure_ascii=False),
        ContentType="application/json",
    )
    return key

def dump_csv_to_s3_from_db(ts):
    conn = get_db()
    cur = conn.cursor()

    header_join = [
        "carpark_number","lot_type","lots_available","total_lots","update_datetime",
        "address","x_coord","y_coord",
        "car_park_type","type_of_parking_system","short_term_parking",
        "free_parking","night_parking","car_park_decks","gantry_height","car_park_basement",
        "carpark_rate","current_rate_30min","active_cap_type","active_cap_amount","ev_lot_location","has_info"
    ]
    try:
        rows = cur.execute("""
            SELECT
            carpark_number, lot_type, lots_available, total_lots, update_datetime,
            address, x_coord, y_coord,
            car_park_type, type_of_parking_system, short_term_parking,
            free_parking, night_parking, car_park_decks, gantry_height, car_park_basement,
            carpark_rate, current_rate_30min, active_cap_type, active_cap_amount,ev_lot_location, has_info
            FROM carpark_availability_join
        """).fetchall()

        buf = io.StringIO()
        w = csv.writer(buf, lineterminator="\n")
        w.writerow(header_join)
        w.writerows(rows)
        key = f"{INFO_PREFIX}/lot_update_combined_{ts}.csv"
        s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue(), ContentType="text/csv")
        return key
    except sqlite3.OperationalError:
        # inline LEFT JOIN just in case
        try:
            rows = cur.execute("""
                SELECT
                  a.carpark_number, a.lot_type, a.lots_available, a.total_lots, a.update_datetime,
                  i.address, i.x_coord, i.y_coord,
                  i.car_park_type, i.type_of_parking_system, i.short_term_parking,
                  i.free_parking, i.night_parking, i.car_park_decks, i.gantry_height, i.car_park_basement,
                  i.carpark_rate, '' AS ev_lot_location,
                  CASE WHEN i.carpark_number IS NULL THEN 0 ELSE 1 END AS has_info
                FROM carpark_availability AS a
                LEFT JOIN carpark_info AS i
                  ON UPPER(TRIM(a.carpark_number)) = i.carpark_number
            """).fetchall()

            buf = io.StringIO()
            w = csv.writer(buf, lineterminator="\n")
            w.writerow(header_join)
            w.writerows(rows)
            key = f"{INFO_PREFIX}/lot_update_combined_{ts}.csv"
            s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue(), ContentType="text/csv")
            return key
        except sqlite3.OperationalError:
            # carpark availability
            header_raw = ["carpark_number","lot_type","lots_available","total_lots","update_datetime"]
            rows = cur.execute("""
                SELECT carpark_number, lot_type, lots_available, total_lots, update_datetime
                FROM carpark_availability
            """).fetchall()
            buf = io.StringIO()
            w = csv.writer(buf, lineterminator="\n")
            w.writerow(header_raw)
            w.writerows(rows)
            key = f"{INFO_PREFIX}/snapshot_{ts}.csv"
            s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue(), ContentType="text/csv")
            return key

#############################################################
# Carpark rates helpers
#############################################################
def mark_central_and_base_rates(conn):
    # Your central list
    CENTRAL = {"ACB","BBB","BRB1","CY","DUXM","HLM","KAB","KAM","KAS","PRM","SLS","SR1","SR2","TPM","UCS","WCB"}
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        # Set is_central deterministically each run (idempotent)
        # Use a temp table for clean IN semantics
        cur.execute("DROP TABLE IF EXISTS _central_tmp;")
        cur.execute("CREATE TEMP TABLE _central_tmp(cp TEXT PRIMARY KEY);")
        cur.executemany("INSERT INTO _central_tmp(cp) VALUES (?)", [(c,) for c in CENTRAL])

        # Mark central (1) / outside (0)
        cur.execute("""
            UPDATE carpark_info
            SET is_central = CASE WHEN carpark_number IN (SELECT cp FROM _central_tmp) THEN 1 ELSE 0 END
        """)

        # Set base carpark_rate (default 0.6; central 1.2)
        cur.execute("""
            UPDATE carpark_info
            SET carpark_rate = CASE WHEN is_central = 1 THEN 1.2 ELSE 0.6 END
        """)

        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

def refresh_time_dependent_rates(conn):
    # Compute current SGT time
    from datetime import datetime, timedelta, timezone
    sgt_now = datetime.now(timezone.utc) + timedelta(hours=8)
    wk = sgt_now.weekday()  # Mon=0,.., Sun=6
    hh, mm = sgt_now.hour, sgt_now.minute

    in_night = (hh > 22 or (hh == 22 and mm >= 30)) or (hh < 7) # Night parking, 22:30–07:00
    in_day   = ((hh > 7 or (hh == 7 and mm >= 0)) and (hh < 22 or (hh == 22 and mm < 30))) # Day parking, 07:00–22:30

    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        rows = cur.execute("""
            SELECT carpark_number, is_central, night_parking
            FROM carpark_info
        """).fetchall()

        for cp_no, is_central, night_parking in rows:
            is_central = 1 if is_central else 0
            nps = (night_parking or "").strip().upper().startswith("YES")

            # Base rule for effective half-hour rate at this instant
            if is_central and wk <= 5 and (7 <= hh < 17):
                current_rate = 1.2
            else:
                current_rate = 0.6

            # Caps
            cap_type, cap_amt = (None, None)
            if nps and in_night:
                cap_type, cap_amt = ("NPS_NIGHT_CAP", 5.0)
            elif in_day:
                cap_type, cap_amt = ("DAY_CAP", (20.0 if is_central else 12.0))

            cur.execute("""
                UPDATE carpark_info
                SET current_rate_30min = ?,
                    active_cap_type = ?,
                    active_cap_amount = ?,
                    rate_updated_at = ?
                WHERE carpark_number = ?
            """, (current_rate, cap_type, cap_amt,
                  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), cp_no))

        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

#############################################################
# Fresh snapshot of the join table for the pricing fields
#############################################################
def rebuild_join_snapshot(conn):
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        cur.execute("DROP TABLE IF EXISTS _ev_cache;")
        cur.execute("""
            CREATE TEMP TABLE _ev_cache AS
            SELECT carpark_number, MAX(ev_lot_location) AS ev_lot_location
            FROM carpark_availability_join
            GROUP BY carpark_number
        """)

        cur.execute("DELETE FROM carpark_availability_join;")
        cur.execute("""
            INSERT INTO carpark_availability_join(
              carpark_number, lot_type, lots_available, total_lots, update_datetime,
              address, x_coord, y_coord,
              car_park_type, type_of_parking_system, short_term_parking,
              free_parking, night_parking, car_park_decks, gantry_height, car_park_basement,
              carpark_rate, current_rate_30min, active_cap_type, active_cap_amount,
              has_info
            )
            SELECT
              a.carpark_number,
              a.lot_type,
              a.lots_available,
              a.total_lots,
              a.update_datetime,
              i.address,
              i.x_coord,
              i.y_coord,
              i.car_park_type,
              i.type_of_parking_system,
              i.short_term_parking,
              i.free_parking,
              i.night_parking,
              i.car_park_decks,
              i.gantry_height,
              i.car_park_basement,
              i.carpark_rate,
              i.current_rate_30min,
              i.active_cap_type,
              i.active_cap_amount,
              CASE WHEN i.carpark_number IS NULL THEN 0 ELSE 1 END AS has_info
            FROM carpark_availability AS a
            LEFT JOIN carpark_info AS i
              ON UPPER(TRIM(a.carpark_number)) = i.carpark_number
        """)

        cur.execute("""
            UPDATE carpark_availability_join AS j
            SET ev_lot_location = COALESCE(
                (SELECT c.ev_lot_location FROM _ev_cache c WHERE c.carpark_number = j.carpark_number),
                ev_lot_location
            )
        """)

        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

#############################################################
# DB write logic
#############################################################
def upsert_snapshot(cur, cp_no, lot_type, lots_avail, total_lots, upd, seen):
    global use_legacy_upsert
    if not use_legacy_upsert:
        try:
            cur.execute("""
              INSERT INTO carpark_availability(
                carpark_number, lot_type, lots_available, total_lots, update_datetime, last_seen_at
              ) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(carpark_number, lot_type) DO UPDATE SET
                lots_available = excluded.lots_available,
                total_lots    = COALESCE(carpark_availability.total_lots, excluded.total_lots),
                update_datetime = excluded.update_datetime,
                last_seen_at  = excluded.last_seen_at
            """, (cp_no, lot_type, lots_avail, total_lots, upd, seen))
            return
        except sqlite3.OperationalError as e:
            if 'near "ON": syntax error' in str(e):
                use_legacy_upsert = True
            else:
                raise

    # Fallback UPSERT
    cur.execute("""
        UPDATE carpark_availability
        SET lots_available = ?,
            total_lots = CASE WHEN total_lots IS NULL THEN ? ELSE total_lots END,
            update_datetime = ?,
            last_seen_at = ?
        WHERE carpark_number = ? AND lot_type = ?
    """, (lots_avail, total_lots, upd, seen, cp_no, lot_type))
    if cur.rowcount == 0:
        cur.execute("""
            INSERT INTO carpark_availability(
              carpark_number, lot_type, lots_available, total_lots, update_datetime, last_seen_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (cp_no, lot_type, lots_avail, total_lots, upd, seen))

def upsert(payload):
    conn = get_db()
    cur = conn.cursor()
    retrieved_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    items = payload.get("items", [])
    carparks = items[0].get("carpark_data", []) if items else []

    history_inserts = 0
    mirror_deleted = 0

    cur.execute("BEGIN IMMEDIATE;")
    try:
        for cp in carparks:
            cp_no = cp.get("carpark_number")
            upd   = cp.get("update_datetime")
            for info in cp.get("carpark_info", []):
                lot_type   = info.get("lot_type")
                lots_avail = int(info.get("lots_available", 0))

                raw_total = info.get("total_lots")
                try:
                    total_lots = int(raw_total) if raw_total not in (None, "") else None
                except Exception:
                    total_lots = None

                upsert_snapshot(cur, cp_no, lot_type, lots_avail, total_lots, upd, retrieved_at)

                cur.execute("""
                  INSERT OR IGNORE INTO carpark_availability_history(
                    carpark_number, lot_type, lots_available, update_datetime, retrieved_at
                  ) VALUES (?, ?, ?, ?, ?)
                """, (cp_no, lot_type, lots_avail, upd, retrieved_at))
                history_inserts += cur.rowcount

        if SNAPSHOT_STRICT_MIRROR:
            cur.execute("DELETE FROM carpark_availability WHERE last_seen_at < ?", (retrieved_at,))
            mirror_deleted = cur.rowcount

        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

    snap_count = conn.execute("SELECT COUNT(*) FROM carpark_availability").fetchone()[0]

    return {
        "seen_carparks": len(carparks),
        "snapshot_rows": snap_count,
        "history_inserts": history_inserts,
        "mirror_deleted": mirror_deleted,
        "legacy_upsert": use_legacy_upsert,
    }