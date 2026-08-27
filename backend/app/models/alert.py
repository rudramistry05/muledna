from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    victim_name = Column(String(255), nullable=True)
    victim_phone = Column(String(50), nullable=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True)
    status = Column(String(50), default="Sent") # Sent, Acknowledged, Blocked, Escalated
    alert_type = Column(String(50), default="SMS") # SMS, Push, Voice
    countdown_seconds = Column(Integer, default=45)
    sent_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    transaction = relationship("Transaction", back_populates="alerts")
