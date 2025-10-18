/**
 * Check if there are existing users in Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function checkUsers() {
  console.log('🔍 Checking for existing users in Supabase...\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  NO USERS FOUND IN DATABASE');
    console.log('\nThis means all users were deleted.');
    console.log('\n📝 To fix:');
    console.log('   1. Go to https://dashboard.clerk.com');
    console.log('   2. Check if there are users in Clerk');
    console.log('   3. If yes, those users were deleted from Supabase but still exist in Clerk');
    console.log('   4. Sign up with a NEW email address to create a fresh user');
    console.log('   5. OR delete the Clerk users and sign up again with any email\n');
    return;
  }

  console.log(`✅ Found ${users.length} user(s):\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email || user.clerk_id}`);
    console.log(`   Clerk ID: ${user.clerk_id}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Company ID: ${user.company_id || 'NULL'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });

  console.log('\n📝 Next steps:');
  console.log('   1. Try signing in with one of these emails');
  console.log('   2. If sign-in fails, check Clerk Dashboard to verify user exists there too\n');
}

checkUsers().catch(console.error);
