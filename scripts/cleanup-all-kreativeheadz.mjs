import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gkrcaeymhgjepncbceag.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 'sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function cleanup() {
  console.log('🧹 Cleaning ALL kreativeheadz@gmail.com data...\n');

  // 1. Delete all users with this email
  console.log('1️⃣  Deleting users with email: kreativeheadz@gmail.com');
  const { data: users, error: findUsersError } = await supabase
    .from('users')
    .select('id, email, company_id')
    .eq('email', 'kreativeheadz@gmail.com');

  if (findUsersError) {
    console.error('❌ Error finding users:', findUsersError);
  } else if (users && users.length > 0) {
    console.log(`   Found ${users.length} user(s):`, users.map(u => ({ id: u.id, company_id: u.company_id })));

    const { error: deleteUsersError } = await supabase
      .from('users')
      .delete()
      .eq('email', 'kreativeheadz@gmail.com');

    if (deleteUsersError) {
      console.error('   ❌ Error deleting users:', deleteUsersError);
    } else {
      console.log('   ✅ Deleted all users');
    }
  } else {
    console.log('   ℹ️  No users found');
  }

  // 2. Delete all companies with "Music's Company" name or matching subdomains
  console.log('\n2️⃣  Deleting companies (Music\'s Company, companyuser35ee, companyuser35ef)');
  const { data: companies, error: findCompaniesError } = await supabase
    .from('companies')
    .select('id, name, subdomain')
    .or('name.eq.Music\'s Company,subdomain.like.companyuser35e%');

  if (findCompaniesError) {
    console.error('❌ Error finding companies:', findCompaniesError);
  } else if (companies && companies.length > 0) {
    console.log(`   Found ${companies.length} company(ies):`, companies.map(c => ({ subdomain: c.subdomain, id: c.id })));

    const { error: deleteCompaniesError } = await supabase
      .from('companies')
      .delete()
      .or('name.eq.Music\'s Company,subdomain.like.companyuser35e%');

    if (deleteCompaniesError) {
      console.error('   ❌ Error deleting companies:', deleteCompaniesError);
    } else {
      console.log('   ✅ Deleted all companies');
    }
  } else {
    console.log('   ℹ️  No companies found');
  }

  console.log('\n✅ Cleanup complete! Now:');
  console.log('   1. Delete user from Clerk dashboard: https://dashboard.clerk.com/');
  console.log('   2. Try fresh sign-up at: http://localhost:3000/en/sign-up');
  console.log('   3. Should redirect to /en/dashboard after login ✓');
}

cleanup().catch(console.error);
