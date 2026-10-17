from datetime import UTC, datetime, timedelta

import httpx
import pytest
from conftest import GOOGLE_STATE
from fastapi.testclient import TestClient
from test_connections import EVENTS, connect, fake_google  # noqa: F401 - fixture reused

ACTOR = "corretora@example.com"
# 17/10/2026 at 10:00 in São Paulo.
NOW = datetime(2026, 10, 17, 13, 0, tzinfo=UTC)


def new_client(client: TestClient, name: str, **fields: object) -> dict[str, object]:
    body = {"name": name, "actor": ACTOR, "pipeline": "sales", **fields}
    response = client.post("/internal/crm/clients", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def deal_of(c: dict[str, object]) -> str:
    return str(c["deals"][0]["id"])  # type: ignore[index]


def set_due(client: TestClient, deal_id: str, due: datetime | None, action: str = "Ligar") -> None:
    body = {"actor": ACTOR, "next_action": action, "next_action_due": due and due.isoformat()}
    assert client.patch(f"/internal/crm/deals/{deal_id}", json=body).status_code == 200


def today(client: TestClient) -> dict[str, object]:
    response = client.get("/internal/crm/today", params={"now": NOW.isoformat()})
    assert response.status_code == 200, response.text
    return response.json()


def reasons(body: dict[str, object]) -> list[tuple[str, str]]:
    items = body["items"]
    assert isinstance(items, list)
    return [(i["reason"], i["deal"]["client_name"]) for i in items]


def test_lists_what_needs_her_most_urgent_first(client: TestClient) -> None:
    late = new_client(client, "Atrasado Silva")
    set_due(client, deal_of(late), NOW - timedelta(days=1))
    later_today = new_client(client, "Hoje Tarde")
    set_due(client, deal_of(later_today), NOW + timedelta(hours=5))
    tomorrow = new_client(client, "Amanha Souza")
    set_due(client, deal_of(tomorrow), NOW + timedelta(days=1))
    new_client(client, "Lead Novo")
    talked = new_client(client, "Sem Proxima")
    client.post(
        f"/internal/crm/clients/{talked['id']}/activities",
        json={"actor": ACTOR, "kind": "call", "body": "Conversamos"},
    )
    closed = new_client(client, "Fechado Lima")
    client.patch(f"/internal/crm/deals/{deal_of(closed)}", json={"actor": ACTOR, "stage": "won"})

    assert reasons(today(client)) == [
        ("overdue", "Atrasado Silva"),
        ("due_today", "Hoje Tarde"),
        ("new_lead", "Lead Novo"),
        ("no_next_action", "Sem Proxima"),
    ]


def test_done_records_the_action_and_clears_it(client: TestClient) -> None:
    c = new_client(client, "Ana Souza")
    set_due(client, deal_of(c), NOW - timedelta(hours=1), action="Mandar tabela")
    detail = client.post(f"/internal/crm/deals/{deal_of(c)}/done", json={"actor": ACTOR}).json()
    assert detail["deals"][0]["next_action"] is None
    assert detail["deals"][0]["next_action_due"] is None
    done = detail["activities"][0]
    assert done["kind"] == "next_action" and done["body"] == "Mandar tabela"
    assert done["data"]["done"] is True
    assert reasons(today(client)) == [("no_next_action", "Ana Souza")]


def test_calendar_not_connected_is_not_an_error(client: TestClient) -> None:
    body = today(client)
    assert body["calendar"] == "not_connected" and body["events"] == []


def test_calendar_events_of_today_are_matched_to_clients(client: TestClient) -> None:
    connect(client)
    new_client(client, "João Silva")
    calls: list[httpx.Request] = []

    def events(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(
            200,
            json={
                "items": [
                    {
                        "id": "1",
                        "summary": "Visita joao silva - Lapa",
                        "start": {"dateTime": "2026-10-17T15:00:00-03:00"},
                        "end": {"dateTime": "2026-10-17T16:00:00-03:00"},
                        "location": "Rua X",
                    },
                    {"id": "2", "summary": "Plantão", "start": {"date": "2026-10-17"}},
                    {"id": "3", "status": "cancelled", "start": {"date": "2026-10-17"}},
                ]
            },
        )

    GOOGLE_STATE[EVENTS] = events
    body = today(client)
    assert body["calendar"] == "ok"
    titles = [(e["title"], e["client_name"], e["all_day"]) for e in body["events"]]  # type: ignore[union-attr]
    assert titles == [("Visita joao silva - Lapa", "João Silva", False), ("Plantão", None, True)]
    # The window is São Paulo's day, not UTC's.
    params = calls[-1].url.params
    assert params["timeMin"] == "2026-10-17T00:00:00-03:00"
    assert params["timeMax"] == "2026-10-18T00:00:00-03:00"


def test_a_refused_calendar_keeps_the_list_and_flags_the_connection(client: TestClient) -> None:
    connect(client)
    GOOGLE_STATE[EVENTS] = lambda r: httpx.Response(403, json={})
    body = today(client)
    assert body["calendar"] == "http_403"
    rows = {r["provider"]: r for r in client.get("/internal/connections").json()}
    assert rows["google_calendar"]["status"] == "error"


@pytest.mark.parametrize("hour,expected", [(2, "2026-10-16"), (4, "2026-10-17")])
def test_day_bounds_follow_sao_paulo(hour: int, expected: str) -> None:
    from imobos_api.today import day_bounds

    start, end = day_bounds(datetime(2026, 10, 17, hour, 0, tzinfo=UTC))
    assert start.date().isoformat() == expected
    assert end - start == timedelta(days=1)
