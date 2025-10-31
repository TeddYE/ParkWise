"""
EV Details Merge (One-off Lambda function)

Purpose
- Join EV lot location info from the EV details CSV in S3 into the DB’s carpark_availability_join.ev_lot_location.

Flow
1) Parse CSV → build {CARPARK_NUMBER → EV_LOCATION} mapping (first non-empty wins).
2) Ensure DB + column; run transactional update (default blanks, then apply mapping).
    - Sets ev_lot_location = <default_text> where NULL/empty (does NOT overwrite non-empty values).
    - Applies CSV mapping by carpark_number (UPPER(TRIM) match) to fill/replace values.
3) Dump post-merge snapshot to S3: {EV_PREFIX}carpark_availability_join_snapshot_{ts}.csv.
4) Return JSON with counts: total_rows, sheet_matches_applied, defaulted_set_this_run, with/without_ev_location.
"""

import os, io, json, time, sqlite3, boto3, csv, re

###############################################################
# Config
###############################################################
S3_BUCKET   = os.getenv("S3_BUCKET", "cs5224-group-08")
EV_PREFIX   = os.getenv("EV_PREFIX", "ev_information/")
OPS_DB      = os.getenv("OPS_DB", "/mnt/efs/ops/ops.sqlite")
NO_EV_TEXT  = os.getenv("NO_EV_TEXT", "No EV chargers")

# Accept header aliases
CP_ALIASES  = {"hdb_ev","carpark_number","car_park_no","carpark_no"}
LOC_ALIASES = {"ev_lot_location","ev_location","ev_lots_location"}

s3 = boto3.client("s3")
_conn = None

###############################################################
# DB helpers
###############################################################
def get_db():
    global _conn
    if _conn is None:
        os.makedirs(os.path.dirname(OPS_DB), exist_ok=True)
        _conn = sqlite3.connect(OPS_DB, timeout=30, isolation_level=None)
        _conn.execute("PRAGMA journal_mode=WAL;")
        _conn.execute("PRAGMA synchronous=NORMAL;")
        _conn.execute("PRAGMA busy_timeout=10000;")
    return _conn

def _table_exists(conn, name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name=?;", (name,)
    ).fetchone()
    return bool(row)

def _has_column(conn, table: str, col: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table});").fetchall()
    return any(r[1] == col for r in rows)

def _ensure_ev_column(conn):
    if not _table_exists(conn, "carpark_availability_join"):
        raise RuntimeError("carpark_availability_join does not exist.")
    if not _has_column(conn, "carpark_availability_join", "ev_lot_location"):
        conn.execute("ALTER TABLE carpark_availability_join ADD COLUMN ev_lot_location TEXT;")

###############################################################
# S3 helpers
###############################################################
def _latest_csv_key(bucket: str, prefix: str) -> str:
    paginator = s3.get_paginator("list_objects_v2")
    latest = None
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []) or []:
            key = obj["Key"]
            if key.lower().endswith(".csv"):
                if latest is None or obj["LastModified"] > latest["LastModified"]:
                    latest = obj
    if not latest:
        raise FileNotFoundError(f"No .csv found under s3://{bucket}/{prefix}")
    return latest["Key"]

def _download_csv_text(bucket: str, key: str) -> str:
    res = s3.get_object(Bucket=bucket, Key=key)
    return res["Body"].read().decode("utf-8-sig")

def _dump_join_snapshot_to_s3(conn, ts: str):
    cols = [r[1] for r in conn.execute("PRAGMA table_info(carpark_availability_join);").fetchall()]
    if not cols:
        raise RuntimeError("carpark_availability_join has no columns?")

    rows = conn.execute(f"SELECT {', '.join(cols)} FROM carpark_availability_join;").fetchall()

    # CSV
    csv_buf = io.StringIO()
    w = csv.writer(csv_buf, lineterminator="\n")
    w.writerow(cols)
    w.writerows(rows)
    csv_key = f"{EV_PREFIX}carpark_availability_join_snapshot_{ts}.csv"
    s3.put_object(Bucket=S3_BUCKET, Key=csv_key, Body=csv_buf.getvalue(), ContentType="text/csv")

    return {"csv_key": csv_key, "row_count": len(rows), "columns": cols}
###############################################################
# CSV parsing
###############################################################
_norm = lambda s: re.sub(r"[^a-z0-9]+", "_", (s or "").strip().lower())

def _load_ev_mapping_csv(csv_text: str) -> dict:
    rdr = csv.DictReader(io.StringIO(csv_text))
    if rdr.fieldnames is None:
        return {}
    # normalize header names
    norm_map = {_norm(h): h for h in rdr.fieldnames if h}
    # find columns
    cp_header = next((norm_map[a] for a in CP_ALIASES if a in norm_map), None)
    loc_header = next((norm_map[a] for a in LOC_ALIASES if a in norm_map), None)
    if not cp_header:
        raise ValueError(f"Could not find carpark_number column (tried {sorted(CP_ALIASES)})")
    if not loc_header:
        raise ValueError(f"Could not find EV location column (tried {sorted(LOC_ALIASES)})")

    mapping = {}
    for row in rdr:
        cp = (row.get(cp_header) or "").strip().upper()
        ev = (row.get(loc_header) or "").strip()
        if not cp:
            continue
        # keep first non-empty entry
        if cp not in mapping and ev:
            mapping[cp] = ev
    return mapping

###############################################################
# Apply to DB
###############################################################
def _apply_ev_mapping(conn, mapping: dict, default_text: str):
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        # Set default where empty/NULL (won't override non-empty)
        cur.execute("""
            UPDATE carpark_availability_join
               SET ev_lot_location = ?
             WHERE ev_lot_location IS NULL OR TRIM(ev_lot_location) = '';
        """, (default_text,))
        defaulted = cur.rowcount

        # Apply matches
        updates = 0
        for cp_no, ev_loc in mapping.items():
            cur.execute("""
                UPDATE carpark_availability_join
                   SET ev_lot_location = ?
                 WHERE UPPER(TRIM(carpark_number)) = ?;
            """, (ev_loc, cp_no))
            updates += cur.rowcount

        cur.execute("COMMIT;")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

    total_rows = conn.execute("SELECT COUNT(*) FROM carpark_availability_join;").fetchone()[0]
    with_ev = conn.execute("""
        SELECT COUNT(*) FROM carpark_availability_join
         WHERE ev_lot_location IS NOT NULL
           AND TRIM(ev_lot_location) <> ?
           AND TRIM(ev_lot_location) <> '';
    """, (default_text,)).fetchone()[0]

    return {
        "total_rows": total_rows,
        "sheet_matches_applied": updates,
        "defaulted_set_this_run": defaulted,
        "with_ev_location": with_ev,
        "without_ev_location": total_rows - with_ev,
        "default_label": default_text,
    }

###############################################################
# Lambda
###############################################################
def lambda_handler(event, context):
    """
    One-time EV merge using CSV exported from the sheet.
    Test event examples:
    {}
    or
    {"s3_key": "ev_information/HDB_EV.csv", "default_text": "No EV chargers"}
    """
    s3_key = (event or {}).get("s3_key")
    default_text = (event or {}).get("default_text") or NO_EV_TEXT

    try:
        if not s3_key:
            s3_key = _latest_csv_key(S3_BUCKET, EV_PREFIX)

        csv_text = _download_csv_text(S3_BUCKET, s3_key)
        mapping = _load_ev_mapping_csv(csv_text)

        conn = get_db()
        _ensure_ev_column(conn)
        stats = _apply_ev_mapping(conn, mapping, default_text)

        ts = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
        snap = _dump_join_snapshot_to_s3(conn, ts)
        
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "ok": True,
                "s3_source": {"bucket": S3_BUCKET, "key": s3_key},
                "mapping_size": len(mapping),
                **stats,
                "snapshot":snap
            }, ensure_ascii=False)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"ok": False, "error": str(e)})
        }
