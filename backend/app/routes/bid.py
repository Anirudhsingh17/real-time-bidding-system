from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.rfq import BidCreate
from app.services.rfq_service import process_bid
from app.models import User

router = APIRouter()


@router.post("/")
async def submit_bid(
    bid: BidCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
   
    from app.models import RFQ
    from sqlalchemy import select
    rfq_result = await db.execute(select(RFQ).where(RFQ.id == bid.rfq_id))
    rfq = rfq_result.scalars().first()
    
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    if str(rfq.creator_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot bid on your own RFQ")

    try:
        new_bid = await process_bid(db, bid.model_dump())
        return {"message": "Bid submitted successfully", "bid_id": str(new_bid.id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
