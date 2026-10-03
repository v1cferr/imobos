# 0003. Tooling and runtime are separate concerns

- Status: accepted
- Date: 2026-10-03
- Card: V1C-84

## Context

Nix and Docker can each do part of the other's job: Nix can build images and run services, Docker
can host a development toolchain. Letting both do everything makes it unclear where a version is
defined and which tool to debug when something breaks.

## Decision

| Concern                                       | Owner                        |
| --------------------------------------------- | ---------------------------- |
| Interpreters, package managers, linters, CLIs | Nix devShell (`flake.nix`)   |
| Application dependencies                      | `pnpm-lock.yaml`, `uv.lock`  |
| Building and running services                 | Dockerfiles + `compose.yaml` |
| Secrets and per-host settings                 | `.env` (never committed)     |

Rules that follow from it:

- uv uses the flake's Python and may not download its own (`UV_PYTHON_DOWNLOADS=never`).
- Images are built from tracked sources only (`.dockerignore` excludes `.env` and local state).
- **No Compose service publishes a port.** Docker writes its own iptables rules and bypasses ufw,
  so `ports:` would expose a service to the internet. Only the reverse proxy will publish 80 and
  443; everything else is reached over the internal `app` network.
- State lives in named Docker volumes, never inside the checkout, so a re-clone cannot touch data.

## Consequences

- Local development runs the apps directly (`pnpm dev`) with the flake's toolchain; Compose is the
  production-shaped runtime and is validated in CI.
- The PostgreSQL and Redis clients are in the devShell to talk to containers, not to run servers.
