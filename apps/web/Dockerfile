# ImobOS web image. Build context: the REPOSITORY ROOT, because the pnpm lockfile and workspace live there.
# Same Node line (24) and pnpm version as flake.lock, so the image matches development.
FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.27.0 --activate
WORKDIR /repo

FROM base AS build
# Manifests first, so dependency installation is cached until a lockfile or manifest changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @imobos/web...
COPY apps/web apps/web
# The public origin, for absolute link-preview URLs in pages prerendered at build time.
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=$SITE_URL
RUN pnpm --filter @imobos/web build

FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
# The standalone server mirrors the monorepo layout, hence apps/web inside it.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health', { redirect: 'manual' }).then(r => process.exit(r.status === 200 ? 0 : 1), () => process.exit(1))"]

CMD ["node", "apps/web/server.js"]
