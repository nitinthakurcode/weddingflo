#!/bin/bash

# Supabase Management API approach
PROJECT_REF="gkrcaeymhgjepncbceag"
ACCESS_TOKEN="sbp_8f2c87204b1bf14dd7b8bfe6e0b80c3288ad938e"

echo "📦 Creating RLS helper functions via Supabase Management API..."
echo ""

# Function to execute SQL via Management API
execute_sql() {
  local sql="$1"
  local description="$2"

  echo "📝 $description"

  # Create a temporary file for the SQL
  local temp_file=$(mktemp)
  echo "$sql" > "$temp_file"

  # Execute via Management API
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(jq -Rs . < "$temp_file")}")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  rm "$temp_file"

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ Success"
  else
    echo "❌ HTTP $http_code: $body"
    return 1
  fi

  echo ""
}

# Create helper function 1
execute_sql "
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid;
\$\$;
" "Creating get_user_company_id function"

# Create helper function 2
execute_sql "
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
  SELECT auth.uid();
\$\$;
" "Creating get_current_user_id function"

# Create helper function 3
execute_sql "
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin';
\$\$;
" "Creating is_super_admin function"

# Create helper function 4
execute_sql "
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
\$\$;
" "Creating get_user_role function"

# Grant permissions
execute_sql "
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
" "Granting execute permissions"

echo "✅ RLS helper functions created successfully!"
echo ""
echo "📝 Next step: Update RLS policies to use these functions"
