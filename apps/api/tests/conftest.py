from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from imobos_api.config import Settings
from imobos_api.db import get_session, get_settings
from imobos_api.main import app
from imobos_api.models import Base

TOKEN = "test-internal-token"
ADMIN = "admin@example.com"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        database_url="sqlite://",
        internal_api_token=TOKEN,
        admin_emails=frozenset({ADMIN}),
        signup_open=True,
        max_pending=3,
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
    with TestClient(app, headers={"X-Internal-Token": TOKEN}) as c:
        yield c
    app.dependency_overrides.clear()
