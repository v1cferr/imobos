# Backup and restore

What protects ImobOS's data, how to install it on the host, and how to get the data back. Cards:
V1C-88, V1C-94 (Chatwoot). Everything here runs as root on the production host ([vps.md](vps.md)).

## What is backed up

- **Both PostgreSQL databases** (ImobOS and Chatwoot), each as a `pg_dump` in custom format
  (compressed, restorable table by table).
- **Chatwoot's attachments**, the `imobos_chatwoot_storage` volume, as its own restic series.

Redis is not backed up: neither instance holds anything that cannot be rebuilt.

## How it works

1. `imobos-backup.timer` runs daily at 03:00 (host time), plus a random delay of up to 15 minutes;
   a run missed while the host was down happens at the next boot.
2. `infrastructure/backup/imobos-backup.sh` dumps both databases to `/var/backups/imobos` (root,
   mode 700, `imobos-*.dump` and `chatwoot-*.dump`), checks each dump with `pg_restore --list`, and
   keeps 7 days locally.
3. restic (`restic/restic:0.19.1`, in a container) sends that directory (tag `imobos-db`) and the
   attachments volume (tag `chatwoot-storage`) to the off-site repository, **encrypted before it
   leaves the host**, then keeps 7 daily, 4 weekly and 6 monthly snapshots of each.
   On Sundays it also reads back 10% of the stored data (`restic check --read-data-subset`) and
   runs the restore drill below.
4. Every run reports start, success or failure to healthchecks.io (`HC_PING_URL`). A run that
   fails, or never happens, raises an alert there.

The off-site repository is a Cloudflare R2 bucket: free up to 10 GB and no charge to download,
so a restore never costs anything.

## Install (once)

1. In Cloudflare, create the bucket (for example `imobos-backup`) and an R2 API token with
   **Object Read & Write on that bucket only**. Keep both in the password manager.
2. Generate the repository password and keep it in the password manager too. **Without it the
   backup cannot be restored by anyone.**
3. Write the secrets ([`backup.env.example`](../../infrastructure/backup/backup.env.example)
   lists the names):

   ```bash
   sudo install -d -m 700 /etc/imobos
   sudo install -m 600 /dev/null /etc/imobos/backup.env   # then fill it in
   ```

4. Create the repository, then install and start the timer:

   ```bash
   sudo docker run --rm --env-file /etc/imobos/backup.env restic/restic:0.19.1 init
   sudo systemctl link /srv/imobos/infrastructure/backup/imobos-backup.service \
                       /srv/imobos/infrastructure/backup/imobos-backup.timer
   sudo systemctl enable --now imobos-backup.timer
   sudo systemctl start imobos-backup.service    # first run now
   ```

The units are linked from the checkout, so a `git pull` updates them; run
`sudo systemctl daemon-reload` after a change to a `.service` or `.timer` file.

## Check

```bash
systemctl list-timers imobos-backup.timer          # next and last run
journalctl -u imobos-backup.service -n 50          # the last run's log
sudo docker run --rm --env-file /etc/imobos/backup.env restic/restic:0.19.1 snapshots
```

## Restore drill (weekly by the timer, and by hand after any change here)

```bash
sudo /srv/imobos/infrastructure/backup/imobos-restore-check.sh
```

It takes the latest snapshots from the off-site repository, restores each dump into a throwaway
PostgreSQL container (pgvector for Chatwoot), compares user counts with production, and restores
the attachments. It never touches the live
database, and it reads the repository without locking it.

## Real restore (the database is lost)

```bash
cd /srv/imobos
sudo docker run --rm --env-file /etc/imobos/backup.env -v /tmp/restore:/restore \
  restic/restic:0.19.1 restore latest --tag imobos-db --target /restore
ls /tmp/restore/data/                               # pick the dump to restore
docker compose up -d postgres
docker compose exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < /tmp/restore/data/imobos-<stamp>.dump
docker compose up -d
```

`restore latest` can be replaced by a snapshot id from `restic snapshots` to go back further.

Chatwoot is the same procedure with `chatwoot-postgres` and a `chatwoot-<stamp>.dump`. Its
attachments come back with `restore latest --tag chatwoot-storage` and are copied into the
`imobos_chatwoot_storage` volume. A restored Chatwoot database needs the same Rails keys in `.env`
(password manager item "ImobOS Chatwoot").
