# 0010. ImobOS is the broker's CRM

- Status: accepted
- Date: 2026-10-16
- Card: V1C-83 (scope change), V1C-109

## Context

V1C-83 started with HubSpot as the commercial source of truth and ImobOS on top of it. The
broker's HubSpot belongs to the construtora she sells for, and on 13/10 she settled it: the
construtora's admin will not authorize an integration ("O do hubspot esquece"). Meanwhile her own
records live in WhatsApp conversations and an Excel sheet, she works two lines at once (sales for
the construtora, rentals on QuintoAndar, which has no public broker API), and she wants to bring in
her own leads with paid Meta campaigns.

## Decision

- **ImobOS owns the commercial data**: clients, what each one wants, deals in two funnels (sales and
  rentals), stages, next action with a due date, lead source, and an append-only, timestamped
  history per client.
- **Chatwoot stays the owner of conversations and channels** (ADR 0009). ImobOS links a
  conversation to a client by phone number and records conversation events in the history; it
  never copies message bodies into its own tables as a second inbox.
- **Leads enter from many sources** (manual quick add, spreadsheet import, WhatsApp, Meta Lead Ads),
  each tagged with its source.
- **The API owns the tables** like users and connections (ADR 0007): Alembic migrations, `/internal`
  routes, the web app never touches the database.
- HubSpot is removed from the code (migration 0003); bringing a CRM back would be a new decision.

## Consequences

- ImobOS must be good at the basics a CRM gives for free: quick capture on the phone, search,
  deduplication by phone, and history.
- The history doubles as her evidence when another broker closes a client she served, so it is
  append-only and timestamped by the server.
- The nightly backup now protects her business records, not only access data; the restore drill
  covers the new tables.
