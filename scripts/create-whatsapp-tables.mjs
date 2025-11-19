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
  console.error('URL:', supabaseUrl ? '✓' : '✗');
  console.error('Key:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function createWhatsAppTables() {
  console.log('📦 Creating WhatsApp system tables...\n');

  try {
    // Check if tables exist
    console.log('1. Checking whatsapp_logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('whatsapp_logs')
      .select('id')
      .limit(1);

    if (logsError?.code === '42P01' || logsError?.message?.includes('does not exist') || logsError?.message?.includes('not find')) {
      console.log('   ⚠️  Table does not exist, will need manual creation');
      console.log('   Run this SQL in Supabase SQL Editor:\n');
      console.log('   https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/sql/new\n');

      const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251021000005_create_whatsapp_system.sql');
      const sql = readFileSync(migrationPath, 'utf-8');

      console.log('════════════════════════════════════════════════');
      console.log(sql);
      console.log('════════════════════════════════════════════════\n');

      console.log('After running the SQL:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Paste the SQL above');
      console.log('3. Click "Run"');
      console.log('4. Re-run this verification script: node scripts/verify-whatsapp-tables.mjs');

    } else if (logsError) {
      console.log('   ❌ Error checking table:', logsError.message);
    } else {
      console.log('   ✅ whatsapp_logs table exists');
    }

    console.log('\n2. Checking whatsapp_templates table...');
    const { data: templates, error: templatesError } = await supabase
      .from('whatsapp_templates')
      .select('id')
      .limit(1);

    if (templatesError?.code === '42P01' || templatesError?.message?.includes('does not exist') || templatesError?.message?.includes('not find')) {
      console.log('   ⚠️  Table does not exist (see SQL above)');
    } else if (templatesError) {
      console.log('   ❌ Error checking table:', templatesError.message);
    } else {
      console.log('   ✅ whatsapp_templates table exists');
    }

    console.log('\n3. Testing get_whatsapp_stats function...');
    const { data: statsData, error: statsError } = await supabase.rpc('get_whatsapp_stats', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_days: 30
    });

    if (statsError?.message?.includes('function') || statsError?.code === '42883') {
      console.log('   ⚠️  Function does not exist (see SQL above)');
    } else if (statsError) {
      console.log('   ⚠️  Function might exist but returned error:', statsError.message);
    } else {
      console.log('   ✅ get_whatsapp_stats function works');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

createWhatsAppTables();
