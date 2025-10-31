"""
Updating Carpark availability

Purpose
- Ingest HDB carpark availability from data.gov.sg (Data is refreshed every minute)
- Maintain DB snapshots/history and publish as CSV/JSON to S3 (For checking)
- Compute carpark pricing at runtime (For future improvements, can keep this as a separate lambda function)

Schedule
- Day start 07:00 daily: cron(59 6 * * ? *), cron(0 7 * * ? *), cron(1 7 * * ? *)
- Night start 22:30 daily: cron(29 22 * * ? *), cron(30 22 * * ? *), cron(31 22 * * ? *)
- Central window end 17:00 Mon–Sat: cron(59 16 ? * MON-SAT *), cron(0 17 ? * MON-SAT *), cron(1 17 ? * MON-SAT *)

Main changes for each run:
- current_rate_30min
- active_cap_type
- active_cap_amount
- rate_updated_at

Flow:
1) Compute pricing fields (central/base rate + time-dependent caps)
2) Rebuild denormalized join table
3) Export CSV to S3
"""

import json, time

from avail_carpark_utils import (
    get_db, mark_central_and_base_rates, refresh_time_dependent_rates, 
    rebuild_join_snapshot, dump_csv_to_s3_from_db
)

def lambda_handler(event, context):
    ts = time.strftime("%Y%m%d-%H%M%S", time.gmtime())

    conn = get_db()
    mark_central_and_base_rates(conn)
    refresh_time_dependent_rates(conn)
    rebuild_join_snapshot(conn)

    # Optional: keep this if you like a priced snapshot for auditing
    priced_csv_key = dump_csv_to_s3_from_db(ts)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "priced_csv_key": priced_csv_key,
            "message": "Pricing updated, join snapshot refreshed."
        })
    }