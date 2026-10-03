from fastapi.testclient import TestClient

from imobos_api.main import app


def test_healthz_reports_ok() -> None:
    response = TestClient(app).get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
