# 0008. Connected accounts: OAuth in the web, tokens only in the API, encrypted at rest

- Status: accepted
- Date: 2026-10-04
- Card: V1C-85

## Context

ImobOS must reach services on the broker's behalf (Google Calendar now, HubSpot when authorized),
always through the provider's own consent screen and never with her passwords. These tokens are the
most sensitive data the system holds: whoever has them reads her calendar. ADR 0005 keeps the
database behind the API, and ADR 0006 keeps the login free of any API access.

## Decision

**Login and integrations stay separate.** A second OAuth client ("ImobOS integrações") in the same
Google project asks for integration scopes; the login client still asks only for identity. Revoking
one never affects the other.

**The browser half runs in the web, the token half in the API.** "Conectar" is a Server Action that
creates a `state` and a PKCE verifier, keeps both in a 10-minute HttpOnly `__Host-` cookie and sends
the browser to the provider. The callback (a Route Handler, outside the proxy) requires a
signed-in user, the cookie and a matching state before forwarding the code and verifier to the API
over the internal channel. The API exchanges the code, stores the tokens, refreshes, probes and
revokes. Tokens never reach the web container or the browser.

**Tokens are encrypted at rest** with Fernet through `MultiFernet` (`IMOBOS_TOKEN_KEYS`, newest key
first, so keys rotate by prepending). The keys live in the host's `.env` and the password manager,
never in the database, so the nightly backup (V1C-88) alone reveals no token. Without a key,
integrations are reported unavailable instead of storing anything in clear.

**One connection per provider** (single-tenant workspace). A connection row exists only while
connected; disconnecting revokes the grant at the provider first and then deletes the row. Its
`status` (`connected` / `error`), the connected account, the last check and a short, token-free
`last_error` code are what the screen and a future dashboard read.

**Minimal scopes.** Google Calendar asks for `calendar.events.readonly` plus `openid email` (to show
which account is connected), with offline access. A consent that unticks the calendar scope is
refused and revoked.

**Channel ownership follows V1C-83.** WhatsApp, Instagram, Facebook and Gmail are Chatwoot channels
connected in Chatwoot; ImobOS never holds their tokens. See `docs/integrations/`.

## Consequences

- The calendar scope is "sensitive": until Google verifies the app, the consent screen shows an
  "unverified app" warning (accepted by the owner, up to 100 users).
- A lost `IMOBOS_TOKEN_KEYS` only means reconnecting each service; a leaked database without it
  exposes no token.
- HubSpot is modelled but on hold: the broker's HubSpot belongs to the construtora, whose Super
  Admin must authorize an app that would see the whole account (V1C-85).
