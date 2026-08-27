# pyrefly: ignore [missing-import]
import time
import pymongo
from app.core.config import settings

mongo_client = None
mongo_db = None
_last_mongo_check = 0
_mongo_failed = False
COOLDOWN_SECONDS = 60

def get_mongo_db():
    global mongo_client, mongo_db, _last_mongo_check, _mongo_failed
    if mongo_db is not None:
        return mongo_db
        
    now = time.time()
    if _mongo_failed and (now - _last_mongo_check < COOLDOWN_SECONDS):
        return None

    _last_mongo_check = now
    try:
        mongo_client = pymongo.MongoClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=500
        )
        # Test connection
        mongo_client.admin.command('ping')
        mongo_db = mongo_client[settings.MONGODB_DB_NAME]
        _mongo_failed = False
        print(f"[MuleDNA] Connected to MongoDB ({settings.MONGODB_DB_NAME}) successfully.")
        return mongo_db
    except Exception as e:
        _mongo_failed = True
        print(f"[MuleDNA] WARNING: MongoDB server check failed ({e}). Operating in resilient fallback mode.")
        return None

def sync_user_to_mongodb(user_data: dict):
    """
    Inserts or updates a user document in the MongoDB 'users' collection.
    Handles offline MongoDB gracefully.
    """
    try:
        db = get_mongo_db()
        if db is not None:
            collection = db['users']
            email = user_data.get('email')
            if email:
                collection.update_one(
                    {'email': email},
                    {'$set': user_data},
                    upsert=True
                )
                print(f"[MuleDNA MongoDB] Synced user profile document for: {email}")
                return True
    except Exception as err:
        print(f"[MuleDNA MongoDB Warning] Failed to sync user document: {err}")
    return False

def log_auth_event_to_mongodb(event_data: dict):
    """
    Logs authentication events (e.g. login attempt, OTP verification) into MongoDB 'auth_logs'.
    """
    try:
        db = get_mongo_db()
        if db is not None:
            db['auth_logs'].insert_one(event_data)
            return True
    except Exception as err:
        print(f"[MuleDNA MongoDB Warning] Failed to log auth event: {err}")
    return False
