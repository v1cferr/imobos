"""Connected accounts (ADR 0008): connect, check, disconnect. Tokens are decrypted only here, for
the duration of one call, and never logged or returned."""

import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import google
from .config import Settings
from .crypto import TokenCipher
from .models import Connection, ConnectionStatus, Provider

log = logging.getLogger("imobos.connections")


class NotConfiguredError(Exception):
    """The provider's OAuth client or the token key is missing on this host."""


def configured(settings: Settings, provider: Provider) -> bool:
    if not settings.token_keys:
        return False
    if provider is Provider.GOOGLE_CALENDAR:
        return bool(settings.google_client_id and settings.google_client_secret)
    return False  # HubSpot: on hold (V1C-85), no client yet.


def _get(session: Session, provider: Provider) -> Connection | None:
    return session.scalar(select(Connection).where(Connection.provider == provider))


def list_connections(session: Session) -> dict[Provider, Connection]:
    return {c.provider: c for c in session.scalars(select(Connection))}


def connect_google_calendar(
    session: Session,
    settings: Settings,
    client: httpx.Client,
    *,
    code: str,
    code_verifier: str,
    actor: str,
) -> Connection:
    if not configured(settings, Provider.GOOGLE_CALENDAR):
        raise NotConfiguredError
    cipher = TokenCipher(settings.token_keys)
    tokens = google.exchange_code(client, settings, code=code, code_verifier=code_verifier)
    granted = set(tokens.scope.split())
    if google.CALENDAR_SCOPES[-1] not in granted:
        # The consent screen lets the user untick a scope; without Calendar there is nothing to do.
        google.revoke(client, tokens.access_token)
        raise google.GoogleError("scope_not_granted")
    if not tokens.refresh_token:
        raise google.GoogleError("no_refresh_token")

    conn = _get(session, Provider.GOOGLE_CALENDAR) or Connection(provider=Provider.GOOGLE_CALENDAR)
    conn.status = ConnectionStatus.CONNECTED
    conn.account = google.account_email(client, tokens.access_token)
    conn.scopes = tokens.scope
    conn.access_token_enc = cipher.encrypt(tokens.access_token)
    conn.refresh_token_enc = cipher.encrypt(tokens.refresh_token)
    conn.access_token_expires_at = tokens.expires_at
    conn.connected_by = actor.strip().lower()
    conn.connected_at = datetime.now(UTC)
    conn.last_checked_at = datetime.now(UTC)
    conn.last_error = None
    session.add(conn)
    session.commit()
    log.info("connection.connected provider=google_calendar")
    return conn


def _fresh_access_token(
    conn: Connection, cipher: TokenCipher, settings: Settings, client: httpx.Client
) -> str:
    expires = conn.access_token_expires_at
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if conn.access_token_enc and expires and expires > datetime.now(UTC):
        return cipher.decrypt(conn.access_token_enc)
    if not conn.refresh_token_enc:
        raise google.GoogleError("no_refresh_token")
    tokens = google.refresh(client, settings, cipher.decrypt(conn.refresh_token_enc))
    conn.access_token_enc = cipher.encrypt(tokens.access_token)
    conn.access_token_expires_at = tokens.expires_at
    if tokens.refresh_token:  # Google may rotate it
        conn.refresh_token_enc = cipher.encrypt(tokens.refresh_token)
    return tokens.access_token


def check(
    session: Session, settings: Settings, client: httpx.Client, provider: Provider
) -> Connection | None:
    """Refreshes if needed and probes the provider; records the outcome either way."""
    conn = _get(session, provider)
    if conn is None:
        return None
    if not configured(settings, provider):
        raise NotConfiguredError
    cipher = TokenCipher(settings.token_keys)
    try:
        token = _fresh_access_token(conn, cipher, settings, client)
        google.probe_calendar(client, token)
        conn.status, conn.last_error = ConnectionStatus.CONNECTED, None
    except google.GoogleError as e:
        conn.status, conn.last_error = ConnectionStatus.ERROR, e.code
        log.warning("connection.check_failed provider=%s error=%s", provider.value, e.code)
    conn.last_checked_at = datetime.now(UTC)
    session.commit()
    return conn


def disconnect(
    session: Session, settings: Settings, client: httpx.Client, provider: Provider
) -> None:
    """Revokes at the provider (so the grant disappears from the user's Google account too), then
    deletes the row: no token outlives a disconnection."""
    conn = _get(session, provider)
    if conn is None:
        return
    if settings.token_keys and conn.refresh_token_enc:
        try:
            google.revoke(client, TokenCipher(settings.token_keys).decrypt(conn.refresh_token_enc))
        except Exception:  # noqa: BLE001 - revocation is best effort; deletion must still happen
            log.warning("connection.revoke_failed provider=%s", provider.value)
    session.delete(conn)
    session.commit()
    log.info("connection.disconnected provider=%s", provider.value)
