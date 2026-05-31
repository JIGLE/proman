#!/usr/bin/env bash
# scripts/init-db — Initialize the ProMan database via the API endpoint
# Usage: bash scripts/init-db [base-url] [init-secret]
#
# Examples:
#   bash scripts/init-db http://localhost:3000                     # no auth (dev)
#   bash scripts/init-db http://localhost:3000 my-secret           # Bearer auth
#   INIT_SECRET=my-secret bash scripts/init-db http://localhost:3000  # from env

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SECRET="${2:-${INIT_SECRET:-}}"
ENDPOINT="${BASE_URL}/api/debug/db/init"

echo "Initializing database at ${ENDPOINT}..."

if [ -n "${SECRET}" ]; then
  echo "  Using Bearer authentication"
  RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer ${SECRET}" \
    "${ENDPOINT}")
else
  echo "  No authentication (dev mode)"
  RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "${ENDPOINT}")
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "HTTP ${HTTP_CODE}"
echo "${BODY}" | jq . 2>/dev/null || echo "${BODY}"

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo ""
  echo "Database initialized successfully."
else
  echo ""
  echo "Error: Database initialization failed (HTTP ${HTTP_CODE})."
  exit 1
fi
