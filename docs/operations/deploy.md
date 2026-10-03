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

- `IMOBOS_DOMAIN`, `ACME_EMAIL`, `BASIC_AUTH_USER`.
- `BASIC_AUTH_HASH`: the bcrypt hash of a password kept in the password manager, in single quotes:
  `docker run --rm caddy:2.11.6-alpine caddy hash-password --plaintext '<password>'`.
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`: generated on the host and never copied anywhere else,
  e.g. `openssl rand -hex 32`.
- `AUTH_SECRET`: generated on the host, `openssl rand -base64 33`. Rotating it signs everyone out.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: the Google OAuth client ("Web application") kept in the
  password manager. Its authorized redirect URIs are exactly
  `https://<domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google`
  for development); no wildcard.
- `IMOBOS_ALLOWED_EMAILS`: the Google email(s) allowed in, comma-separated. Editing it and running
  `docker compose up -d` locks a removed address out on its next request.

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

## Verify

```bash
curl -sI https://<domain>/login       # 200: the sign-in page
curl -sI https://<domain>/today       # 307 to /login: no session, no page
curl -s  https://<domain>/api/me      # {"error":"unauthorized"} with 401
sudo ss -tlnp                         # only 22, 80 and 443 listen publicly
docker compose logs web | grep '"event":"auth'   # auth events, never tokens or emails
```

Then in a browser: the allowed Google account lands on `/today`, any other account is refused on
`/login`, a refresh keeps the session, and "Sair" ends it.

## Data

PostgreSQL and Redis keep their state in the named volumes `imobos_postgres_data` and
`imobos_redis_data`; certificates live in `imobos_caddy_data`. `docker compose down` keeps them.
**`docker compose down -v` deletes them**, and there is no backup yet (V1C-88).
