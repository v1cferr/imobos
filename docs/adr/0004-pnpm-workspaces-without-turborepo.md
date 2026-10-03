# 0004. pnpm workspaces orchestrate the monorepo, without Turborepo

- Status: accepted
- Date: 2026-10-03
- Card: V1C-84

## Context

The repository must be validated from its root with `lint`, `typecheck`, `test`, `build` and `dev`.
It has one TypeScript app (web) and one Python app (api). Turborepo is the usual answer for
JavaScript monorepos, mainly for task caching and dependency-aware scheduling.

## Decision

- **pnpm workspaces** (`pnpm-workspace.yaml`: `apps/*`, `packages/*`), and root scripts fan out with
  `pnpm --recursive <task>`. A workspace without a given script is skipped.
- **No Turborepo for now.** With two apps and no shared packages, the whole check runs in under a
  minute, and pnpm already orders tasks by the workspace dependency graph. Caching would save
  seconds and add a tool, a config file and cache invalidation rules to learn.
- **The Python API joins the same workflow** through a thin `apps/api/package.json` whose scripts
  call uv (`ruff`, `mypy`, `pytest`), and whose `postinstall` runs `uv sync --locked`. One
  `pnpm install` prepares both languages, and one `pnpm lint` checks both.
- The API has no `build` script on purpose: its deliverable is the container image, built by
  `docker compose build`.

## Revisit when

- the full `pnpm check` takes long enough to slow down commits or CI, or
- shared `packages/` create build chains that pnpm ordering alone handles badly.

At that point Turborepo (or Nx) can be added on top without restructuring the workspace.
