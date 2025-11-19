import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function verifyFunctions() {
  try {
    console.log('✅ Connected to Supabase\n');

    // Check how many functions now have search_path set
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig)) AS secure_functions,
        COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT ('search_path=public' = ANY(proconfig))) AS vulnerable_functions,
        COUNT(*) AS total_functions
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f';
    `;

    const { data, error } = await supabase.rpc('exec_sql', { query });

    if (error) {
      // Try alternative: query via pg_stat_statements or use REST API
      console.log('⚠️  Direct SQL execution not available via Supabase client');
      console.log('\n📋 Please check manually in Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/database/linter');
      console.log('2. Check if "Function Search Path Mutable" warnings are gone');
      console.log('3. The warning count should have dropped from 57 to 0');
      return;
    }

    const stats = data[0];

    console.log('📊 Function Security Status:');
    console.log('─'.repeat(60));
    console.log(`✅ Secure functions (search_path set):   ${stats.secure_functions}`);
    console.log(`❌ Vulnerable functions (no search_path): ${stats.vulnerable_functions}`);
    console.log(`📦 Total functions:                       ${stats.total_functions}`);
    console.log('─'.repeat(60));

    if (stats.vulnerable_functions === '0' || stats.vulnerable_functions === 0) {
      console.log('\n🎉 SUCCESS! All functions are now secure!');
      console.log('Check Supabase Dashboard > Database > Linter to confirm warnings are gone.');
    } else {
      console.log(`\n⚠️  ${stats.vulnerable_functions} functions still need fixing.`);
      console.log('The migration may not have applied to all functions.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please verify manually:');
    console.log('Go to: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/database/linter');
  }
}

verifyFunctions();
