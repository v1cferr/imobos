"""ImobOS tables: who may use it (users), what it may reach (connections) and the broker's CRM
(clients, deals, activities; ADR 0010)."""

import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserStatus(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    DISABLED = "disabled"


class UserRole(enum.StrEnum):
    ADMIN = "admin"
    USER = "user"


def _enum(kind: type[enum.StrEnum], name: str) -> Enum:
    # VARCHAR + CHECK instead of a native Postgres enum: adding a value later is a plain migration.
    return Enum(
        kind,
        name=name,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda k: [m.value for m in k],
    )


class Provider(enum.StrEnum):
    GOOGLE_CALENDAR = "google_calendar"


class ConnectionStatus(enum.StrEnum):
    CONNECTED = "connected"
    ERROR = "error"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[UserStatus] = mapped_column(_enum(UserStatus, "user_status"))
    role: Mapped[UserRole] = mapped_column(_enum(UserRole, "user_role"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    # Email of the admin who last approved, disabled or re-roled this user.
    decided_by: Mapped[str | None] = mapped_column(String(320))


class Connection(Base):
    """A service ImobOS may reach on the broker's behalf (ADR 0008). One per provider: the workspace
    is single-tenant. Tokens are stored only as Fernet ciphertext; no row means disconnected."""

    __tablename__ = "connections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    provider: Mapped[Provider] = mapped_column(_enum(Provider, "connection_provider"), unique=True)
    status: Mapped[ConnectionStatus] = mapped_column(_enum(ConnectionStatus, "connection_status"))
    # Which external account was connected, for the screen ("conta: maria@gmail.com").
    account: Mapped[str | None] = mapped_column(String(320))
    scopes: Mapped[str] = mapped_column(String(1000))
    access_token_enc: Mapped[str | None] = mapped_column(String(4000))
    refresh_token_enc: Mapped[str | None] = mapped_column(String(4000))
    access_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    connected_by: Mapped[str] = mapped_column(String(320))
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # A short, token-free reason ("invalid_grant", "http_403"), shown to the user and the dashboard.
    last_error: Mapped[str | None] = mapped_column(String(200))


# --- CRM (ADR 0010) ---


class LeadSource(enum.StrEnum):
    ROLETA = "roleta"  # the construtora's lead roulette
    WHATSAPP = "whatsapp"
    META_LEAD_ADS = "meta_lead_ads"
    INDICACAO = "indicacao"
    PLANILHA = "planilha"
    MANUAL = "manual"
    OUTRO = "outro"


class Purpose(enum.StrEnum):
    BUY = "buy"
    RENT = "rent"


class Pipeline(enum.StrEnum):
    SALES = "sales"  # sales for the construtora
    RENTAL = "rental"  # rentals on QuintoAndar


class Stage(enum.StrEnum):
    """One list for both funnels; the screen names them per funnel (a won rental is a contract)."""

    NEW = "new"
    QUALIFYING = "qualifying"
    VISIT_SCHEDULED = "visit_scheduled"
    VISITED = "visited"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"


class ActivityKind(enum.StrEnum):
    CREATED = "created"
    UPDATED = "updated"  # client fields changed; data lists which
    DEAL_OPENED = "deal_opened"
    STAGE_CHANGED = "stage_changed"
    NEXT_ACTION = "next_action"
    NOTE = "note"
    CALL = "call"
    VISIT = "visit"
    MESSAGE = "message"


class Client(Base):
    """A person the broker serves. Single-tenant: every client is hers."""

    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    # E.164 (+5511987654321): the key that links Chatwoot conversations later (V1C-112).
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    email: Mapped[str | None] = mapped_column(String(320))
    source: Mapped[LeadSource] = mapped_column(_enum(LeadSource, "lead_source"))
    notes: Mapped[str | None] = mapped_column(Text)
    # What the client wants: the questions she asks every buyer or tenant.
    purpose: Mapped[Purpose | None] = mapped_column(_enum(Purpose, "client_purpose"))
    budget_max: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    region: Mapped[str | None] = mapped_column(String(200))
    property_type: Mapped[str | None] = mapped_column(String(60))
    min_area_m2: Mapped[int | None] = mapped_column(Integer)
    bedrooms: Mapped[int | None] = mapped_column(Integer)
    parking: Mapped[int | None] = mapped_column(Integer)
    financing: Mapped[bool | None] = mapped_column(Boolean)
    pets: Mapped[bool | None] = mapped_column(Boolean)
    need: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(320))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    deals: Mapped[list["Deal"]] = relationship(
        back_populates="client", cascade="all, delete-orphan", order_by="Deal.created_at"
    )
    activities: Mapped[list["Activity"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="Activity.occurred_at.desc()",
    )


class Deal(Base):
    """A client in one funnel. A client may have a sale and a rental at the same time."""

    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    pipeline: Mapped[Pipeline] = mapped_column(_enum(Pipeline, "deal_pipeline"))
    stage: Mapped[Stage] = mapped_column(_enum(Stage, "deal_stage"))
    # Development (sales) or listing (rentals) the deal is about, as she names it.
    property: Mapped[str | None] = mapped_column(String(200))
    value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    next_action: Mapped[str | None] = mapped_column(String(300))
    next_action_due: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    objections: Mapped[str | None] = mapped_column(Text)
    lost_reason: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    client: Mapped[Client] = relationship(back_populates="deals")


class Activity(Base):
    """Append-only history. The server stamps the time; PostgreSQL refuses updates (migration
    0004), so the history can serve as evidence of who served the client and when."""

    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    # CASCADE, not SET NULL: updates are refused, and deals are never deleted on their own.
    deal_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"))
    kind: Mapped[ActivityKind] = mapped_column(_enum(ActivityKind, "activity_kind"))
    body: Mapped[str | None] = mapped_column(Text)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    actor: Mapped[str] = mapped_column(String(320))
    # Stamped by the API with the wall clock, not the database's transaction time, so several
    # entries written in one request keep their order.
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )

    client: Mapped[Client] = relationship(back_populates="activities")
