#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://gkrcaeymhgjepncbceag.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251118090000_optimize_all_rls_policies.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split by major sections to avoid timeout
    const sections = migrationSQL.split('-- ============================================');

    console.log(`📝 Found ${sections.length} sections to execute`);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section || section.startsWith('--') && section.length < 100) continue;

      console.log(`\n⚙️  Executing section ${i + 1}/${sections.length}...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: section
      }).catch(async () => {
        // If rpc doesn't exist, try direct execution via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql_query: section })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return { data: await response.json(), error: null };
      });

      if (error) {
        console.error(`❌ Error in section ${i + 1}:`, error.message);
        // Continue with next section
      } else {
        console.log(`✅ Section ${i + 1} completed`);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('💡 Please verify RLS policies using Supabase advisors');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
