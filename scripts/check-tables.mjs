import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.gkrcaeymhgjepncbceag:Nitin@123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function checkTables() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check tables
    console.log('=== CHECKING TABLES ===\n');
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('guests', 'hotels', 'gifts', 'vendors', 'budget', 'events', 'timeline', 'documents')
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    const expectedTables = ['budget', 'documents', 'events', 'gifts', 'guests', 'hotels', 'timeline', 'vendors'];
    const existingTables = tablesResult.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    console.log('Expected tables (8):', expectedTables.join(', '));
    console.log('Existing tables (' + existingTables.length + '):', existingTables.join(', ') || 'NONE');

    if (missingTables.length > 0) {
      console.log('❌ Missing tables (' + missingTables.length + '):', missingTables.join(', '));
    } else {
      console.log('✅ All expected tables exist!');
    }

    // Check RLS policies
    console.log('\n=== CHECKING RLS POLICIES ===\n');
    const policiesQuery = `
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('guests', 'hotels', 'gifts', 'vendors', 'budget', 'events', 'timeline', 'documents')
      ORDER BY tablename, policyname;
    `;

    const policiesResult = await client.query(policiesQuery);

    if (policiesResult.rows.length > 0) {
      console.log('RLS Policies found:');
      let currentTable = '';
      policiesResult.rows.forEach(row => {
        if (row.tablename !== currentTable) {
          currentTable = row.tablename;
          console.log(`\n📋 ${row.tablename}:`);
        }
        console.log(`  - ${row.policyname}`);
      });
    } else {
      console.log('❌ No RLS policies found for these tables');
    }

    // Check if policies use session claims
    console.log('\n=== CHECKING SESSION CLAIMS IN POLICIES ===\n');
    const claimsQuery = `
      SELECT tablename, policyname, qual::text, with_check::text
      FROM pg_policies
      WHERE tablename IN ('guests', 'hotels', 'gifts', 'vendors', 'budget', 'events', 'timeline', 'documents')
      ORDER BY tablename, policyname;
    `;

    const claimsResult = await client.query(claimsQuery);

    if (claimsResult.rows.length > 0) {
      claimsResult.rows.forEach(row => {
        const usesSessionClaims =
          (row.qual && row.qual.includes("auth.jwt()")) ||
          (row.with_check && row.with_check.includes("auth.jwt()"));

        const icon = usesSessionClaims ? '✅' : '⚠️';
        console.log(`${icon} ${row.tablename}.${row.policyname}`);
        if (usesSessionClaims) {
          console.log(`   Uses auth.jwt() session claims`);
        } else {
          console.log(`   Does NOT use session claims`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
