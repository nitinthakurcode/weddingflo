#!/bin/bash

# Apply SQL migration to Supabase using curl and the Management API
# This bypasses the need for psql or MCP

MIGRATION_FILE="supabase/migrations/20251118070157_fix_function_search_path_security.sql"
PROJECT_REF="gkrcaeymhgjepncbceag"
SUPABASE_ACCESS_TOKEN="sbp_8f2c87204b1bf14dd7b8bfe6e0b80c3288ad938e"

echo "🔧 WeddingFlow Pro - SQL Migration Applicator"
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
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🔍 Verify in Dashboard > Database > Linter"
    echo "All 'Function Search Path Mutable' warnings should be resolved."
fi
