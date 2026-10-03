# ImobOS

The operating system of a real estate broker: one place that answers **who needs attention today,
why, and what the next action should be**. HubSpot stays the CRM, Chatwoot centralizes the
conversation channels (WhatsApp Business through the official Meta API), and ImobOS orchestrates
follow-ups, AI-assisted replies with human review, and daily priorities on top of them.

Status: **foundation**. The monorepo, toolchain and runtime skeleton are in place; integrations
come next.

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
cp .env.example .env # then fill in; .env is git-ignored
docker compose build
docker compose up -d
```

No service publishes a port: Docker bypasses the host firewall, so only the reverse proxy will
expose 80/443. See [ADR 0003](docs/adr/0003-tooling-vs-runtime.md).

## Structure

```text
apps/
  web/               Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Lucide
  api/               FastAPI on Python 3.13, managed by uv
docs/
  adr/               architecture decision records
  operations/        production host reference
compose.yaml         runtime of the services
flake.nix            development environment (flake.lock pins it)
pnpm-workspace.yaml  workspaces: apps/*, packages/*
```

`packages/`, `services/` and `infrastructure/` are created with their first real content
([ADR 0001](docs/adr/0001-monorepo.md)).

## Decisions

- [0001. One monorepo for application and infrastructure](docs/adr/0001-monorepo.md)
- [0002. Ubuntu host, Nix for the environment, Docker Compose for services](docs/adr/0002-ubuntu-nix-docker-compose.md)
- [0003. Tooling and runtime are separate concerns](docs/adr/0003-tooling-vs-runtime.md)
- [0004. pnpm workspaces orchestrate the monorepo, without Turborepo](docs/adr/0004-pnpm-workspaces-without-turborepo.md)

## Secrets

This repository is public. Real values live only in `.env` on each host; `.env.example` documents
the names.
