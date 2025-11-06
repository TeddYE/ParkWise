import boto3
import os, json, sqlite3, itertools
from collections import defaultdict

OPS_DB = os.getenv("OPS_DB", "/mnt/efs/ops/ops.sqlite")

def _fetch_one(conn, sql, args=()):
    try:
        return conn.execute(sql, args).fetchone()[0]
    except Exception:
        return None

def lambda_handler(event, context):
    # List EFS folder & file sizes
    root = os.path.dirname(OPS_DB)
    listing = []
    for name in sorted(os.listdir(root)):
        p = os.path.join(root, name)
        try:
            listing.append({"name": name, "bytes": os.path.getsize(p)})
        except Exception:
            listing.append({"name": name, "bytes": None})

    # Open DB read-only
    conn = sqlite3.connect(f"file:{OPS_DB}?mode=ro", uri=True, timeout=10)

    # Query carpark availability
    sample_snap = conn.execute("""
        SELECT carpark_number, lot_type, lots_available
        FROM carpark_availability
        ORDER BY carpark_number
    """).fetchall()

    # Group by carpark_number
    grouped = defaultdict(list)
    for carpark_number, lot_type, lots_available in sample_snap:
        grouped[carpark_number].append({
            "lot_type": lot_type,
            "lots_available": str(lots_available)
        })

    # Format output
    formatted = [
        {
            "carpark_number": cp,
            "lots": grouped[cp]
        }
        for cp in sorted(grouped)
    ]

    print(formatted)

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps({
            "carpark_ava": formatted,
            "efs_listing": listing
        }, default=str)
    }
