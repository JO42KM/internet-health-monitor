import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load .env from the project root
ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

DB_PASSWORD = os.getenv("DB_PASSWORD")

if not DB_PASSWORD:
    raise RuntimeError("DB_PASSWORD is missing from the .env file")

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username="ihm_user",
    password=DB_PASSWORD,
    host="localhost",
    port=5432,
    database="internet_health",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()