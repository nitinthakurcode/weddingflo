/**
 * Verify Database is Empty
 * February 2026
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function verifyEmpty() {
  console.log('🔍 Verifying database is empty...\n');

  const client = postgres(connectionString!, { max: 1 });
  const db = drizzle(client);

  const tables = [
    'user',
    'companies',
    'clients',
    'guests',
    'events',
    'vendors',
    'timeline',
    'budget',
    'payments',
    'invoices',
    'session',
    'account',
  ];

  let allEmpty = true;

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${table}"`));
      const count = (result[0] as { count: string })?.count || '0';
      const isEmpty = count === '0';

      if (!isEmpty) {
        console.log(`  ❌ ${table}: ${count} rows`);
        allEmpty = false;
      } else {
        console.log(`  ✅ ${table}: empty`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('does not exist')) {
        console.log(`  ⏭️  ${table}: table not exists`);
      } else {
        console.log(`  ⚠️  ${table}: ${message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allEmpty) {
    console.log('✅ All tables are empty - fresh database!');
  } else {
    console.log('⚠️  Some tables still have data');
  }
  console.log('='.repeat(50));

  await client.end();
}

verifyEmpty().catch(console.error);
