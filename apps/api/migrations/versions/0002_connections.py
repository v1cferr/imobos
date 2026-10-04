"""Connected accounts with encrypted tokens (V1C-85).

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade() -> None:
    op.create_table(
        "connections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "provider",
            sa.Enum(
                "google_calendar",
                "hubspot",
                name="connection_provider",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "connected",
                "error",
                name="connection_status",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("account", sa.String(320)),
        sa.Column("scopes", sa.String(1000), nullable=False),
        sa.Column("access_token_enc", sa.String(4000)),
        sa.Column("refresh_token_enc", sa.String(4000)),
        sa.Column("access_token_expires_at", sa.DateTime(timezone=True)),
        sa.Column("connected_by", sa.String(320), nullable=False),
        sa.Column(
            "connected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("last_checked_at", sa.DateTime(timezone=True)),
        sa.Column("last_error", sa.String(200)),
        sa.UniqueConstraint("provider", name="uq_connections_provider"),
    )


def downgrade() -> None:
    op.drop_table("connections")
