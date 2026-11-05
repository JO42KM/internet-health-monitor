"""check database schema

Revision ID: 140027ba0bae
Revises: 9804a72240ef
Create Date: 2026-11-05 13:35:02.952122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '140027ba0bae'
down_revision: Union[str, Sequence[str], None] = '9804a72240ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'dns_measurements',
        'resolver_ip',
        existing_type=sa.VARCHAR(length=45),
        nullable=False
    )

    op.alter_column(
        'dns_measurements',
        'dnssec_ad_flag',
        existing_type=sa.BOOLEAN(),
        nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        'dns_measurements',
        'dnssec_ad_flag',
        existing_type=sa.BOOLEAN(),
        nullable=False
    )

    op.alter_column(
        'dns_measurements',
        'resolver_ip',
        existing_type=sa.VARCHAR(length=45),
        nullable=True
    )