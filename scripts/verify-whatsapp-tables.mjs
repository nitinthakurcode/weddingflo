import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error('❌ Could not read .env.local file');
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SECRET_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyWhatsAppTables() {
  console.log('🔍 Verifying WhatsApp system migration...\n');

  try {
    // Check whatsapp_logs table
    const { data: logsData, error: logsError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .limit(1);

    if (logsError && logsError.code !== 'PGRST116') {
      console.log('❌ whatsapp_logs table:', logsError.message);
    } else {
      console.log('✅ whatsapp_logs table exists');
    }

    // Check whatsapp_templates table
    const { data: templatesData, error: templatesError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .limit(1);

    if (templatesError && templatesError.code !== 'PGRST116') {
      console.log('❌ whatsapp_templates table:', templatesError.message);
    } else {
      console.log('✅ whatsapp_templates table exists');
    }

    // Check if the helper function exists
    const { data: functionData, error: functionError } = await supabase.rpc('get_whatsapp_stats', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_days: 30
    });

    if (functionError && !functionError.message.includes('function')) {
      console.log('❌ get_whatsapp_stats function:', functionError.message);
    } else if (functionError && functionError.message.includes('function')) {
      console.log('❌ get_whatsapp_stats function does not exist');
    } else {
      console.log('✅ get_whatsapp_stats function exists');
    }

    console.log('\n✨ WhatsApp system verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyWhatsAppTables();
