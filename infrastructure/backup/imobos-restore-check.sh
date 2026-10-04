#!/usr/bin/env bash
# Restore drill (V1C-88): takes the LATEST snapshot from the off-site repository, restores it into a
# throwaway PostgreSQL and compares row counts with production. Nothing touches the live database.
set -euo pipefail

ENV_FILE="${IMOBOS_BACKUP_ENV:-/etc/imobos/backup.env}"
# shellcheck source=/dev/null
set -a && . "$ENV_FILE" && set +a
IMOBOS_DIR="${IMOBOS_DIR:-/srv/imobos}"
RESTIC_IMAGE="restic/restic:0.19.1"
PG_IMAGE="postgres:17.11"

work="$(mktemp -d)"
name="imobos-restore-check-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

mounts=(-v "$work:/restore")
if [[ "$RESTIC_REPOSITORY" == /* ]]; then mounts+=(-v "$RESTIC_REPOSITORY:$RESTIC_REPOSITORY:ro"); fi
# --no-lock: a drill only reads, so it never waits on (or blocks) the nightly backup's lock.
docker run --rm --env-file "$ENV_FILE" "${mounts[@]}" "$RESTIC_IMAGE" \
  restore latest --tag imobos-db --target /restore --no-lock >/dev/null
dump="$(find "$work" -name 'imobos-*.dump' | sort | tail -1)"
[ -n "$dump" ] || { echo "no dump in the latest snapshot" >&2; exit 1; }
echo "restoring $(basename "$dump")"

docker run -d --name "$name" -e POSTGRES_PASSWORD=drill -v "$work:/restore:ro" "$PG_IMAGE" >/dev/null
for _ in $(seq 60); do docker exec "$name" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$name" createdb -U postgres drill
docker exec "$name" pg_restore -U postgres -d drill --no-owner "/restore/${dump#"$work"/}"

restored="$(docker exec "$name" psql -U postgres -d drill -tA -c 'select count(*) from users')"
# shellcheck disable=SC2016  # expands inside the container
live="$(docker compose --project-directory "$IMOBOS_DIR" -f "$IMOBOS_DIR/compose.yaml" exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "select count(*) from users"')"
echo "users: restored=$restored live=$live"
# The snapshot may be up to a day old, so it may hold fewer rows than production, never zero.
[ "$restored" -gt 0 ]
echo "restore drill ok"
