import json

import httpx
import pytest
from conftest import GOOGLE_STATE, TOKEN_KEY
from fastapi.testclient import TestClient

from imobos_api.crypto import TokenCipher
from imobos_api.google import CALENDAR_SCOPES

TOKEN_URL = "oauth2.googleapis.com/token"
REVOKE_URL = "oauth2.googleapis.com/revoke"
USERINFO = "openidconnect.googleapis.com/v1/userinfo"
EVENTS = "www.googleapis.com/calendar/v3/calendars/primary/events"
ALL_SCOPES = " ".join(CALENDAR_SCOPES)


@pytest.fixture(autouse=True)
def fake_google() -> None:
    GOOGLE_STATE.clear()
    GOOGLE_STATE[TOKEN_URL] = lambda r: httpx.Response(
        200,
        json={
            "access_token": "ya29.ACCESS",
            "refresh_token": "1//REFRESH",
            "expires_in": 3599,
            "scope": ALL_SCOPES,
        },
    )
    GOOGLE_STATE[USERINFO] = lambda r: httpx.Response(200, json={"email": "corretora@example.com"})
    GOOGLE_STATE[EVENTS] = lambda r: httpx.Response(200, json={"items": []})


def connect(client: TestClient) -> httpx.Response:
    return client.post(
        "/internal/connections/google_calendar/exchange",
        json={"code": "4/CODE", "code_verifier": "verifier", "actor": "Admin@Example.com"},
    )


def calendar(client: TestClient) -> dict[str, object]:
    rows = client.get("/internal/connections").json()
    return next(r for r in rows if r["provider"] == "google_calendar")


def test_starts_disconnected_and_lists_every_provider(client: TestClient) -> None:
    rows = {r["provider"]: r for r in client.get("/internal/connections").json()}
    assert rows["google_calendar"]["status"] is None
    assert rows["google_calendar"]["available"] is True
    assert rows["hubspot"]["available"] is False  # on hold


def test_connect_exchanges_with_pkce_and_shows_the_account(client: TestClient) -> None:
    response = connect(client)
    assert response.status_code == 200
    assert response.json()["status"] == "connected"
    assert response.json()["account"] == "corretora@example.com"
    method, url, body = next(c for c in GOOGLE_STATE["calls"] if c[1] == TOKEN_URL)  # type: ignore[union-attr]
    assert "code_verifier=verifier" in body
    assert (
        "redirect_uri=https%3A%2F%2Fimobos.example%2Fapi%2Fintegrations%2Fgoogle-calendar%2Fcallback"
        in body
    )


def test_tokens_are_stored_encrypted_and_never_returned(client: TestClient) -> None:
    from imobos_api.db import get_session
    from imobos_api.main import app
    from imobos_api.models import Connection

    connect(client)
    payload = json.dumps(client.get("/internal/connections").json())
    assert "ya29" not in payload and "REFRESH" not in payload
    session = next(app.dependency_overrides[get_session]())
    row = session.query(Connection).one()
    assert "ya29" not in (row.access_token_enc or "")
    assert TokenCipher((TOKEN_KEY,)).decrypt(row.refresh_token_enc or "") == "1//REFRESH"


def test_a_consent_without_the_calendar_scope_is_refused_and_revoked(client: TestClient) -> None:
    GOOGLE_STATE[TOKEN_URL] = lambda r: httpx.Response(
        200,
        json={
            "access_token": "ya29.X",
            "refresh_token": "1//R",
            "expires_in": 3599,
            "scope": "openid email",
        },
    )
    response = connect(client)
    assert response.status_code == 400
    assert response.json()["detail"] == "scope_not_granted"
    assert any(c[1] == REVOKE_URL for c in GOOGLE_STATE["calls"])  # type: ignore[union-attr]
    assert calendar(client)["status"] is None


def test_a_rejected_code_reports_googles_error_code(client: TestClient) -> None:
    GOOGLE_STATE[TOKEN_URL] = lambda r: httpx.Response(400, json={"error": "invalid_grant"})
    response = connect(client)
    assert response.status_code == 400
    assert response.json()["detail"] == "invalid_grant"


def test_check_refreshes_an_expired_token_and_records_success(client: TestClient) -> None:
    connect(client)
    from imobos_api.db import get_session
    from imobos_api.main import app
    from imobos_api.models import Connection

    session = next(app.dependency_overrides[get_session]())
    row = session.query(Connection).one()
    row.access_token_expires_at = None
    session.commit()
    GOOGLE_STATE["calls"] = []
    result = client.post("/internal/connections/google_calendar/check").json()
    assert result["status"] == "connected"
    calls = [c[1] for c in GOOGLE_STATE["calls"]]  # type: ignore[union-attr]
    assert calls == [TOKEN_URL, EVENTS]


def test_check_marks_a_revoked_grant_as_error(client: TestClient) -> None:
    connect(client)
    GOOGLE_STATE[EVENTS] = lambda r: httpx.Response(401, json={})
    result = client.post("/internal/connections/google_calendar/check").json()
    assert result["status"] == "error"
    assert result["last_error"] == "http_401"


def test_disconnect_revokes_at_google_and_deletes_the_tokens(client: TestClient) -> None:
    connect(client)
    GOOGLE_STATE["calls"] = []
    assert client.delete("/internal/connections/google_calendar").status_code == 204
    revoke = next(c for c in GOOGLE_STATE["calls"] if c[1] == REVOKE_URL)  # type: ignore[union-attr]
    assert "token=1%2F%2FREFRESH" in revoke[2]
    assert calendar(client)["status"] is None


def test_checking_a_disconnected_provider_is_404(client: TestClient) -> None:
    assert client.post("/internal/connections/google_calendar/check").status_code == 404


def test_without_a_token_key_integrations_stay_off(client: TestClient, settings) -> None:  # type: ignore[no-untyped-def]
    from imobos_api.config import Settings
    from imobos_api.db import get_settings
    from imobos_api.main import app

    app.dependency_overrides[get_settings] = lambda: Settings(
        **{**settings.__dict__, "token_keys": ()}
    )
    assert connect(client).status_code == 409
    assert calendar(client)["available"] is False


def test_unknown_providers_are_rejected(client: TestClient) -> None:
    assert client.post("/internal/connections/dropbox/check").status_code == 422
