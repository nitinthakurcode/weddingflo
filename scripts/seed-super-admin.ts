// @ts-nocheck
import { db, eq, sql } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';

const AUTH_USER_ID = 'user_YOUR_AUTH_USER_ID'; // Replace with your actual BetterAuth user ID
const YOUR_EMAIL = 'your-email@example.com'; // Replace with your email

async function seedSuperAdmin() {
  try {
    if (AUTH_USER_ID.includes('YOUR_AUTH_USER_ID')) {
      console.error('\n❌ ERROR: Please configure this script first!\n');
      console.log('   Steps:');
      console.log('   1. Sign up at your app');
      console.log('   2. Check the database for your auth user ID');
      console.log('   3. Get your email from the users table');
      console.log('   4. Update YOUR_EMAIL in this script');
      console.log('   5. Update AUTH_USER_ID in this script\n');
      process.exit(1);
    }

    console.log('🏢 Checking for platform company...');
    const existingCompanyResult = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.subdomain, 'platform'))
      .limit(1);

    const existingCompany = existingCompanyResult[0];
    let companyId: string;

    if (existingCompany) {
      console.log(`✅ Platform company already exists: ${existingCompany.name} (${existingCompany.id})\n`);
      companyId = existingCompany.id;
    } else {
      console.log('📝 Creating platform company...');
      const newCompanyResult = await db
        .insert(companies)
        .values({
          name: 'WeddingFlo Platform',
          subscriptionTier: 'enterprise',
          subscriptionStatus: 'active',
          subdomain: 'platform',
        })
        .returning({ id: companies.id });

      const newCompany = newCompanyResult[0];

      if (!newCompany) {
        console.error('❌ Error creating platform company');
        process.exit(1);
      }

      console.log(`✅ Platform company created: ${newCompany.id}\n`);
      companyId = newCompany.id;
    }

    console.log('👤 Checking for super admin user...');
    const existingUserResult = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.authId, AUTH_USER_ID))
      .limit(1);

    const existingUser = existingUserResult[0];

    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.email} (${existingUser.id})`);

      if (existingUser.role !== 'super_admin') {
        console.log('🔄 Updating user role to super_admin...');
        await db
          .update(users)
          .set({ role: 'super_admin' })
          .where(eq(users.id, existingUser.id));
        console.log('✅ User role updated to super_admin\n');
      } else {
        console.log('✅ User already has super_admin role\n');
      }
    } else {
      console.log('📝 Creating super admin user...');
      const newUserResult = await db
        .insert(users)
        .values({
          authId: AUTH_USER_ID,
          email: YOUR_EMAIL,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          companyId: companyId,
          isActive: true,
        })
        .returning({ id: users.id });

      const newUser = newUserResult[0];

      if (!newUser) {
        console.error('❌ Error creating super admin user');
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
