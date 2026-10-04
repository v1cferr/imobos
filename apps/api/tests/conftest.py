from collections.abc import Iterator

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from imobos_api.config import Settings
from imobos_api.db import get_session, get_settings
from imobos_api.http import get_http_client
from imobos_api.main import app
from imobos_api.models import Base

TOKEN = "test-internal-token"

# Every outbound call goes to this fake Google; tests set its behaviour through GOOGLE_STATE.
GOOGLE_STATE: dict[str, object] = {}


def _fake_google(request: httpx.Request) -> httpx.Response:
    calls = GOOGLE_STATE.setdefault("calls", [])
    assert isinstance(calls, list)
    calls.append((request.method, request.url.host + request.url.path, request.content.decode()))
    handler = GOOGLE_STATE.get(request.url.host + request.url.path)
    if callable(handler):
        result = handler(request)
        assert isinstance(result, httpx.Response)
        return result
    return httpx.Response(200, json={})


FAKE_GOOGLE = httpx.MockTransport(_fake_google)
ADMIN = "admin@example.com"
# A fixed, valid Fernet key for tests only.
TOKEN_KEY = "a2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2s="


@pytest.fixture
def settings() -> Settings:
    return Settings(
        database_url="sqlite://",
        internal_api_token=TOKEN,
        admin_emails=frozenset({ADMIN}),
        signup_open=True,
        max_pending=3,
        public_url="https://imobos.example",
        token_keys=(TOKEN_KEY,),
        google_client_id="client-id",
        google_client_secret="client-secret",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    # Rules are tested on SQLite; migrations run against real PostgreSQL in compose and CI.
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def session() -> Iterator[Session]:
        with factory() as s:
            yield s

    app.dependency_overrides[get_session] = session
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_http_client] = lambda: httpx.Client(transport=FAKE_GOOGLE)
    with TestClient(app, headers={"X-Internal-Token": TOKEN}) as c:
        yield c
    app.dependency_overrides.clear()
