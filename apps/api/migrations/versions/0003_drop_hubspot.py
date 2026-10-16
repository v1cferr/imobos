"""Drop the HubSpot provider: ImobOS is the broker's CRM (V1C-83 scope change, ADR 0010).

Revision ID: 0003
Revises: 0002
"""

from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade() -> None:
    # Never connected (it was on hold), so there is nothing to keep.
    op.execute("DELETE FROM connections WHERE provider = 'hubspot'")
    op.drop_constraint("connection_provider", "connections", type_="check")
    op.create_check_constraint(
        "connection_provider", "connections", "provider IN ('google_calendar')"
    )


def downgrade() -> None:
    op.drop_constraint("connection_provider", "connections", type_="check")
    op.create_check_constraint(
        "connection_provider", "connections", "provider IN ('google_calendar', 'hubspot')"
    )
