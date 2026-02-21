/**
 * Database Reset Script
 * February 2026
 *
 * Clears ALL data from the database while preserving schema.
 * Run with: npx tsx scripts/reset-database.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Make sure .env.local or .env contains DATABASE_URL');
  process.exit(1);
}

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n');

  const client = postgres(connectionString!, { max: 1 });
  const db = drizzle(client);

  try {
    // List of all tables - CASCADE handles foreign key dependencies
    const tables = [
      // Start with tables that have the most dependencies pointing TO them
      'companies',
      'user',
      'users',
      'clients',
      'guests',
      'events',
      'vendors',
      'hotels',
      'timeline',
      'budget',
      'payments',
      'invoices',
      'documents',
      'messages',
      'floor_plans',
      'gifts',
      'creative_jobs',
      'wedding_websites',

      // Pipeline & CRM
      'pipeline_stages',
      'pipeline_leads',
      'pipeline_activities',

      // Proposals & Contracts
      'proposal_templates',
      'proposals',
      'contract_templates',
      'contracts',

      // Workflows
      'workflows',
      'workflow_steps',
      'workflow_executions',
      'workflow_execution_logs',

      // Questionnaires
      'questionnaire_templates',
      'questionnaires',
      'questionnaire_responses',

      // Notifications & Jobs
      'notifications',
      'job_queue',

      // Seating
      'floor_plan_tables',
      'floor_plan_guests',
      'seating_change_log',
      'seating_versions',

      // Gifts
      'guest_gifts',
      'gift_items',
      'gift_categories',
      'gift_types',
      'gifts_enhanced',
      'thank_you_note_templates',

      // Guest related
      'guest_preferences',
      'guest_conflicts',
      'guest_transport',
      'hotel_bookings',
      'vehicles',
      'accommodations',

      // Communication logs
      'email_logs',
      'sms_logs',
      'whatsapp_logs',
      'push_logs',
      'push_notification_logs',
      'push_subscriptions',

      // Preferences
      'email_preferences',
      'sms_preferences',
      'push_notification_preferences',

      // Templates
      'sms_templates',
      'whatsapp_templates',

      // Calendar
      'calendar_synced_events',
      'calendar_sync_settings',
      'google_calendar_tokens',
      'ical_feed_tokens',

      // Reports
      'generated_reports',
      'scheduled_reports',

      // Payments & Invoices
      'refunds',
      'advance_payments',
      'stripe_connect_accounts',
      'stripe_accounts',

      // Vendors
      'vendor_comments',
      'client_vendors',

      // Website
      'website_builder_content',
      'website_builder_pages',
      'website_builder_layouts',

      // Timeline
      'timeline_templates',

      // Team
      'team_client_assignments',

      // Client Users
      'client_users',

      // QR Codes
      'qr_codes',

      // Webhook events
      'webhook_events',

      // Activity logs
      'activity',

      // Auth tables (clear last)
      'session',
      'account',
      'verification',
    ];

    console.log(`📋 Clearing ${tables.length} tables...\n`);

    let cleared = 0;
    let skipped = 0;

    for (const table of tables) {
      try {
        // Use CASCADE to handle foreign key constraints
        await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
        console.log(`  ✅ Cleared: ${table}`);
        cleared++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // Table might not exist yet (not migrated)
        if (message.includes('does not exist')) {
          console.log(`  ⏭️  Skipped (not exists): ${table}`);
          skipped++;
        } else {
          console.log(`  ⚠️  Warning for ${table}: ${message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Database reset complete!`);
    console.log(`   Tables cleared: ${cleared}`);
    console.log(`   Tables skipped: ${skipped}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase().catch(console.error);
