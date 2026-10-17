"""CRM rules (ADR 0010): clients, their deals in the sales and rentals funnels, and the history.

Every change that matters to the broker leaves an Activity, written in the same transaction as the
change itself, so the history never disagrees with the data.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import phonenumbers
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .models import Activity, ActivityKind, Client, Deal, LeadSource, Pipeline, Stage

CLOSED = (Stage.WON, Stage.LOST)

# Client fields the screen may set. Changes to these are recorded by name in the history.
CLIENT_FIELDS = (
    "name",
    "phone",
    "email",
    "source",
    "notes",
    "purpose",
    "budget_max",
    "region",
    "property_type",
    "min_area_m2",
    "bedrooms",
    "parking",
    "financing",
    "pets",
    "need",
)
DEAL_FIELDS = ("property", "value", "next_action", "next_action_due", "objections", "lost_reason")


class NotFoundError(Exception):
    pass


class InvalidPhoneError(ValueError):
    pass


class DuplicatePhoneError(Exception):
    def __init__(self, client_id: uuid.UUID) -> None:
        self.client_id = client_id


class OpenDealExistsError(Exception):
    """A client has at most one open deal per funnel; reopen means a new deal after closing."""


def normalize_phone(raw: str | None) -> str | None:
    """E.164, Brazilian numbers by default: '(11) 98765-4321' -> '+5511987654321'."""
    if raw is None or not raw.strip():
        return None
    try:
        parsed = phonenumbers.parse(raw, "BR")
    except phonenumbers.NumberParseException as e:
        raise InvalidPhoneError(raw) from e
    if not phonenumbers.is_possible_number(parsed):
        raise InvalidPhoneError(raw)
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def _log(
    session: Session,
    client: Client,
    kind: ActivityKind,
    actor: str,
    *,
    deal: Deal | None = None,
    body: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    session.add(
        Activity(
            client_id=client.id,
            deal_id=deal.id if deal else None,
            kind=kind,
            body=body,
            data=data,
            actor=actor,
        )
    )


def _check_phone(session: Session, phone: str | None, own_id: uuid.UUID | None = None) -> None:
    if phone is None:
        return
    other = session.scalar(select(Client.id).where(Client.phone == phone))
    if other is not None and other != own_id:
        raise DuplicatePhoneError(other)


def get_client(session: Session, client_id: uuid.UUID) -> Client:
    client = session.scalar(
        select(Client)
        .where(Client.id == client_id)
        .options(selectinload(Client.deals), selectinload(Client.activities))
        # Reload collections already in the session: a write just added to them.
        .execution_options(populate_existing=True)
    )
    if client is None:
        raise NotFoundError
    return client


def create_client(
    session: Session,
    *,
    actor: str,
    fields: dict[str, Any],
    pipeline: Pipeline | None = None,
    listing: str | None = None,
) -> Client:
    fields = dict(fields)
    fields["phone"] = normalize_phone(fields.get("phone"))
    _check_phone(session, fields["phone"])
    fields.setdefault("source", LeadSource.MANUAL)
    client = Client(id=uuid.uuid4(), created_by=actor, **fields)
    session.add(client)
    _log(session, client, ActivityKind.CREATED, actor, data={"source": str(client.source)})
    if pipeline is not None:
        _open_deal(session, client, actor, pipeline, listing=listing)
    session.commit()
    return get_client(session, client.id)


def update_client(
    session: Session, client_id: uuid.UUID, *, actor: str, changes: dict[str, Any]
) -> Client:
    client = get_client(session, client_id)
    if "phone" in changes:
        changes["phone"] = normalize_phone(changes["phone"])
        _check_phone(session, changes["phone"], client.id)
    changed = [k for k, v in changes.items() if k in CLIENT_FIELDS and getattr(client, k) != v]
    for k in changed:
        setattr(client, k, changes[k])
    if changed:
        _log(session, client, ActivityKind.UPDATED, actor, data={"fields": sorted(changed)})
    session.commit()
    return get_client(session, client.id)


def delete_client(session: Session, client_id: uuid.UUID) -> None:
    """LGPD erasure: the client goes with every deal and history entry."""
    client = session.get(Client, client_id)
    if client is None:
        raise NotFoundError
    session.delete(client)
    session.commit()


def _open_deal(
    session: Session,
    client: Client,
    actor: str,
    pipeline: Pipeline,
    *,
    listing: str | None = None,
) -> Deal:
    if any(d.pipeline == pipeline and d.stage not in CLOSED for d in client.deals):
        raise OpenDealExistsError
    deal = Deal(id=uuid.uuid4(), pipeline=pipeline, stage=Stage.NEW, property=listing)
    client.deals.append(deal)
    session.flush()
    _log(session, client, ActivityKind.DEAL_OPENED, actor, deal=deal, data={"pipeline": pipeline})
    return deal


def open_deal(
    session: Session,
    client_id: uuid.UUID,
    *,
    actor: str,
    pipeline: Pipeline,
    listing: str | None = None,
) -> Client:
    client = get_client(session, client_id)
    _open_deal(session, client, actor, pipeline, listing=listing)
    session.commit()
    return get_client(session, client.id)


def update_deal(
    session: Session,
    deal_id: uuid.UUID,
    *,
    actor: str,
    stage: Stage | None = None,
    changes: dict[str, Any],
) -> Client:
    deal = session.get(Deal, deal_id)
    if deal is None:
        raise NotFoundError
    client = deal.client
    if stage is not None and stage != deal.stage:
        _log(
            session,
            client,
            ActivityKind.STAGE_CHANGED,
            actor,
            deal=deal,
            data={"from": deal.stage, "to": stage},
        )
        deal.stage = stage
        deal.closed_at = datetime.now(UTC) if stage in CLOSED else None
    action_changed = any(
        k in changes and changes[k] != getattr(deal, k) for k in ("next_action", "next_action_due")
    )
    for k, v in changes.items():
        if k in DEAL_FIELDS:
            setattr(deal, k, v)
    if action_changed:
        due = deal.next_action_due.isoformat() if deal.next_action_due else None
        _log(
            session,
            client,
            ActivityKind.NEXT_ACTION,
            actor,
            deal=deal,
            body=deal.next_action,
            data={"due": due},
        )
    session.commit()
    return get_client(session, client.id)


def complete_action(session: Session, deal_id: uuid.UUID, *, actor: str) -> Client:
    """ "Feito" in Hoje: the history keeps what was done, and the deal waits for its next action."""
    deal = session.get(Deal, deal_id)
    if deal is None:
        raise NotFoundError
    client = deal.client
    if deal.next_action or deal.next_action_due:
        due = deal.next_action_due.isoformat() if deal.next_action_due else None
        _log(
            session,
            client,
            ActivityKind.NEXT_ACTION,
            actor,
            deal=deal,
            body=deal.next_action,
            data={"due": due, "done": True},
        )
        deal.next_action, deal.next_action_due = None, None
    session.commit()
    return get_client(session, client.id)


def add_activity(
    session: Session,
    client_id: uuid.UUID,
    *,
    actor: str,
    kind: ActivityKind,
    body: str,
    deal_id: uuid.UUID | None = None,
) -> Client:
    """What she records by hand: a note, a call, a visit."""
    client = get_client(session, client_id)
    deal = next((d for d in client.deals if d.id == deal_id), None) if deal_id else None
    if deal_id and deal is None:
        raise NotFoundError
    _log(session, client, kind, actor, deal=deal, body=body)
    session.commit()
    return get_client(session, client.id)


@dataclass(frozen=True)
class ClientRow:
    """One line of the client list: the client, its open deals and when it was last touched."""

    client: Client
    open_deals: list[Deal]
    last_activity_at: datetime | None


def list_clients(
    session: Session,
    *,
    q: str | None = None,
    pipeline: Pipeline | None = None,
    stage: Stage | None = None,
    limit: int = 200,
) -> list[ClientRow]:
    last = (
        select(Activity.client_id, func.max(Activity.occurred_at).label("last"))
        .group_by(Activity.client_id)
        .subquery()
    )
    query = (
        select(Client, last.c.last)
        .outerjoin(last, last.c.client_id == Client.id)
        .options(selectinload(Client.deals))
        .order_by(last.c.last.desc().nulls_last(), Client.created_at.desc())
        .limit(limit)
    )
    if q:
        like = f"%{q.strip()}%"
        digits = "".join(c for c in q if c.isdigit())
        conditions: list[ColumnElement[bool]] = [Client.name.ilike(like), Client.email.ilike(like)]
        if len(digits) >= 4:
            conditions.append(Client.phone.contains(digits))
        query = query.where(or_(*conditions))
    if pipeline or stage:
        deal_filter = select(Deal.client_id)
        if pipeline:
            deal_filter = deal_filter.where(Deal.pipeline == pipeline)
        if stage:
            deal_filter = deal_filter.where(Deal.stage == stage)
        query = query.where(Client.id.in_(deal_filter))
    rows = []
    for client, last_at in session.execute(query).all():
        open_deals = [d for d in client.deals if d.stage not in CLOSED]
        rows.append(ClientRow(client, open_deals, last_at))
    return rows


def list_deals(session: Session, pipeline: Pipeline) -> list[Deal]:
    """The funnel board: every deal of one funnel, open ones by due date, closed ones last."""
    return list(
        session.scalars(
            select(Deal)
            .where(Deal.pipeline == pipeline)
            .options(selectinload(Deal.client))
            .order_by(Deal.next_action_due.asc().nulls_last(), Deal.updated_at.desc())
        )
    )
