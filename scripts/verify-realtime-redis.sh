#!/bin/bash

# Realtime Redis (SRH) Verification Script for WeddingFlo
# June 2026
#
# Verifies the self-hosted realtime stack end-to-end:
#   1. SRH HTTP bridge answers an @upstash/redis-style REST call (SET then GET)
#   2. The app's redis-keepalive cron endpoint reports the Redis PING is healthy
#
# This is the production replacement for Upstash. The app's @upstash/redis client
# speaks HTTP to SRH (see docker-compose.yml `srh`), which proxies to Redis.
#
# Usage (run on the host, or anywhere that can reach the endpoints):
#   SRH_URL=http://localhost:8079 \
#   SRH_TOKEN=<your-srh-token> \
#   APP_URL=http://localhost:3000 \
#   CRON_SECRET=<your-cron-secret> \
#   ./scripts/verify-realtime-redis.sh
#
# Inside the Compose/Dokploy network use SRH_URL=http://srh:80 and APP_URL=http://web:3000.

set -euo pipefail

SRH_URL="${SRH_URL:-http://localhost:8079}"
APP_URL="${APP_URL:-http://localhost:3000}"
SRH_TOKEN="${SRH_TOKEN:?SRH_TOKEN is required}"
CRON_SECRET="${CRON_SECRET:-}"

fail() { echo "❌ $1"; exit 1; }

echo "== 1/2  SRH REST round-trip ($SRH_URL) =="
STAMP="verify-$(date +%s)"
# @upstash/redis REST: POST /set/<key>/<value>  and  GET /get/<key>
SET_RES=$(curl -fsS -X POST \
  -H "Authorization: Bearer ${SRH_TOKEN}" \
  "${SRH_URL}/set/wf:verify/${STAMP}") || fail "SRH SET failed (is the srh service up + token correct?)"
echo "   SET -> ${SET_RES}"

GET_RES=$(curl -fsS \
  -H "Authorization: Bearer ${SRH_TOKEN}" \
  "${SRH_URL}/get/wf:verify") || fail "SRH GET failed"
echo "   GET -> ${GET_RES}"

echo "${GET_RES}" | grep -q "${STAMP}" \
  || fail "SRH round-trip mismatch — value not persisted through to Redis"
echo "✅ SRH ↔ Redis round-trip OK"

echo
echo "== 2/2  App keep-alive endpoint (${APP_URL}/api/cron/redis-keepalive) =="
if [ -n "${CRON_SECRET}" ]; then
  KA=$(curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/redis-keepalive") \
    || fail "keep-alive request failed"
else
  KA=$(curl -fsS "${APP_URL}/api/cron/redis-keepalive") || fail "keep-alive request failed"
fi
echo "   ${KA}"
echo "${KA}" | grep -q '"ok":true' \
  || fail "keep-alive did not report ok — check UPSTASH_REDIS_REST_URL/TOKEN in the app env"
echo "✅ App reaches Redis (realtime pub/sub path healthy)"

echo
echo "🎉 Realtime Redis verified. Cross-tab / cross-user live sync is wired."
