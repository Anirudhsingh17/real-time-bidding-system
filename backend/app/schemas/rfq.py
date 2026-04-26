from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models import ExtensionTriggerType, RFQStatus
import uuid


class RFQCreate(BaseModel):
    name: str
    start_time: datetime
    pickup_date: datetime
    bid_close_time: datetime
    forced_close_time: datetime
    trigger_window: int       
    extension_duration: int   
    extension_trigger_type: ExtensionTriggerType


class RFQResponse(BaseModel):
    id: uuid.UUID
    creator_id: Optional[uuid.UUID]
    name: str
    start_time: datetime
    pickup_date: datetime
    bid_close_time: datetime
    forced_close_time: datetime
    trigger_window: int
    extension_duration: int
    extension_trigger_type: ExtensionTriggerType
    status: RFQStatus
    created_at: datetime

    class Config:
        from_attributes = True


class BidCreate(BaseModel):
    rfq_id: uuid.UUID
    supplier_name: str
    freight_charges: float
    origin_charges: float
    destination_charges: float
    transit_time: str
    quote_validity: datetime
