"""Access rules: who becomes pending, who is let in, who may change whom."""

import uuid
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import Settings
from .models import User, UserRole, UserStatus

SignInOutcome = Literal["approved", "pending", "disabled", "closed", "full", "conflict"]


@dataclass(frozen=True)
class SignInResult:
    outcome: SignInOutcome
    role: UserRole | None = None


class ProtectedUserError(Exception):
    """Bootstrap admins come from the environment and cannot be changed from the screen."""


class NotFoundError(Exception):
    pass


def normalize(email: str) -> str:
    return email.strip().lower()


def _by_email(session: Session, email: str) -> User | None:
    return session.scalar(select(User).where(User.email == email))


def sign_in(
    session: Session, settings: Settings, *, email: str, name: str | None, google_sub: str
) -> SignInResult:
    """Called after Google verified the address. Never trusts anything but the verified identity."""
    email = normalize(email)
    user = _by_email(session, email)

    # Google's `sub` is the stable account id. The same email with another sub is a different
    # (for example recycled) account and must not inherit this access.
    if user and user.google_sub and user.google_sub != google_sub:
        return SignInResult("conflict")

    if email in settings.admin_emails:
        if user is None:
            user = User(email=email, status=UserStatus.APPROVED, role=UserRole.ADMIN)
            session.add(user)
        user.status, user.role = UserStatus.APPROVED, UserRole.ADMIN
    elif user is None:
        if not settings.signup_open:
            return SignInResult("closed")
        pending = session.scalar(
            select(func.count()).select_from(User).where(User.status == UserStatus.PENDING)
        )
        if (pending or 0) >= settings.max_pending:
            return SignInResult("full")
        user = User(email=email, status=UserStatus.PENDING, role=UserRole.USER)
        session.add(user)

    user.name = name
    user.google_sub = google_sub
    session.commit()
    return SignInResult(user.status.value, user.role)


def access_of(
    session: Session, settings: Settings, email: str
) -> tuple[UserStatus, UserRole] | None:
    """What this email may do right now. Bootstrap admins are always approved admins."""
    email = normalize(email)
    if email in settings.admin_emails:
        return UserStatus.APPROVED, UserRole.ADMIN
    user = _by_email(session, email)
    return (user.status, user.role) if user else None


def list_users(session: Session) -> list[User]:
    return list(session.scalars(select(User).order_by(User.status, User.created_at)))


def update_user(
    session: Session,
    settings: Settings,
    user_id: uuid.UUID,
    *,
    actor: str,
    status: UserStatus | None = None,
    role: UserRole | None = None,
) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError
    if user.email in settings.admin_emails:
        raise ProtectedUserError
    if status is not None:
        user.status = status
    if role is not None:
        user.role = role
    user.decided_by = normalize(actor)
    session.commit()
    return user


def reject_pending(session: Session, settings: Settings, user_id: uuid.UUID) -> None:
    """A refused request leaves nothing behind (LGPD: no data without a purpose)."""
    user = session.get(User, user_id)
    if user is None or user.status != UserStatus.PENDING:
        raise NotFoundError
    if user.email in settings.admin_emails:
        raise ProtectedUserError
    session.delete(user)
    session.commit()
