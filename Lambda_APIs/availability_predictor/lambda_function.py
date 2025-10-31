import json, joblib, datetime, os

BASE = os.path.dirname(__file__)
model = joblib.load(os.path.join(BASE, "carpark_hgb_model.pkl"))
carpark_le = joblib.load(os.path.join(BASE, "carpark_label_encoder.pkl"))
lot_type_le = joblib.load(os.path.join(BASE, "lot_type_label_encoder.pkl"))
with open(os.path.join(BASE, "carpark_static.json")) as f:
    CARPARK_STATIC = json.load(f)

SG_HOLIDAYS = {
    "2023-01-01","2023-01-02","2023-01-22","2023-01-23","2023-04-07","2023-04-22",
    "2023-05-01","2023-06-02","2023-06-29","2023-08-09","2023-11-12","2023-11-13","2023-12-25",
    "2024-01-01","2024-02-10","2024-02-11","2024-03-29","2024-04-10","2024-05-01","2024-05-22",
    "2024-06-17","2024-08-09","2024-10-31","2024-12-25",
    "2025-01-01","2025-01-29","2025-01-30","2025-04-18","2025-05-01","2025-06-07",
    "2025-06-08","2025-08-09","2025-12-25"
}

def is_holiday(dt):
    return int(dt.strftime("%Y-%m-%d") in SG_HOLIDAYS)

def build_features(carpark, dt):
    meta = CARPARK_STATIC[carpark]
    return [
        carpark_le.transform([carpark])[0],
        meta["total_lots"],
        lot_type_le.transform([meta["lot_type"]])[0],
        dt.month, dt.weekday(), dt.hour,
        int(dt.weekday() >= 5), is_holiday(dt)
    ]

def lambda_handler(event, context):
    # CORS headers
    CORS_HEADERS = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
    }

    # detect method (HTTP API v2 or REST)
    method = (
        event.get("requestContext", {})
             .get("http", {})
             .get("method")
    ) or event.get("httpMethod")

    # short-circuit CORS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }

    
    data = None
    if isinstance(event, dict) and "body" in event:
        if isinstance(event["body"], str):
            try:
                data = json.loads(event["body"])
            except Exception:
                data = {}
        elif isinstance(event["body"], dict):
            data = event["body"]
        else:
            data = {}
    elif isinstance(event, dict):
        data = event
    elif isinstance(event, str):
        data = json.loads(event)
    else:
        data = {}

    carpark = data.get("carpark_number")
    dt_str = data.get("datetime")

    
    if not carpark or not dt_str:
        return {"statusCode":400,
                "headers": CORS_HEADERS,
                "body":json.dumps({"error":"missing carpark_number or datetime"})}
    
    dt_clean = dt_str.rstrip("Z")
    try:
        try:
            start = datetime.datetime.fromisoformat(dt_str)
        except:
            start = datetime.datetime.strptime(dt_str,"%Y-%m-%dT%H:%M")
        times = [start + datetime.timedelta(hours=h) for h in range(24)]
        feats = [build_features(carpark, t) for t in times]
        preds = model.predict(feats)
        out = [{"datetime":t.isoformat(timespec="seconds"),
                "predicted_lots_available":max(0,int(round(p)))} 
                for t,p in zip(times,preds)]
        return {"statusCode":200,
                "headers": CORS_HEADERS,
                "body":json.dumps({"carpark_number":carpark,"predictions":out})}
    except Exception as e:
        return {"statusCode":500,
                "headers": CORS_HEADERS,
                "body":json.dumps({"error":str(e)})}
