from datetime import UTC, datetime

from fastapi.testclient import TestClient

ACTOR = "corretora@example.com"


def test_templates_can_be_created_edited_and_removed(client: TestClient) -> None:
    created = client.post("/internal/crm/templates", json={"title": "Oi", "body": "Oi, {nome}!"})
    assert created.status_code == 201
    tid = created.json()["id"]
    edited = client.put(f"/internal/crm/templates/{tid}", json={"title": "Olá", "body": "Olá!"})
    assert edited.json()["title"] == "Olá"
    assert [t["title"] for t in client.get("/internal/crm/templates").json()] == ["Olá"]
    assert client.delete(f"/internal/crm/templates/{tid}").status_code == 204
    assert client.get("/internal/crm/templates").json() == []
    gone = client.put(f"/internal/crm/templates/{tid}", json={"title": "x", "body": "y"})
    assert gone.status_code == 404


def test_new_templates_go_to_the_end(client: TestClient) -> None:
    for title in ("A", "B", "C"):
        client.post("/internal/crm/templates", json={"title": title, "body": "x"})
    assert [t["title"] for t in client.get("/internal/crm/templates").json()] == ["A", "B", "C"]


def test_a_sent_message_enters_the_history_and_counts_as_contact(client: TestClient) -> None:
    c = client.post(
        "/internal/crm/clients", json={"name": "Ana Souza", "actor": ACTOR, "pipeline": "sales"}
    ).json()
    detail = client.post(
        f"/internal/crm/clients/{c['id']}/messages",
        json={"actor": ACTOR, "body": "Oi, Ana!", "template": "Primeiro contato"},
    ).json()
    sent = detail["activities"][0]
    assert sent["kind"] == "message" and sent["body"] == "Oi, Ana!"
    assert sent["data"] == {"channel": "whatsapp_link", "template": "Primeiro contato"}
    # No longer a lead nobody talked to.
    now = datetime.now(UTC).isoformat()
    items = client.get("/internal/crm/today", params={"now": now}).json()["items"]
    assert [i["reason"] for i in items] == ["no_next_action"]
