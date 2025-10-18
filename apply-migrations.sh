#!/bin/bash

# Script to link Supabase and apply migrations
# This fixes the 500 errors by updating RLS policies for Clerk JWT

echo "================================================"
echo "🔧 Supabase Migration Setup"
echo "================================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed!"
    echo "Run: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI is installed"
echo ""

# Prompt for access token
echo "📝 Please create a Supabase access token:"
echo "   1. Go to: https://supabase.com/dashboard/account/tokens"
echo "   2. Click 'Generate new token'"
echo "   3. Name it 'CLI Access' and copy the token"
echo ""
read -sp "Paste your Supabase access token: " SUPABASE_ACCESS_TOKEN
echo ""
echo ""

# Export the token
export SUPABASE_ACCESS_TOKEN

# Link the project
echo "🔗 Linking Supabase project..."
if supabase link --project-ref gkrcaeymhgjepncbceag; then
    echo "✅ Project linked successfully!"
else
    echo "❌ Failed to link project"
    exit 1
fi

echo ""
echo "📦 Applying database migrations..."
echo ""

# Apply migrations
if supabase db push; then
    echo ""
    echo "================================================"
    echo "✅ SUCCESS! Migrations applied!"
    echo "================================================"
    echo ""
    echo "What was fixed:"
    echo "  - Created users table with correct 'clerk_id' field"
    echo "  - Updated RLS policies to work with Clerk JWT"
    echo "  - Created auth.clerk_user_id() helper function"
    echo ""
    echo "Next step: Try logging in again!"
    echo ""
else
    echo ""
    echo "❌ Failed to apply migrations"
    echo ""
    echo "If you see errors, please share them so I can help debug."
    exit 1
fi
