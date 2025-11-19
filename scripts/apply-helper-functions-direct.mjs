#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://gkrcaeymhgjepncbceag.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcmNhZXltaGdqZXBuY2JjZWFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTM1MDAzMywiZXhwIjoyMDQ0OTI2MDMzfQ.Z2gn3e-7PL0zMHdNpP1DNy4iU3RzgM24tIdY8VKSYxI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql) {
  try {
    // Use the REST API directly to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql })
    });

    const text = await response.text();

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}:`, text);
      return false;
    }

    console.log('✅ Success');
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function createHelperFunctions() {
  console.log('📦 Creating RLS helper functions...\n');

  const functions = [
    {
      name: 'get_user_company_id',
      sql: `
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid;
$$;`
    },
    {
      name: 'get_current_user_id',
      sql: `
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid();
$$;`
    },
    {
      name: 'is_super_admin',
      sql: `
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin';
$$;`
    },
    {
      name: 'get_user_role',
      sql: `
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$;`
    }
  ];

  const grants = [
    'GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;',
    'GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;',
    'GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;',
    'GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;'
  ];

  // Create functions
  for (const func of functions) {
    console.log(`Creating function: ${func.name}...`);
    const success = await executeSQL(func.sql);
    if (!success) {
      console.log(`⚠️  Failed to create ${func.name}, but continuing...`);
    }
  }

  // Grant permissions
  console.log('\nGranting execute permissions...');
  for (const grant of grants) {
    await executeSQL(grant);
  }

  console.log('\n✅ Helper functions setup complete!');
  console.log('\n📝 Next step: Update RLS policies to use these helper functions');
}

createHelperFunctions().catch(console.error);
