"""
Carpark Information Details Merge (One-off Lambda function)

Purpose
- Pull HDB carpark info (address, coords, attributes) from data.gov.sg and merge with main DB

Flow
1) Fetch page from data.gov.sg datastore (INFO_RESOURCE_ID, PAGE_SIZE).
2) Dump raw info to S3 (JSON + CSV) under INFO_PREFIX_RAW for auditing.
3) Load info into SQLite (OPS_DB)
4) Rebuild carpark_availability_join via LEFT JOIN on normalized carpark_number.
5) Export merged snapshot to S3 (CSV + JSON) under INFO_PREFIX_COMBINED/combined_{ts}.*.
6) Return counts: downloaded rows, loaded rows, total/matched/unmatched join rows.
"""

import os, io, csv, json, time, sqlite3, boto3, requests

#############################################################
# Config
#############################################################
S3_BUCKET  = os.getenv("S3_BUCKET", "cs5224-group-08")
INFO_PREFIX_RAW = os.getenv("INFO_PREFIX_RAW", "dumps/carpark_lot_information")
INFO_PREFIX_COMBINED = os.getenv("INFO_PREFIX_COMBINED", "dumps/carpark_lot_information_combined")
OPS_DB    = os.getenv("OPS_DB", "/mnt/efs/ops/ops.sqlite")
INFO_RESOURCE_ID = os.getenv("INFO_RESOURCE_ID", "d_23f946fa557947f93a8043bbef41dd09")
PAGE_SIZE = int(os.getenv("PAGE_SIZE", "5000"))

s3 = boto3.client("s3")
_conn = None

#############################################################
# SQLite helpers
#############################################################
def get_db():
    global _conn
    if _conn is None:
        os.makedirs(os.path.dirname(OPS_DB), exist_ok=True)
        _conn = sqlite3.connect(OPS_DB, timeout=30, isolation_level=None)
        _conn.execute("PRAGMA journal_mode=WAL;")
        _conn.execute("PRAGMA synchronous=NORMAL;")
        _conn.execute("PRAGMA busy_timeout=10000;")
    return _conn

def _has_column(conn, table, col):
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == col for r in rows)

def safe_add_column(conn, table, col, coltype):
    if not _has_column(conn, table, col):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype};")

def ensure_tables(conn):
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_availability(
      carpark_number TEXT,
      lot_type TEXT,
      lots_available INTEGER,
      update_datetime TEXT,
      last_seen_at TEXT,
      PRIMARY KEY (carpark_number, lot_type)
    );""")
    # add total_lots to carpark_availability
    safe_add_column(conn, "carpark_availability", "total_lots", "INTEGER")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_info(
      carpark_number TEXT PRIMARY KEY,
      address TEXT, x_coord TEXT, y_coord TEXT, car_park_type TEXT,
      type_of_parking_system TEXT, short_term_parking TEXT, free_parking TEXT, night_parking TEXT,
      car_park_decks TEXT, gantry_height TEXT, car_park_basement TEXT, updated_at TEXT
    );""")
    # Include x_coord, y_coord in the join schema for fresh DBs
    cur.execute("""
    CREATE TABLE IF NOT EXISTS carpark_availability_join(
      carpark_number TEXT,
      lot_type TEXT,
      lots_available INTEGER,
      update_datetime TEXT,
      address TEXT, x_coord TEXT, y_coord TEXT,
      car_park_type TEXT, type_of_parking_system TEXT, short_term_parking TEXT,
      free_parking TEXT, night_parking TEXT, car_park_decks TEXT, gantry_height TEXT, car_park_basement TEXT,
      has_info INTEGER,
      PRIMARY KEY (carpark_number, lot_type)
    );""")

    # Add x & y coord
    safe_add_column(conn, "carpark_availability_join", "x_coord", "TEXT")
    safe_add_column(conn, "carpark_availability_join", "y_coord", "TEXT")
    # Add total_lots to join table (migration-safe)
    safe_add_column(conn, "carpark_availability_join", "total_lots", "INTEGER")

#############################################################
# Carpark Info API
#############################################################
def fetch_info_records(resource_id: str, page_size: int = 5000):
    base = "https://data.gov.sg/api/action/datastore_search"
    fields = None
    all_records = []
    offset = 0
    while True:
        r = requests.get(base, params={"resource_id": resource_id, "limit": page_size, "offset": offset}, timeout=30)
        r.raise_for_status()
        res = r.json()["result"]
        if fields is None:
            fields = [f["id"] for f in res.get("fields", []) if f.get("id") != "_id"]
        records = res.get("records", [])
        if not records:
            break
        all_records.extend(records)
        if len(records) < page_size:
            break
        offset += len(records)
    return fields or [], all_records

#############################################################
# S3 dumps
#############################################################
def dump_info_to_s3(ts, fields, records):
    # JSON
    payload = {"result": {"fields": [{"id": f} for f in fields], "records": records}}
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=f"{INFO_PREFIX_RAW}/info_{ts}.json",
        Body=json.dumps(payload, ensure_ascii=False),
        ContentType="application/json",
    )
    # CSV
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(fields)
    for rec in records:
        w.writerow([rec.get(col, "") for col in fields])
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=f"{INFO_PREFIX_RAW}/info_{ts}.csv",
        Body=buf.getvalue(),
        ContentType="text/csv",
    )

def dump_join_to_s3(ts, conn):
    # fixed column order for the merged export (now includes x_coord, y_coord)
    header = [
        "carpark_number","lot_type","lots_available","total_lots","update_datetime",
        "address","x_coord","y_coord",
        "car_park_type","type_of_parking_system","short_term_parking",
        "free_parking","night_parking","car_park_decks","gantry_height","car_park_basement",
        "has_info"
    ]
    rows = conn.execute("""
        SELECT
          carpark_number, lot_type, lots_available, total_lots, update_datetime,
          address, x_coord, y_coord,
          car_park_type, type_of_parking_system, short_term_parking,
          free_parking, night_parking, car_park_decks, gantry_height, car_park_basement,
          has_info
        FROM carpark_availability_join
    """).fetchall()

    # CSV
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=f"{INFO_PREFIX_COMBINED}/combined_{ts}.csv",
        Body=buf.getvalue(),
        ContentType="text/csv",
    )

    # JSON (array of objects; small enough for ~few K rows)
    json_body = json.dumps([dict(zip(header, r)) for r in rows], ensure_ascii=False)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=f"{INFO_PREFIX_COMBINED}/combined_{ts}.json",
        Body=json_body,
        ContentType="application/json",
    )

#############################################################
# Load info & build join
#############################################################
def load_info_into_sqlite(conn, fields, records):
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        cur.execute("DELETE FROM carpark_info;")
        rows = 0
        for rec in records:
            cp = (rec.get("car_park_no") or rec.get("carpark_number") or "").strip().upper()
            if not cp:
                continue
            cur.execute("""
              INSERT INTO carpark_info(
                carpark_number, address, x_coord, y_coord, car_park_type,
                type_of_parking_system, short_term_parking, free_parking, night_parking,
                car_park_decks, gantry_height, car_park_basement, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cp, rec.get("address",""), rec.get("x_coord",""), rec.get("y_coord",""),
                rec.get("car_park_type",""), rec.get("type_of_parking_system",""),
                rec.get("short_term_parking",""), rec.get("free_parking",""),
                rec.get("night_parking",""), rec.get("car_park_decks",""),
                rec.get("gantry_height",""), rec.get("car_park_basement",""), now
            ))
            rows += 1
        cur.execute("COMMIT;")
        return rows
    except Exception:
        cur.execute("ROLLBACK;")
        raise

def rebuild_join_table(conn):
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        cur.execute("DELETE FROM carpark_availability_join;")
        # Insert column list now includes x_coord, y_coord to match the SELECT (16 columns)
        cur.execute("""
          INSERT INTO carpark_availability_join(
            carpark_number, lot_type, lots_available, update_datetime,
            address, x_coord, y_coord,
            car_park_type, type_of_parking_system, short_term_parking,
            free_parking, night_parking, car_park_decks, gantry_height, car_park_basement, has_info,
            total_lots
          )
          SELECT
            a.carpark_number,
            a.lot_type,
            a.lots_available,
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
            CASE WHEN i.carpark_number IS NULL THEN 0 ELSE 1 END AS has_info,
            a.total_lots
          FROM carpark_availability AS a
          LEFT JOIN carpark_info AS i
            ON UPPER(TRIM(a.carpark_number)) = i.carpark_number
        """)
        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

    total = conn.execute("SELECT COUNT(*) FROM carpark_availability_join").fetchone()[0]
    unmatched = conn.execute("SELECT COUNT(*) FROM carpark_availability_join WHERE has_info = 0").fetchone()[0]
    matched = total - unmatched
    return matched, unmatched, total

# Snapshot
def _snapshot_user_profiles(limit=10, include_carparks=False):
    conn = get_db()
    rows = conn.execute("""
      SELECT
        user_id,
        email,
        created_at,
        updated_at,
        subscription_end_date,
        fav_carparks,
        json_array_length(fav_carparks) AS fav_count
      FROM user_profiles
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT ?;
    """, (limit,)).fetchall()

    out = []
    for uid, em, created, updated, sub_end, favs_json, fav_count in rows:
        item = {
            "user_id": uid,
            "email": em,
            "created_at": created,
            "updated_at": updated,
            "subscription_end_date": sub_end,
            "fav_count": int(fav_count or 0),
        }
        if include_carparks:
            try:
                item["fav_carparks"] = json.loads(favs_json or "[]")
            except Exception:
                item["fav_carparks"] = []
        out.append(item)
    return {"limit": limit, "rows": out}

#############################################################
# Lambda entry
#############################################################
def lambda_handler(event, context):
    ts = time.strftime("%Y%m%d-%H%M%S", time.gmtime())

    # Pull carpark_info from API
    fields, records = fetch_info_records(INFO_RESOURCE_ID, PAGE_SIZE)

    # Dump raw carpark info to S3 (RAW prefix)
    dump_info_to_s3(ts, fields, records)

    # Load into EFS SQLite and rebuild join
    conn = get_db()
    ensure_tables(conn)
    info_rows = load_info_into_sqlite(conn, fields, records)
    matched, unmatched, total = rebuild_join_table(conn)

    # Dump merged snapshot to S3
    dump_join_to_s3(ts, conn)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "timestamp": ts,
            "info_rows_downloaded": len(records),
            "info_rows_loaded": info_rows,
            "join_rows_total": total,
            "join_rows_matched": matched,
            "join_rows_unmatched": unmatched,
            "info_columns": fields
        })
    }
