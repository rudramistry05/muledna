from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class FraudCase(Base):
    __tablename__ = "fraud_cases"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="Open") # Open, Under Investigation, Resolved, Closed
    severity = Column(String(50), default="Medium") # Low, Medium, High, Critical
    summary = Column(Text, nullable=True)
    investigator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    account = relationship("Account")
    investigator = relationship("User")
    sar_reports = relationship("SARReport", back_populates="fraud_case", cascade="all, delete-orphan")


class SARReport(Base):
    __tablename__ = "sar_reports"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("fraud_cases.id", ondelete="CASCADE"), nullable=False)
    report_xml = Column(Text, nullable=True)
    report_pdf_base64 = Column(Text, nullable=True)
    filer_name = Column(String(255), default="Bank of India AML Unit")
    subject_name = Column(String(255), nullable=True)
    subject_account = Column(String(100), nullable=True)
    summary_narrative = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    fraud_case = relationship("FraudCase", back_populates="sar_reports")
