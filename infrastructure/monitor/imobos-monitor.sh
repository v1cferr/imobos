#!/usr/bin/env bash
# ImobOS uptime check (V1C-118): every 5 minutes from imobos-monitor.timer. Checks, through the
# public URLs and so through DNS, TLS and Caddy, that ImobOS and Chatwoot answer and that the disk
# has room, then pings healthchecks.io. A dead host stops pinging, which alerts too.
set -euo pipefail

ENV_FILE="${IMOBOS_MONITOR_ENV:-/etc/imobos/monitor.env}"
# shellcheck source=/dev/null
set -a && . "$ENV_FILE" && set +a
: "${HC_PING_URL:?set HC_PING_URL in $ENV_FILE}" "${IMOBOS_DOMAIN:?}" "${CHATWOOT_DOMAIN:?}"
DISK_MAX_PERCENT="${DISK_MAX_PERCENT:-90}"

problems=()
curl -fsS -m 15 -o /dev/null "https://$IMOBOS_DOMAIN/api/health" || problems+=("imobos down")
chatwoot="$(curl -fsS -m 15 "https://$CHATWOOT_DOMAIN/api" 2>/dev/null || true)"
[[ "$chatwoot" == *'"data_services":"ok"'* ]] || problems+=("chatwoot down")
used="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
[ "$used" -lt "$DISK_MAX_PERCENT" ] || problems+=("disk ${used}%")

if [ ${#problems[@]} -eq 0 ]; then
  curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "ok disk ${used}%" "$HC_PING_URL"
else
  # The reason shows up in the healthchecks.io event log and in the alert.
  curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "${problems[*]}" "$HC_PING_URL/fail"
  echo "${problems[*]}" >&2
  exit 1
fi
