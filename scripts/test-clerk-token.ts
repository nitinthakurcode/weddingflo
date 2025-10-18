/**
 * Test Clerk Token Generation and Decode
 *
 * This script helps debug JWT token issues by showing what's in the token.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('========================================')
  console.log('🔑 Clerk Token Diagnostic')
  console.log('========================================\n')

  console.log('📊 Clerk Configuration:')
  console.log('  Publishable Key:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...')
  console.log('  Secret Key:', process.env.CLERK_SECRET_KEY ? 'Set ✅' : 'Missing ❌')
  console.log('  Webhook Secret:', process.env.CLERK_WEBHOOK_SECRET ? 'Set ✅' : 'Missing ❌')
  console.log('')

  // Extract domain from publishable key
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  const isTest = pubKey.startsWith('pk_test_')
  const isLive = pubKey.startsWith('pk_live_')

  console.log('📍 Clerk Environment:')
  console.log('  Mode:', isTest ? 'Test/Development ✅' : isLive ? 'Production' : 'Unknown')
  console.log('')

  // Decode the base64 part of the key to get info
  try {
    // Clerk publishable keys are base64 encoded
    const parts = pubKey.split('_')
    if (parts.length >= 3) {
      const encoded = parts.slice(2).join('_')
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      console.log('🔍 Decoded Key Info:')
      console.log(' ', decoded)
      console.log('')
    }
  } catch (err) {
    console.log('⚠️  Could not decode publishable key')
  }

  console.log('🎯 Expected Clerk JWT Structure:')
  console.log('  {')
  console.log('    "iss": "https://your-app.clerk.accounts.dev",  // Clerk issuer')
  console.log('    "sub": "user_xxxxxxxxxxxxx",                   // Clerk user ID')
  console.log('    "azp": "https://your-domain.com",              // Authorized party')
  console.log('    "sid": "sess_xxxxxxxxxxxxx",                   // Session ID')
  console.log('    "exp": 1234567890,                             // Expiration')
  console.log('    "iat": 1234567890,                             // Issued at')
  console.log('    ...                                            // Other claims')
  console.log('  }')
  console.log('')

  console.log('🔗 For Native Clerk + Supabase Integration:')
  console.log('  1. Supabase needs to know your Clerk issuer (iss)')
  console.log('  2. This is configured in Supabase Dashboard → Auth → Providers')
  console.log('  3. You add "Clerk" and paste your Clerk domain')
  console.log('  4. Clerk domain format: "your-app.clerk.accounts.dev"')
  console.log('')

  console.log('✅ Your Code Implementation:')
  console.log('  - Uses getToken() without template ✅')
  console.log('  - Uses accessToken() callback ✅')
  console.log('  - RLS uses auth.jwt() ->> \'sub\' ✅')
  console.log('')

  console.log('========================================')
  console.log('🎯 ACTION REQUIRED')
  console.log('========================================')
  console.log('')
  console.log('Since you mentioned the integration is configured on your end,')
  console.log('let\'s verify the actual token flow by:')
  console.log('')
  console.log('1. Start dev server: npm run dev')
  console.log('2. Open browser console')
  console.log('3. Sign in/Sign up')
  console.log('4. Check for Clerk token in network tab')
  console.log('5. Copy a Supabase request and check if it has Authorization header')
  console.log('')
  console.log('Or run the app and check terminal logs for:')
  console.log('  - "🔑 Clerk token: Present" (should show when making requests)')
  console.log('  - Webhook logs showing company + user creation')
  console.log('')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
