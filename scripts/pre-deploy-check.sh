#!/bin/bash

echo "🚀 WeddingFlo - Pre-Deployment Verification"
echo "================================================"
echo "December 2025 Stack: BetterAuth + Drizzle + PostgreSQL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Check 1: Environment variables (December 2025 Stack)
echo "📋 Checking required environment variables..."
REQUIRED_VARS=(
  "DATABASE_URL"
  "BETTER_AUTH_SECRET"
  "BETTER_AUTH_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}✗${NC} Missing: $var"
    FAILED=1
  else
    echo -e "${GREEN}✓${NC} Found: $var"
  fi
done

# Check 2: Optional but recommended
echo ""
echo "📋 Checking optional environment variables..."
OPTIONAL_VARS=(
  "STRIPE_SECRET_KEY"
  "RESEND_API_KEY"
  "OPENAI_API_KEY"
  "R2_ACCESS_KEY_ID"
)

for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠${NC} Optional: $var (feature may be disabled)"
  else
    echo -e "${GREEN}✓${NC} Found: $var"
  fi
done

# Check 3: Dependencies installed
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules exists"
else
  echo -e "${RED}✗${NC} node_modules missing - run 'npm install'"
  FAILED=1
fi

# Check 4: TypeScript compilation
echo ""
echo "🔍 Running TypeScript check..."
if npx tsc --noEmit 2>/dev/null; then
  echo -e "${GREEN}✓${NC} TypeScript check passed"
else
  echo -e "${RED}✗${NC} TypeScript errors found"
  FAILED=1
fi

# Check 5: Build test
echo ""
echo "🏗️  Testing production build..."
if npm run build > /tmp/build-check.log 2>&1; then
  echo -e "${GREEN}✓${NC} Build successful"
else
  echo -e "${RED}✗${NC} Build failed - run 'npm run build' to see errors"
  echo -e "${YELLOW}ℹ${NC} Check /tmp/build-check.log for details"
  FAILED=1
fi

# Check 6: Check for large files
echo ""
echo "📏 Checking for large files (>1MB)..."
LARGE_FILES=$(find . -type f -size +1M -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" 2>/dev/null)
if [ -z "$LARGE_FILES" ]; then
  echo -e "${GREEN}✓${NC} No large files found"
else
  echo -e "${YELLOW}⚠${NC} Large files detected:"
  echo "$LARGE_FILES"
fi

# Check 7: Critical dependencies (December 2025 Stack)
echo ""
echo "📚 Checking critical dependencies..."
CRITICAL_DEPS=(
  "next"
  "better-auth"
  "drizzle-orm"
  "@trpc/server"
  "@trpc/client"
  "@trpc/react-query"
)

for dep in "${CRITICAL_DEPS[@]}"; do
  if npm list "$dep" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $dep installed"
  else
    echo -e "${RED}✗${NC} $dep missing"
    FAILED=1
  fi
done

# Check 8: Ensure no legacy packages
echo ""
echo "🧹 Checking for legacy packages (should NOT be installed)..."
LEGACY_DEPS=(
  "@clerk/nextjs"
  "@supabase/supabase-js"
  "@supabase/ssr"
)

for dep in "${LEGACY_DEPS[@]}"; do
  if npm list "$dep" > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Legacy package found: $dep (should be removed)"
    FAILED=1
  else
    echo -e "${GREEN}✓${NC} $dep not installed (correct)"
  fi
done

# Final result
echo ""
echo "================================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Ready to deploy${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Fix issues before deploying${NC}"
  exit 1
fi
