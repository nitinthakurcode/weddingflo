#!/usr/bin/env bash
#
# verify-phase2.sh — Post-Deployment Verification for Phase 2 Security Remediation
#
# Runs 5 checks from docs/phase2/README.md "Post-Deployment Verification":
#   1. Health check (curl)
#   2. RLS verification (prints psql command — requires DB creds)
#   3. HSTS header check
#   4. CSP header check
#   5. npm audit --audit-level=high
#
# Usage: ./scripts/verify-phase2.sh
#

set -uo pipefail

DOMAIN="https://app.weddingflow.pro"
PASS=0
FAIL=0
MANUAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

pass() {
  echo -e "  ${GREEN}PASS${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}FAIL${NC} $1"
  FAIL=$((FAIL + 1))
}

manual() {
  echo -e "  ${YELLOW}MANUAL${NC} $1"
  MANUAL=$((MANUAL + 1))
}

echo ""
echo -e "${BOLD}WeddingFlo Phase 2 — Post-Deployment Verification${NC}"
echo -e "${BOLD}==================================================${NC}"
echo ""

# ---- Check 1: Health endpoint ----
echo -e "${BOLD}[1/5] Health Check${NC}"
echo "     GET ${DOMAIN}/api/health"

if curl -sf --max-time 10 "${DOMAIN}/api/health" > /dev/null 2>&1; then
  pass "Health endpoint returned 200 OK"
else
  EXIT_CODE=$?
  if [ "$EXIT_CODE" -eq 6 ]; then
    fail "Could not resolve host (DNS not configured or app not deployed)"
  elif [ "$EXIT_CODE" -eq 28 ]; then
    fail "Connection timed out after 10s"
  elif [ "$EXIT_CODE" -eq 22 ]; then
    fail "Health endpoint returned non-2xx status"
  else
    fail "Health check failed (curl exit code: ${EXIT_CODE})"
  fi
fi
echo ""

# ---- Check 2: RLS verification ----
echo -e "${BOLD}[2/5] RLS Verification${NC}"
echo "     Requires database credentials — run manually:"
echo ""
echo -e "     ${YELLOW}psql -U weddingflo_app -d weddingflo -c \"SELECT count(*) FROM clients;\"${NC}"
echo "     Expected: 0 rows (no tenant context set = RLS blocks all rows)"
echo ""
echo -e "     ${YELLOW}psql -U weddingflo_app -d weddingflo -c \"SET app.current_company_id = '<your-company-id>'; SELECT count(*) FROM clients;\"${NC}"
echo "     Expected: Only rows belonging to that company"
echo ""
manual "RLS check requires manual psql verification (see commands above)"
echo ""

# ---- Check 3: HSTS header ----
echo -e "${BOLD}[3/5] HSTS Header${NC}"
echo "     Checking Strict-Transport-Security header..."

HSTS_HEADER=$(curl -sI --max-time 10 "${DOMAIN}" 2>/dev/null | grep -i "strict-transport-security" || true)

if [ -n "$HSTS_HEADER" ]; then
  pass "HSTS header present: ${HSTS_HEADER}"
else
  # Check if domain is reachable at all
  if curl -sI --max-time 10 "${DOMAIN}" > /dev/null 2>&1; then
    fail "HSTS header NOT present (domain reachable but header missing)"
    echo "     Fix: Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload'"
    echo "     to your Cloudflare, Nginx, or Next.js config"
  else
    fail "Could not reach ${DOMAIN} — deploy first, then re-run"
  fi
fi
echo ""

# ---- Check 4: CSP header ----
echo -e "${BOLD}[4/5] Content-Security-Policy Header${NC}"
echo "     Checking Content-Security-Policy header..."

CSP_HEADER=$(curl -sI --max-time 10 "${DOMAIN}" 2>/dev/null | grep -i "content-security-policy" || true)

if [ -n "$CSP_HEADER" ]; then
  pass "CSP header present"
  # Truncate long CSP for display
  CSP_DISPLAY=$(echo "$CSP_HEADER" | cut -c 1-120)
  echo "     ${CSP_DISPLAY}..."
else
  if curl -sI --max-time 10 "${DOMAIN}" > /dev/null 2>&1; then
    fail "CSP header NOT present (domain reachable but header missing)"
    echo "     Fix: Add a Content-Security-Policy header to your hosting config"
  else
    fail "Could not reach ${DOMAIN} — deploy first, then re-run"
  fi
fi
echo ""

# ---- Check 5: npm audit ----
echo -e "${BOLD}[5/5] npm audit (high + critical)${NC}"
echo "     Running npm audit --audit-level=high..."
echo ""

# Find project root (script may be run from anywhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if npm audit --audit-level=high --prefix "${PROJECT_ROOT}" 2>/dev/null; then
  pass "No high/critical vulnerabilities found"
else
  AUDIT_EXIT=$?
  if [ "$AUDIT_EXIT" -eq 1 ]; then
    fail "npm audit found high or critical vulnerabilities (run 'npm audit' for details)"
  else
    fail "npm audit failed to run (exit code: ${AUDIT_EXIT})"
  fi
fi
echo ""

# ---- Summary ----
echo -e "${BOLD}==================================================${NC}"
echo -e "${BOLD}Summary${NC}"
echo -e "  ${GREEN}Passed:${NC}  ${PASS}"
echo -e "  ${RED}Failed:${NC}  ${FAIL}"
echo -e "  ${YELLOW}Manual:${NC}  ${MANUAL}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All automated checks passed.${NC}"
else
  echo -e "${RED}${BOLD}${FAIL} check(s) failed — review above and fix before signing off.${NC}"
fi

if [ "$MANUAL" -gt 0 ]; then
  echo -e "${YELLOW}${MANUAL} check(s) require manual verification.${NC}"
fi

echo ""
exit "$FAIL"
