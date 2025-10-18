// @ts-nocheck
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { TablesInsert, TablesUpdate, SubscriptionTier, SubscriptionStatus, UserRole } from '@/lib/supabase/types';

const CLERK_USER_ID = 'user_YOUR_CLERK_USER_ID'; // Replace with your actual Clerk user ID
const YOUR_EMAIL = 'your-email@example.com'; // Replace with your email

async function seedSuperAdmin() {
  try {
    if (CLERK_USER_ID.includes('YOUR_CLERK_USER_ID')) {
      console.error('\n❌ ERROR: Please configure this script first!\n');
      console.log('   Steps:');
      console.log('   1. Sign up at your app');
      console.log('   2. Check Clerk dashboard for your user ID');
      console.log('   3. Get your email from Clerk');
      console.log('   4. Update YOUR_EMAIL in this script');
      console.log('   5. Update CLERK_USER_ID in this script\n');
      process.exit(1);
    }

    const supabase = createServerSupabaseAdminClient();

    console.log('🏢 Checking for platform company...');
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id, name')
      .eq('subdomain', 'platform')
      .maybeSingle() as any;

    let companyId: string;

    if (existingCompany) {
      console.log(`✅ Platform company already exists: ${existingCompany.name} (${existingCompany.id})\n`);
      companyId = existingCompany.id;
    } else {
      console.log('📝 Creating platform company...');
      const companyInsert: TablesInsert<'companies'> = {
        name: 'WeddingFlow Platform',
        subscription_tier: SubscriptionTier.ENTERPRISE,
        subscription_status: SubscriptionStatus.ACTIVE,
        subdomain: null,
        logo_url: null,
        branding: null,
        settings: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        trial_ends_at: null,
        subscription_ends_at: null,
      };

      const { data: newCompany, error: companyError } = (await supabase
        .from('companies')
        .insert(companyInsert as any)
        .select()
        .maybeSingle()) as any;

      if (companyError) {
        console.error('❌ Error creating platform company:', companyError);
        process.exit(1);
      }

      console.log(`✅ Platform company created: ${newCompany.id}\n`);
      companyId = newCompany.id;
    }

    console.log('👤 Checking for super admin user...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('clerk_id', CLERK_USER_ID)
      .maybeSingle() as any;

    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.email} (${existingUser.id})`);

      if (existingUser.role !== UserRole.SUPER_ADMIN) {
        console.log('🔄 Updating user role to super_admin...');
        const userUpdate: TablesUpdate<'users'> = {
          role: UserRole.SUPER_ADMIN,
        };

        const { error: updateError } = await supabase
          .from('users')
          .update(userUpdate as any)
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
      console.log('📝 Creating super admin user...');
      const userInsert: TablesInsert<'users'> = {
        clerk_id: CLERK_USER_ID,
        email: YOUR_EMAIL,
        first_name: 'Super',
        last_name: 'Admin',
        avatar_url: null,
        role: UserRole.SUPER_ADMIN,
        company_id: companyId,
        is_active: true,
      };

      const { data: newUser, error: userError } = (await supabase
        .from('users')
        .insert(userInsert as any)
        .select()
        .maybeSingle()) as any;

      if (userError) {
        console.error('❌ Error creating super admin user:', userError);
        process.exit(1);
      }

      console.log(`✅ Super admin user created: ${newUser.id}\n`);
    }

    console.log('🎉 SUCCESS! Super admin account is ready!\n');
    console.log('You can now:');
    console.log('  1. Sign in at /superadmin');
    console.log('  2. Access the super admin dashboard');
    console.log('  3. Manage all companies and users\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
