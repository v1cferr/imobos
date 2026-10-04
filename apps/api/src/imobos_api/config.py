"""Settings read from the environment once per process. Nothing here has a secret default."""

import os
from dataclasses import dataclass, field


def _emails(raw: str | None) -> frozenset[str]:
    return frozenset(e.strip().lower() for e in (raw or "").split(",") if e.strip())


@dataclass(frozen=True)
class Settings:
    database_url: str
    internal_api_token: str
    # Bootstrap admins: always approved admins, so nobody can be locked out of the approval screen.
    admin_emails: frozenset[str] = field(default_factory=frozenset)
    # Open sign-up: an unknown, Google-verified account becomes a pending request.
    signup_open: bool = True
    # Spam guard: refuse new requests while this many are already waiting.
    max_pending: int = 10
    # Public origin (https://<domain>): OAuth redirect URIs are built from it.
    public_url: str = "http://localhost:3000"
    # Fernet keys for integration tokens, newest first; older keys only decrypt (rotation).
    token_keys: tuple[str, ...] = ()
    # The Google OAuth client for integrations (Calendar), separate from the login client.
    google_client_id: str = ""
    google_client_secret: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            database_url=os.environ["DATABASE_URL"],
            internal_api_token=os.environ["INTERNAL_API_TOKEN"],
            admin_emails=_emails(os.environ.get("IMOBOS_ADMIN_EMAILS")),
            signup_open=os.environ.get("IMOBOS_SIGNUP_OPEN", "true").strip().lower() == "true",
            max_pending=int(os.environ.get("IMOBOS_MAX_PENDING", "10")),
            public_url=os.environ.get("IMOBOS_PUBLIC_URL", "http://localhost:3000").rstrip("/"),
            token_keys=tuple(
                k.strip() for k in os.environ.get("IMOBOS_TOKEN_KEYS", "").split(",") if k.strip()
            ),
            google_client_id=os.environ.get("GOOGLE_INTEGRATIONS_CLIENT_ID", ""),
            google_client_secret=os.environ.get("GOOGLE_INTEGRATIONS_CLIENT_SECRET", ""),
        )
