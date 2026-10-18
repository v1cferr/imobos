# Monitoring and logs

How the operator learns that ImobOS is down, and where to read what happened. Card: V1C-118.
Everything here runs on the production host ([vps.md](vps.md)).

## Uptime alert

`imobos-monitor.timer` runs `infrastructure/monitor/imobos-monitor.sh` every 5 minutes. It checks,
through the public URLs (so DNS, TLS and Caddy are part of the check):

- ImobOS answers `https://<IMOBOS_DOMAIN>/api/health`;
- Chatwoot answers `https://<CHATWOOT_DOMAIN>/api` with `"data_services":"ok"`;
- the root disk is below `DISK_MAX_PERCENT` (90% by default).

Then it pings a healthchecks.io check: success, or `/fail` with the reason. If the host itself
dies, the pings stop and healthchecks.io alerts after the grace time. The backup has its own
check (V1C-88).

### Install (once)

1. In healthchecks.io, create a check "ImobOS uptime": period **5 minutes**, grace **10 minutes**,
   and an integration that reaches the operator's phone (ntfy or e-mail). Keep the ping URL in the
   password manager.
2. On the host:

   ```bash
   sudo install -m 600 /dev/null /etc/imobos/monitor.env   # fill it from monitor.env.example
   sudo systemctl link /srv/imobos/infrastructure/monitor/imobos-monitor.service \
                       /srv/imobos/infrastructure/monitor/imobos-monitor.timer
   sudo systemctl enable --now imobos-monitor.timer
   sudo systemctl start imobos-monitor.service && systemctl status imobos-monitor.service
   ```

### When the alert fires

```bash
journalctl -u imobos-monitor.service -n 20     # which check failed
docker compose ps                              # which service is unhealthy
```

## Logs

Every container logs to the host's journald (`logging: journald` in `compose.yaml`), so logs
outlive a deploy that recreates the container. Retention: 14 days, at most 2 GB
([`infrastructure/journald/imobos.conf`](../../infrastructure/journald/imobos.conf), installed
once with `sudo install -m 644 infrastructure/journald/imobos.conf /etc/systemd/journald.conf.d/`
and `sudo systemctl restart systemd-journald`).

```bash
docker compose logs -f web                      # still works, current container
sudo journalctl CONTAINER_TAG=imobos-web-1 --since "1 hour ago"    # across deploys
sudo journalctl CONTAINER_TAG=imobos-api-1 -p warning --since today
```

The application logs no tokens and no client data; auth events carry only masked e-mails.
