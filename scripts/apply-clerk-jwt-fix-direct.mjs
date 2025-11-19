#!/usr/bin/env node
/**
 * Apply Clerk JWT RLS Fix Migration - Direct Connection
 * Fixes RLS helper functions to read from publicMetadata instead of user_metadata
 */

import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.gkrcaeymhgjepncbceag:Nitin@123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

console.log('📖 Reading migration file...');
const migrationSQL = readFileSync('supabase/migrations/20251119000001_fix_clerk_jwt_rls_functions.sql', 'utf8');

console.log('🔌 Connecting to database...');
const client = new Client({ connectionString });

try {
  await client.connect();
  console.log('✅ Connected');

  console.log('🔧 Applying Clerk JWT RLS fix migration...');
  await client.query(migrationSQL);

  console.log('✅ Migration applied successfully!');
  console.log('\n📋 Updated RLS helper functions:');
  console.log('  ✓ get_clerk_user_id() - reads from JWT sub claim');
  console.log('  ✓ get_user_company_id() - reads from publicMetadata.company_id');
  console.log('  ✓ get_current_user_id() - looks up user by Clerk ID');
  console.log('  ✓ is_super_admin() - checks publicMetadata.role === "super_admin"');
  console.log('  ✓ get_user_role() - returns publicMetadata.role');
  console.log('  ✓ is_admin() - checks if role is company_admin or super_admin');
  console.log('\n🎯 All RLS policies now use November 2025 Clerk JWT standard');

} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
