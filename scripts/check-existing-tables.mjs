import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

async function checkTables() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('guests', 'hotels', 'gifts', 'vendors', 'budget', 'events', 'timeline', 'documents')
      ORDER BY table_name;
    `);

    const allTables = ['budget', 'documents', 'events', 'gifts', 'guests', 'hotels', 'timeline', 'vendors'];
    const existing = result.rows.map(r => r.table_name);
    const missing = allTables.filter(t => !existing.includes(t));

    console.log('Existing tables:', existing.join(', ') || 'NONE');
    console.log('Missing tables:', missing.join(', ') || 'NONE');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
