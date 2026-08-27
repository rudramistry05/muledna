from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
use_sqlite = False

if db_url.startswith("postgresql"):
    try:
        import psycopg2
        # Proactively test connection to verify PostgreSQL is online
        from sqlalchemy import create_engine as test_create_engine
        temp_engine = test_create_engine(db_url, connect_args={"connect_timeout": 1})
        conn = temp_engine.connect()
        conn.close()
        temp_engine.dispose()
        print("[MuleDNA] Connected to PostgreSQL server successfully.")
    except Exception as e:
        print(f"[MuleDNA] WARNING: PostgreSQL server check failed ({e}). Falling back to SQLite local database.")
        db_url = "sqlite:///./muledna.db"
        use_sqlite = True

# Create database engine
if db_url.startswith("sqlite") or use_sqlite:
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=10
    )

# Session local factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base
Base = declarative_base()

# DB Dependency generator
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
