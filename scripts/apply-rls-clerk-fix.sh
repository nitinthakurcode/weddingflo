#!/bin/bash

# Apply Clerk JWT RLS Fix Migration
# This fixes RLS helper functions to read from publicMetadata instead of user_metadata

PROJECT_REF="gkrcaeymhgjepncbceag"
ACCESS_TOKEN="sbp_96691910fda7ef3dd596176c3f57fdb9eef45e38"
MIGRATION_FILE="supabase/migrations/20251119000001_fix_clerk_jwt_rls_functions.sql"

echo "🔧 Applying Clerk JWT RLS Fix Migration..."
echo "📁 Reading: $MIGRATION_FILE"

# Read the SQL file
SQL_CONTENT=$(cat "$MIGRATION_FILE")

# Apply via Supabase Management API
curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . <<< "$SQL_CONTENT")}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "📋 Updated RLS helper functions:"
  echo "  ✓ get_clerk_user_id() - reads from JWT sub claim"
  echo "  ✓ get_user_company_id() - reads from publicMetadata.company_id"
  echo "  ✓ get_current_user_id() - looks up user by Clerk ID"
  echo "  ✓ is_super_admin() - checks publicMetadata.role === 'super_admin'"
  echo "  ✓ get_user_role() - returns publicMetadata.role"
  echo "  ✓ is_admin() - checks if role is company_admin or super_admin"
  echo ""
  echo "🎯 All RLS policies now use November 2025 Clerk JWT standard"
else
  echo "❌ Migration failed"
  echo "📝 Please apply manually via Supabase Dashboard SQL Editor"
  echo "📍 https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
  exit 1
fi
