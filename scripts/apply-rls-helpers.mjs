#!/usr/bin/env node

// Direct SQL execution using fetch to Supabase PostgREST
const SUPABASE_URL = 'https://gkrcaeymhgjepncbceag.supabase.co';
const SERVICE_KEY = 'sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2';

async function executeSQLcommand(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`❌ HTTP ${response.status}:`, text);
    return false;
  }

  console.log('✅ Success');
  return true;
}

async function main() {
  console.log('📦 Applying RLS helper functions...\n');

  const sqls = [
    `CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$ SELECT (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid; $$;`,

    `CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$ SELECT auth.uid(); $$;`,

    `CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$ SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'; $$;`,

    `CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$ SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text; $$;`,

    `GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;`,
  ];

  for (let i = 0; i < sqls.length; i++) {
    console.log(`Executing statement ${i+1}/${sqls.length}...`);
    const success = await executeSQLcommand(sqls[i]);
    if (!success && i < 4) { // Functions are critical
      console.error('❌ Failed to create helper functions');
      process.exit(1);
    }
  }

  console.log('\n✅ All RLS helper functions created successfully!');
  console.log('\n📝 Next step: Update RLS policies to use these helper functions');
  console.log('   Replace: auth.jwt() -> \'user_metadata\' ->> \'company_id\'');
  console.log('   With:    get_user_company_id()');
  console.log('\n   Replace: auth.uid()');
  console.log('   With:    get_current_user_id()');
}

main().catch(console.error);
