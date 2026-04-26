from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from app.core.database import get_db
from app.models import RFQ, RFQStatus, Bid, ActivityLog, User
from app.schemas.rfq import RFQCreate, RFQResponse
from app.core.security import get_current_user
from datetime import datetime
from typing import List
import uuid

router = APIRouter()


@router.post("/", response_model=RFQResponse)
async def create_rfq(
    rfq: RFQCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if rfq.forced_close_time <= rfq.bid_close_time:
        raise HTTPException(
            status_code=400,
            detail="forced_close_time must be strictly after bid_close_time",
        )

    new_rfq = RFQ(
        name=rfq.name,
        creator_id=current_user.id,
        start_time=rfq.start_time,
        pickup_date=rfq.pickup_date,
        bid_close_time=rfq.bid_close_time,
        forced_close_time=rfq.forced_close_time,
        trigger_window=rfq.trigger_window,
        extension_duration=rfq.extension_duration,
        extension_trigger_type=rfq.extension_trigger_type,
        status=RFQStatus.ACTIVE,
    )
    db.add(new_rfq)
    await db.commit()
    await db.refresh(new_rfq)
    return new_rfq


@router.get("/", response_model=List[RFQResponse])
async def list_rfqs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RFQ).order_by(RFQ.created_at.desc()))
    return result.scalars().all()


@router.get("/{rfq_id}", response_model=RFQResponse)
async def get_rfq(rfq_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rfq = await db.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.get("/{rfq_id}/bids")
async def list_bids(rfq_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq_id).order_by(asc(Bid.total_price))
    )
    bids = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "supplier_name": b.supplier_name,
            "freight_charges": b.freight_charges,
            "origin_charges": b.origin_charges,
            "destination_charges": b.destination_charges,
            "total_price": b.total_price,
            "transit_time": b.transit_time,
            "rank": f"L{i + 1}",
            "created_at": b.created_at.isoformat(),
        }
        for i, b in enumerate(bids)
    ]


@router.get("/{rfq_id}/logs")
async def get_activity_logs(rfq_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.rfq_id == rfq_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(50)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "event_type": l.event_type,
            "message": l.message,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
