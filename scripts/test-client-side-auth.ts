/**
 * Test Client-Side Supabase Authentication
 *
 * This script simulates what the browser does when fetching user data
 */

import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';

async function testClientSideAuth() {
  console.log('\n==========================================');
  console.log('🔍 Testing Client-Side Supabase Auth');
  console.log('==========================================\n');

  // Get Clerk user
  const clerkUserId = 'user_34EacPxhz0rwIUb7lsP5bORP5Rs'; // From logs

  console.log(`1️⃣  Fetching Clerk user: ${clerkUserId}\n`);

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    console.log(`✅ Clerk user found:`);
    console.log(`   Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log(`   ID: ${user.id}\n`);

    // Get a session token
    console.log(`2️⃣  Creating session token...\n`);

    const sessionList = await clerkClient.sessions.getSessionList({
      userId: clerkUserId,
    });

    if (sessionList.data.length === 0) {
      console.log('❌ No active sessions found');
      console.log('   User needs to sign in to get a JWT token\n');
      return;
    }

    const session = sessionList.data[0];
    console.log(`✅ Active session found: ${session.id}\n`);

    // Get JWT token for this session
    console.log(`3️⃣  Getting JWT token from session...\n`);

    const token = await clerkClient.sessions.getToken(session.id, 'default');

    if (!token) {
      console.log('❌ Failed to get JWT token');
      return;
    }

    console.log(`✅ JWT token obtained (${token.length} chars)\n`);

    // Decode JWT header to check algorithm
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid JWT format');
      return;
    }

    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

    console.log(`4️⃣  JWT Details:\n`);
    console.log(`   Algorithm: ${header.alg} ${header.alg === 'RS256' ? '✅' : '❌'}`);
    console.log(`   Key ID: ${header.kid}`);
    console.log(`   Subject (clerk_id): ${payload.sub}`);
    console.log(`   Issuer: ${payload.iss}`);
    console.log(`   Expires: ${new Date(payload.exp * 1000).toLocaleString()}\n`);

    // Now test Supabase call with this JWT
    console.log(`5️⃣  Testing Supabase API call with JWT...\n`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    // Create Supabase client that simulates browser behavior
    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Try to fetch users (what dashboard does)
    console.log(`   Making request to: ${supabaseUrl}/rest/v1/users`);
    console.log(`   With Authorization: Bearer ${token.substring(0, 20)}...\n`);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', payload.sub);

    if (error) {
      console.log(`❌ Supabase API Error:`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
      console.log(`   Hint: ${error.hint}\n`);

      // Check if it's a JWT validation error
      if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('auth')) {
        console.log('🔍 This appears to be a JWT validation error.\n');
        console.log('Possible causes:');
        console.log('   1. Supabase cannot validate the RS256 signature');
        console.log('   2. JWKS endpoint not accessible from Supabase');
        console.log('   3. JWT issuer mismatch');
        console.log('   4. Token expired\n');
      }

      // Check if it's an RLS error
      if (error.code === 'PGRST301' || error.message.includes('RLS') || error.message.includes('policy')) {
        console.log('🔍 This appears to be an RLS policy error.\n');
        console.log('Possible causes:');
        console.log('   1. RLS policy cannot extract clerk_id from JWT');
        console.log('   2. auth.jwt()->>\'sub\' returning null');
        console.log('   3. User not found in database\n');
      }

    } else {
      console.log(`✅ Supabase API Success!`);
      console.log(`   Found ${data.length} user(s):\n`);
      data.forEach(user => {
        console.log(`   👤 ${user.email}`);
        console.log(`      Clerk ID: ${user.clerk_id}`);
        console.log(`      Supabase ID: ${user.id}`);
        console.log(`      Role: ${user.role}\n`);
      });
    }

    // Test RLS directly
    console.log(`6️⃣  Testing RLS policy directly...\n`);

    const adminSupabase = createClient(
      supabaseUrl,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('clerk_id', payload.sub)
      .single();

    if (userError) {
      console.log(`❌ User not found in database: ${userError.message}\n`);
    } else {
      console.log(`✅ User exists in database (bypassing RLS):`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Clerk ID: ${userData.clerk_id}`);
      console.log(`   Role: ${userData.role}\n`);
    }

    console.log('==========================================');
    console.log('Test Complete');
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run test
testClientSideAuth();
