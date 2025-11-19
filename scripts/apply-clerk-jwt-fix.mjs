#!/usr/bin/env node
/**
 * Apply Clerk JWT RLS Fix Migration
 * Fixes RLS helper functions to read from publicMetadata instead of user_metadata
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('📖 Reading migration file...');
const migrationSQL = readFileSync('supabase/migrations/20251119000001_fix_clerk_jwt_rls_functions.sql', 'utf8');

console.log('🔧 Applying Clerk JWT RLS fix migration...');

try {
  // Execute the migration SQL
  const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');
  console.log('\n📋 Updated RLS helper functions:');
  console.log('  - get_clerk_user_id() - reads from JWT sub claim');
  console.log('  - get_user_company_id() - reads from publicMetadata.company_id');
  console.log('  - get_current_user_id() - looks up user by Clerk ID');
  console.log('  - is_super_admin() - checks publicMetadata.role === "super_admin"');
  console.log('  - get_user_role() - returns publicMetadata.role');
  console.log('  - is_admin() - checks if role is company_admin or super_admin');
  console.log('\n🎯 All RLS policies now use November 2025 Clerk JWT standard');

} catch (err) {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}
