from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from app.models import RFQ, RFQStatus, ExtensionTriggerType, Bid, ActivityLog, EventType
from app.websocket.manager import manager
from datetime import datetime, timedelta, timezone


async def process_bid(db: AsyncSession, bid_data: dict) -> Bid:
    rfq_id = bid_data["rfq_id"]
    total_price = (
        bid_data["freight_charges"]
        + bid_data["origin_charges"]
        + bid_data["destination_charges"]
    )

    
    rfq = await db.get(RFQ, rfq_id)
    if not rfq:
        raise ValueError("RFQ not found")

    now_utc = datetime.now(timezone.utc)

 
    if rfq.status != RFQStatus.ACTIVE:
        raise ValueError("Auction is not active")

    
    close_time = rfq.bid_close_time
    if close_time.tzinfo is None:
        close_time = close_time.astimezone(timezone.utc)
    else:
        close_time = close_time.astimezone(timezone.utc)

    forced_close = rfq.forced_close_time
    if forced_close.tzinfo is None:
        forced_close = forced_close.astimezone(timezone.utc)
    else:
        forced_close = forced_close.astimezone(timezone.utc)

    if now_utc >= close_time:
        raise ValueError("Bidding window has closed")

  
    lowest_result = await db.execute(
        select(Bid)
        .where(Bid.rfq_id == rfq_id)
        .order_by(asc(Bid.total_price))
        .limit(1)
    )
    lowest_bid = lowest_result.scalars().first()

    if lowest_bid and total_price >= lowest_bid.total_price:
        raise ValueError(
            f"Bid (${total_price:.2f}) must be strictly lower than the "
            f"current best bid (${lowest_bid.total_price:.2f})"
        )

   
    new_bid = Bid(
        rfq_id=rfq_id,
        supplier_name=bid_data["supplier_name"],
        freight_charges=bid_data["freight_charges"],
        origin_charges=bid_data["origin_charges"],
        destination_charges=bid_data["destination_charges"],
        total_price=total_price,
        transit_time=bid_data["transit_time"],
        quote_validity=bid_data["quote_validity"],
    )
    db.add(new_bid)

   
    time_till_close_minutes = (close_time - now_utc).total_seconds() / 60.0
    extension_triggered = False

    if time_till_close_minutes <= rfq.trigger_window:
        ttype = rfq.extension_trigger_type
        if ttype == ExtensionTriggerType.ANY_BID:
            extension_triggered = True
        elif ttype == ExtensionTriggerType.L1_CHANGE:
            if not lowest_bid or total_price < lowest_bid.total_price:
                extension_triggered = True
        elif ttype == ExtensionTriggerType.ANY_RANK_CHANGE:
            extension_triggered = True

        if extension_triggered:
            proposed = close_time + timedelta(minutes=rfq.extension_duration)
            new_close = min(proposed, forced_close)
            if new_close > close_time:
                rfq.bid_close_time = new_close # Keep aware UTC
                db.add(
                    ActivityLog(
                        rfq_id=rfq_id,
                        event_type=EventType.EXTENSION,
                        message=(
                            f"Auction extended by {rfq.extension_duration} minutes "
                            f"due to new bid."
                        ),
                        metadata_={"new_close_time": new_close.isoformat()},
                    )
                )
            else:
                extension_triggered = False

    
    db.add(
        ActivityLog(
            rfq_id=rfq_id,
            event_type=EventType.BID,
            message=f"Bid placed by {bid_data['supplier_name']} — ${total_price:.2f}",
            metadata_={"total_price": total_price, "supplier": bid_data["supplier_name"]},
        )
    )

    await db.commit()
    await db.refresh(new_bid)

   
    all_bids_result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq_id).order_by(asc(Bid.total_price))
    )
    sorted_bids = all_bids_result.scalars().all()

    bids_payload = [
        {
            "id": str(b.id),
            "supplier_name": b.supplier_name,
            "total_price": b.total_price,
            "freight_charges": b.freight_charges,
            "origin_charges": b.origin_charges,
            "destination_charges": b.destination_charges,
            "transit_time": b.transit_time,
            "rank": f"L{i + 1}",
            "created_at": b.created_at.isoformat(),
        }
        for i, b in enumerate(sorted_bids)
    ]

    
    await manager.broadcast(
        str(rfq_id),
        {
            "type": "NEW_BID",
            "bids": bids_payload,
            "extended": extension_triggered,
            "new_close_time": rfq.bid_close_time.isoformat() if extension_triggered else None,
        },
    )

    return new_bid
