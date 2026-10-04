#!/usr/bin/env bash
# Creates the Chatwoot account and its super admin from the shell, then closes the installation
# onboarding (ADR 0009). Chatwoot's own onboarding page lets whoever opens it FIRST become super
# admin, so this runs before Caddy routes the subdomain. Refuses to run twice.
#
#   infrastructure/chatwoot/bootstrap.sh "Account name" "Admin name" admin@example.com
#
# The password is read hidden and reaches Rails through the environment, never the command line.
set -euo pipefail

[ $# -eq 3 ] || { echo "usage: $0 <account name> <admin name> <admin email>" >&2; exit 2; }
IMOBOS_DIR="${IMOBOS_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
read -rsp "Admin password: " CW_PASSWORD && echo
export CW_ACCOUNT="$1" CW_NAME="$2" CW_EMAIL="$3" CW_PASSWORD

docker compose --project-directory "$IMOBOS_DIR" -f "$IMOBOS_DIR/compose.yaml" exec -T \
  -e CW_ACCOUNT -e CW_NAME -e CW_EMAIL -e CW_PASSWORD chatwoot bundle exec rails runner '
    abort "Chatwoot already has users; nothing done." if User.exists?
    AccountBuilder.new(
      account_name: ENV.fetch("CW_ACCOUNT"), user_full_name: ENV.fetch("CW_NAME"),
      email: ENV.fetch("CW_EMAIL"), user_password: ENV.fetch("CW_PASSWORD"),
      super_admin: true, confirmed: true
    ).perform
    Redis::Alfred.delete(Redis::Alfred::CHATWOOT_INSTALLATION_ONBOARDING)
    puts "account and super admin created; onboarding closed"
  '
