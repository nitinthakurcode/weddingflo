import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Clean up test user
async function cleanupUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const email = 'kreativeheadz@gmail.com';

  console.log(`🗑️  Cleaning up all users with email: ${email}`);

  // Delete user by email (will cascade delete related data)
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('email', email);

  if (deleteError) {
    console.error('❌ Error deleting user:', deleteError);
  } else {
    console.log('✅ User deleted successfully');
  }

  // Find and delete orphaned company
  const { data: companies } = await supabase
    .from('companies')
    .select('id, subdomain')
    .like('subdomain', 'company%')
    .limit(10);

  if (companies && companies.length > 0) {
    console.log('Found companies:', companies);

    for (const company of companies) {
      // Check if company has any users
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', company.id)
        .limit(1);

      if (!users || users.length === 0) {
        console.log(`🗑️  Deleting orphaned company: ${company.subdomain}`);
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id);

        if (error) {
          console.error('❌ Error deleting company:', error);
        } else {
          console.log('✅ Company deleted');
        }
      }
    }
  }

  console.log('✅ Cleanup complete');
  process.exit(0);
}

cleanupUser().catch(console.error);
