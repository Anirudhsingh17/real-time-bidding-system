import asyncio
from app.core.database import engine
from sqlalchemy import text

async def add_pickup_column():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE rfqs ADD COLUMN pickup_date TIMESTAMP WITH TIME ZONE;"))
            print("Successfully added pickup_date column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_pickup_column())
