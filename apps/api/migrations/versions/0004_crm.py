"""The broker's CRM: clients, deals in two funnels, append-only history (V1C-109, ADR 0010).

Revision ID: 0004
Revises: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=True)


def _stamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("email", sa.String(320)),
        sa.Column(
            "source",
            _enum(
                "lead_source",
                "roleta",
                "whatsapp",
                "meta_lead_ads",
                "indicacao",
                "planilha",
                "manual",
                "outro",
            ),
            nullable=False,
        ),
        sa.Column("notes", sa.Text()),
        sa.Column("purpose", _enum("client_purpose", "buy", "rent")),
        sa.Column("budget_max", sa.Numeric(14, 2)),
        sa.Column("region", sa.String(200)),
        sa.Column("property_type", sa.String(60)),
        sa.Column("min_area_m2", sa.Integer()),
        sa.Column("bedrooms", sa.Integer()),
        sa.Column("parking", sa.Integer()),
        sa.Column("financing", sa.Boolean()),
        sa.Column("pets", sa.Boolean()),
        sa.Column("need", sa.Text()),
        sa.Column("created_by", sa.String(320), nullable=False),
        *_stamps(),
        sa.UniqueConstraint("phone", name="uq_clients_phone"),
    )
    op.create_table(
        "deals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "client_id", sa.Uuid(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("pipeline", _enum("deal_pipeline", "sales", "rental"), nullable=False),
        sa.Column(
            "stage",
            _enum(
                "deal_stage",
                "new",
                "qualifying",
                "visit_scheduled",
                "visited",
                "proposal",
                "won",
                "lost",
            ),
            nullable=False,
        ),
        sa.Column("property", sa.String(200)),
        sa.Column("value", sa.Numeric(14, 2)),
        sa.Column("next_action", sa.String(300)),
        sa.Column("next_action_due", sa.DateTime(timezone=True)),
        sa.Column("objections", sa.Text()),
        sa.Column("lost_reason", sa.String(300)),
        *_stamps(),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_deals_client_id", "deals", ["client_id"])
    op.create_index("ix_deals_next_action_due", "deals", ["next_action_due"])
    op.create_table(
        "activities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "client_id", sa.Uuid(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("deal_id", sa.Uuid(), sa.ForeignKey("deals.id", ondelete="CASCADE")),
        sa.Column(
            "kind",
            _enum(
                "activity_kind",
                "created",
                "updated",
                "deal_opened",
                "stage_changed",
                "next_action",
                "note",
                "call",
                "visit",
                "message",
            ),
            nullable=False,
        ),
        sa.Column("body", sa.Text()),
        sa.Column("data", sa.JSON()),
        sa.Column("actor", sa.String(320), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_activities_client_id", "activities", ["client_id"])
    op.create_index("ix_activities_occurred_at", "activities", ["occurred_at"])
    # The history is evidence: an entry can disappear with its client (LGPD erasure), never change.
    op.execute(
        """
        CREATE FUNCTION activities_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'activities are append-only';
        END $$;
        CREATE TRIGGER activities_no_update BEFORE UPDATE ON activities
          FOR EACH ROW EXECUTE FUNCTION activities_append_only();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER activities_no_update ON activities")
    op.execute("DROP FUNCTION activities_append_only()")
    op.drop_table("activities")
    op.drop_table("deals")
    op.drop_table("clients")
