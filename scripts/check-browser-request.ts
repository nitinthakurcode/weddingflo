/**
 * Simulate Browser Request to Supabase
 * This tests exactly what the browser is doing
 */

import { createClient } from '@supabase/supabase-js';

async function simulateBrowserRequest() {
  console.log('\n==========================================');
  console.log('🔍 Simulating Browser → Supabase Request');
  console.log('==========================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  console.log('Configuration:');
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Publishable Key: ${supabasePublishableKey.substring(0, 20)}...`);
  console.log(`  Key Format: ${supabasePublishableKey.startsWith('sb_publishable_') ? '2025 ✅' : 'Legacy'}\n`);

  // Test 1: Make request without JWT (like anonymous)
  console.log('1️⃣  Test: Request WITHOUT JWT (should fail with RLS)\n');

  const supabaseAnon = createClient(supabaseUrl, supabasePublishableKey);

  const { data: anonData, error: anonError } = await supabaseAnon
    .from('users')
    .select('*')
    .limit(1);

  if (anonError) {
    console.log(`   Expected error: ${anonError.message}`);
    console.log(`   Error code: ${anonError.code}`);
    console.log(`   Status: ${anonError.message.includes('JWT') ? 'JWT issue' : 'RLS blocking (expected)'}\n`);
  } else {
    console.log(`   ⚠️  Unexpected success - RLS might not be working correctly\n`);
  }

  // Test 2: Check what the publishable key allows
  console.log('2️⃣  Test: Publishable Key Permissions\n');

  // Try to access a table that should work
  const { data: testData, error: testError } = await supabaseAnon
    .from('users')
    .select('count');

  if (testError) {
    console.log(`   Error: ${testError.message}`);
    console.log(`   This is expected - RLS is protecting the table ✅\n`);
  } else {
    console.log(`   Result: ${JSON.stringify(testData)}\n`);
  }

  // Test 3: Check Supabase configuration
  console.log('3️⃣  Checking Supabase Configuration...\n');

  // Make a REST API call directly to see the response
  const testUrl = `${supabaseUrl}/rest/v1/users?select=clerk_id&limit=1`;
  console.log(`   Making direct REST call to:`);
  console.log(`   ${testUrl}\n`);

  try {
    const response = await fetch(testUrl, {
      headers: {
        'apikey': supabasePublishableKey,
        'Authorization': `Bearer ${supabasePublishableKey}`,
      },
    });

    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response OK: ${response.ok}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error Response:\n`);
      try {
        const errorJson = JSON.parse(errorText);
        console.log(`   ${JSON.stringify(errorJson, null, 2)}\n`);
      } catch {
        console.log(`   ${errorText}\n`);
      }
    } else {
      const data = await response.json();
      console.log(`   Success Response:\n`);
      console.log(`   ${JSON.stringify(data, null, 2)}\n`);
    }
  } catch (error) {
    console.log(`   Network error: ${error}\n`);
  }

  // Diagnosis
  console.log('==========================================');
  console.log('📊 Diagnosis');
  console.log('==========================================\n');

  console.log('Based on the tests above:\n');

  console.log('If you see:');
  console.log('  ✅ "JWT" or "token" errors → JWT validation issue');
  console.log('  ✅ "RLS" or "policy" errors → RLS blocking (expected without valid JWT)');
  console.log('  ✅ 401/403 errors → Authentication/Authorization (expected)');
  console.log('  ❌ 500 errors → Server-side configuration issue\n');

  console.log('Common 500 error causes:');
  console.log('  1. Supabase cannot validate Clerk JWT signature');
  console.log('  2. RLS policy has syntax error');
  console.log('  3. Database trigger/function error');
  console.log('  4. Missing indexes or constraints\n');

  console.log('Next steps:');
  console.log('  1. Check Supabase Dashboard → Logs');
  console.log('  2. Look for specific error messages');
  console.log('  3. Verify Clerk integration is "Active"');
  console.log('  4. Check if there\'s a JWT issuer field to configure\n');

  console.log('==========================================\n');
}

simulateBrowserRequest();
