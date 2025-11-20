#!/bin/bash

echo "🚀 WeddingFlow Pro - Pre-Deployment Verification"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Check 1: Environment variables
echo "📋 Checking required environment variables..."
REQUIRED_VARS=(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_SECRET_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}✗${NC} Missing: $var"
    FAILED=1
  else
    echo -e "${GREEN}✓${NC} Found: $var"
  fi
done

# Check 2: Dependencies installed
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules exists"
else
  echo -e "${RED}✗${NC} node_modules missing - run 'npm install'"
  FAILED=1
fi

# Check 3: TypeScript compilation
echo ""
echo "🔍 Running TypeScript check..."
if npx tsc --noEmit; then
  echo -e "${GREEN}✓${NC} TypeScript check passed"
else
  echo -e "${RED}✗${NC} TypeScript errors found"
  FAILED=1
fi

# Check 4: Build test
echo ""
echo "🏗️  Testing production build..."
if npm run build > /tmp/build-check.log 2>&1; then
  echo -e "${GREEN}✓${NC} Build successful"
else
  echo -e "${RED}✗${NC} Build failed - run 'npm run build' to see errors"
  echo -e "${YELLOW}ℹ${NC} Check /tmp/build-check.log for details"
  FAILED=1
fi

# Check 5: Check for large files
echo ""
echo "📏 Checking for large files (>1MB)..."
LARGE_FILES=$(find . -type f -size +1M -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" 2>/dev/null)
if [ -z "$LARGE_FILES" ]; then
  echo -e "${GREEN}✓${NC} No large files found"
else
  echo -e "${YELLOW}⚠${NC} Large files detected:"
  echo "$LARGE_FILES"
fi

# Check 6: Migrations applied
echo ""
echo "🗄️  Checking database migrations..."
echo -e "${YELLOW}ℹ${NC} Ensure all migrations are applied: supabase db push"

# Check 7: Critical dependencies
echo ""
echo "📚 Checking critical dependencies..."
CRITICAL_DEPS=(
  "next"
  "@clerk/nextjs"
  "@supabase/supabase-js"
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
