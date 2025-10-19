import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.gkrcaeymhgjepncbceag:Nitin@123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function verify() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check tables
    console.log('=== TABLES ===\n');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('guests', 'hotels', 'gifts', 'vendors', 'budget', 'events', 'timeline', 'documents')
      ORDER BY table_name;
    `);

    const expected = ['budget', 'documents', 'events', 'gifts', 'guests', 'hotels', 'timeline', 'vendors'];
    const existing = tables.rows.map(r => r.table_name);

    expected.forEach(table => {
      if (existing.includes(table)) {
        console.log(`✅ ${table}`);
      } else {
        console.log(`❌ ${table} - MISSING`);
      }
    });

    // Check RLS policies
    console.log('\n=== RLS POLICIES ===\n');
    const policies = await client.query(`
      SELECT tablename, policyname,
        CASE
          WHEN qual::text LIKE '%auth.jwt()%' OR with_check::text LIKE '%auth.jwt()%' THEN true
          ELSE false
        END as uses_session_claims
      FROM pg_policies
      WHERE tablename IN ('guests', 'hotels', 'gifts', 'vendors', 'budget', 'events', 'timeline', 'documents')
      ORDER BY tablename, policyname;
    `);

    let currentTable = '';
    policies.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n${row.tablename}:`);
      }
      const icon = row.uses_session_claims ? '✅' : '❌';
      console.log(`  ${icon} ${row.policyname}`);
    });

    console.log('\n=== SUMMARY ===\n');
    console.log(`Tables: ${existing.length}/8`);
    console.log(`Policies: ${policies.rows.length}`);
    console.log(`Using session claims: ${policies.rows.filter(r => r.uses_session_claims).length}/${policies.rows.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verify();
