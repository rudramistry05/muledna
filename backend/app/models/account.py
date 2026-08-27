from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    risk_score = Column(Float, default=0.0)
    status = Column(String(50), default="Active") # Active, Suspended, Frozen
    balance = Column(Numeric(15, 2), default=0.00)
    phone_number = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    home_branch = Column(String(100), default="Mumbai Main Branch")
    routing_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    devices = relationship("Device", back_populates="account", cascade="all, delete-orphan")
    locations = relationship("Location", back_populates="account", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    device_uuid = Column(String(100), nullable=False)
    device_name = Column(String(255), nullable=True)
    os = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    last_login = Column(DateTime, default=datetime.utcnow)

    # Relationship
    account = relationship("Account", back_populates="devices")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship
    account = relationship("Account", back_populates="locations")
