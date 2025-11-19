import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const sql = readFileSync('supabase/migrations/20251118070157_fix_function_search_path_security.sql', 'utf8');

    console.log('Applying migration to Supabase...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct approach
      console.log('Trying alternative method...');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        // Use the low-level postgres client
        const { error: stmtError } = await supabase.rpc('exec', { sql: statement });

        if (stmtError) {
          console.error(`Error in statement ${i + 1}:`, stmtError);
          throw stmtError;
        }
      }

      console.log('✅ Migration applied successfully!');
    } else {
      console.log('✅ Migration applied successfully!');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
    console.log('\n⚠️  Please apply the migration manually via Supabase Dashboard SQL Editor');
    console.log('File: supabase/migrations/20251118070157_fix_function_search_path_security.sql');
    process.exit(1);
  }
}

applyMigration();
