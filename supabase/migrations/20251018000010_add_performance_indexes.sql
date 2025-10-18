-- ============================================================================
-- Migration: 20251018000010_add_performance_indexes.sql
-- Description: Add strategic indexes for query performance optimization
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Proactive performance optimization for all tables
-- ============================================================================
--
-- This migration adds carefully selected indexes to improve query performance
-- for common access patterns in WeddingFlow Pro application.
--
-- Index Strategy:
-- 1. Foreign keys (for JOIN operations)
-- 2. Status/enum fields (for filtering)
-- 3. Date fields (for sorting and filtering)
-- 4. Composite indexes for common query patterns
-- 5. Partial indexes for active records
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF TABLES EXIST BEFORE ADDING INDEXES
-- ============================================================================
-- This ensures the migration doesn't fail if tables don't exist yet

DO $$
BEGIN
  RAISE NOTICE 'Starting performance index migration...';
END $$;

-- ============================================================================
-- STEP 2: CLIENTS TABLE INDEXES
-- ============================================================================
-- Clients are filtered by company and status frequently

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    -- Index for filtering by company (most common query)
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);

    -- Index for filtering by status
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

    -- Index for filtering by wedding date (timeline view)
    CREATE INDEX IF NOT EXISTS idx_clients_wedding_date ON clients(wedding_date) WHERE wedding_date IS NOT NULL;

    -- Composite index for company + status queries
    CREATE INDEX IF NOT EXISTS idx_clients_company_status ON clients(company_id, status);

    -- Index for created_by (finding clients created by specific user)
    CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

    RAISE NOTICE '✅ Added indexes to clients table';
  ELSE
    RAISE NOTICE '⚠️  clients table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: GUESTS TABLE INDEXES
-- ============================================================================
-- Guests are frequently queried by client and filtered by RSVP status

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guests') THEN
    -- Index for filtering by client (most common query)
    CREATE INDEX IF NOT EXISTS idx_guests_client_id ON guests(client_id);

    -- Index for filtering by RSVP status
    CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);

    -- Index for searching by email
    CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email) WHERE email IS NOT NULL;

    -- Composite index for client + RSVP queries (guest list with filters)
    CREATE INDEX IF NOT EXISTS idx_guests_client_rsvp ON guests(client_id, rsvp_status);

    -- Index for table assignments (seating chart view)
    CREATE INDEX IF NOT EXISTS idx_guests_table_number ON guests(table_number) WHERE table_number IS NOT NULL;

    RAISE NOTICE '✅ Added indexes to guests table';
  ELSE
    RAISE NOTICE '⚠️  guests table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: EVENTS TABLE INDEXES
-- ============================================================================
-- Events are queried by client and filtered by date/status

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    -- Index for filtering by client
    CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);

    -- Index for filtering by status
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

    -- Index for date-based queries (timeline, upcoming events)
    CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);

    -- Composite index for client + date queries (client timeline)
    CREATE INDEX IF NOT EXISTS idx_events_client_date ON events(client_id, start_time);

    -- Index for company-wide event queries (if company_id exists)
    -- CREATE INDEX IF NOT EXISTS idx_events_company_id ON events(company_id);

    RAISE NOTICE '✅ Added indexes to events table';
  ELSE
    RAISE NOTICE '⚠️  events table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: VENDORS TABLE INDEXES
-- ============================================================================
-- Vendors are filtered by category and company

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') THEN
    -- Index for filtering by company
    CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);

    -- Index for filtering by category
    CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

    -- Composite index for company + category queries
    CREATE INDEX IF NOT EXISTS idx_vendors_company_category ON vendors(company_id, category);

    RAISE NOTICE '✅ Added indexes to vendors table';
  ELSE
    RAISE NOTICE '⚠️  vendors table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: TASKS TABLE INDEXES
-- ============================================================================
-- Tasks are filtered by status, priority, and due date

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    -- Index for filtering by client
    CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);

    -- Index for filtering by status
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

    -- Index for filtering by priority
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

    -- Index for due date queries (upcoming tasks)
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

    -- Index for assigned user (my tasks view)
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;

    -- Composite index for status + priority queries
    CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);

    RAISE NOTICE '✅ Added indexes to tasks table';
  ELSE
    RAISE NOTICE '⚠️  tasks table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: BUDGET_ITEMS TABLE INDEXES
-- ============================================================================
-- Budget items are queried by client and category

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_items') THEN
    -- Index for filtering by client
    CREATE INDEX IF NOT EXISTS idx_budget_items_client_id ON budget_items(client_id);

    -- Index for filtering by category
    CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category);

    -- Index for payment status
    CREATE INDEX IF NOT EXISTS idx_budget_items_payment_status ON budget_items(payment_status);

    -- Composite index for client + category queries
    CREATE INDEX IF NOT EXISTS idx_budget_items_client_category ON budget_items(client_id, category);

    RAISE NOTICE '✅ Added indexes to budget_items table';
  ELSE
    RAISE NOTICE '⚠️  budget_items table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 8: CLIENT_USERS TABLE INDEXES
-- ============================================================================
-- Client-user relationships are frequently joined

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_users') THEN
    -- Index for client lookups
    CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);

    -- Index for user lookups (reverse relationship)
    CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);

    -- Index for primary contact queries
    CREATE INDEX IF NOT EXISTS idx_client_users_is_primary ON client_users(is_primary) WHERE is_primary = true;

    RAISE NOTICE '✅ Added indexes to client_users table';
  ELSE
    RAISE NOTICE '⚠️  client_users table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 9: MESSAGES/COMMUNICATIONS TABLE INDEXES
-- ============================================================================
-- Messages are frequently queried by sender, recipient, and timestamp

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    -- Index for sender queries
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

    -- Index for recipient queries
    CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);

    -- Index for timestamp (chronological ordering)
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

    -- Index for unread messages
    CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

    -- Composite index for conversation queries
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);

    RAISE NOTICE '✅ Added indexes to messages table';
  ELSE
    RAISE NOTICE '⚠️  messages table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 10: NOTIFICATIONS TABLE INDEXES
-- ============================================================================
-- Notifications are filtered by user and read status

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Index for user notifications
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

    -- Index for unread notifications
    CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;

    -- Index for timestamp ordering
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

    -- Composite index for user + unread queries
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

    RAISE NOTICE '✅ Added indexes to notifications table';
  ELSE
    RAISE NOTICE '⚠️  notifications table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 11: ACTIVITY_LOGS TABLE INDEXES
-- ============================================================================
-- Activity logs are queried by entity and timestamp

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    -- Index for user activity
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

    -- Index for company activity
    CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);

    -- Index for entity lookups
    CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

    -- Index for timestamp (recent activity)
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

    RAISE NOTICE '✅ Added indexes to activity_logs table';
  ELSE
    RAISE NOTICE '⚠️  activity_logs table does not exist yet - skipping';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PERFORMANCE INDEXES MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexed Tables:';
  RAISE NOTICE '  📊 clients - 5 indexes';
  RAISE NOTICE '  👥 guests - 5 indexes';
  RAISE NOTICE '  📅 events - 4 indexes';
  RAISE NOTICE '  🏢 vendors - 3 indexes';
  RAISE NOTICE '  ✅ tasks - 6 indexes';
  RAISE NOTICE '  💰 budget_items - 4 indexes';
  RAISE NOTICE '  🔗 client_users - 3 indexes';
  RAISE NOTICE '  💬 messages - 5 indexes';
  RAISE NOTICE '  🔔 notifications - 4 indexes';
  RAISE NOTICE '  📝 activity_logs - 4 indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Benefits:';
  RAISE NOTICE '  ⚡ Faster foreign key JOINs';
  RAISE NOTICE '  ⚡ Faster status/category filtering';
  RAISE NOTICE '  ⚡ Faster date-based queries';
  RAISE NOTICE '  ⚡ Optimized composite queries';
  RAISE NOTICE '  ⚡ Partial indexes for active records';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Monitor query performance in dashboard';
  RAISE NOTICE '========================================';
END $$;
