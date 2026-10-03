"""ASGI entry point: `uvicorn imobos_api.main:app`."""

from fastapi import FastAPI

app = FastAPI(title="ImobOS API")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe for Docker and the reverse proxy; touches no dependency on purpose."""
    return {"status": "ok"}
