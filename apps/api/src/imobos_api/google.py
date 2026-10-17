"""Google OAuth for integrations (Calendar). Server-side only: the tokens never leave the api."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx

from .config import Settings

TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

CALLBACK_PATH = "/api/integrations/google-calendar/callback"
# Read-only events of the broker's calendars, plus who she is (to show the connected account).
CALENDAR_SCOPES = ("openid", "email", "https://www.googleapis.com/auth/calendar.events.readonly")


class GoogleError(Exception):
    """A Google refusal, carrying only a short, token-free code for status and logs."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class Tokens:
    access_token: str
    refresh_token: str | None
    expires_at: datetime
    scope: str


def redirect_uri(settings: Settings) -> str:
    return settings.public_url + CALLBACK_PATH


def _tokens(payload: dict[str, object]) -> Tokens:
    expires_in = int(str(payload.get("expires_in", 3600)))
    refresh = payload.get("refresh_token")
    return Tokens(
        access_token=str(payload["access_token"]),
        refresh_token=str(refresh) if refresh else None,
        expires_at=datetime.now(UTC) + timedelta(seconds=expires_in - 60),
        scope=str(payload.get("scope", "")),
    )


def _post(client: httpx.Client, url: str, data: dict[str, str]) -> dict[str, object]:
    response = client.post(url, data=data, timeout=15)
    if response.status_code != 200:
        error = (
            response.json().get("error")
            if response.headers.get("content-type", "").startswith("application/json")
            else None
        )
        raise GoogleError(str(error or f"http_{response.status_code}"))
    result: dict[str, object] = response.json()
    return result


def exchange_code(
    client: httpx.Client, settings: Settings, *, code: str, code_verifier: str
) -> Tokens:
    payload = _post(
        client,
        TOKEN_URL,
        {
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": redirect_uri(settings),
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
        },
    )
    return _tokens(payload)


def refresh(client: httpx.Client, settings: Settings, refresh_token: str) -> Tokens:
    payload = _post(
        client,
        TOKEN_URL,
        {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
        },
    )
    return _tokens(payload)


def account_email(client: httpx.Client, access_token: str) -> str | None:
    response = client.get(
        USERINFO_URL, headers={"authorization": f"Bearer {access_token}"}, timeout=15
    )
    if response.status_code != 200:
        return None
    email = response.json().get("email")
    return str(email) if email else None


def probe_calendar(client: httpx.Client, access_token: str) -> None:
    """Proves the grant still works by reading at most one event id. Nothing is stored."""
    response = client.get(
        EVENTS_URL,
        params={"maxResults": "1", "fields": "items(id)"},
        headers={"authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    if response.status_code != 200:
        raise GoogleError(f"http_{response.status_code}")


@dataclass(frozen=True)
class Event:
    """What Hoje shows of a calendar event. Attendees and descriptions are never read."""

    id: str
    title: str
    start: datetime
    end: datetime | None
    all_day: bool
    location: str | None
    link: str | None


def _when(raw: object) -> tuple[datetime | None, bool]:
    if not isinstance(raw, dict):
        return None, False
    if "dateTime" in raw:
        return datetime.fromisoformat(str(raw["dateTime"])), False
    if "date" in raw:  # all-day: midnight UTC of that date is only used for ordering
        return datetime.fromisoformat(str(raw["date"])).replace(tzinfo=UTC), True
    return None, False


def list_events(
    client: httpx.Client, access_token: str, *, time_min: datetime, time_max: datetime
) -> list[Event]:
    """Events of the primary calendar overlapping [time_min, time_max), recurring ones expanded."""
    response = client.get(
        EVENTS_URL,
        params={
            "timeMin": time_min.isoformat(),
            "timeMax": time_max.isoformat(),
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": "50",
            "fields": "items(id,status,summary,start,end,location,htmlLink)",
        },
        headers={"authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    if response.status_code != 200:
        raise GoogleError(f"http_{response.status_code}")
    events = []
    for item in response.json().get("items", []):
        start, all_day = _when(item.get("start"))
        if start is None or item.get("status") == "cancelled":
            continue
        end, _ = _when(item.get("end"))
        events.append(
            Event(
                id=str(item.get("id", "")),
                title=str(item.get("summary") or "(sem título)"),
                start=start,
                end=end,
                all_day=all_day,
                location=item.get("location"),
                link=item.get("htmlLink"),
            )
        )
    return events


def revoke(client: httpx.Client, token: str) -> None:
    # Best effort: a token Google already forgot is a success for us.
    client.post(REVOKE_URL, data={"token": token}, timeout=15)
