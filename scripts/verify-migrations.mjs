import pg from 'pg';

const { Client } = pg;

const connectionString = "postgresql://postgres.gkrcaeymhgjepncbceag:Nitin@123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function verifyMigrations() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check applied migrations
    console.log('=== APPLIED MIGRATIONS ===');
    const migrationsResult = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations
       WHERE version LIKE '20251021%'
       ORDER BY version`
    );

    if (migrationsResult.rows.length > 0) {
      console.log('Found October 21 migrations:');
      migrationsResult.rows.forEach(row => console.log(`  - ${row.version}`));
    } else {
      console.log('❌ No October 21 migrations found in schema_migrations table');
    }
    console.log('');

    // Check for expected tables
    console.log('=== TABLE VERIFICATION ===');
    const expectedTables = [
      'email_logs',
      'email_preferences',
      'sms_logs',
      'sms_preferences',
      'stripe_accounts',
      'invoices',
      'payments',
      'refunds',
      'payment_methods'
    ];

    const tablesResult = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_name = ANY($1)
       ORDER BY table_name`,
      [expectedTables]
    );

    const foundTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(t => !foundTables.includes(t));

    console.log('Found tables:');
    foundTables.forEach(t => console.log(`  ✓ ${t}`));

    if (missingTables.length > 0) {
      console.log('\nMissing tables:');
      missingTables.forEach(t => console.log(`  ❌ ${t}`));
    }

    console.log('\n=== SUMMARY ===');
    if (migrationsResult.rows.length === 3 && missingTables.length === 0) {
      console.log('✅ All 3 migrations appear to be applied successfully!');
      console.log('✅ All 9 expected tables exist!');
    } else if (migrationsResult.rows.length === 0 && missingTables.length === expectedTables.length) {
      console.log('❌ Migrations NOT applied - need to apply them!');
    } else {
      console.log('⚠️  Partial migration state detected');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigrations();
