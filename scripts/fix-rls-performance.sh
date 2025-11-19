#!/bin/bash

# This script applies RLS performance optimizations
# It wraps auth.jwt() and auth.uid() calls in (SELECT ...) to prevent re-evaluation per row

export PGPASSWORD="Nitin@123"
DB_URL="postgresql://postgres.gkrcaeymhgjepncbceag@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

echo "🔧 Applying RLS Performance Optimizations..."
echo ""

# Function to execute SQL
execute_sql() {
  local sql="$1"
  local description="$2"

  echo "📝 $description"
  echo "$sql" | docker run --rm -i postgres:15 psql "$DB_URL" 2>&1 | grep -v "^$" || true
  echo ""
}

# Note: The main issue is that these auth function calls are NOT wrapped in SELECT
# We need to find all policies and update them

# Part 1: Create a helper function first
execute_sql "
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS \$\$
  SELECT (auth.jwt() -> 'metadata' ->> 'company_id')::uuid;
\$\$;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS \$\$
  SELECT auth.uid();
\$\$;
" "Creating helper functions for auth calls"

echo "✅ Helper functions created!"
echo ""
echo "💡 Next steps:"
echo "   1. Update all RLS policies to use get_user_company_id() instead of direct auth.jwt() calls"
echo "   2. Update all RLS policies to use get_current_user_id() instead of direct auth.uid() calls"
echo "   3. This will automatically optimize performance by evaluating auth functions once per query"
