# 0001. One monorepo for application and infrastructure

- Status: accepted
- Date: 2026-10-03
- Card: V1C-84

## Context

ImobOS is one product with several moving parts: a web app, an API, integrations (HubSpot,
Chatwoot, Meta), automation and the infrastructure that runs them on a single VPS. One person
maintains it, and changes routinely cross those boundaries, such as a new integration that needs an
API route, a UI screen and a Compose service at once.

## Decision

Everything lives in one repository, `v1cferr/imobos`, which is the source of truth for code,
infrastructure and documentation.

```text
apps/            deployable applications (web, api)
packages/        shared code, when there is something to share
services/        configuration for third-party services (Chatwoot, n8n)
infrastructure/  reverse proxy, databases, backup, monitoring
docs/            architecture, requirements, operations, ADRs
```

A directory is created when it has content, not to mirror the planned tree. Today only `apps/` and
`docs/` exist; `packages/`, `services/` and `infrastructure/` appear with their first real file.
`pnpm-workspace.yaml` already lists `packages/*`, so a shared package needs no workspace change.

## Consequences

- One commit can change the API, the UI and the Compose file together, and one CI run validates it.
- One clone and one `nix develop` give the whole toolchain (see 0002).
- The repository is public, so secrets can never be committed: only `.env.example` is tracked.
- If a part ever needs its own release cycle or access control, it can be split out then.
