"""One outbound HTTP client per process, injectable so tests can fake the providers."""

from collections.abc import Iterator

import httpx


def get_http_client() -> Iterator[httpx.Client]:
    with httpx.Client() as client:
        yield client
