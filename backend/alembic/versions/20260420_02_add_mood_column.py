"""Add mood column to sessions table.

Revision ID: 20260420_02
Revises: 20260419_01
Create Date: 2026-04-20 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260420_02"
down_revision: Union[str, None] = "20260419_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("mood", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "mood")
