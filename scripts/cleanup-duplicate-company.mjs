import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gkrcaeymhgjepncbceag.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 'sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function cleanup() {
  console.log('🔍 Finding company with subdomain: companyuser35ee');

  // Find company
  const { data: company, error: findError } = await supabase
    .from('companies')
    .select('id, name, subdomain')
    .eq('subdomain', 'companyuser35ee')
    .maybeSingle();

  if (findError) {
    console.error('❌ Error finding company:', findError);
    return;
  }

  if (!company) {
    console.log('ℹ️  No company found with subdomain "companyuser35ee" (already deleted?)');
    return;
  }

  console.log('📋 Found company:', company);

  // Delete users associated with this company
  console.log('🗑️  Deleting users for company:', company.id);
  const { error: deleteUsersError } = await supabase
    .from('users')
    .delete()
    .eq('company_id', company.id);

  if (deleteUsersError) {
    console.error('❌ Error deleting users:', deleteUsersError);
  } else {
    console.log('✅ Users deleted');
  }

  // Delete company
  console.log('🗑️  Deleting company:', company.id);
  const { error: deleteCompanyError } = await supabase
    .from('companies')
    .delete()
    .eq('id', company.id);

  if (deleteCompanyError) {
    console.error('❌ Error deleting company:', deleteCompanyError);
  } else {
    console.log('✅ Company deleted');
  }

  console.log('✅ Cleanup complete! You can now sign up again.');
}

cleanup().catch(console.error);
