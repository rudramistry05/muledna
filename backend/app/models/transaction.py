from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_reference = Column(String(100), unique=True, nullable=False, index=True)
    source_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True)
    destination_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    type = Column(String(50), default="Transfer") # Transfer, Deposit, Withdrawal
    description = Column(String(255), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lon = Column(Float, nullable=True)
    device_id = Column(String(100), nullable=True)
    risk_score = Column(Float, default=0.0)
    risk_reasons = Column(Text, nullable=True) # Comma-separated or JSON
    status = Column(String(50), default="Pending") # Pending, Approved, Blocked, Suspicious

    # Relationships
    source_account = relationship("Account", foreign_keys=[source_account_id])
    destination_account = relationship("Account", foreign_keys=[destination_account_id])
    predictions = relationship("Prediction", back_populates="transaction", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="transaction", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    xgb_score = Column(Float, nullable=False)
    lgb_score = Column(Float, nullable=False)
    iforest_score = Column(Float, nullable=False)
    ensemble_score = Column(Float, nullable=False)
    shap_values_json = Column(Text, nullable=True) # JSON representation of SHAP values
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship
    transaction = relationship("Transaction", back_populates="predictions")
