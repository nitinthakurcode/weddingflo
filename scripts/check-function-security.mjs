import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres.gkrcaeymhgjepncbceag:Nitin@123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const client = new Client({ connectionString });

async function checkFunctions() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database\n');

    // Check if functions have proper search_path set
    const query = `
      SELECT
        p.proname AS function_name,
        pg_get_function_identity_arguments(p.oid) AS arguments,
        CASE
          WHEN p.proconfig IS NOT NULL THEN
            array_to_string(p.proconfig, ', ')
          ELSE 'NOT SET'
        END AS config_settings,
        CASE
          WHEN 'search_path=public' = ANY(p.proconfig) THEN '✅ SECURE'
          ELSE '❌ VULNERABLE'
        END AS security_status
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'update_webhook_events_updated_at',
          'record_webhook_event',
          'mark_webhook_processed',
          'increment_webhook_retry',
          'get_webhook_stats',
          'update_gifts_enhanced_updated_at',
          'set_thank_you_due_date',
          'create_default_gift_categories',
          'get_thank_you_notes_due',
          'get_gift_stats'
        )
      ORDER BY p.proname;
    `;

    const result = await client.query(query);

    console.log('Checking sample of functions:\n');
    console.log('Function Name                          | Security Status | Config');
    console.log('─'.repeat(80));

    result.rows.forEach(row => {
      console.log(
        `${row.function_name.padEnd(40)} | ${row.security_status.padEnd(15)} | ${row.config_settings}`
      );
    });

    const vulnerable = result.rows.filter(r => r.security_status.includes('❌'));
    const secure = result.rows.filter(r => r.security_status.includes('✅'));

    console.log('\n' + '─'.repeat(80));
    console.log(`✅ Secure functions: ${secure.length}`);
    console.log(`❌ Vulnerable functions: ${vulnerable.length}`);

    if (vulnerable.length > 0) {
      console.log('\n⚠️  Migration was NOT applied successfully!');
      console.log('The functions still have mutable search_path.');
      console.log('\nPlease apply the migration manually via Supabase Dashboard:');
      console.log('File: supabase/migrations/20251118070157_fix_function_search_path_security.sql');
    } else {
      console.log('\n✅ All checked functions are secure!');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkFunctions();
