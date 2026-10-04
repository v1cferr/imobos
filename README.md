# ImobOS

The operating system of a real estate broker: one place that answers **who needs attention today,
why, and what the next action should be**. HubSpot stays the CRM, Chatwoot centralizes the
conversation channels (WhatsApp Business through the official Meta API), and ImobOS orchestrates
follow-ups, AI-assisted replies with human review, and daily priorities on top of them.

Status: **authenticated shell**. Sign-in with Google, open sign-up with admin approval and the
navigation are in place, with example data only; integrations come next.

## Requirements

- [Nix](https://nixos.org/download/) with flakes enabled
  (`experimental-features = nix-command flakes`).
- Docker Engine with the Compose plugin, to build and run the services.
- Optional: [direnv](https://direnv.net/) with
  [nix-direnv](https://github.com/nix-community/nix-direnv), to load the environment on `cd`.

Node.js, pnpm, Python and uv come from the flake. Do not install them globally.

## Bootstrap

```bash
git clone https://github.com/v1cferr/imobos.git
cd imobos

nix develop          # or: direnv allow

pnpm install         # JavaScript deps, plus `uv sync` for the API

pnpm lint
pnpm typecheck
pnpm test
pnpm build           # or `pnpm check` for all four

docker compose config
```

`nix develop` provides Node.js 24, pnpm 11, Python 3.13, uv, git, and the PostgreSQL (`psql`,
`pg_dump`) and Redis (`redis-cli`) clients, all pinned by `flake.lock`.

## Development

```bash
pnpm dev             # web on http://localhost:3000, api on http://localhost:8000
```

Each app also runs on its own: `pnpm --filter @imobos/web dev`, `pnpm --filter @imobos/api dev`.

## Runtime

```bash
cp .env.example .env # fill in every empty value; .env is git-ignored
docker compose build
docker compose up -d
```

`docker compose` refuses to start while a required value in `.env` is empty. Only Caddy publishes
ports (80/443), the application authenticates with Google and an admin approves who enters, and the
databases live on an internal network that only the API reaches. Chatwoot runs beside it with its own
databases and networks ([ADR 0009](docs/adr/0009-chatwoot-self-hosted.md)). See
[ADR 0005](docs/adr/0005-edge-and-network-segmentation.md) and
[the deploy runbook](docs/operations/deploy.md).

## Structure

```text
apps/
  web/               Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Lucide
  api/               FastAPI on Python 3.13, managed by uv; owns the database (Alembic)
infrastructure/
  caddy/             the edge: TLS and security headers
  chatwoot/          Chatwoot bootstrap (account and super admin before the route exists)
  backup/            nightly pg_dump + restic off-site, restore drill, systemd timer
docs/
  adr/               architecture decision records
  operations/        production host, deploy, backup and Chatwoot runbooks
  integrations/      one page per connected service (Google Calendar, HubSpot, Chatwoot channels)
compose.yaml         runtime of the services
flake.nix            development environment (flake.lock pins it)
pnpm-workspace.yaml  workspaces: apps/*, packages/*
```

`packages/` and `services/` are created with their first real content
([ADR 0001](docs/adr/0001-monorepo.md)).

## Decisions

- [0001. One monorepo for application and infrastructure](docs/adr/0001-monorepo.md)
- [0002. Ubuntu host, Nix for the environment, Docker Compose for services](docs/adr/0002-ubuntu-nix-docker-compose.md)
- [0003. Tooling and runtime are separate concerns](docs/adr/0003-tooling-vs-runtime.md)
- [0004. pnpm workspaces orchestrate the monorepo, without Turborepo](docs/adr/0004-pnpm-workspaces-without-turborepo.md)
- [0005. One edge, segmented networks, basic auth until there is a login](docs/adr/0005-edge-and-network-segmentation.md)
- [0006. Google identity through Auth.js, a stateless session and an allowlist](docs/adr/0006-authentication-google-identity.md)
- [0007. Open sign-up with admin approval, owned by the API](docs/adr/0007-sign-up-with-admin-approval.md)
- [0008. Connected accounts: OAuth in the web, tokens only in the API, encrypted at rest](docs/adr/0008-connected-accounts.md)
- [0009. Chatwoot self-hosted beside ImobOS, isolated, at its own subdomain](docs/adr/0009-chatwoot-self-hosted.md)

## Secrets

This repository is public. Real values live only in `.env` on each host; `.env.example` documents
the names.
