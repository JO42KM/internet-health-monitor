from datetime import datetime

from sqlalchemy import (
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class SIDNMeasurement(Base):
    __tablename__ = "sidn_measurements"

    __table_args__ = (
        UniqueConstraint(
            "service",
            "metric",
            "start_period",
            name="uq_sidn_service_metric_period",
        ),
        Index(
            "ix_sidn_metric_period",
            "metric",
            "start_period",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    service: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    metric: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    version: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    start_period: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    source_file: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )