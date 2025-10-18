/**
 * Seed Script: Create Initial Super Admin Account
 *
 * This script creates the platform company and a super admin user.
 *
 * BEFORE RUNNING:
 * 1. Sign up on your app once to create a Clerk account
 * 2. Go to Clerk Dashboard (https://dashboard.clerk.com)
 * 3. Navigate to Users → Click on your user → Copy the User ID
 * 4. Update CLERK_USER_ID below with your actual Clerk user ID
 * 5. Update YOUR_EMAIL below with your actual email
 *
 * HOW TO RUN:
 * npm run seed:admin
 *
 * AFTER RUNNING:
 * 1. Update your Clerk user metadata with role: 'super_admin'
 *    - Or wait for the webhook to sync on your next login
 * 2. Sign in and navigate to /superadmin/dashboard
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/types';

// ⚠️ IMPORTANT: Replace these values before running
const CLERK_USER_ID = 'REPLACE_WITH_YOUR_CLERK_ID'; // Get from Clerk Dashboard
const YOUR_EMAIL = 'admin@weddingflow.com'; // Your actual email

async function seedSuperAdmin() {
  console.log('🌱 Starting super admin seed script...\n');

  // Create admin client
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Check if placeholder values are still being used
    if (CLERK_USER_ID === 'REPLACE_WITH_YOUR_CLERK_ID') {
      console.error('❌ ERROR: Please update CLERK_USER_ID with your actual Clerk user ID');
      console.log('\n📝 How to get your Clerk User ID:');
      console.log('   1. Sign up on your app once');
      console.log('   2. Go to https://dashboard.clerk.com');
      console.log('   3. Navigate to Users → Click on your user');
      console.log('   4. Copy the User ID (starts with "user_")');
      console.log('   5. Update CLERK_USER_ID in this script\n');
      process.exit(1);
    }

    // Step 1: Check if platform company already exists
    console.log('🏢 Checking for platform company...');
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id, name')
      .eq('email', 'platform@weddingflow.com')
      .maybeSingle();

    let companyId: string;

    if (existingCompany) {
      console.log(`✅ Platform company already exists: ${existingCompany.name} (${existingCompany.id})\n`);
      companyId = existingCompany.id;
    } else {
      // Create platform company
      console.log('📝 Creating platform company...');
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: 'WeddingFlow Platform',
          email: 'platform@weddingflow.com',
          subscription_tier: 'enterprise',
          subscription_status: 'active',
          max_clients: 999999,
          max_staff: 999999,
        })
        .select()
        .maybeSingle();

      if (companyError) {
        console.error('❌ Error creating platform company:', companyError);
        process.exit(1);
      }

      console.log(`✅ Platform company created: ${newCompany.id}\n`);
      companyId = newCompany.id;
    }

    // Step 2: Check if super admin user already exists
    console.log('👤 Checking for super admin user...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('clerk_id', CLERK_USER_ID)
      .maybeSingle();

    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.email} (${existingUser.id})`);

      if (existingUser.role !== 'super_admin') {
        console.log('🔄 Updating user role to super_admin...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'super_admin' })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Error updating user role:', updateError);
          process.exit(1);
        }
        console.log('✅ User role updated to super_admin\n');
      } else {
        console.log('✅ User already has super_admin role\n');
      }
    } else {
      // Create super admin user
      console.log('📝 Creating super admin user...');
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_id: CLERK_USER_ID,
          email: YOUR_EMAIL,
          full_name: 'Super Admin',
          role: 'super_admin',
          company_id: companyId,
        })
        .select()
        .maybeSingle();

      if (userError) {
        console.error('❌ Error creating super admin user:', userError);
        process.exit(1);
      }

      console.log(`✅ Super admin user created: ${newUser.id}\n`);
    }

    // Success message
    console.log('🎉 SUCCESS! Super admin account is ready!\n');
    console.log('📋 Summary:');
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Clerk User ID: ${CLERK_USER_ID}`);
    console.log(`   Email: ${YOUR_EMAIL}`);
    console.log(`   Role: super_admin\n`);

    console.log('🔐 Next Steps:');
    console.log('   1. Sign in to your app');
    console.log('   2. Navigate to: http://localhost:3000/superadmin/dashboard');
    console.log('   3. You should have full super admin access!\n');

    console.log('💡 Note: If you get redirected to /dashboard:');
    console.log('   - The middleware reads role from Clerk session metadata');
    console.log('   - Update your Clerk user metadata to include: { "role": "super_admin" }');
    console.log('   - Or sign out and sign in again to refresh the session\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the seed script
seedSuperAdmin();
