"""Hoje: what needs the broker today, computed from the CRM (ADR 0010) in São Paulo time.

Every open deal should carry a next action with a date; whatever is late, due today, new and
untouched, or missing a next action is listed, most urgent first.
"""

import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .crm import CLOSED
from .google import Event
from .models import Activity, ActivityKind, Client, Deal, Stage

TZ = ZoneInfo("America/Sao_Paulo")
# Contact with the client, as opposed to bookkeeping such as "created" or "fields updated".
CONTACT_KINDS = (
    ActivityKind.NOTE,
    ActivityKind.CALL,
    ActivityKind.VISIT,
    ActivityKind.MESSAGE,
    ActivityKind.STAGE_CHANGED,
)


class Reason(StrEnum):
    OVERDUE = "overdue"
    DUE_TODAY = "due_today"
    NEW_LEAD = "new_lead"
    NO_NEXT_ACTION = "no_next_action"


@dataclass(frozen=True)
class Item:
    reason: Reason
    deal: Deal
    last_contact_at: datetime | None


@dataclass(frozen=True)
class MatchedEvent:
    event: Event
    client: Client | None


def day_bounds(now: datetime) -> tuple[datetime, datetime]:
    local = now.astimezone(TZ)
    start = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def _aware(value: datetime | None) -> datetime | None:
    # SQLite (tests) drops the offset; PostgreSQL keeps it. Stored values are UTC either way.
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def items(session: Session, now: datetime) -> list[Item]:
    _, day_end = day_bounds(now)
    last_contact: dict[object, datetime] = dict(
        session.execute(
            select(Activity.client_id, func.max(Activity.occurred_at))
            .where(Activity.kind.in_(CONTACT_KINDS))
            .group_by(Activity.client_id)
        ).all()
    )
    # A next action marked done ("Feito") is contact too: she called, sent, visited.
    for client_id, data, at in session.execute(
        select(Activity.client_id, Activity.data, Activity.occurred_at).where(
            Activity.kind == ActivityKind.NEXT_ACTION
        )
    ).all():
        previous = last_contact.get(client_id)
        if data and data.get("done") and (previous is None or at > previous):
            last_contact[client_id] = at
    deals = session.scalars(
        select(Deal).where(Deal.stage.not_in(CLOSED)).options(selectinload(Deal.client))
    ).all()

    result: list[Item] = []
    for deal in deals:
        contact = _aware(last_contact.get(deal.client_id))
        due = _aware(deal.next_action_due)
        if due is not None and due < now:
            reason = Reason.OVERDUE
        elif due is not None and due < day_end:
            reason = Reason.DUE_TODAY
        elif due is not None:
            continue  # scheduled for later: not today's business
        elif deal.stage == Stage.NEW and contact is None:
            reason = Reason.NEW_LEAD
        else:
            reason = Reason.NO_NEXT_ACTION
        result.append(Item(reason, deal, contact))

    order = list(Reason)
    epoch = datetime.min.replace(tzinfo=UTC)

    def key(item: Item) -> tuple[int, datetime]:
        if item.reason in (Reason.OVERDUE, Reason.DUE_TODAY):
            return order.index(item.reason), _aware(item.deal.next_action_due) or epoch
        if item.reason == Reason.NEW_LEAD:  # oldest lead first: it has waited longest
            return order.index(item.reason), _aware(item.deal.created_at) or epoch
        return order.index(item.reason), item.last_contact_at or epoch

    return sorted(result, key=key)


def _fold(text: str) -> str:
    """Case- and accent-insensitive: "Visita João" matches the client "joao silva"."""
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def match_clients(session: Session, events: list[Event]) -> list[MatchedEvent]:
    """Links an event to a client whose full name appears in its title. Only names with at least
    two words count, so "Ana" alone never pins a visit on the wrong person."""
    if not events:
        return []
    clients = [c for c in session.scalars(select(Client)) if len(c.name.split()) >= 2]
    names = [(_fold(c.name), c) for c in clients]
    matched = []
    for event in events:
        title = _fold(event.title)
        hits = [c for name, c in names if name in title]
        matched.append(MatchedEvent(event, hits[0] if len(hits) == 1 else None))
    return matched
