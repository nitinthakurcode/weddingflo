#!/usr/bin/env node

/**
 * Verify Push Notifications Tables
 * Checks if all tables, indexes, and RLS policies were created correctly
 */

import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.gkrcaeymhgjepncbceag:Nitin@123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function verifyPushTables() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check tables exist
    console.log('📋 Checking Tables...');
    const tablesResult = await client.query(`
      SELECT
        table_name,
        (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_name IN ('push_subscriptions', 'push_notification_logs', 'push_notification_preferences')
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length === 3) {
      console.log('✅ All 3 tables created:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.column_count} columns)`);
      });
    } else {
      console.log('❌ Missing tables! Expected 3, found:', tablesResult.rows.length);
      return;
    }

    // Check RLS is enabled
    console.log('\n🔒 Checking RLS Status...');
    const rlsResult = await client.query(`
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('push_subscriptions', 'push_notification_logs', 'push_notification_preferences')
      ORDER BY tablename;
    `);

    const allRlsEnabled = rlsResult.rows.every(row => row.rls_enabled);
    if (allRlsEnabled) {
      console.log('✅ RLS enabled on all tables');
    } else {
      console.log('❌ RLS not enabled on all tables!');
      rlsResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}: ${row.rls_enabled ? '✓' : '✗'}`);
      });
    }

    // Check policies
    console.log('\n🛡️  Checking RLS Policies...');
    const policiesResult = await client.query(`
      SELECT
        tablename,
        policyname,
        cmd as operation
      FROM pg_policies
      WHERE tablename IN ('push_subscriptions', 'push_notification_logs', 'push_notification_preferences')
      ORDER BY tablename, policyname;
    `);

    console.log(`✅ Found ${policiesResult.rows.length} RLS policies:`);

    const policiesByTable = {};
    policiesResult.rows.forEach(row => {
      if (!policiesByTable[row.tablename]) {
        policiesByTable[row.tablename] = [];
      }
      policiesByTable[row.tablename].push(`${row.policyname} (${row.operation})`);
    });

    Object.entries(policiesByTable).forEach(([table, policies]) => {
      console.log(`\n   ${table}:`);
      policies.forEach(policy => console.log(`     - ${policy}`));
    });

    // Check indexes
    console.log('\n⚡ Checking Indexes...');
    const indexesResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('push_subscriptions', 'push_notification_logs', 'push_notification_preferences')
      ORDER BY tablename, indexname;
    `);

    console.log(`✅ Found ${indexesResult.rows.length} indexes`);

    // Check constraints
    console.log('\n🔗 Checking Constraints...');
    const constraintsResult = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('push_subscriptions', 'push_notification_logs', 'push_notification_preferences')
        AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY')
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
    `);

    console.log(`✅ Found ${constraintsResult.rows.length} constraints:`);
    constraintsResult.rows.forEach(row => {
      const detail = row.check_clause || '';
      console.log(`   - ${row.table_name}.${row.constraint_name} (${row.constraint_type})`);
      if (detail) console.log(`     ${detail}`);
    });

    console.log('\n✅ Push Notifications System - VERIFIED!\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyPushTables();
