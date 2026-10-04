"""Encryption at rest for integration tokens (ADR 0008).

Fernet (AES-128-CBC + HMAC-SHA256) through MultiFernet: the first key encrypts, every key decrypts,
so a key can be rotated by prepending a new one and re-encrypting. The keys live in the host's
.env and the password manager, never next to the data, so the database backup alone reveals
no token.
"""

from cryptography.fernet import Fernet, MultiFernet


class TokenCipherUnavailable(RuntimeError):
    """No key configured: integrations stay off instead of storing tokens in clear."""


class TokenCipher:
    def __init__(self, keys: tuple[str, ...]) -> None:
        if not keys:
            raise TokenCipherUnavailable("IMOBOS_TOKEN_KEYS is empty")
        self._fernet = MultiFernet([Fernet(k.encode()) for k in keys])

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def decrypt(self, value: str) -> str:
        return self._fernet.decrypt(value.encode()).decode()
