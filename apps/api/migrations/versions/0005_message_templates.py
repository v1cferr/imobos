"""Ready-made WhatsApp messages, with a first set she can edit (V1C-117).

Revision ID: 0005
Revises: 0004
"""

import uuid

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"

DEFAULTS = [
    (
        "Primeiro contato",
        "Olá, {nome}! Tudo bem? Aqui é a {corretora}, corretora de imóveis. Vi o seu interesse e "
        "quero te ajudar a encontrar o imóvel certo. Me conta o que você está procurando?",
    ),
    (
        "Retorno (dia seguinte)",
        "Oi, {nome}! Ficou alguma dúvida sobre o {empreendimento}? Estou à disposição.",
    ),
    (
        "Enviar material",
        "Oi, {nome}! Separei o material do {empreendimento} para você: planta, tabela e "
        "condições de pagamento. Posso te mandar por aqui?",
    ),
    (
        "Convite para visita",
        "Oi, {nome}! Que tal conhecer o {empreendimento} pessoalmente? Tenho horários nesta "
        "semana. Qual dia fica melhor para você?",
    ),
    (
        "Confirmar visita",
        "Oi, {nome}! Passando para confirmar a nossa visita ao {empreendimento}. Está tudo certo "
        "para você?",
    ),
    (
        "Depois da visita",
        "Oi, {nome}! Obrigada pela visita ao {empreendimento}. O que você achou? Se quiser, "
        "conversamos sobre as condições.",
    ),
]


def upgrade() -> None:
    table = op.create_table(
        "message_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.bulk_insert(
        table,
        [
            {"id": uuid.uuid4(), "title": title, "body": body, "position": i}
            for i, (title, body) in enumerate(DEFAULTS)
        ],
    )


def downgrade() -> None:
    op.drop_table("message_templates")
