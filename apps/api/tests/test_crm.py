import uuid

from fastapi.testclient import TestClient

from imobos_api.crm import normalize_phone

ACTOR = "corretora@example.com"


def create(client: TestClient, **fields: object) -> dict[str, object]:
    body = {"name": "Ana Souza", "actor": ACTOR, **fields}
    response = client.post("/internal/crm/clients", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def kinds(detail: dict[str, object]) -> list[str]:
    activities = detail["activities"]
    assert isinstance(activities, list)
    return [a["kind"] for a in activities]


def test_phone_is_normalized_to_e164() -> None:
    assert normalize_phone("(11) 98765-4321") == "+5511987654321"
    assert normalize_phone("+55 11 98765 4321") == "+5511987654321"
    assert normalize_phone("  ") is None


def test_quick_add_creates_client_deal_and_history(client: TestClient) -> None:
    detail = create(
        client, phone="11 98765-4321", source="roleta", pipeline="sales", property="Caminhos"
    )
    assert detail["phone"] == "+5511987654321"
    assert detail["source"] == "roleta"
    deals = detail["deals"]
    assert isinstance(deals, list)
    assert deals[0]["pipeline"] == "sales" and deals[0]["stage"] == "new"
    assert deals[0]["property"] == "Caminhos"
    # Newest first: the deal was opened right after the client was created.
    assert kinds(detail) == ["deal_opened", "created"]
    assert detail["activities"][0]["actor"] == ACTOR  # type: ignore[index]


def test_source_defaults_to_manual(client: TestClient) -> None:
    assert create(client)["source"] == "manual"


def test_duplicate_phone_points_to_the_existing_client(client: TestClient) -> None:
    first = create(client, phone="11987654321")
    response = client.post(
        "/internal/crm/clients", json={"name": "Outra", "actor": ACTOR, "phone": "+5511987654321"}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == {"code": "duplicate_phone", "client_id": first["id"]}


def test_invalid_phone_is_refused(client: TestClient) -> None:
    response = client.post(
        "/internal/crm/clients", json={"name": "X", "actor": ACTOR, "phone": "12"}
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "invalid_phone"


def test_update_records_which_fields_changed_and_null_clears(client: TestClient) -> None:
    c = create(client, region="Lapa", bedrooms=2)
    response = client.patch(
        f"/internal/crm/clients/{c['id']}",
        json={"actor": ACTOR, "bedrooms": 3, "region": None, "pets": True},
    )
    detail = response.json()
    assert detail["bedrooms"] == 3 and detail["region"] is None and detail["pets"] is True
    assert detail["activities"][0]["kind"] == "updated"
    assert detail["activities"][0]["data"] == {"fields": ["bedrooms", "pets", "region"]}
    # Sending the same values again changes nothing and logs nothing.
    again = client.patch(f"/internal/crm/clients/{c['id']}", json={"actor": ACTOR, "bedrooms": 3})
    assert kinds(again.json()) == kinds(detail)


def test_name_cannot_be_cleared(client: TestClient) -> None:
    c = create(client)
    response = client.patch(f"/internal/crm/clients/{c['id']}", json={"actor": ACTOR, "name": None})
    assert response.status_code == 422


def test_stage_and_next_action_are_logged_and_won_closes(client: TestClient) -> None:
    c = create(client, pipeline="rental")
    deal_id = c["deals"][0]["id"]  # type: ignore[index]
    detail = client.patch(
        f"/internal/crm/deals/{deal_id}",
        json={
            "actor": ACTOR,
            "stage": "visit_scheduled",
            "next_action": "Visita no apto da Rua X",
            "next_action_due": "2026-10-20T14:00:00-03:00",
        },
    ).json()
    assert kinds(detail)[:2] == ["next_action", "stage_changed"]
    stage = detail["activities"][1]
    assert stage["data"] == {"from": "new", "to": "visit_scheduled"}
    assert detail["activities"][0]["body"] == "Visita no apto da Rua X"
    won = client.patch(f"/internal/crm/deals/{deal_id}", json={"actor": ACTOR, "stage": "won"})
    assert won.json()["deals"][0]["closed_at"] is not None


def test_one_open_deal_per_funnel(client: TestClient) -> None:
    c = create(client, pipeline="sales")
    url = f"/internal/crm/clients/{c['id']}/deals"
    assert client.post(url, json={"actor": ACTOR, "pipeline": "sales"}).status_code == 409
    # A rental at the same time is fine: she works both lines.
    assert client.post(url, json={"actor": ACTOR, "pipeline": "rental"}).status_code == 201
    deal_id = c["deals"][0]["id"]  # type: ignore[index]
    client.patch(f"/internal/crm/deals/{deal_id}", json={"actor": ACTOR, "stage": "lost"})
    assert client.post(url, json={"actor": ACTOR, "pipeline": "sales"}).status_code == 201


def test_manual_activities_only_note_call_visit(client: TestClient) -> None:
    c = create(client)
    url = f"/internal/crm/clients/{c['id']}/activities"
    ok = client.post(url, json={"actor": ACTOR, "kind": "visit", "body": "Gostou da varanda"})
    assert ok.status_code == 201
    assert ok.json()["activities"][0]["body"] == "Gostou da varanda"
    forged = client.post(url, json={"actor": ACTOR, "kind": "stage_changed", "body": "x"})
    assert forged.status_code == 422


def test_list_searches_and_filters(client: TestClient) -> None:
    create(client, name="Bruno Lima", phone="11 91234-5678", pipeline="sales")
    create(client, name="Carla Dias", pipeline="rental")
    names = lambda r: [c["name"] for c in r.json()]  # noqa: E731
    assert names(client.get("/internal/crm/clients", params={"q": "bruno"})) == ["Bruno Lima"]
    assert names(client.get("/internal/crm/clients", params={"q": "1234-5678"})) == ["Bruno Lima"]
    assert names(client.get("/internal/crm/clients", params={"pipeline": "rental"})) == [
        "Carla Dias"
    ]
    rows = client.get("/internal/crm/clients").json()
    assert all(r["last_activity_at"] for r in rows)
    assert all(len(r["open_deals"]) == 1 for r in rows)


def test_board_lists_one_funnel_with_client_names(client: TestClient) -> None:
    create(client, name="Bruno", pipeline="sales")
    create(client, name="Carla", pipeline="rental")
    board = client.get("/internal/crm/deals", params={"pipeline": "sales"}).json()
    assert [d["client_name"] for d in board] == ["Bruno"]


def test_delete_erases_client_with_deals_and_history(client: TestClient) -> None:
    c = create(client, pipeline="sales")
    assert client.delete(f"/internal/crm/clients/{c['id']}").status_code == 204
    assert client.get(f"/internal/crm/clients/{c['id']}").status_code == 404
    assert client.delete(f"/internal/crm/clients/{uuid.uuid4()}").status_code == 404


def test_requires_the_internal_token(client: TestClient) -> None:
    response = client.get("/internal/crm/clients", headers={"X-Internal-Token": "wrong"})
    assert response.status_code == 401
