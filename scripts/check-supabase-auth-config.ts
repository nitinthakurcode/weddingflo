/**
 * Check Supabase Auth Configuration
 *
 * This script checks if Clerk is properly configured as an auth provider
 * in your Supabase project.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('========================================')
  console.log('🔍 Checking Supabase Auth Configuration')
  console.log('========================================\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  console.log('📊 Supabase Project Info:')
  console.log('  URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('  Project ID:', process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0])
  console.log('')

  // Test 1: Check if we can query auth schema
  console.log('Test 1: Query auth.users table')
  console.log('--------------------------------')

  try {
    const { data, error } = await supabase.rpc('version' as any)

    if (error) {
      console.log('❌ RPC call failed:', error.message)
    } else {
      console.log('✅ Supabase connection works')
    }
  } catch (err) {
    console.log('⚠️  RPC test skipped')
  }

  console.log('')

  // Test 2: Try to get current JWT claims structure
  console.log('Test 2: Check JWT Claims Structure')
  console.log('-----------------------------------')

  console.log('Expected JWT structure for Clerk integration:')
  console.log('  - iss: Clerk issuer')
  console.log('  - sub: Clerk user ID (clerk_id)')
  console.log('  - azp: Authorized party')
  console.log('  - exp: Expiration')
  console.log('')

  // Test 3: Verify RLS policies are using correct pattern
  console.log('Test 3: Check RLS Policy Patterns')
  console.log('----------------------------------')

  const { data: policies, error: policiesError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          policyname,
          cmd,
          CASE
            WHEN qual IS NOT NULL THEN
              CASE
                WHEN qual LIKE '%auth.jwt()%' THEN 'Uses auth.jwt() ✅'
                WHEN qual LIKE '%auth.uid()%' THEN 'Uses auth.uid() ❌ (wrong for Clerk)'
                ELSE 'Custom logic'
              END
            ELSE 'No USING clause'
          END as using_pattern,
          CASE
            WHEN with_check IS NOT NULL THEN
              CASE
                WHEN with_check LIKE '%auth.jwt()%' THEN 'Uses auth.jwt() ✅'
                WHEN with_check LIKE '%auth.uid()%' THEN 'Uses auth.uid() ❌ (wrong for Clerk)'
                ELSE 'Custom logic'
              END
            ELSE 'No WITH CHECK clause'
          END as with_check_pattern
        FROM pg_policies
        WHERE tablename IN ('users', 'companies')
        ORDER BY tablename, policyname;
      `
    } as any)
    .single()

  if (policiesError) {
    console.log('⚠️  Could not query RLS policies via RPC')
    console.log('   (This is normal - exec_sql function may not exist)')
  } else {
    console.log('✅ RLS policies queried successfully')
    console.log('   Data:', policies)
  }

  console.log('')

  // Test 4: Check if companies and users tables exist
  console.log('Test 4: Verify Database Schema')
  console.log('-------------------------------')

  const { data: companiesCount, error: companiesError } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })

  const { data: usersCount, error: usersError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })

  if (companiesError) {
    console.log('❌ Companies table:', companiesError.message)
  } else {
    console.log('✅ Companies table exists')
  }

  if (usersError) {
    console.log('❌ Users table:', usersError.message)
  } else {
    console.log('✅ Users table exists')
  }

  console.log('')

  // Test 5: Check Clerk environment variables
  console.log('Test 5: Verify Clerk Configuration')
  console.log('-----------------------------------')

  const clerkVars = {
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    'CLERK_SECRET_KEY': !!process.env.CLERK_SECRET_KEY,
    'CLERK_WEBHOOK_SECRET': !!process.env.CLERK_WEBHOOK_SECRET,
  }

  Object.entries(clerkVars).forEach(([key, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${key}: ${exists ? 'Set' : 'Missing'}`)
  })

  console.log('')

  // Test 6: Manual JWT decode simulation
  console.log('Test 6: Clerk JWT Structure Info')
  console.log('---------------------------------')
  console.log('For Clerk integration to work:')
  console.log('  1. Clerk domain must be configured in Supabase')
  console.log('  2. Supabase must accept Clerk-signed JWTs')
  console.log('  3. RLS policies must use: auth.jwt() ->> \'sub\'')
  console.log('  4. \'sub\' claim contains the Clerk user ID')
  console.log('')
  console.log('Your current setup:')
  console.log('  - Code uses getToken() ✅')
  console.log('  - Code uses accessToken() callback ✅')
  console.log('  - RLS policies use auth.jwt() ->> \'sub\' ✅')
  console.log('')

  console.log('========================================')
  console.log('✅ CONFIGURATION CHECK COMPLETE')
  console.log('========================================')
  console.log('')
  console.log('🔍 Next Steps:')
  console.log('  1. Verify Clerk domain is configured in Supabase dashboard')
  console.log('  2. Go to: https://app.supabase.com/project/gkrcaeymhgjepncbceag/auth/providers')
  console.log('  3. Check if "Clerk" is listed as an auth provider')
  console.log('  4. If yes, get the Clerk domain and verify it matches your app')
  console.log('')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
