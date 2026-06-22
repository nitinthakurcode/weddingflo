import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function verifyPaymentTables() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check tables exist
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('stripe_accounts', 'invoices', 'payments', 'refunds', 'payment_methods')
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    console.log('📊 Payment Tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    console.log('');

    // Check enum types
    const enumsQuery = `
      SELECT typname
      FROM pg_type
      WHERE typtype = 'e'
      AND typname IN ('payment_status', 'invoice_status', 'stripe_account_status')
      ORDER BY typname;
    `;

    const enumsResult = await client.query(enumsQuery);
    console.log('🏷️  Enum Types:');
    enumsResult.rows.forEach(row => {
      console.log(`  ✅ ${row.typname}`);
    });
    console.log('');

    // Check RLS policies
    const policiesQuery = `
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('stripe_accounts', 'invoices', 'payments', 'refunds', 'payment_methods')
      ORDER BY tablename, policyname;
    `;

    const policiesResult = await client.query(policiesQuery);
    console.log('🔒 RLS Policies:');
    let currentTable = '';
    policiesResult.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        console.log(`\n  ${row.tablename}:`);
        currentTable = row.tablename;
      }
      console.log(`    ✅ ${row.policyname}`);
    });
    console.log('');

    // Check indexes
    const indexesQuery = `
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('stripe_accounts', 'invoices', 'payments', 'refunds', 'payment_methods')
      AND indexname NOT LIKE '%pkey'
      ORDER BY tablename, indexname;
    `;

    const indexesResult = await client.query(indexesQuery);
    console.log('📇 Indexes:');
    currentTable = '';
    indexesResult.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        console.log(`\n  ${row.tablename}:`);
        currentTable = row.tablename;
      }
      console.log(`    ✅ ${row.indexname}`);
    });
    console.log('');

    // Check functions
    const functionsQuery = `
      SELECT proname
      FROM pg_proc
      WHERE proname IN ('get_payment_stats', 'generate_invoice_number', 'update_invoice_totals')
      ORDER BY proname;
    `;

    const functionsResult = await client.query(functionsQuery);
    console.log('⚙️  Functions:');
    functionsResult.rows.forEach(row => {
      console.log(`  ✅ ${row.proname}()`);
    });
    console.log('');

    console.log('✅ Payment system migration verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyPaymentTables();
