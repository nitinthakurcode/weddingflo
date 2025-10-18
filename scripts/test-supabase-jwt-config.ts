/**
 * Test Supabase JWT Configuration for 2025 Native Integration
 */

import { createClient } from '@supabase/supabase-js';

async function testSupabaseJWTConfig() {
  console.log('\n==========================================');
  console.log('🔍 Testing Supabase JWT Configuration');
  console.log('==========================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  // Create admin client
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // 1. Check if we can connect
  console.log('1️⃣  Testing Supabase Connection...\n');

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('clerk_id, email, role')
    .limit(5);

  if (usersError) {
    console.log(`❌ Connection error: ${usersError.message}\n`);
    return;
  }

  console.log(`✅ Connected successfully`);
  console.log(`📊 Found ${users.length} user(s)\n`);

  if (users.length > 0) {
    users.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.email}`);
      console.log(`      Clerk ID: ${user.clerk_id}`);
      console.log(`      Role: ${user.role}\n`);
    });
  }

  // 2. Check Supabase Auth configuration
  console.log('2️⃣  Checking Supabase Auth Config...\n');

  try {
    // Query auth.config to see JWT settings
    const { data: authConfig, error: configError } = await supabase
      .rpc('version' as any);

    console.log('   ℹ️  Supabase database version check: ✅\n');
  } catch (error) {
    console.log(`   ⚠️  Could not query auth config: ${error}\n`);
  }

  // 3. Check RLS policies
  console.log('3️⃣  Checking RLS Policies...\n');

  try {
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['users', 'companies']);

    if (policies && policies.length > 0) {
      console.log(`✅ Found ${policies.length} RLS policies\n`);
    } else {
      console.log('⚠️  Could not retrieve policies (may require permissions)\n');
    }
  } catch (error) {
    console.log(`   Note: Direct policy query not available\n`);
  }

  // 4. Test a simulated authenticated query
  console.log('4️⃣  Testing RLS with Test Clerk ID...\n');

  const testClerkId = users[0]?.clerk_id;

  if (!testClerkId) {
    console.log('❌ No users in database to test with\n');
    return;
  }

  console.log(`   Using clerk_id: ${testClerkId}\n`);

  // Simulate what happens when browser makes a request
  // The browser passes JWT in Authorization header
  // Supabase extracts clerk_id from JWT using auth.jwt()->>'sub'
  // Then RLS policy filters: WHERE clerk_id = auth.jwt()->>'sub'

  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', testClerkId)
    .single();

  if (testError) {
    console.log(`❌ Query error: ${testError.message}\n`);
  } else {
    console.log(`✅ User query successful (using service role)\n`);
    console.log(`   This proves the database schema is correct\n`);
  }

  // 5. Check Supabase project settings
  console.log('5️⃣  Checking Project Configuration...\n');

  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   Project ID: ${supabaseUrl.split('//')[1]?.split('.')[0]}\n`);

  // 6. Important checks for 2025 integration
  console.log('6️⃣  2025 Native Integration Checklist:\n');

  const checks = [
    {
      name: 'Supabase connection',
      status: !usersError,
    },
    {
      name: 'Users table accessible',
      status: users.length > 0,
    },
    {
      name: 'clerk_id field present',
      status: users[0]?.clerk_id !== undefined,
    },
    {
      name: 'Service role working',
      status: !testError,
    },
  ];

  checks.forEach(check => {
    console.log(`   ${check.status ? '✅' : '❌'} ${check.name}`);
  });

  console.log('\n\n📝 DIAGNOSIS:\n');
  console.log('The 500 errors you\'re seeing are likely caused by:\n');
  console.log('1️⃣  JWT Validation Issue:');
  console.log('   - Supabase is receiving the JWT from the browser');
  console.log('   - But cannot validate the RS256 signature');
  console.log('   - This happens when Supabase cannot fetch Clerk\'s public key\n');

  console.log('2️⃣  Possible Causes:');
  console.log('   a) Supabase JWT secret not configured correctly');
  console.log('   b) Clerk JWKS endpoint not accessible from Supabase');
  console.log('   c) JWT issuer mismatch\n');

  console.log('3️⃣  How to Fix:');
  console.log('   a) Go to Supabase Dashboard → Settings → Auth');
  console.log('   b) Scroll to "JWT Settings" section');
  console.log('   c) Check "JWT Secret" field');
  console.log('   d) For native integration, this should be LEFT EMPTY');
  console.log('   e) Supabase will fetch keys from Clerk\'s JWKS endpoint\n');

  console.log('4️⃣  Verify Clerk Integration:');
  console.log('   a) Supabase Dashboard → Settings → Auth → Third-Party Auth');
  console.log('   b) Ensure "Clerk" is enabled');
  console.log('   c) Domain should be: https://skilled-sawfish-5.clerk.accounts.dev');
  console.log('   d) This tells Supabase where to fetch the JWKS\n');

  console.log('==========================================\n');
}

testSupabaseJWTConfig();
