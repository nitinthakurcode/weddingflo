#!/usr/bin/env node

const SUPABASE_URL = 'https://gkrcaeymhgjepncbceag.supabase.co';
const SUPABASE_KEY = 'sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2';

async function querySupabase(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function checkDatabase() {
  console.log('=== WeddingFlo Database Status ===\n');

  try {
    // List all tables
    console.log('📊 All Tables:');
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tablesResult = await querySupabase(tablesQuery);
    if (tablesResult && Array.isArray(tablesResult)) {
      tablesResult.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.table_name}`);
      });
    }

    console.log('\n📋 RLS Policy Coverage:');
    const rlsQuery = `
      SELECT schemaname, tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY schemaname, tablename
      ORDER BY tablename;
    `;

    const rlsResult = await querySupabase(rlsQuery);
    if (rlsResult && Array.isArray(rlsResult)) {
      rlsResult.forEach((row) => {
        console.log(`  ${row.tablename}: ${row.policy_count} policies`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);

    // Fallback: Just connect and verify connection
    console.log('\nTrying direct REST API...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      console.log('✅ Supabase connection successful!');
      console.log('Note: exec_sql function might not be available. Use PostgREST endpoints instead.');
    } else {
      console.log('❌ Supabase connection failed:', response.status);
    }
  }
}

checkDatabase();
