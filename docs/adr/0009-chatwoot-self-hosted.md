# 0009. Chatwoot self-hosted beside ImobOS, isolated, at its own subdomain

- Status: accepted
- Date: 2026-10-04
- Card: V1C-94

## Context

V1C-83 makes Chatwoot the owner of conversations and channels (WhatsApp Business, later Instagram,
Facebook and e-mail). It is a Rails application with a Sidekiq worker, PostgreSQL with pgvector and
Redis. It holds customers' messages and files, so it falls under the same rules as ImobOS's own data:
self-hosted, behind the single edge, backed up off the host, nothing sent to third parties without
a decision.

## Decision

- **Same host, same Compose project**, one pinned image (`chatwoot/chatwoot:v4.18.0`) for Rails and
  Sidekiq. An upgrade is a reviewed edit followed by `rails db:chatwoot_prepare` (runs migrations).
- **Its own PostgreSQL and Redis.** Chatwoot needs pgvector (`pgvector/pgvector:0.8.7-pg17`, the same
  major as the rest), migrates on its own schedule and may misbehave; none of that reaches the
  ImobOS database.
- **Two networks of its own**: `chat` (caddy, chatwoot, worker; it has a route out, needed for Meta's
  Graph API and Google) and `chat-data` (internal: Chatwoot and its databases). Chatwoot is on
  neither `app` nor `data`, so it cannot reach the ImobOS API or database.
- **Its own subdomain**, `chat.<IMOBOS_DOMAIN>`: Rails cannot be served under a path. Caddy applies
  the same security headers as the main site.
- **The account exists before the route.** Chatwoot's installation onboarding page makes whoever
  opens it first the super admin. `infrastructure/chatwoot/bootstrap.sh` creates the account and super
  admin from the shell and closes the onboarding; only then does Caddy route the subdomain.
- **Closed and quiet by default**: account signup off; usage telemetry, Gravatar lookups by e-mail
  hash and the chatwoot.com push relay off. The push relay would carry message previews through
  Chatwoot's servers to Firebase and Apple; enabling mobile push is a later decision with the broker.
- **Sign in with Google** (optional, its own OAuth client) only finds existing users. Chatwoot's
  OmniAuth setup ignores the OAuth `state`, which allows login CSRF into an attacker's account; with
  signup closed nobody outside can own an account here, so it is accepted.
- **Secrets**: the Rails secret key base and the three Active Record encryption values are kept in
  the password manager (item "ImobOS Chatwoot"), because a restored database needs them. The
  database and Redis passwords are generated on the host and never leave it.
- **Backups** (extending V1C-88): the nightly run dumps Chatwoot's database next to the
  ImobOS one and snapshots the `chatwoot_storage` volume (attachments); the weekly drill restores
  both.

## Consequences

- Two more databases to watch and upgrade. Memory on the host goes from about 0.3 GB to about
  1.5 GB, well within its 16 GB.
- The broker uses a second screen (Chatwoot) for conversations until ImobOS reads them through
  Chatwoot's API. A single sign-in between the two is a later step.
- Without SMTP, Chatwoot sends no e-mail (invitations, password resets, notifications). Users are
  created by the operator; Google sign-in avoids passwords.
