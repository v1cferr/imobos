# 0007. Open sign-up with admin approval, owned by the API

- Status: accepted
- Date: 2026-10-04
- Card: V1C-90
- Supersedes: the environment allowlist of ADR 0006 (its `IMOBOS_ALLOWED_EMAILS`)

## Context

The broker's Google account was not known when the login shipped (V1C-89), so an email allowlist
could not let her in. The owner chose open sign-up with approval: anyone with a Google account may
*ask* for access, and an admin decides. That needs a place to keep users, and ADR 0005 keeps the
database reachable only by the API.

## Decision

**The API owns the users.** A `users` table (email, name, Google `sub`, status
`pending`/`approved`/`disabled`, role `admin`/`user`, `decided_by`) managed by Alembic, with CHECK
constraints on status and role. No photo is stored.

**The web asks the API over an internal channel.** `/internal/*` routes on the api, reached only
over the `app` network (Caddy never routes to the api) and authenticated by `INTERNAL_API_TOKEN`,
compared in constant time. The web container never joins the `data` network.

**Sign-in.** After Google verifies the email, the api decides:

- `IMOBOS_ADMIN_EMAILS` are bootstrap admins: always approved admins, never changeable or
  rejectable from the screen, so the approval screen can never be locked.
- An unknown account becomes `pending` while `IMOBOS_SIGNUP_OPEN=true` and fewer than
  `IMOBOS_MAX_PENDING` requests wait; it gets no session, only "request sent".
- `approved` enters with its role; `disabled`, closed sign-up and a full queue are refused.
- The same email with a different Google `sub` is a conflict, not an inherited access.

**Authorization next to the data.** `getCurrentUser()` asks the api for status and role on every
request (memoized within the request only) and fails closed if the api cannot answer.
`requireAdmin()` answers 404 to non-admins. Every admin Server Action re-checks the role and
validates its input (UUID, role) before calling the api.

**Data minimization (LGPD).** Rejecting a pending request deletes it. A public `/privacidade` page
states what is kept, why, for how long and how to ask for deletion.

**Publishing the OAuth app.** Google only admits test users until the app is published, and
publishing requires a public privacy policy. So Caddy's basic auth exempts exactly `/privacidade`,
`/_next/static/*` and `/favicon.ico` (build assets, nothing user-specific).

**Cutover.** Basic auth stays until the broker signs up, is approved and validates; then sign-up is
closed (`IMOBOS_SIGNUP_OPEN=false`) and only then basic auth is removed.

## Consequences

- Who may enter is changed on a screen, not in `.env`, and takes effect on the next request.
- Every authenticated request costs one internal HTTP call; for a single-broker tool this is
  negligible, and it is what makes disabling immediate.
- The users table has no backup yet (V1C-88). Losing it only means approving people again, and it
  holds no customer data, so this was accepted before the backup.
- With basic auth gone and sign-up open, anyone could fill the pending queue; the cap and closing
  sign-up are the guard, and a rate limit at the edge is the next step if that ever happens.
