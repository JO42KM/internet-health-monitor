"""Add SIDN measurements

Revision ID: a5ae18ed0401
Revises: b36aba6ab7fb
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a5ae18ed0401"
down_revision: Union[str, Sequence[str], None] = "b36aba6ab7fb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sidn_measurements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service", sa.String(length=100), nullable=False),
        sa.Column("metric", sa.String(length=50), nullable=False),
        sa.Column("version", sa.String(length=30), nullable=False),
        sa.Column("start_period", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("source_file", sa.String(length=500), nullable=False),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "service",
            "metric",
            "start_period",
            name="uq_sidn_service_metric_period",
        ),
    )

    op.create_index(
        "ix_sidn_metric_period",
        "sidn_measurements",
        ["metric", "start_period"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_sidn_metric_period",
        table_name="sidn_measurements",
    )
    op.drop_table("sidn_measurements")