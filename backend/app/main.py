from fastapi import FastAPI, Depends, HTTPException, status, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User

# Import routers
from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.transactions import router as transactions_router
from app.api.fraud_rings import router as fraud_rings_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.metrics import router as metrics_router
from app.api.admin import router as admin_router
from app.api.real_apis import router as real_apis_router

# Create database tables if they do not exist (runs initial bootstrap)
try:
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    print("[MuleDNA] Database tables verified/created successfully.")
    
    # Check if database is empty and seed if necessary
    from app.core.database import SessionLocal
    from app.models.user import User
    db_session = SessionLocal()
    try:
        if db_session.query(User).count() == 0:
            print("[MuleDNA] Database is empty. Seeding initial data...")
            from app.core.seed import seed_data
            seed_data(db_session)
            print("[MuleDNA] Database seeded successfully.")
    except Exception as seed_err:
        print(f"[MuleDNA] Database seeding warning/error: {seed_err}")
    finally:
        db_session.close()
except Exception as e:
    print(f"[MuleDNA] Database table startup connection error: {e}. (Awaiting docker db startup...)")

# Initialize FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(accounts_router, prefix=settings.API_V1_STR)
app.include_router(transactions_router, prefix=settings.API_V1_STR)
app.include_router(fraud_rings_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(metrics_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(real_apis_router)

# Swagger OAuth2 login helper endpoint (parses form fields instead of JSON)
@app.post("/api/v1/auth/login-form-dummy")
def login_for_swagger_token(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.get("/")
def read_root():
    return {
        "app": "MuleDNA AI-Powered Fraud Network Intelligence System",
        "status": "Online",
        "api_docs": "/docs",
        "bank": "Bank of India AML Division"
    }

import socketio
from app.core.socket_manager import sio

sio_app = socketio.ASGIApp(sio, socketio_path="")
app.mount("/socket.io", sio_app)
