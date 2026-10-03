# 0005. One edge, segmented networks, basic auth until there is a login

- Status: accepted
- Date: 2026-10-03
- Card: V1C-87

## Context

The stack now holds customer-facing pieces (web, api) and data (PostgreSQL, Redis) on one host.
Docker bypasses ufw, so the Compose file is the real firewall (ADR 0003). The application has no
login yet, the site will be reachable at `corretora.v1cferr.dev`, and OAuth callbacks (V1C-85) will
need public paths that a browser-style login cannot protect.

## Decision

```text
internet ──80/443──▶ caddy ──[edge]──▶ web ──[app]──▶ api ──[data, internal]──▶ postgres, redis
```

- **Caddy is the only service with `ports:`** (80, 443, and 443/udp for HTTP/3). It terminates TLS
  with automatic ACME certificates and sets the security headers.
- **Three networks, each service on the fewest it needs:**
  - `edge`: caddy and web. The proxy reaches the web app and nothing else.
  - `app`: web and api. The API is not reachable from the proxy.
  - `data`: api, postgres and redis, marked `internal`, so the databases have no route out.
- **Site-wide basic auth** at the edge until the application has its own authentication. Only the
  bcrypt hash lives on the host's `.env`; the password is kept in a password manager.
- **The API stays private.** When V1C-85 needs OAuth callbacks and webhooks, each one is exposed by
  its exact path, outside basic auth, and validated by the OAuth `state` or the webhook signature.
  `/api/*` is never exposed as a whole.
- **Secrets are mandatory.** Compose refuses to start while a required variable is empty
  (`${VAR:?}`), so a forgotten password is an error, not an open database.

## Verified

With the stack up, from inside the networks: no credentials or wrong ones give 401, the right ones
give 200, HTTP redirects to HTTPS. caddy reaches none of api, postgres, redis; web reaches api but
cannot even resolve postgres or redis; api reaches both; postgres cannot reach the internet.

## Consequences

- A new service joins only the networks it needs; reaching the database is a deliberate edit to
  `compose.yaml`, visible in review.
- Basic auth is a single shared credential with no per-user audit. It is a gate, not an identity
  system, and is replaced by the application login.
- Backups are not in place yet (V1C-88) and must be before real customer data arrives.
