#!/usr/bin/env bash
# ImobOS backup (V1C-88): a consistent pg_dump, kept locally for a week and shipped off the host,
# encrypted, by restic. Runs as root from imobos-backup.timer. Secrets: /etc/imobos/backup.env.
# -E (errtrace): the ERR trap must also fire inside functions, or a failed dump would exit
# without cleaning up or reporting the failure.
set -Eeuo pipefail

ENV_FILE="${IMOBOS_BACKUP_ENV:-/etc/imobos/backup.env}"
# shellcheck source=/dev/null
set -a && . "$ENV_FILE" && set +a

IMOBOS_DIR="${IMOBOS_DIR:-/srv/imobos}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/imobos}"
LOCAL_KEEP_DAYS="${LOCAL_KEEP_DAYS:-7}"
RESTIC_IMAGE="restic/restic:0.19.1"

# Dead man's switch: start, success and failure go to healthchecks.io when HC_PING_URL is set. A
# run that never happens is caught by the service itself, which is the point of using one.
ping() {
  [ -n "${HC_PING_URL:-}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "${2:-}" "$HC_PING_URL$1" || true
}
log() { printf '%s %s\n' "$(date -Is)" "$*"; }
dump=""
on_error() {
  local line="$1"
  # A failed run leaves no half-written dump behind, then raises the alarm.
  [ -n "$dump" ] && rm -f "$dump.partial"
  ping /fail "backup failed at line $line"
}
trap 'on_error $LINENO' ERR

compose() { docker compose --project-directory "$IMOBOS_DIR" -f "$IMOBOS_DIR/compose.yaml" "$@"; }

restic() {
  local mounts=(-v "$BACKUP_DIR:/data:ro" -v imobos_restic_cache:/root/.cache/restic)
  # A local repository (tests, or a future second copy on a disk) is mounted at the same path.
  if [[ "$RESTIC_REPOSITORY" == /* ]]; then mounts+=(-v "$RESTIC_REPOSITORY:$RESTIC_REPOSITORY"); fi
  docker run --rm --hostname imobos --env-file "$ENV_FILE" "${mounts[@]}" "$RESTIC_IMAGE" "$@"
}

ping /start
install -d -m 700 "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump="$BACKUP_DIR/imobos-$stamp.dump"
log "dumping postgres to $dump"
# Custom format: compressed, and pg_restore can pick tables. Written to a temp name first, so a
# half-written dump never looks like a backup. The variables expand inside the container.
# shellcheck disable=SC2016
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$dump.partial"
compose exec -T postgres pg_restore --list <"$dump.partial" >/dev/null
mv "$dump.partial" "$dump"
chmod 600 "$dump"

log "local retention: dumps older than $LOCAL_KEEP_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -name 'imobos-*.dump' -mtime "+$LOCAL_KEEP_DAYS" -delete

log "restic backup"
restic backup /data --tag imobos-db --exclude '*.partial'
restic forget --tag imobos-db --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

# Once a week, read back a slice of the stored data: a repository nobody reads is a hope.
if [ "$(date +%u)" = 7 ]; then
  log "weekly restic check"
  restic check --read-data-subset=10%
fi

ping "" "ok $stamp"
log "done"
