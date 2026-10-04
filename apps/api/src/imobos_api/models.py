"""Who may use ImobOS. Only what identifies a person and their access: no photo, no profile."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
