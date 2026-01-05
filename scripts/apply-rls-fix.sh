#!/bin/bash

# Apply RLS Performance Fix migration to Supabase using curl and the Management API
# This fixes auth.jwt() re-evaluation warnings

MIGRATION_FILE="supabase/migrations/20251118080000_fix_rls_performance.sql"
PROJECT_REF="gkrcaeymhgjepncbceag"
SUPABASE_ACCESS_TOKEN="sbp_96691910fda7ef3dd596176c3f57fdb9eef45e38"

echo "🔧 WeddingFlo - RLS Performance Fix"
echo "═══════════════════════════════════════════════"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📖 Reading migration file..."
SQL_CONTENT=$(cat "$MIGRATION_FILE")

echo "📤 Uploading SQL to Supabase..."

# Use Supabase Management API to execute SQL
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . <<< "$SQL_CONTENT")}")

# Check response
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Migration failed!"
    echo "$RESPONSE" | jq '.'
    echo ""
    echo "📋 Please apply manually via Dashboard:"
    echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
    exit 1
else
    echo "✅ RLS Performance Fix applied successfully!"
    echo ""
    echo "🔍 Verify in Dashboard > Database > Linter"
    echo "All 'Auth RLS Initialization Plan' warnings for these tables should be resolved:"
    echo "   - companies, guests, vendors, timeline, budget"
fi
