import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMigration() {
  console.log('🔧 Fixing WhatsApp migration...\n');

  try {
    // Option 1: Try to delete the migration record
    console.log('Attempting to remove migration record from schema_migrations...');

    const { data, error } = await supabase
      .from('schema_migrations')
      .delete()
      .eq('version', '20251021000005');

    if (error) {
      console.log('⚠️  Cannot delete via Supabase client (table might be in different schema)');
      console.log('\n📋 MANUAL FIX REQUIRED:\n');
      console.log('1. Go to Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/sql/new\n');
      console.log('2. Run this SQL to remove the failed migration record:\n');
      console.log('   DELETE FROM supabase_migrations.schema_migrations WHERE version = \'20251021000005\';\n');
      console.log('3. Then run the migration SQL:\n');

      const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251021000005_create_whatsapp_system.sql');
      const sql = readFileSync(migrationPath, 'utf-8');

      console.log('════════════════════════════════════════════════');
      console.log(sql);
      console.log('════════════════════════════════════════════════\n');

      console.log('4. Verify with: node scripts/verify-whatsapp-tables.mjs');

    } else {
      console.log('✅ Migration record removed');
      console.log('\nNow run: SUPABASE_ACCESS_TOKEN=sbp_8f2c87204b1bf14dd7b8bfe6e0b80c3288ad938e supabase db push');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixMigration();
