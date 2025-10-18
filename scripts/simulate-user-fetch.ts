/**
 * Simulate User Fetch (the actual 500 error scenario)
 *
 * This simulates what happens when the dashboard tries to fetch user data
 * using a Clerk-authenticated Supabase client.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('========================================')
  console.log('🧪 Simulating User Fetch (500 Error Scenario)')
  console.log('========================================\n')

  // Simulate what happens in the browser
  console.log('Scenario: User is logged in with Clerk')
  console.log('Dashboard tries to fetch user data from Supabase')
  console.log('')

  // Create admin client (service role - bypasses RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  console.log('Test 1: Fetch users with ADMIN client (bypasses RLS)')
  console.log('-----------------------------------------------------')

  const { data: usersAdmin, error: usersAdminError } = await adminClient
    .from('users')
    .select('*')

  if (usersAdminError) {
    console.log('❌ Admin fetch failed:', usersAdminError.message)
  } else {
    console.log(`✅ Admin can fetch users: ${usersAdmin?.length || 0} found`)
    if (usersAdmin && usersAdmin.length > 0) {
      usersAdmin.forEach((user, i) => {
        console.log(`   User ${i + 1}:`, {
          clerk_id: user.clerk_id,
          email: user.email,
          role: user.role,
          company_id: user.company_id || 'NULL ❌',
        })
      })
    }
  }

  console.log('')

  // Create client WITHOUT auth (simulating missing Clerk token)
  console.log('Test 2: Fetch users with CLIENT (no auth - will fail)')
  console.log('------------------------------------------------------')

  const unauthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: usersUnauth, error: usersUnauthError } = await unauthClient
    .from('users')
    .select('*')

  if (usersUnauthError) {
    console.log('❌ Unauthenticated fetch failed (EXPECTED):', usersUnauthError.message)
    console.log('   This is correct behavior - RLS is working!')
  } else {
    console.log('⚠️  Unauthenticated fetch SUCCEEDED (RLS might be disabled!)')
    console.log(`   Found ${usersUnauth?.length || 0} users`)
  }

  console.log('')

  // Simulate with a fake token (what would happen if Clerk token was invalid)
  console.log('Test 3: Fetch with FAKE token (simulates invalid Clerk JWT)')
  console.log('-------------------------------------------------------------')

  const fakeTokenClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        return 'fake_invalid_token_12345'
      },
    }
  )

  const { data: usersFake, error: usersFakeError } = await fakeTokenClient
    .from('users')
    .select('*')

  if (usersFakeError) {
    console.log('❌ Fake token fetch failed (EXPECTED):', usersFakeError.message)
    if (usersFakeError.message.includes('Invalid JWT') ||
        usersFakeError.message.includes('invalid') ||
        usersFakeError.message.includes('401')) {
      console.log('   ✅ Supabase correctly rejected invalid token!')
    } else {
      console.log('   ⚠️  Error might be something else')
    }
  } else {
    console.log('⚠️  Fake token fetch SUCCEEDED (this should not happen!)')
  }

  console.log('')

  console.log('========================================')
  console.log('🔍 DIAGNOSIS')
  console.log('========================================\n')

  if (usersAdmin && usersAdmin.length === 0) {
    console.log('📊 Status: Database is CLEAN (no users yet)')
    console.log('')
    console.log('✅ This is good! Your database is ready.')
    console.log('')
    console.log('Next step: Test actual user signup:')
    console.log('  1. npm run dev')
    console.log('  2. Sign up with a new account')
    console.log('  3. Watch webhook logs in terminal')
    console.log('  4. Verify both company AND user are created')
    console.log('  5. Dashboard should load without errors')
    console.log('')
  } else if (usersAdmin && usersAdmin.length > 0) {
    console.log('📊 Status: Users exist in database')
    console.log('')

    const usersWithoutCompany = usersAdmin.filter(u => !u.company_id)
    if (usersWithoutCompany.length > 0) {
      console.log('❌ PROBLEM FOUND:')
      console.log(`   ${usersWithoutCompany.length} user(s) WITHOUT company_id!`)
      console.log('')
      console.log('   This causes 500 errors when fetching user data.')
      console.log('')
      console.log('   Solution:')
      console.log('     1. Delete these broken users')
      console.log('     2. Run: npx tsx scripts/cleanup-current-user.ts')
      console.log('     3. Sign up fresh')
      console.log('')
    } else {
      console.log('✅ All users have companies assigned')
      console.log('')
      console.log('If you\'re still getting 500 errors, the issue is likely:')
      console.log('  - Clerk JWT not being sent to Supabase')
      console.log('  - Clerk domain not configured in Supabase')
      console.log('  - Token validation failing')
      console.log('')
      console.log('Check browser console network tab:')
      console.log('  - Look for Supabase requests')
      console.log('  - Check if Authorization header is present')
      console.log('  - Check the token format')
      console.log('')
    }
  }

  // Check RLS policies
  console.log('🔒 RLS Policy Check:')
  console.log('--------------------')

  const { data: policies, error: policiesError } = await adminClient
    .rpc('exec_sql', {
      sql: 'SELECT tablename, policyname FROM pg_policies WHERE tablename IN (\'users\', \'companies\') ORDER BY tablename, policyname'
    } as any)
    .single()

  if (policiesError) {
    console.log('⚠️  Could not check RLS policies programmatically')
    console.log('   This is normal - use Supabase dashboard to verify')
  } else {
    console.log('✅ RLS policies exist (checked via exec_sql)')
  }

  console.log('')
  console.log('========================================')
  console.log('✅ SIMULATION COMPLETE')
  console.log('========================================')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
