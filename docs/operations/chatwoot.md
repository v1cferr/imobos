# Chatwoot

Conversations and channels ([ADR 0009](../adr/0009-chatwoot-self-hosted.md)), at
`https://chat.<IMOBOS_DOMAIN>`. Card: V1C-94. Run as `v1cferr` in `/srv/imobos`.

## First install

1. DNS: an `A` record for `chat.<IMOBOS_DOMAIN>`, **DNS only**, to the same host. The router's
   split-DNS exception for `<IMOBOS_DOMAIN>` already covers it.
2. `.env`: the `CHATWOOT_*` values ([`.env.example`](../../.env.example)). The four Rails keys come
   from the password manager item "ImobOS Chatwoot"; the database and Redis passwords are generated
   on the host.
3. Database, then the app, **without** the Caddy route yet:

   ```bash
   docker compose up -d --wait chatwoot-postgres chatwoot-redis
   docker compose run --rm -T chatwoot bundle exec rails db:chatwoot_prepare
   docker compose up -d --wait chatwoot chatwoot-worker
   ```

4. Account and super admin (password from the same password manager item, read hidden):

   ```bash
   infrastructure/chatwoot/bootstrap.sh "Account name" "Admin name" admin@example.com
   ```

5. Only now the route: `docker compose up -d caddy` (or `caddy reload` if Caddy already has the
   site), then check the onboarding page is closed:
   `curl -sI https://chat.<domain>/installation/onboarding` answers 302.

## Upgrade

Change the image tag in `compose.yaml` after reading the release notes, then:

```bash
docker compose pull chatwoot
docker compose run --rm -T chatwoot bundle exec rails db:chatwoot_prepare   # migrations
docker compose up -d --wait chatwoot chatwoot-worker
```

The nightly backup runs before any manual upgrade worth the risk: `sudo systemctl start
imobos-backup.service` first.

## Verify

```bash
curl -s https://chat.<domain>/api      # version, "queue_services":"ok", "data_services":"ok"
docker compose ps chatwoot chatwoot-worker chatwoot-postgres chatwoot-redis
```

## Users

Signup is closed. Add an agent in Chatwoot (Settings, Agents) as the administrator; without SMTP the
invitation e-mail is not sent, so the agent signs in with Google (when the client is configured) or
the operator sets a password from the super admin console (`/super_admin`).
