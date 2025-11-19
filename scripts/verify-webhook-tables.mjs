// Verification script for webhook-related tables
// Using fetch to Supabase REST API to avoid pooler connection issues

const SUPABASE_URL = 'https://gkrcaeymhgjepncbceag.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('\nTo verify tables, set your service role key:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

const expectedTables = {
  'Email System': ['email_logs', 'email_preferences'],
  'SMS System': ['sms_logs', 'sms_preferences'],
  'Payment System': ['stripe_accounts', 'invoices', 'payments', 'refunds', 'payment_methods']
};

async function checkTable(tableName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      }
    );

    return response.ok;
  } catch (error) {
    return false;
  }
}

async function verifyAllTables() {
  console.log('🔍 Verifying webhook system tables...\n');

  let allExists = true;

  for (const [system, tables] of Object.entries(expectedTables)) {
    console.log(`\n📋 ${system}:`);
    for (const table of tables) {
      const exists = await checkTable(table);
      if (exists) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - NOT FOUND`);
        allExists = false;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allExists) {
    console.log('✅ SUCCESS: All webhook tables created successfully!');
    console.log('\nTables verified:');
    console.log('  • 2 Email tables (email_logs, email_preferences)');
    console.log('  • 2 SMS tables (sms_logs, sms_preferences)');
    console.log('  • 5 Payment tables (stripe_accounts, invoices, payments, refunds, payment_methods)');
    console.log('\n✅ Step 1 complete - All 3 migrations applied successfully');
  } else {
    console.log('❌ FAILURE: Some tables are missing');
    console.log('Check migration logs for errors');
  }
  console.log('='.repeat(50));
}

verifyAllTables().catch(console.error);
