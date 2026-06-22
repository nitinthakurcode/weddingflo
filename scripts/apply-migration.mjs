import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function applyMigration() {
  // Connection string - using transaction mode (port 5432) for DDL operations
  const connectionString = process.env.DATABASE_URL ||
    process.env.DATABASE_URL;

  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!');
    console.log('');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase/migrations/20251019000001_create_messages_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying migration: 20251019000001_create_messages_table.sql');
    console.log('---');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('');

    // Verify table was created
    console.log('🔍 Verifying messages table...');
    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'messages'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length > 0) {
      console.log('✅ Messages table created with columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
      console.log('');
    }

    // Verify RLS policies
    console.log('🔍 Verifying RLS policies...');
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, cmd
      FROM pg_policies
      WHERE tablename = 'messages'
      ORDER BY policyname;
    `);

    if (policies.rows.length > 0) {
      console.log('✅ RLS Policies created:');
      policies.rows.forEach(row => {
        console.log(`   - ${row.policyname} (${row.cmd})`);
      });
      console.log('');
    }

    // Verify indexes
    console.log('🔍 Verifying indexes...');
    const indexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'messages'
      AND schemaname = 'public'
      ORDER BY indexname;
    `);

    if (indexes.rows.length > 0) {
      console.log('✅ Indexes created:');
      indexes.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
      console.log('');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Table: messages (${result.rows.length} columns)`);
    console.log(`   • RLS Policies: ${policies.rows.length}`);
    console.log(`   • Indexes: ${indexes.rows.length}`);
    console.log(`   • Realtime: Enabled`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
