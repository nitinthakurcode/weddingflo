/**
 * Cleanup Script: Remove existing user data to test fresh signup
 *
 * This script deletes the current user from Supabase so you can test
 * a fresh signup flow with the fixed RLS policies.
 *
 * Usage:
 *   npx tsx scripts/cleanup-current-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('========================================')
  console.log('🧹 User Cleanup Script')
  console.log('========================================\n')

  // Create admin Supabase client (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!, // Service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Get email to clean up
  const email = await question('Enter the email address to clean up: ')

  if (!email.includes('@')) {
    console.error('❌ Invalid email address')
    rl.close()
    return
  }

  // Confirm
  const confirm = await question(
    `\n⚠️  This will DELETE the user with email: ${email}\nAre you sure? (yes/no): `
  )

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    rl.close()
    return
  }

  console.log('\n🔍 Looking for user...')

  // Find user by email
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      console.log('✅ User not found in database (already clean)')
      rl.close()
      return
    }
    console.error('❌ Error fetching user:', fetchError)
    rl.close()
    return
  }

  console.log(`\n📊 Found user:`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Clerk ID: ${user.clerk_id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Company ID: ${user.company_id || 'NULL'}`)

  // Delete user
  console.log('\n🗑️  Deleting user...')
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id)

  if (deleteError) {
    console.error('❌ Error deleting user:', deleteError)
    rl.close()
    return
  }

  console.log('✅ User deleted successfully!')

  // If user had a company, check if we should delete it
  if (user.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single()

    if (company) {
      console.log(`\n📊 User's company:`)
      console.log(`   ID: ${company.id}`)
      console.log(`   Name: ${company.name}`)
      console.log(`   Subdomain: ${company.subdomain}`)

      const deleteCompany = await question(
        `\nDelete this company too? (yes/no): `
      )

      if (deleteCompany.toLowerCase() === 'yes') {
        console.log('\n🗑️  Deleting company...')
        const { error: deleteCompanyError } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id)

        if (deleteCompanyError) {
          console.error('❌ Error deleting company:', deleteCompanyError)
        } else {
          console.log('✅ Company deleted successfully!')
        }
      }
    }
  }

  console.log('\n========================================')
  console.log('✅ CLEANUP COMPLETE!')
  console.log('========================================')
  console.log('\n📝 Next steps:')
  console.log('   1. Delete the user in Clerk dashboard too')
  console.log('   2. Sign up with a fresh account')
  console.log('   3. Check logs to verify company creation')
  console.log()

  rl.close()
}

main().catch((error) => {
  console.error('❌ Error:', error)
  rl.close()
  process.exit(1)
})
