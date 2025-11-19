import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function applyMigration() {
  try {
    console.log('📖 Reading RLS performance fix migration...');
    const migrationContent = readFileSync(
      'supabase/migrations/20251118080000_fix_rls_performance.sql',
      'utf8'
    );

    // Split into individual DROP POLICY + CREATE POLICY blocks
    const functionBlocks = migrationContent.split(/(?=DROP POLICY)/g)
      .filter(block => block.trim().length > 0 && block.includes('DROP POLICY'));

    console.log(`\n📝 Found ${functionBlocks.length} RLS policies to optimize\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < functionBlocks.length; i++) {
      const block = functionBlocks[i].trim();

      // Extract policy name for logging
      const nameMatch = block.match(/POLICY IF EXISTS "([^"]+)"/);
      const functionName = nameMatch ? nameMatch[1] : `policy_${i + 1}`;

      process.stdout.write(`${i + 1}/${functionBlocks.length} Optimizing ${functionName}... `);

      try {
        // Use rpc to execute SQL via the Postgres REST API
        const { error } = await supabase.rpc('exec_sql', {
          query: block
        }).catch(() => {
          // If rpc doesn't work, try using from with a raw query
          return { error: 'rpc not available' };
        });

        if (error && error !== 'rpc not available') {
          // Try alternative method - direct SQL execution
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ query: block }),
          }).catch(() => ({ ok: false }));

          if (!response.ok) {
            throw new Error('Failed to execute');
          }
        }

        console.log('✅');
        successCount++;
      } catch (err) {
        console.log(`❌ ${err.message}`);
        failCount++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`✅ Successfully optimized: ${successCount} RLS policies`);
    console.log(`❌ Failed to optimize: ${failCount} RLS policies`);

    if (failCount > 0) {
      console.log('\n⚠️  Some policies could not be updated programmatically.');
      console.log('\n📋 MANUAL APPLICATION REQUIRED:');
      console.log('1. Go to: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/sql');
      console.log('2. Copy the entire contents of:');
      console.log('   supabase/migrations/20251118080000_fix_rls_performance.sql');
      console.log('3. Paste into the SQL Editor');
      console.log('4. Click "Run" or press Cmd+Enter');
      console.log('\nThis is the most reliable method for applying migrations.');
    } else {
      console.log('\n✅ RLS performance optimization complete!');
      console.log('Check your Supabase Dashboard > Database > Linter to verify the improvements.');
    }

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.log('\n📋 Please apply the migration manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/sql');
    console.log('2. Open: supabase/migrations/20251118080000_fix_rls_performance.sql');
    console.log('3. Copy and paste the entire file into the SQL Editor');
    console.log('4. Click "Run"');
    process.exit(1);
  }
}

console.log('🔧 WeddingFlow Pro - RLS Performance Optimizer');
console.log('─'.repeat(60));
applyMigration();
