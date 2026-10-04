# Deploy

How ImobOS is deployed on the production host ([vps.md](vps.md)). Run as `v1cferr` in
`/srv/imobos`.

## Prerequisites

- DNS: an `A` record for the public hostname pointing at the host, **DNS only** (not proxied by
  Cloudflare), so Caddy can complete the ACME HTTP challenge on port 80.
- Inside the home network, the router's split DNS answers `*.v1cferr.dev` locally. Each hostname
  that lives elsewhere needs a `server=/<name>/...` exception, or it resolves to the home server.

## First deploy

```bash
cd /srv/imobos
git pull --ff-only
cp .env.example .env && chmod 600 .env
```

Fill `.env`:

- `IMOBOS_DOMAIN`, `ACME_EMAIL`.
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`: generated on the host and never copied anywhere else,
  e.g. `openssl rand -hex 32`.
- `AUTH_SECRET`: generated on the host, `openssl rand -base64 33`. Rotating it signs everyone out.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: the Google OAuth client ("Web application") kept in the
  password manager. Its authorized redirect URIs are exactly
  `https://<domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google`
  for development); no wildcard.
- `IMOBOS_ADMIN_EMAILS` (required): bootstrap admins, comma-separated Google emails. Everyone
  else signs up and is approved on `/admin/users` (ADR 0007).
- `IMOBOS_SIGNUP_OPEN` (`true`/`false`) and `IMOBOS_MAX_PENDING`: whether unknown accounts may
  request access, and how many requests may wait. Close sign-up once the expected users are in.
- `INTERNAL_API_TOKEN`: generated on the host, `openssl rand -hex 32`; shared by web and api.

```bash
docker compose up -d --build
docker compose ps        # every service with a healthcheck reports (healthy)
```

## Update

```bash
cd /srv/imobos
git pull --ff-only
docker compose up -d --build
```

A change to `infrastructure/caddy/Caddyfile` needs a reload after the pull:
`docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`.

Never run `git pull` in a shell with a restrictive `umask` (for example right after writing
`.env` with `umask 077`): new files would be created unreadable to the containers' users.

## Verify

```bash
curl -sI https://<domain>/login       # 200: the sign-in page
curl -sI https://<domain>/today       # 307 to /login: no session, no page
curl -s  https://<domain>/api/me      # {"error":"unauthorized"} with 401
sudo ss -tlnp                         # only 22, 80 and 443 listen publicly
docker compose logs web | grep '"event":"auth'   # auth events, never tokens or emails
docker compose exec api alembic current          # the schema revision in use
```

Then in a browser: an admin lands on `/today`; a new account sees "pedido de acesso enviado" and
appears on `/admin/users`; once approved it enters; a refresh keeps the session, and "Sair" ends
it. Without a session, every screen redirects to `/login` and every API route answers 401; only
`/login`, `/privacidade`, `/api/auth/*` and `/api/health` are public.

## Data

PostgreSQL and Redis keep their state in the named volumes `imobos_postgres_data` and
`imobos_redis_data`; certificates live in `imobos_caddy_data`. `docker compose down` keeps them.
**`docker compose down -v` deletes them**; the database is backed up nightly off the host
([backup.md](backup.md)).
