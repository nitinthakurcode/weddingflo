/**
 * Test Supabase Connection
 *
 * This script tests if your Supabase API keys are working correctly
 * with the 2025 native integration.
 *
 * Usage:
 *   npx tsx scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('========================================')
  console.log('🔌 Testing Supabase Connection')
  console.log('========================================\n')

  // Test 1: Client-side connection (publishable key)
  console.log('Test 1: Client-side connection (publishable key)')
  console.log('------------------------------------------------')

  const clientSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  try {
    // This should work without auth (public access)
    const { data, error } = await clientSupabase
      .from('companies')
      .select('count')
      .limit(1)

    if (error) {
      console.log('❌ Client connection error:', error.message)
      console.log('   This is expected if RLS is enabled (no auth context)')
    } else {
      console.log('✅ Client connection works!')
      console.log('   Data:', data)
    }
  } catch (err) {
    console.log('❌ Client connection failed:', err)
  }

  console.log('')

  // Test 2: Server-side admin connection (service role key)
  console.log('Test 2: Server-side admin connection (service role key)')
  console.log('--------------------------------------------------------')

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  try {
    // This should bypass RLS
    const { data: companies, error: companiesError } = await adminSupabase
      .from('companies')
      .select('*')
      .limit(5)

    if (companiesError) {
      console.log('❌ Admin connection error:', companiesError.message)
      console.log('   Full error:', JSON.stringify(companiesError, null, 2))
    } else {
      console.log('✅ Admin connection works!')
      console.log(`   Found ${companies?.length || 0} companies`)
      if (companies && companies.length > 0) {
        console.log('   First company:', {
          id: companies[0].id,
          name: companies[0].name,
          subdomain: companies[0].subdomain,
        })
      }
    }
  } catch (err) {
    console.log('❌ Admin connection failed:', err)
  }

  console.log('')

  // Test 3: Check users table
  console.log('Test 3: Check users table')
  console.log('-------------------------')

  try {
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select('id, email, role, company_id')
      .limit(5)

    if (usersError) {
      console.log('❌ Users query error:', usersError.message)
    } else {
      console.log(`✅ Found ${users?.length || 0} users`)
      users?.forEach((user, i) => {
        console.log(`   User ${i + 1}:`, {
          email: user.email,
          role: user.role,
          has_company: !!user.company_id,
        })
      })
    }
  } catch (err) {
    console.log('❌ Users query failed:', err)
  }

  console.log('')

  // Test 4: Try to insert a test company (then delete it)
  console.log('Test 4: Test company creation (webhook simulation)')
  console.log('---------------------------------------------------')

  try {
    const testCompany = {
      name: 'Test Company (Delete Me)',
      subdomain: `test${Date.now()}`,
      subscription_tier: 'free',
      subscription_status: 'trialing',
    }

    const { data: newCompany, error: insertError } = await adminSupabase
      .from('companies')
      .insert(testCompany)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Company creation failed!')
      console.log('   Error:', insertError.message)
      console.log('   Full error:', JSON.stringify(insertError, null, 2))
      console.log('')
      console.log('🔍 This is likely the issue causing webhook failures!')
    } else {
      console.log('✅ Company creation works!')
      console.log('   Created company:', {
        id: newCompany.id,
        name: newCompany.name,
      })

      // Clean up - delete the test company
      const { error: deleteError } = await adminSupabase
        .from('companies')
        .delete()
        .eq('id', newCompany.id)

      if (!deleteError) {
        console.log('✅ Test company deleted (cleanup successful)')
      }
    }
  } catch (err) {
    console.log('❌ Company creation test failed:', err)
  }

  console.log('')
  console.log('========================================')
  console.log('✅ CONNECTION TEST COMPLETE')
  console.log('========================================')
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
