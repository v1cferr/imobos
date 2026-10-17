"""CRM routes for the web app (ADR 0010), under /internal like the rest: same token, same network.

The web app sends the signed-in user's e-mail as `actor`; it is what the history shows as who did
each thing.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from . import connections, crm, google, today
from .config import Settings
from .db import get_session, get_settings
from .http import get_http_client
from .internal import require_internal_token
from .models import ActivityKind, Client, Deal, LeadSource, Pipeline, Purpose, Stage

SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
HttpDep = Annotated[httpx.Client, Depends(get_http_client)]
router = APIRouter(prefix="/internal/crm", dependencies=[Depends(require_internal_token)])

Short = Annotated[str, Field(max_length=200)]


class ClientFields(BaseModel):
    """Everything optional: PATCH sends only what changed; POST requires `name` below."""

    name: Short | None = None
    phone: Annotated[str, Field(max_length=40)] | None = None
    email: EmailStr | None = None
    source: LeadSource | None = None
    notes: Annotated[str, Field(max_length=10_000)] | None = None
    purpose: Purpose | None = None
    budget_max: Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)] | None = None
    region: Short | None = None
    property_type: Annotated[str, Field(max_length=60)] | None = None
    min_area_m2: Annotated[int, Field(ge=0, le=100_000)] | None = None
    bedrooms: Annotated[int, Field(ge=0, le=50)] | None = None
    parking: Annotated[int, Field(ge=0, le=50)] | None = None
    financing: bool | None = None
    pets: bool | None = None
    need: Annotated[str, Field(max_length=5_000)] | None = None


class ClientCreate(ClientFields):
    name: Annotated[str, Field(min_length=1, max_length=200)]
    actor: EmailStr
    # Quick add opens the deal at once: "new lead for the sales funnel".
    pipeline: Pipeline | None = None
    property: Short | None = None


class ClientUpdate(ClientFields):
    actor: EmailStr


class DealCreate(BaseModel):
    actor: EmailStr
    pipeline: Pipeline
    property: Short | None = None


class DealUpdate(BaseModel):
    actor: EmailStr
    stage: Stage | None = None
    property: Short | None = None
    value: Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)] | None = None
    next_action: Annotated[str, Field(max_length=300)] | None = None
    next_action_due: datetime | None = None
    objections: Annotated[str, Field(max_length=5_000)] | None = None
    lost_reason: Annotated[str, Field(max_length=300)] | None = None


class ActivityCreate(BaseModel):
    actor: EmailStr
    kind: ActivityKind
    body: Annotated[str, Field(min_length=1, max_length=5_000)]
    deal_id: uuid.UUID | None = None


class DealOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    pipeline: Pipeline
    stage: Stage
    property: str | None
    value: Decimal | None
    next_action: str | None
    next_action_due: datetime | None
    objections: str | None
    lost_reason: str | None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None


class ActivityOut(BaseModel):
    id: uuid.UUID
    deal_id: uuid.UUID | None
    kind: ActivityKind
    body: str | None
    data: dict[str, Any] | None
    actor: str
    occurred_at: datetime


class ClientOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    source: LeadSource
    notes: str | None
    purpose: Purpose | None
    budget_max: Decimal | None
    region: str | None
    property_type: str | None
    min_area_m2: int | None
    bedrooms: int | None
    parking: int | None
    financing: bool | None
    pets: bool | None
    need: str | None
    created_by: str
    created_at: datetime
    updated_at: datetime


class ClientDetail(ClientOut):
    deals: list[DealOut]
    activities: list[ActivityOut]


class ClientListItem(ClientOut):
    open_deals: list[DealOut]
    last_activity_at: datetime | None


class BoardItem(DealOut):
    client_name: str
    client_phone: str | None


def _deal(d: Deal) -> DealOut:
    return DealOut.model_validate(d, from_attributes=True)


def _detail(c: Client) -> ClientDetail:
    return ClientDetail.model_validate(c, from_attributes=True)


def _errors(e: Exception) -> HTTPException:
    if isinstance(e, crm.NotFoundError):
        return HTTPException(status.HTTP_404_NOT_FOUND)
    if isinstance(e, crm.InvalidPhoneError):
        return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "invalid_phone")
    if isinstance(e, crm.DuplicatePhoneError):
        return HTTPException(
            status.HTTP_409_CONFLICT, {"code": "duplicate_phone", "client_id": str(e.client_id)}
        )
    if isinstance(e, crm.OpenDealExistsError):
        return HTTPException(status.HTTP_409_CONFLICT, "open_deal_exists")
    raise e


CrmErrors = (
    crm.NotFoundError,
    crm.InvalidPhoneError,
    crm.DuplicatePhoneError,
    crm.OpenDealExistsError,
)


@router.get("/clients")
def list_clients(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=100)] = None,
    pipeline: Pipeline | None = None,
    stage: Stage | None = None,
) -> list[ClientListItem]:
    return [
        ClientListItem(
            **ClientOut.model_validate(r.client, from_attributes=True).model_dump(),
            open_deals=[_deal(d) for d in r.open_deals],
            last_activity_at=r.last_activity_at,
        )
        for r in crm.list_clients(session, q=q, pipeline=pipeline, stage=stage)
    ]


@router.post("/clients", status_code=status.HTTP_201_CREATED)
def create_client(body: ClientCreate, session: SessionDep) -> ClientDetail:
    fields = body.model_dump(exclude={"actor", "pipeline", "property"}, exclude_none=True)
    try:
        client = crm.create_client(
            session, actor=body.actor, fields=fields, pipeline=body.pipeline, listing=body.property
        )
    except CrmErrors as e:
        raise _errors(e) from e
    return _detail(client)


@router.get("/clients/{client_id}")
def get_client(client_id: uuid.UUID, session: SessionDep) -> ClientDetail:
    try:
        return _detail(crm.get_client(session, client_id))
    except CrmErrors as e:
        raise _errors(e) from e


@router.patch("/clients/{client_id}")
def update_client(client_id: uuid.UUID, body: ClientUpdate, session: SessionDep) -> ClientDetail:
    # exclude_unset: a field sent as null clears it; a field not sent stays as it is.
    changes = body.model_dump(exclude={"actor"}, exclude_unset=True)
    if changes.get("name") is None and "name" in changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "name_required")
    try:
        return _detail(crm.update_client(session, client_id, actor=body.actor, changes=changes))
    except CrmErrors as e:
        raise _errors(e) from e


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: uuid.UUID, session: SessionDep) -> None:
    try:
        crm.delete_client(session, client_id)
    except CrmErrors as e:
        raise _errors(e) from e


@router.post("/clients/{client_id}/deals", status_code=status.HTTP_201_CREATED)
def open_deal(client_id: uuid.UUID, body: DealCreate, session: SessionDep) -> ClientDetail:
    try:
        client = crm.open_deal(
            session, client_id, actor=body.actor, pipeline=body.pipeline, listing=body.property
        )
    except CrmErrors as e:
        raise _errors(e) from e
    return _detail(client)


@router.patch("/deals/{deal_id}")
def update_deal(deal_id: uuid.UUID, body: DealUpdate, session: SessionDep) -> ClientDetail:
    changes = body.model_dump(exclude={"actor", "stage"}, exclude_unset=True)
    try:
        client = crm.update_deal(
            session, deal_id, actor=body.actor, stage=body.stage, changes=changes
        )
    except CrmErrors as e:
        raise _errors(e) from e
    return _detail(client)


@router.post("/clients/{client_id}/activities", status_code=status.HTTP_201_CREATED)
def add_activity(client_id: uuid.UUID, body: ActivityCreate, session: SessionDep) -> ClientDetail:
    # Only what a person records by hand; the rest is written by the rules themselves.
    if body.kind not in (ActivityKind.NOTE, ActivityKind.CALL, ActivityKind.VISIT):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "kind_not_allowed")
    try:
        client = crm.add_activity(
            session,
            client_id,
            actor=body.actor,
            kind=body.kind,
            body=body.body,
            deal_id=body.deal_id,
        )
    except CrmErrors as e:
        raise _errors(e) from e
    return _detail(client)


@router.get("/deals")
def board(pipeline: Pipeline, session: SessionDep) -> list[BoardItem]:
    return [
        BoardItem(**_deal(d).model_dump(), client_name=d.client.name, client_phone=d.client.phone)
        for d in crm.list_deals(session, pipeline)
    ]


class Actor(BaseModel):
    actor: EmailStr


@router.post("/deals/{deal_id}/done")
def complete_action(deal_id: uuid.UUID, body: Actor, session: SessionDep) -> ClientDetail:
    try:
        return _detail(crm.complete_action(session, deal_id, actor=body.actor))
    except CrmErrors as e:
        raise _errors(e) from e


class TodayItem(BaseModel):
    reason: today.Reason
    deal: BoardItem
    last_contact_at: datetime | None


class EventOut(BaseModel):
    title: str
    start: datetime
    end: datetime | None
    all_day: bool
    location: str | None
    link: str | None
    client_id: uuid.UUID | None
    client_name: str | None


class TodayOut(BaseModel):
    now: datetime
    items: list[TodayItem]
    events: list[EventOut]
    # "ok", "not_connected", or the connection's short error code ("invalid_grant", "http_403").
    calendar: str


@router.get("/today")
def get_today(
    session: SessionDep,
    settings: SettingsDep,
    client: HttpDep,
    now: datetime | None = None,  # tests only; production asks for the present
) -> TodayOut:
    moment = now or datetime.now(UTC)
    items = [
        TodayItem(
            reason=i.reason,
            deal=BoardItem(
                **_deal(i.deal).model_dump(),
                client_name=i.deal.client.name,
                client_phone=i.deal.client.phone,
            ),
            last_contact_at=i.last_contact_at,
        )
        for i in today.items(session, moment)
    ]
    start, end = today.day_bounds(moment)
    calendar = "ok"
    events: list[EventOut] = []
    try:
        found = connections.calendar_events(session, settings, client, time_min=start, time_max=end)
    except google.GoogleError as e:
        found, calendar = [], e.code
    if found is None:
        calendar = "not_connected"
    else:
        events = [
            EventOut(
                title=m.event.title,
                start=m.event.start,
                end=m.event.end,
                all_day=m.event.all_day,
                location=m.event.location,
                link=m.event.link,
                client_id=m.client.id if m.client else None,
                client_name=m.client.name if m.client else None,
            )
            for m in today.match_clients(session, found)
        ]
    return TodayOut(now=moment, items=items, events=events, calendar=calendar)
