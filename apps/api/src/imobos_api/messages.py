"""Ready-made messages (V1C-117): the templates, and the record that one was sent to a client.

Sending itself happens in her WhatsApp (click-to-chat), so ImobOS only records that she opened it,
which keeps the history and Hoje's "last contact" right.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import crm
from .models import ActivityKind, Client, MessageTemplate


def list_templates(session: Session) -> list[MessageTemplate]:
    return list(
        session.scalars(
            select(MessageTemplate).order_by(MessageTemplate.position, MessageTemplate.created_at)
        )
    )


def create_template(session: Session, *, title: str, body: str) -> MessageTemplate:
    last = session.scalar(select(func.max(MessageTemplate.position)))
    template = MessageTemplate(title=title, body=body, position=(last or 0) + 1)
    session.add(template)
    session.commit()
    return template


def update_template(
    session: Session, template_id: uuid.UUID, *, title: str, body: str
) -> MessageTemplate:
    template = session.get(MessageTemplate, template_id)
    if template is None:
        raise crm.NotFoundError
    template.title, template.body = title, body
    session.commit()
    return template


def delete_template(session: Session, template_id: uuid.UUID) -> None:
    template = session.get(MessageTemplate, template_id)
    if template is None:
        raise crm.NotFoundError
    session.delete(template)
    session.commit()


def record_sent(
    session: Session,
    client_id: uuid.UUID,
    *,
    actor: str,
    body: str,
    template: str | None,
    deal_id: uuid.UUID | None = None,
) -> Client:
    """The message as she opened it in WhatsApp; she may still edit it there before sending."""
    client = crm.get_client(session, client_id)
    deal = next((d for d in client.deals if d.id == deal_id), None) if deal_id else None
    if deal_id and deal is None:
        raise crm.NotFoundError
    crm.log(
        session,
        client,
        ActivityKind.MESSAGE,
        actor,
        deal=deal,
        body=body,
        data={"channel": "whatsapp_link", "template": template},
    )
    session.commit()
    return crm.get_client(session, client.id)
