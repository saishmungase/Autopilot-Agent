"""Add intake_leads table; reps/sales_agents/clients already exist

Revision ID: d1e2f3g4h5i6
Revises: c3d4e5f6g7h8
Create Date: 2026-05-16 12:00:00.000000

Context
-------
The shared Aiven DB already contains a "leads" table belonging to a different
project (AI call-center). We must NOT touch it.

This migration creates "intake_leads" for this project's lead-intake flow.
"reps", "sales_agents", and "clients" were already created by a prior
create_all() call and are confirmed present — we skip them here.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON
from alembic import op

revision: str = "d1e2f3g4h5i6"
down_revision: Union[str, None] = "c3d4e5f6g7h8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table_name: str) -> bool:
    return conn.execute(sa.text(
        "SELECT EXISTS ("
        "  SELECT 1 FROM information_schema.tables"
        "  WHERE table_schema = 'public' AND table_name = :t"
        ")"
    ), {"t": table_name}).scalar()


def _index_exists(conn, index_name: str) -> bool:
    return conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = :i)"
    ), {"i": index_name}).scalar()


def upgrade() -> None:
    conn = op.get_bind()

    # ------------------------------------------------------------------
    # intake_leads — our project's lead table (NOT the existing "leads")
    # ------------------------------------------------------------------
    if not _table_exists(conn, "intake_leads"):
        op.create_table(
            "intake_leads",
            sa.Column(
                "lead_id",
                UUID(as_uuid=True),
                nullable=False,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column("policy_type", sa.String(), nullable=False),
            sa.Column("contact", JSON(), nullable=False),
            sa.Column("lead_score", sa.Float(), nullable=True),
            sa.Column(
                "assigned_rep_id",
                sa.Integer(),
                sa.ForeignKey("reps.id"),
                nullable=True,
            ),
            sa.Column("status", sa.String(), nullable=True, server_default="new"),
            sa.Column("transcript", sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint("lead_id"),
        )

    if not _index_exists(conn, "ix_intake_leads_policy_type"):
        op.create_index(
            "ix_intake_leads_policy_type", "intake_leads", ["policy_type"], unique=False
        )

    # reps, sales_agents, clients already exist — nothing to do for them.


def downgrade() -> None:
    conn = op.get_bind()
    if _index_exists(conn, "ix_intake_leads_policy_type"):
        op.drop_index("ix_intake_leads_policy_type", table_name="intake_leads")
    if _table_exists(conn, "intake_leads"):
        op.drop_table("intake_leads")
