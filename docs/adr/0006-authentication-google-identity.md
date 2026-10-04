# 0006. Google identity through Auth.js, a stateless session and an allowlist

- Status: accepted
- Date: 2026-10-03
- Card: V1C-89

## Context

ImobOS has one real user, a broker who is not technical and already has a Google account. She needs
to sign in without a new password, and nobody else may get in. Connecting her Google data (Gmail,
Calendar) is a different concern with its own consent, scopes and token storage (V1C-85), and must
not leak into the login. No real customer data may enter the system before backups exist (V1C-88),
so the login cannot depend on PostgreSQL either.

## Decision

**Authentication only.** Google answers "who is this?" and nothing else: scopes `openid email
profile`, no `access_type=offline`, `prompt=select_account`. Integrations get their own OAuth flows
in V1C-85, and this login never grants API access.

**Library: Auth.js v5** (`next-auth@5`), evaluated first as the card asked, against Better Auth 1.7:

- Without an adapter, Auth.js keeps the session in an encrypted JWT (JWE) inside an HttpOnly cookie,
  and its default `jwt` callback stores only `name`, `email`, `picture` and `sub`. Google's access,
  refresh and id tokens are discarded after the identity is verified, which is exactly the
  "no token retention" requirement, with no extra code.
- It documents Next.js 16's `proxy.ts`, ships CSRF protection (double-submit token) and a
  same-origin `redirect` callback that blocks open redirects.
- Better Auth is the actively developed successor, but without a database it keeps the OAuth account
  data in its own cookie (`storeAccountCookie`), and its documentation does not say whether the
  Google tokens go in there, which conflicts with "no token retention".

**Checks:** PKCE (S256) is the default for OIDC; `state` and `nonce` are enabled on top of it, for a
login-CSRF check on the callback and replay protection on the id_token.

**Session:** 7 days of inactivity (`maxAge`), slid forward once a day of use (`updateAge`). Cookies
are HttpOnly and `SameSite=Lax`, and over HTTPS they are `Secure` with the `__Secure-` prefix.
`AUTH_SECRET` lives only in the host's `.env`; rotating it signs everyone out.

**Authorization:** two environment lists (never the repository) give each Google email a role:
`IMOBOS_ADMIN_EMAILS` (operators, required) and `IMOBOS_ALLOWED_EMAILS` (regular users, may be
empty). Google must have verified the address, and an email on neither list is refused, so empty
lists deny everyone. There is no user table, so there is no sign-up to abuse. The check runs at
sign-in **and again next to the data**: `requireUser()` in the layout and every page,
`getCurrentUser()` in Route Handlers (401, never a redirect). The role is recomputed from the
environment on every request and never trusted from the cookie, so removing an email locks that
person out on the next request, even with a valid session. `proxy.ts` is only an optimistic
redirect to `/login`. Today all roles see the same single workspace; admin-only screens arrive
with their first use.

**Next:** open sign-up with admin approval (V1C-90) replaces the environment lists with a user
table owned by the API, which keeps the database off the web container (ADR 0005).

**Observability:** `auth.login.success`, `auth.login.denied`, `auth.logout` and `auth.error` as JSON
lines. The identity is a 12-character SHA-256 prefix of the email; tokens, authorization codes,
cookies, secrets and full addresses are never logged, and Auth.js errors are reduced to their
stable `type`.

**Edge:** Caddy's basic auth stays in front during the rollout and is removed only after the
production checks pass (see `docs/operations/deploy.md`).

## Consequences

- One stateless session cannot be revoked on its own: the remedies are removing the email from the
  allowlist (immediate, per person) or rotating `AUTH_SECRET` (everyone).
- **Risk: Auth.js v5 is still published as beta**, and the project is now part of Better Auth, which
  maintains it mainly with security fixes.
- **Revisit (migrate to Better Auth) when** Auth.js security releases stop, or ImobOS needs
  database sessions, per-session revocation, several users with roles, or a second sign-in method.
  The allowlist and `requireUser()` are library-independent and survive that move.
