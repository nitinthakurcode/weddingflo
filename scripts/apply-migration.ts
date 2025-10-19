import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  // Create admin client (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/20251019000001_create_messages_table.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration: 20251019000001_create_messages_table.sql');
  console.log('---');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Verifying messages table...');

    // Verify table exists
    const { data: tables, error: tableError } = await supabase
      .from('messages')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('⚠️  Warning: Could not verify table:', tableError.message);
    } else {
      console.log('✅ Messages table verified!');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
