"""
User Profiles

Purpose:
- Manage user information (signup, login, update, fetch, and snapshots).
- Secure password storage with scrypt + per-user SALT + env PEPPER.

Primary table:
- user_profiles(
    user_id PK, email UNIQUE, pw_hash, pw_salt, profile_json,
    created_at, updated_at, is_premium, subscription_end_date, fav_carparks
  )

Main fields changed per route:
- POST /signup: inserts new row, sets created_at/updated_at, sets subscription_end_date to yesterday, fav_carparks=[]
- POST /login: read-only (verifies password, never reveals if email exists)
- PUT /users/{user_id} or ?email=...: may update pw_hash, pw_salt, profile_json, subscription_end_date,
  is_premium, fav_carparks, and always updates updated_at
- GET /users?...: read-only
- GET /snapshot/user-profiles: read-only, computes is_premium from subscription_end_date

"""

import os, json, time, base64, re, uuid, sqlite3, hashlib, hmac
import datetime as dt

USERS_DB = os.getenv("USERS_DB", "/mnt/users/user_profiles.sqlite")
# Extra secret mixed into every password hash
PEPPER = os.getenv("PEPPER", "")

conn = None

##########################################################
# DB bootstrap
##########################################################

def get_db():
    global conn
    if conn is None:
        os.makedirs(os.path.dirname(USERS_DB), exist_ok=True)
        conn = sqlite3.connect(USERS_DB, timeout=30, isolation_level=None)  # autocommit
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
    ensure_schema(conn)  # <- ensure ALTERs always run safely
    return conn

def ensure_schema(conn):
    cur = conn.cursor()
    # Base table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS user_profiles(
      user_id      TEXT PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      pw_hash      TEXT NOT NULL,
      pw_salt      TEXT NOT NULL,
      profile_json TEXT,
      created_at   TEXT,
      updated_at   TEXT
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_user_email ON user_profiles(email);")

    def _col_exists(table, col):
        rows = conn.execute(f"PRAGMA table_info({table});").fetchall()
        return any(r[1] == col for r in rows)

    if not _col_exists("user_profiles", "is_premium"):
        conn.execute("ALTER TABLE user_profiles ADD COLUMN is_premium TEXT;")
    if not _col_exists("user_profiles", "subscription_end_date"):
        conn.execute("ALTER TABLE user_profiles ADD COLUMN subscription_end_date TEXT;")
    if not _col_exists("user_profiles", "fav_carparks"):
        conn.execute("ALTER TABLE user_profiles ADD COLUMN fav_carparks TEXT NOT NULL DEFAULT '[]';")
    else:
        conn.execute("UPDATE user_profiles SET fav_carparks='[]' WHERE fav_carparks IS NULL;")


##########################################################
# Hash helpers
##########################################################
def hash_password(password: str, salt_bytes: bytes) -> bytes:
    return hashlib.scrypt(
        (password + PEPPER).encode("utf-8"),
        salt=salt_bytes, n=2**14, r=8, p=1, dklen=64
    )

def make_hash_and_salt(password: str) -> tuple[str, str]:
    salt = os.urandom(16)
    pw_hash = hash_password(password, salt)
    return base64.b64encode(pw_hash).decode(), base64.b64encode(salt).decode()

def verify_password(password: str, salt_b64: str, hash_b64: str) -> bool:
    salt = base64.b64decode(salt_b64.encode())
    expected = base64.b64decode(hash_b64.encode())   # bytes
    actual = hash_password(password, salt)          # bytes
    # constant-time compare
    return hmac.compare_digest(actual, expected)

##########################################################
# validation 
##########################################################
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def _require_email(email: str):
    if not email or not EMAIL_RE.match(email):
        raise ValueError("Invalid email")

def _require_password(pw: str):
    if not pw or len(pw) < 8:
        raise ValueError("Password must be at least 8 characters")

##########################################################
# login (password verify only)
##########################################################
def login(body):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    _require_email(email)
    _require_password(password)

# "SELECT pw_hash, pw_salt,user_id,profile_json FROM user_profiles WHERE email=?",
    conn = get_db()
    row = conn.execute(
        "SELECT pw_hash, pw_salt,user_id,is_premium,subscription_end_date,fav_carparks FROM user_profiles WHERE email=?",
        (email,)
    ).fetchone()

    if not row:
        return False

    pw_hash_b64, pw_salt_b64,user_id, is_premium,subscription_end_date,fav_carparks = row
    if verify_password(password, pw_salt_b64, pw_hash_b64) :
        return True, user_id, is_premium,subscription_end_date,fav_carparks
    else:
        return False
    #return verify_password(password, pw_salt_b64, pw_hash_b64)

##########################################################
# User helpers
##########################################################

def yesterday_date_str() -> str:
    """Calculates yesterday's date in YYYY-MM-DD format based on UTC time."""
    # dt is imported as datetime
    yesterday = dt.datetime.utcnow().date() - dt.timedelta(days=1)
    return yesterday.isoformat()

def create_user(body):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    profile = body.get("profile") or {}

    _require_email(email)
    _require_password(password)
    if not isinstance(profile, dict):
        raise ValueError("profile must be an object")

    pw_hash, pw_salt = make_hash_and_salt(password)
    user_id = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Set the subscription end date to yesterday by default for new users (free tier)
    default_sub_end_date = yesterday_date_str()

    conn = get_db()
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE;")
    try:
        cur.execute("""
          INSERT INTO user_profiles(
            user_id, email, pw_hash, pw_salt, profile_json, 
            created_at, updated_at, subscription_end_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
          user_id, email, pw_hash, pw_salt, json.dumps(profile, ensure_ascii=False), 
          now, now, default_sub_end_date # <-- New value added here
        ))
        cur.execute("COMMIT;")
    except sqlite3.IntegrityError:
        cur.execute("ROLLBACK;")
        raise ValueError("Email already exists")
    except Exception:
        cur.execute("ROLLBACK;")
        raise

    return {"user_id": user_id, "email": email, "created_at": now}

def update_user(path_params, query, body):
    # identify target by user_id (path) or email (query/body)
    user_id = (path_params or {}).get("user_id") or (body.get("user_id") if body else None)
    email = (query or {}).get("email") or (body.get("email") if body else None)
    if not user_id and not email:
        raise ValueError("Provide user_id in path or email as query/body")
    if email:
        _require_email(email)

    new_password = body.get("password") if body else None
    new_profile = body.get("profile") if body else None
    subscription_end_date = body.get("subscription_end_date") if body else None
    fav_carparks = body.get("fav_carparks") if body else None
    is_premium = body.get("is_premium") if body else None

    if new_profile is not None and not isinstance(new_profile, dict):
        raise ValueError("profile must be an object when provided")
    if fav_carparks is not None and not isinstance(fav_carparks, (list, tuple)):
        raise ValueError("fav_carparks must be a list")

    sets = []
    args = []

    if new_password:
        _require_password(new_password)
        pw_hash, pw_salt = make_hash_and_salt(new_password)
        sets += ["pw_hash=?", "pw_salt=?"]
        args += [pw_hash, pw_salt]

    if new_profile is not None:
        sets += ["profile_json=?"]
        args += [json.dumps(new_profile, ensure_ascii=False)]

    if subscription_end_date is not None:
        sets += ["subscription_end_date=?"]
        args += [subscription_end_date]

    if is_premium is not None:
        sets += ["is_premium=?"]
        args += [is_premium]

    if fav_carparks is not None:
        sets += ["fav_carparks=?"]
        args += [json.dumps(list(fav_carparks), ensure_ascii=False)]

    if not sets:
        return {"updated": False, "message": "Nothing to update"}

    sets += ["updated_at=?"]
    args += [time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())]

    where = "user_id=?" if user_id else "email=?"
    args.append(user_id if user_id else email)

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE user_profiles SET {', '.join(sets)} WHERE {where}", args)
    return {"updated": cur.rowcount > 0}

def get_user(path_params, query):
    user_id = (path_params or {}).get("id")
    email = (query or {}).get("email")
    if not user_id and not email:
        raise ValueError("Provide user_id in path or email as query")
    where = "user_id=?" if user_id else "email=?"
    key = user_id if user_id else email

    conn = get_db()
    row = conn.execute(f"""
      SELECT user_id, email, profile_json, created_at, updated_at
      FROM user_profiles WHERE {where}
    """, (key,)).fetchone()
    if not row:
        return None

    (uid, em, profile_json, created_at, updated_at) = row
    profile = json.loads(profile_json) if profile_json else {}
    return {"user_id": uid, "email": em, "profile": profile,
            "created_at": created_at, "updated_at": updated_at}

##########################################################
# Premium Functionalities
##########################################################
ISO_DATE_ONLY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def is_premium_today(sub_end_str: str | None) -> bool:
    if not sub_end_str:
        return False
    s = sub_end_str.strip()
    try:
        if ISO_DATE_ONLY_RE.match(s):
            end_date = dt.datetime.strptime(s, "%Y-%m-%d").date()
        else:
            # allow 'Z' timezone
            s = s.replace("Z", "+00:00")
            end_date = dt.datetime.fromisoformat(s).date()
    except Exception:
        return False
    today = dt.datetime.utcnow().date()
    return end_date >= today


##########################################################
# API Gateway event parsing (REST v1 and HTTP v2)
##########################################################
def parse_apigw_event(event):
    method = (event.get("httpMethod")
              or event.get("requestContext", {}).get("http", {}).get("method")
              or "").upper()

    #raw_path = event.get("rawPath") or event.get("path") or ""
    raw_path = event.get("rawPath") or event.get("path") or event.get("resource") or ""

    # Params
    path_params = event.get("pathParameters") or {}
    query = event.get("queryStringParameters") or {}

    # Body (string or base64)
    body_text = event.get("body")
    if body_text and event.get("isBase64Encoded"):
        body_text = base64.b64decode(body_text).decode("utf-8")
    body = {}
    if body_text:
        try:
            body = json.loads(body_text)
        except Exception:
            body = {"Body_Exception"}

    if not method and "action" in event:
        method = (event.get("action") or "").upper()
        #raw_path = event.get("rawPath") or event.get("path") or "/"
        raw_path = event.get("rawPath") or event.get("path") or event.get("resource") or ""
        path_params = event.get("pathParameters") or {}
        query = event.get("query") or {}
        body = event.get("payload") or {}

    return method, raw_path, path_params, query, body

def resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(body, ensure_ascii=False),
    }

##########################################################
# Snapshot
##########################################################
def snapshot_user_profiles(limit=10, include_carparks=False):
    conn = get_db()
    rows = conn.execute("""
      SELECT user_id, email, created_at, updated_at,
             subscription_end_date, fav_carparks,
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
            "is_premium": is_premium_today(sub_end),
            "fav_count": int(fav_count or 0),
        }
        if include_carparks:
            try:
                item["fav_carparks"] = json.loads(favs_json or "[]")
            except Exception:
                item["fav_carparks"] = []
        out.append(item)
    return {"limit": limit, "rows": out}


##########################################################
# Lambda
##########################################################
def lambda_handler(event, context):
    method, raw_path, path_params, query, body = parse_apigw_event(event)
    
    try:
        # LOGIN route: POST /login OR /sessions
        if method == "POST" and (raw_path.endswith("/login") or raw_path.endswith("/sessions")):         
            ok , user_id, is_premium, subscription_end_date,fav_carparks = login(body)
            return resp(200, {"ok": True, "user_id": user_id, "is_premium" : is_premium, "subscription_end_date" : subscription_end_date ,"fav_carparks" : fav_carparks }) if ok else resp(401, {"ok": False})

        # Users credentials
        #if method == "POST":
        if method == "POST" and (raw_path.endswith("/signup")):
            out = create_user(body)
            return resp(201, out)
        elif method == "PUT":
            out = update_user(path_params, query, body)
            return resp(200, out)
        elif method == "GET":
            if raw_path.endswith("/snapshot/user-profiles"):
                q = query or {}
                try:
                    limit = int(q.get("limit") or 10)
                except Exception:
                    limit = 10
                include_carparks = (str(q.get("include") or "").lower() == "carparks")
                return resp(200, snapshot_user_profiles(limit, include_carparks))

            # Generic GET
            out = get_user(path_params, query)
            if out is None:
                return resp(404, {"error": "Not found"})
            return resp(200, out)
        else:
            #return resp(405, {"error": "Method not allowed"})
            return resp(405, {
        "debug_event": event, 
        "debug_method": method,
        "debug_body": body,
        "message": "Method/Path not matched by router"
    })
    except ValueError as ve:
        return resp(400, {"error": str(ve)})
    except Exception as e:
        return resp(500, {"error": "Internal error", "detail": str(e)})
