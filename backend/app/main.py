from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import rfq, bid, auth
from app.websocket.manager import manager
from app.core.database import engine, Base
from app.core.config import settings
from app.models import RFQ, RFQStatus 
import asyncio
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)




async def background_auction_checker():
    while True:
        try:
            async with AsyncSessionLocal() as session:
                now = datetime.now(timezone.utc)

                # Active se Close krega
                stmt_close = (
                    update(RFQ)
                    .where(RFQ.status == RFQStatus.ACTIVE)
                    .where(RFQ.bid_close_time <= now)
                    .values(status=RFQStatus.CLOSED)
                    .returning(RFQ.id)
                )
                closed_result = await session.execute(stmt_close)
                closed_ids = closed_result.scalars().all()

                # Active se Force Close krega
                stmt_force = (
                    update(RFQ)
                    .where(RFQ.status == RFQStatus.ACTIVE)
                    .where(RFQ.forced_close_time <= now)
                    .values(status=RFQStatus.FORCE_CLOSED)
                    .returning(RFQ.id)
                )
                forced_result = await session.execute(stmt_force)
                forced_ids = forced_result.scalars().all()

                await session.commit()

                for rid in list(closed_ids) + list(forced_ids):
                    await manager.broadcast(str(rid), {"type": "AUCTION_CLOSED"})

        except Exception as exc:
            logger.error("Auction checker error: %s", exc)

        await asyncio.sleep(5)



# app start hone se phle ye chlega saari tables load krega 
async def lifespan(app: FastAPI):
   
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    task = asyncio.create_task(background_auction_checker())
    yield
    task.cancel()


# ── App setup ──────────────────────────────────────────────────────────────

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(rfq.router, prefix="/rfq", tags=["RFQ"])
app.include_router(bid.router, prefix="/bid", tags=["Bid"])


@app.websocket("/ws/rfq/{rfq_id}")
async def websocket_endpoint(websocket: WebSocket, rfq_id: str):
    await manager.connect(websocket, rfq_id)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket, rfq_id)


@app.get("/")
def root():
    return {"message": "RFQ British Auction API — running ✓"}


@app.get("/health")
def health():
    return {"status": "ok", "time_utc": datetime.now(timezone.utc).isoformat()}
