import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Direct connection string to Supabase
const connectionString = process.env.DATABASE_URL;

async function applyMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251021000005_create_whatsapp_system.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📦 Executing WhatsApp system migration...\n');

    // Execute the entire SQL file
    await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...\n');

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('whatsapp_logs', 'whatsapp_templates')
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length === 2) {
      console.log('✅ whatsapp_logs table created');
      console.log('✅ whatsapp_templates table created');
    } else {
      console.log('❌ Expected 2 tables, found:', tablesResult.rows.length);
      tablesResult.rows.forEach(row => console.log('   - ' + row.table_name));
    }

    // Verify function exists
    const functionResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name = 'get_whatsapp_stats';
    `);

    if (functionResult.rows.length > 0) {
      console.log('✅ get_whatsapp_stats function created');
    } else {
      console.log('❌ get_whatsapp_stats function not found');
    }

    // Verify indexes
    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('whatsapp_logs', 'whatsapp_templates')
      ORDER BY indexname;
    `);

    console.log(`✅ Created ${indexResult.rows.length} indexes`);

    console.log('\n✨ WhatsApp system migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
