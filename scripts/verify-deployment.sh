#!/bin/bash
# =============================================================================
# WeddingFlo — Phase 1.1: Deployment Verification Script
# Run on your Hostinger VPS to confirm versions and check for CVE exposure
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo " WeddingFlo Deployment Verification"
echo " $(date)"
echo "=============================================="
echo ""

# ---- Find the app directory ----
APP_DIR="${1:-$(pwd)}"
if [ ! -f "$APP_DIR/package.json" ]; then
  echo -e "${RED}ERROR: package.json not found in $APP_DIR${NC}"
  echo "Usage: ./verify-deployment.sh /path/to/weddingflo"
  exit 1
fi

cd "$APP_DIR"

# ---- 1. Check Next.js version ----
echo "--- Next.js Version ---"
NEXT_VERSION=$(node -e "console.log(require('next/package.json').version)" 2>/dev/null || echo "NOT_FOUND")

if [ "$NEXT_VERSION" = "NOT_FOUND" ]; then
  echo -e "${RED}FAIL: Next.js not found in node_modules${NC}"
  echo "  → Run: npm install (or pnpm install)"
  exit 1
elif [[ "$NEXT_VERSION" == "16.1.6" ]]; then
  echo -e "${GREEN}PASS: Next.js $NEXT_VERSION (latest stable)${NC}"
elif [[ "$NEXT_VERSION" > "16.0.6" ]]; then
  echo -e "${YELLOW}WARN: Next.js $NEXT_VERSION (patched for React2Shell, but not latest)${NC}"
  echo "  → Recommend upgrading to 16.1.6"
else
  echo -e "${RED}CRITICAL: Next.js $NEXT_VERSION is VULNERABLE to React2Shell (CVE-2025-55182)${NC}"
  echo "  → IMMEDIATELY upgrade: npm install next@16.1.6"
  echo "  → Then run scripts/rotate-secrets.sh"
fi

# ---- 2. Check React version ----
echo ""
echo "--- React Version ---"
REACT_VERSION=$(node -e "console.log(require('react/package.json').version)" 2>/dev/null || echo "NOT_FOUND")

if [[ "$REACT_VERSION" == "19.2.4" ]]; then
  echo -e "${GREEN}PASS: React $REACT_VERSION (includes all RSC fixes)${NC}"
elif [[ "$REACT_VERSION" == "NOT_FOUND" ]]; then
  echo -e "${RED}FAIL: React not found${NC}"
else
  echo -e "${YELLOW}WARN: React $REACT_VERSION (expected 19.2.4)${NC}"
fi

# ---- 3. Check BetterAuth version ----
echo ""
echo "--- BetterAuth Version ---"
BA_VERSION=$(node -e "console.log(require('better-auth/package.json').version)" 2>/dev/null || echo "NOT_FOUND")

if [ "$BA_VERSION" = "NOT_FOUND" ]; then
  echo -e "${YELLOW}WARN: BetterAuth not found in node_modules (may use different path)${NC}"
elif [[ "$(printf '%s\n' "1.3.26" "$BA_VERSION" | sort -V | head -n1)" == "1.3.26" ]]; then
  echo -e "${GREEN}PASS: BetterAuth $BA_VERSION (patched for CVE-2025-61928)${NC}"
else
  echo -e "${RED}CRITICAL: BetterAuth $BA_VERSION is VULNERABLE to account takeover (CVE-2025-61928)${NC}"
  echo "  → IMMEDIATELY upgrade: npm install better-auth@latest"
fi

# ---- 4. Check for canary/beta builds ----
echo ""
echo "--- Canary Build Check ---"
NEXT_PKG_VERSION=$(node -e "console.log(require('./node_modules/next/package.json').version)" 2>/dev/null || echo "")
if echo "$NEXT_PKG_VERSION" | grep -qiE "canary|beta|alpha|rc"; then
  echo -e "${RED}CRITICAL: Running a canary/pre-release build: $NEXT_PKG_VERSION${NC}"
  echo "  → Switch to stable: npm install next@16.1.6"
else
  echo -e "${GREEN}PASS: No canary/pre-release builds detected${NC}"
fi

# ---- 5. Check lock file ----
echo ""
echo "--- Lock File Check ---"
if [ -f "pnpm-lock.yaml" ]; then
  LOCK_NEXT=$(grep -A1 "next@" pnpm-lock.yaml | head -5 || echo "")
  echo "Lock file: pnpm-lock.yaml"
  echo "  Next.js entries: $LOCK_NEXT"
elif [ -f "package-lock.json" ]; then
  LOCK_NEXT=$(node -e "const l=require('./package-lock.json');console.log(l.packages?.['node_modules/next']?.version||l.dependencies?.next?.version||'unknown')" 2>/dev/null || echo "")
  echo "Lock file: package-lock.json"
  echo "  Locked Next.js version: $LOCK_NEXT"
else
  echo -e "${YELLOW}WARN: No lock file found. This is a supply chain risk.${NC}"
fi

# ---- 6. Check npm audit ----
echo ""
echo "--- npm audit (critical + high) ---"
npm audit --audit-level=high 2>/dev/null && echo -e "${GREEN}PASS: No high/critical vulnerabilities${NC}" || echo -e "${YELLOW}WARN: Vulnerabilities found (see above)${NC}"

# ---- 7. Check if app was online during React2Shell window ----
echo ""
echo "=============================================="
echo " REACT2SHELL EXPOSURE CHECK"
echo "=============================================="
echo ""
echo "Was this application deployed and publicly accessible between"
echo "December 3-7, 2025, AND running Next.js < 16.0.7?"
echo ""
echo "If YES → Run: ./rotate-secrets.sh"
echo "If NO  → You are safe. No secret rotation needed."
echo "If UNSURE → Rotate secrets as a precaution."
echo ""

# ---- 8. Environment check ----
echo "--- Environment Variables ---"
for VAR in DATABASE_URL BETTER_AUTH_SECRET OPENAI_API_KEY STRIPE_SECRET_KEY AWS_ACCESS_KEY_ID; do
  if [ -n "${!VAR:-}" ]; then
    echo -e "  $VAR: ${GREEN}SET${NC} (${#!VAR} chars)"
  else
    echo -e "  $VAR: ${YELLOW}NOT SET${NC}"
  fi
done

echo ""
echo "=============================================="
echo " Verification complete"
echo "=============================================="
