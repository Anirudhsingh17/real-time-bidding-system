import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "RFQ British Auction System"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/rfq_auction"
    )
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

   
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  

    class Config:
        env_file = ".env"


settings = Settings()
