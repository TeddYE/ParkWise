"""
Updating Carpark availability

Purpose
- Ingest HDB carpark availability from data.gov.sg (Data is refreshed every minute)
- Maintain DB snapshots/history and publish as CSV/JSON to S3 (For checking)
- Compute carpark pricing at runtime (For future improvements, can keep this as a separate lambda function)

Schedule
- Runs every 5 minutes (EventBridge), currently inactive to save on cost 
- cron(0/5 * * ? * *)
- Can be scaled depending on amount of users to refresh every minute (Same as data.gov) but this is more cost-effective
- HDB carpark availability is not like stock price where every second matters. The data represents the movement of physical cars. While it changes minute-by-minute, the useful, actionable trend (e.g., "the carpark is filling up," "it's peak hour") is perfectly captured by 5-minute snapshots.

Main changes for each run:
- lots_available
- total_lots (only filled if currently NULL)
- update_datetime
- last_seen_at

Flow:
1) Fetch JSON payload from data.gov.sg
2) Upsert into SQLite (current snapshot + append-only history)
3) Rebuild denormalized join table
4) Export JSON + CSV to S3
"""

import json, time

from avail_carpark_utils import (
    fetch_payload, upsert, get_db, rebuild_join_snapshot, 
    upload_json_to_s3, dump_csv_to_s3_from_db
)

def lambda_handler(event, context):
    ts = time.strftime("%Y%m%d-%H%M%S", time.gmtime())

    payload = fetch_payload()
    stats = upsert(payload)

    conn = get_db()
    rebuild_join_snapshot(conn)

    json_key = upload_json_to_s3(payload, ts)
    csv_key  = dump_csv_to_s3_from_db(ts)

    return {
        "statusCode": 200,
        "body": json.dumps({
            **stats,
            "json_key": json_key,
            "csv_key": csv_key
        })
    }
