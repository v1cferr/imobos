# Production host

What the VPS provides before this repository is deployed on it. The host was prepared in V1C-86;
this page is the reference, not a runbook to repeat.

## Host

- KingHost VPS, Ubuntu 24.04 LTS (Xen HVM), reached as `vps.v1cferr.dev`.
- SSH by key only, as `v1cferr` (groups `sudo` and `docker`). Root cannot log in over SSH; the
  provider's web console is the emergency path.
- ufw allows 22 (rate limited), 80 and 443. Docker bypasses ufw, hence the no-`ports:` rule
  in [ADR 0003](../adr/0003-tooling-vs-runtime.md).
- Nix (upstream, multi-user, flakes enabled) with `direnv` + `nix-direnv` for `v1cferr`.
- Docker Engine with the Compose plugin.

## Layout

```text
/srv/imobos/          this repository, cloned over HTTPS, owned by v1cferr
/srv/imobos/.env      secrets, mode 600, never committed
Docker named volumes  service state (databases, certificates, uploads)
/var/backups/imobos/  database dumps, root-only, shipped off the host by restic (backup.md)
/etc/imobos/          backup secrets (backup.env), root-only
```

Code, state and secrets are kept apart because they have different lifecycles: a re-clone or
`git clean` must never be able to touch data.

## Known host quirks

- Outbound NTP is blocked except to `ntp.locaweb.com.br`, which `systemd-timesyncd` uses.
- `/boot` is a separate partition (`xvda2`). Before a kernel upgrade, `findmnt /boot` must show it.
