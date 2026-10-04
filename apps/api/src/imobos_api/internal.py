"""Routes for the web app only. Reached over the internal `app` network, never through Caddy, and
each call must carry INTERNAL_API_TOKEN."""

import hmac
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from . import users
from .config import Settings
from .db import get_session, get_settings
from .models import UserRole, UserStatus

SettingsDep = Annotated[Settings, Depends(get_settings)]
SessionDep = Annotated[Session, Depends(get_session)]


def require_internal_token(
    settings: SettingsDep, x_internal_token: Annotated[str | None, Header()] = None
) -> None:
    # Constant-time comparison: the token must not leak through response timing.
    expected = settings.internal_api_token.encode()
    if not x_internal_token or not hmac.compare_digest(x_internal_token.encode(), expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)


router = APIRouter(prefix="/internal", dependencies=[Depends(require_internal_token)])


class SignInRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    google_sub: str


class SignInResponse(BaseModel):
    outcome: users.SignInOutcome
    role: UserRole | None


class AccessResponse(BaseModel):
    status: UserStatus
    role: UserRole


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None
    status: UserStatus
    role: UserRole
    created_at: datetime
    decided_by: str | None
    protected: bool


class UserUpdate(BaseModel):
    actor: EmailStr
    status: UserStatus | None = None
    role: UserRole | None = None


@router.post("/users/sign-in")
def sign_in(body: SignInRequest, session: SessionDep, settings: SettingsDep) -> SignInResponse:
    result = users.sign_in(
        session, settings, email=body.email, name=body.name, google_sub=body.google_sub
    )
    return SignInResponse(outcome=result.outcome, role=result.role)


@router.get("/users/access")
def access(email: str, session: SessionDep, settings: SettingsDep) -> AccessResponse:
    found = users.access_of(session, settings, email)
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return AccessResponse(status=found[0], role=found[1])


@router.get("/users")
def list_users(session: SessionDep, settings: SettingsDep) -> list[UserOut]:
    return [
        UserOut(
            id=u.id,
            email=u.email,
            name=u.name,
            status=u.status,
            role=u.role,
            created_at=u.created_at,
            decided_by=u.decided_by,
            protected=u.email in settings.admin_emails,
        )
        for u in users.list_users(session)
    ]


@router.patch("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def update_user(
    user_id: uuid.UUID, body: UserUpdate, session: SessionDep, settings: SettingsDep
) -> None:
    try:
        users.update_user(
            session, settings, user_id, actor=body.actor, status=body.status, role=body.role
        )
    except users.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND) from e
    except users.ProtectedUserError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN) from e


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def reject(user_id: uuid.UUID, session: SessionDep, settings: SettingsDep) -> None:
    try:
        users.reject_pending(session, settings, user_id)
    except users.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND) from e
    except users.ProtectedUserError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN) from e
