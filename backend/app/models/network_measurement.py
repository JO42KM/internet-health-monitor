from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class NetworkMeasurement(Base):
    __tablename__ = "network_measurements"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    target: Mapped[str] = mapped_column(
        String(253), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    packets_transmitted: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    packets_received: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    packet_loss_percent: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    latency_min_ms: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    latency_avg_ms: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    latency_max_ms: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    jitter_ms: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    samples_ms: Mapped[list] = mapped_column(
        JSONB, nullable=False
    )

    error: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )