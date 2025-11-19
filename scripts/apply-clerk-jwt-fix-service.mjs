#!/usr/bin/env node
/**
 * Apply Clerk JWT RLS Fix Migration using Supabase Service Role
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkrcaeymhgjepncbceag.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2';

console.log('📖 Reading migration file...');
const migrationSQL = readFileSync('supabase/migrations/20251119000001_fix_clerk_jwt_rls_functions.sql', 'utf8');

console.log('🔌 Connecting to Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log('🔧 Applying Clerk JWT RLS fix migration...');

try {
  // Split the SQL into individual statements and execute them
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      // Try direct query if rpc doesn't exist
      const result = await supabase.from('_migrations').insert({});
      if (result.error && result.error.message.includes('does not exist')) {
        console.log('ℹ️  Using direct SQL execution...');
        // Direct execution via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
        }
      } else if (error) {
        throw error;
      }
    }
  }

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
  console.error('\n💡 Trying alternative approach...');

  // Try executing the whole thing at once
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/sql',
        'Prefer': 'return=minimal'
      },
      body: migrationSQL
    });

    if (response.ok) {
      console.log('✅ Migration applied via SQL endpoint!');
    } else {
      const errorText = await response.text();
      console.error('❌ Alternative method also failed:', errorText);
      console.error('\n📝 Please apply this migration manually via Supabase Dashboard SQL Editor');
      process.exit(1);
    }
  } catch (altErr) {
    console.error('❌ Alternative method failed:', altErr.message);
    console.error('\n📝 Please apply this migration manually via Supabase Dashboard SQL Editor');
    console.error('📍 File location: supabase/migrations/20251119000001_fix_clerk_jwt_rls_functions.sql');
    process.exit(1);
  }
}
