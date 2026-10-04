from conftest import ADMIN
from fastapi.testclient import TestClient

from imobos_api.config import Settings


def sign_in(client: TestClient, email: str, sub: str = "", name: str = "Ana") -> dict[str, str]:
    body = {"email": email, "name": name, "google_sub": sub or f"sub-{email}"}
    response = client.post("/internal/users/sign-in", json=body)
    assert response.status_code == 200
    return response.json()


def user_id(client: TestClient, email: str) -> str:
    return next(u["id"] for u in client.get("/internal/users").json() if u["email"] == email)


def test_internal_routes_refuse_a_missing_or_wrong_token(client: TestClient) -> None:
    assert client.get("/internal/users", headers={"X-Internal-Token": ""}).status_code == 401
    assert client.get("/internal/users", headers={"X-Internal-Token": "wrong"}).status_code == 401


def test_health_stays_public(client: TestClient) -> None:
    assert client.get("/healthz", headers={"X-Internal-Token": ""}).status_code == 200


def test_an_unknown_account_becomes_a_pending_request(client: TestClient) -> None:
    # Same Google account (same sub), email typed with different case: still one request.
    assert sign_in(client, "Ana@Example.com", sub="g-1") == {"outcome": "pending", "role": "user"}
    assert sign_in(client, "ana@example.com", sub="g-1") == {"outcome": "pending", "role": "user"}
    access = client.get("/internal/users/access", params={"email": "ana@example.com"}).json()
    assert access == {"status": "pending", "role": "user"}


def test_a_bootstrap_admin_is_always_an_approved_admin(client: TestClient) -> None:
    assert sign_in(client, ADMIN) == {"outcome": "approved", "role": "admin"}
    access = client.get("/internal/users/access", params={"email": ADMIN.upper()}).json()
    assert access == {"status": "approved", "role": "admin"}


def test_approval_lets_the_user_in_with_the_chosen_role(client: TestClient) -> None:
    sign_in(client, "ana@example.com")
    uid = user_id(client, "ana@example.com")
    response = client.patch(f"/internal/users/{uid}", json={"actor": ADMIN, "status": "approved"})
    assert response.status_code == 204
    assert sign_in(client, "ana@example.com") == {"outcome": "approved", "role": "user"}
    row = next(u for u in client.get("/internal/users").json() if u["id"] == uid)
    assert row["decided_by"] == ADMIN


def test_a_disabled_user_is_refused(client: TestClient) -> None:
    sign_in(client, "ana@example.com")
    uid = user_id(client, "ana@example.com")
    client.patch(f"/internal/users/{uid}", json={"actor": ADMIN, "status": "disabled"})
    assert sign_in(client, "ana@example.com")["outcome"] == "disabled"


def test_closed_sign_up_creates_nothing(client: TestClient, settings: Settings) -> None:
    from imobos_api.db import get_settings
    from imobos_api.main import app

    closed = Settings(**{**settings.__dict__, "signup_open": False})
    app.dependency_overrides[get_settings] = lambda: closed
    assert sign_in(client, "ana@example.com")["outcome"] == "closed"
    assert client.get("/internal/users").json() == []


def test_the_pending_queue_is_capped(client: TestClient) -> None:
    for n in range(3):
        assert sign_in(client, f"p{n}@example.com")["outcome"] == "pending"
    assert sign_in(client, "p3@example.com")["outcome"] == "full"
    assert len(client.get("/internal/users").json()) == 3


def test_same_email_with_another_google_account_is_a_conflict(client: TestClient) -> None:
    sign_in(client, "ana@example.com", sub="original")
    assert sign_in(client, "ana@example.com", sub="recycled")["outcome"] == "conflict"


def test_bootstrap_admins_cannot_be_changed_or_rejected(client: TestClient) -> None:
    sign_in(client, ADMIN)
    uid = user_id(client, ADMIN)
    patch = client.patch(f"/internal/users/{uid}", json={"actor": ADMIN, "status": "disabled"})
    assert patch.status_code == 403
    assert client.delete(f"/internal/users/{uid}").status_code in (403, 404)
    assert next(u for u in client.get("/internal/users").json() if u["id"] == uid)["protected"]


def test_rejecting_a_request_deletes_it(client: TestClient) -> None:
    sign_in(client, "ana@example.com")
    uid = user_id(client, "ana@example.com")
    assert client.delete(f"/internal/users/{uid}").status_code == 204
    assert (
        client.get("/internal/users/access", params={"email": "ana@example.com"}).status_code == 404
    )


def test_only_pending_requests_can_be_rejected(client: TestClient) -> None:
    sign_in(client, "ana@example.com")
    uid = user_id(client, "ana@example.com")
    client.patch(f"/internal/users/{uid}", json={"actor": ADMIN, "status": "approved"})
    assert client.delete(f"/internal/users/{uid}").status_code == 404


def test_unknown_user_ids_answer_404(client: TestClient) -> None:
    missing = "00000000-0000-0000-0000-000000000000"
    assert client.patch(f"/internal/users/{missing}", json={"actor": ADMIN}).status_code == 404
