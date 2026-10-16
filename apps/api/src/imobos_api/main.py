"""ASGI entry point: `uvicorn imobos_api.main:app`."""

from fastapi import FastAPI

from .crm_routes import router as crm_router
from .internal import router as internal_router

app = FastAPI(title="ImobOS API")
app.include_router(internal_router)
app.include_router(crm_router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe for Docker and the reverse proxy; touches no dependency on purpose."""
    return {"status": "ok"}
