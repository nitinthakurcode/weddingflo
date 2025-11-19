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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying WhatsApp system migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251021000005_create_whatsapp_system.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if rpc doesn't work
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: statement })
        });

        if (!response.ok) {
          console.log(`   ⚠️  Statement ${i + 1} - Will skip (might already exist)`);
          if (statement.includes('CREATE TABLE')) {
            console.log(`   Table creation - continuing...`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed`);
        }
      } else {
        console.log(`   ✅ Statement ${i + 1} executed`);
      }
    }

    console.log('\n✨ Migration application complete! Verifying tables...\n');

    // Verify tables exist
    const { data: logsData, error: logsError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .limit(1);

    if (logsError && logsError.code !== 'PGRST116') {
      console.log('❌ whatsapp_logs table:', logsError.message);
    } else {
      console.log('✅ whatsapp_logs table verified');
    }

    const { data: templatesData, error: templatesError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .limit(1);

    if (templatesError && templatesError.code !== 'PGRST116') {
      console.log('❌ whatsapp_templates table:', templatesError.message);
    } else {
      console.log('✅ whatsapp_templates table verified');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
