#!/usr/bin/env bash
# Restore drill (V1C-88, V1C-94): takes the LATEST snapshots from the off-site repository, restores
# each database dump into a throwaway PostgreSQL and compares row counts with production, and
# restores Chatwoot's attachments. Nothing touches the live databases or volumes.
set -euo pipefail

ENV_FILE="${IMOBOS_BACKUP_ENV:-/etc/imobos/backup.env}"
# shellcheck source=/dev/null
set -a && . "$ENV_FILE" && set +a
IMOBOS_DIR="${IMOBOS_DIR:-/srv/imobos}"
RESTIC_IMAGE="restic/restic:0.19.1"

work="$(mktemp -d)"
containers=()
cleanup() {
  for c in "${containers[@]}"; do docker rm -f "$c" >/dev/null 2>&1 || true; done
  rm -rf "$work"
}
trap cleanup EXIT

mounts=(-v "$work:/restore")
if [[ "$RESTIC_REPOSITORY" == /* ]]; then mounts+=(-v "$RESTIC_REPOSITORY:$RESTIC_REPOSITORY:ro"); fi
# --no-lock: a drill only reads, so it never waits on (or blocks) the nightly backup's lock.
restore() {
  docker run --rm --env-file "$ENV_FILE" "${mounts[@]}" "$RESTIC_IMAGE" \
    restore latest --tag "$1" --target /restore --no-lock >/dev/null
}
restore imobos-db
restore chatwoot-storage

# drill <file prefix> <postgres image> <compose service> <table>
drill() {
  local dump name restored live
  dump="$(find "$work" -name "$1-*.dump" | sort | tail -1)"
  [ -n "$dump" ] || { echo "no $1 dump in the latest snapshot" >&2; return 1; }
  echo "restoring $(basename "$dump")"
  name="imobos-restore-check-$1-$$"
  containers+=("$name")
  docker run -d --name "$name" -e POSTGRES_PASSWORD=drill -v "$work:/restore:ro" "$2" >/dev/null
  for _ in $(seq 60); do docker exec "$name" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  docker exec "$name" createdb -U postgres drill
  docker exec "$name" pg_restore -U postgres -d drill --no-owner "/restore/${dump#"$work"/}"

  restored="$(docker exec "$name" psql -U postgres -d drill -tA -c "select count(*) from $4")"
  # shellcheck disable=SC2016  # expands inside the container
  live="$(docker compose --project-directory "$IMOBOS_DIR" -f "$IMOBOS_DIR/compose.yaml" exec -T "$3" \
    sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "select count(*) from '"$4"'"')"
  echo "$1 $4: restored=$restored live=$live"
  # The snapshot may be up to a day old, so it may hold fewer rows than production, never zero.
  [ "$restored" -gt 0 ]
}
drill imobos postgres:17.11 postgres users
# Chatwoot needs pgvector to restore its schema, so the drill uses its image.
drill chatwoot pgvector/pgvector:0.8.7-pg17 chatwoot-postgres users

[ -d "$work/chatwoot-storage" ] || { echo "no chatwoot-storage in the latest snapshot" >&2; exit 1; }
echo "chatwoot-storage: $(find "$work/chatwoot-storage" -type f | wc -l) files restored"
echo "restore drill ok"
