"""Alembic runs online only, against DATABASE_URL."""

import os

from alembic import context
from sqlalchemy import create_engine

from imobos_api.models import Base

url = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1)

with create_engine(url).connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
