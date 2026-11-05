from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class DNSMeasurement(Base):
    __tablename__ = "dns_measurements"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    domain: Mapped[str] = mapped_column(
        String(253), nullable=False, index=True
    )

    record_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )

    resolver: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    resolver_ip: Mapped[str] = mapped_column(
        String(45), nullable=False
    )

    answers: Mapped[list] = mapped_column(
        JSONB, nullable=False
    )

    response_time_ms: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    error: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    dnssec_ad_flag: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )