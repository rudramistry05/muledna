import os
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "MuleDNA API"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgrespassword@localhost:5432/muledna"
    )
    
    # MongoDB Settings
    MONGODB_URL: str = Field(
        default="mongodb://localhost:27017"
    )
    MONGODB_DB_NAME: str = "muledna"
    
    # Redis Settings
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0"
    )
    
    # Security Settings
    SECRET_KEY: str = Field(
        default="09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Twilio (SMS/Voice Alerts) Settings
    TWILIO_ACCOUNT_SID: str = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    TWILIO_AUTH_TOKEN: str = "your_auth_token_here"
    TWILIO_FROM_NUMBER: str = "+1234567890"
    
    # Firebase Cloud Messaging Settings
    FIREBASE_SERVER_KEY: str = "firebase_server_key_here"
    
    # Machine Learning Settings
    MODEL_ENV: str = "production"
    MODEL_PATH: str = "/app/ml_artifacts"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
