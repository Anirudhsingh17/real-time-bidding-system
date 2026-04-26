from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum
from datetime import datetime, timezone
from app.core.database import Base



class ExtensionTriggerType(str, enum.Enum):
    ANY_BID = "ANY_BID"
    ANY_RANK_CHANGE = "ANY_RANK_CHANGE"
    L1_CHANGE = "L1_CHANGE"


class RFQStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    FORCE_CLOSED = "FORCE_CLOSED"


class EventType(str, enum.Enum):
    BID = "BID"
    EXTENSION = "EXTENSION"
    STATUS_CHANGE = "STATUS_CHANGE"



class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RFQ(Base):
    __tablename__ = "rfqs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # nullable for safety with existing
    name = Column(String, index=True)
    start_time = Column(DateTime(timezone=True))
    pickup_date = Column(DateTime(timezone=True))
    bid_close_time = Column(DateTime(timezone=True))
    forced_close_time = Column(DateTime(timezone=True))
    trigger_window = Column(Integer)          # minutes
    extension_duration = Column(Integer)      # minutes
    extension_trigger_type = Column(SAEnum(ExtensionTriggerType))
    status = Column(SAEnum(RFQStatus), default=RFQStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Bid(Base):
    __tablename__ = "bids"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    supplier_name = Column(String, nullable=False)
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, nullable=False)
    destination_charges = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    transit_time = Column(String, nullable=False)
    quote_validity = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    event_type = Column(SAEnum(EventType))
    message = Column(String)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
