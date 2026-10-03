# 0002. Ubuntu host, Nix for the environment, Docker Compose for services

- Status: accepted
- Date: 2026-10-03
- Card: V1C-84 (host prepared in V1C-86)

## Context

Production is one KingHost VPS. It ships Ubuntu 24.04 LTS, the provider supports it, and its
console and snapshots assume it. The development workstation runs NixOS. Each environment needs the
same tool versions, and the services need isolation and a lifecycle (restart, health, upgrade).

## Decision

```text
Ubuntu 24.04 LTS                host: kernel, SSH, firewall, provider support
├── Nix (multi-user, flakes)    toolchain and development environment
└── Docker Engine
    └── Docker Compose          runtime of every service
```

- **Ubuntu** stays the host. Migrating the VPS to NixOS buys nothing at this stage and would leave
  the provider's tooling behind.
- **Nix** provides the toolchain through `flake.nix`, pinned by `flake.lock`: Node.js, pnpm,
  Python, uv, git and the PostgreSQL and Redis clients. Nothing of this is installed with apt.
- **Docker Compose** builds and runs the services. Nix does not run services and Docker does not
  provide the toolchain (see 0003).
- **Git** is the source of truth; `flake.lock` and the language lockfiles pin everything else.

## Consequences

- The workstation, CI and the VPS run the same `nix develop`, so a version mismatch is a lockfile
  diff rather than a mystery.
- Bumping the toolchain is a deliberate `nix flake update` commit.
- Container images pin the same major lines (Node 24, Python 3.13) and the same pnpm and uv
  versions as the flake. Moving one means moving the other, in the same commit.
