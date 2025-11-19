-- Migration: Optimize ALL RLS policies for performance
-- Issue: auth.uid() and auth.jwt() are being re-evaluated for each row
-- Fix: Wrap in (SELECT ...) to evaluate once per query

-- ============================================
-- PART 1: COMPANIES TABLE
-- ============================================

DROP POLICY IF EXISTS "users_update_own_company_onboarding" ON companies;
CREATE POLICY "users_update_own_company_onboarding" ON companies
  FOR UPDATE
  USING (
    id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 2: GUESTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete guests in their company" ON guests;
CREATE POLICY "Users can delete guests in their company" ON guests
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert guests for their company clients" ON guests;
CREATE POLICY "Users can insert guests for their company clients" ON guests
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update guests in their company" ON guests;
CREATE POLICY "Users can update guests in their company" ON guests
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view guests in their company" ON guests;
CREATE POLICY "Users can view guests in their company" ON guests
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 3: VENDORS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete vendors in their company" ON vendors;
CREATE POLICY "Users can delete vendors in their company" ON vendors
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert vendors in their company" ON vendors;
CREATE POLICY "Users can insert vendors in their company" ON vendors
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update vendors in their company" ON vendors;
CREATE POLICY "Users can update vendors in their company" ON vendors
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view vendors in their company" ON vendors;
CREATE POLICY "Users can view vendors in their company" ON vendors
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 4: TIMELINE TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete timeline in their company" ON timeline;
CREATE POLICY "Users can delete timeline in their company" ON timeline
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert timeline for their company clients" ON timeline;
CREATE POLICY "Users can insert timeline for their company clients" ON timeline
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update timeline in their company" ON timeline;
CREATE POLICY "Users can update timeline in their company" ON timeline
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view timeline in their company" ON timeline;
CREATE POLICY "Users can view timeline in their company" ON timeline
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 5: BUDGET TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete budget in their company" ON budget;
CREATE POLICY "Users can delete budget in their company" ON budget
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert budget for their company clients" ON budget;
CREATE POLICY "Users can insert budget for their company clients" ON budget
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update budget in their company" ON budget;
CREATE POLICY "Users can update budget in their company" ON budget
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view budget in their company" ON budget;
CREATE POLICY "Users can view budget in their company" ON budget
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 6: DOCUMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete documents in their company" ON documents;
CREATE POLICY "Users can delete documents in their company" ON documents
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert documents for their company clients" ON documents;
CREATE POLICY "Users can insert documents for their company clients" ON documents
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update documents in their company" ON documents;
CREATE POLICY "Users can update documents in their company" ON documents
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view documents in their company" ON documents;
CREATE POLICY "Users can view documents in their company" ON documents
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 7: MESSAGES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  USING (
    sender_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert messages in their company" ON messages;
CREATE POLICY "Users can insert messages in their company" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  USING (
    sender_id = (SELECT auth.uid())
  )
  WITH CHECK (
    sender_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view messages in their company" ON messages;
CREATE POLICY "Users can view messages in their company" ON messages
  FOR SELECT
  USING (
    sender_id = (SELECT auth.uid())
    OR receiver_id = (SELECT auth.uid())
  );

-- ============================================
-- PART 8: HOTELS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete hotels in their company" ON hotels;
CREATE POLICY "Users can delete hotels in their company" ON hotels
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert hotels for their company clients" ON hotels;
CREATE POLICY "Users can insert hotels for their company clients" ON hotels
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update hotels in their company" ON hotels;
CREATE POLICY "Users can update hotels in their company" ON hotels
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view hotels in their company" ON hotels;
CREATE POLICY "Users can view hotels in their company" ON hotels
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 9: GIFTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete gifts in their company" ON gifts;
CREATE POLICY "Users can delete gifts in their company" ON gifts
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert gifts for their company clients" ON gifts;
CREATE POLICY "Users can insert gifts for their company clients" ON gifts
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update gifts in their company" ON gifts;
CREATE POLICY "Users can update gifts in their company" ON gifts
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view gifts in their company" ON gifts;
CREATE POLICY "Users can view gifts in their company" ON gifts
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 10: EVENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can delete events in their company" ON events;
CREATE POLICY "Users can delete events in their company" ON events
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert events for their company clients" ON events;
CREATE POLICY "Users can insert events for their company clients" ON events
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update events in their company" ON events;
CREATE POLICY "Users can update events in their company" ON events
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view events in their company" ON events;
CREATE POLICY "Users can view events in their company" ON events
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 11: AI_USAGE_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "System can insert AI usage logs" ON ai_usage_logs;
CREATE POLICY "System can insert AI usage logs" ON ai_usage_logs
  FOR INSERT
  WITH CHECK (true); -- System policy, no auth check needed

DROP POLICY IF EXISTS "Users can view their company's AI usage logs" ON ai_usage_logs;
CREATE POLICY "Users can view their company's AI usage logs" ON ai_usage_logs
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 12: EMAIL SYSTEM TABLES
-- ============================================

DROP POLICY IF EXISTS "Users can insert email logs for their company" ON email_logs;
CREATE POLICY "Users can insert email logs for their company" ON email_logs
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update email logs in their company" ON email_logs;
CREATE POLICY "Users can update email logs in their company" ON email_logs
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view email logs in their company" ON email_logs;
CREATE POLICY "Users can view email logs in their company" ON email_logs
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own email preferences" ON email_preferences;
CREATE POLICY "Users can insert own email preferences" ON email_preferences
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own email preferences" ON email_preferences;
CREATE POLICY "Users can update own email preferences" ON email_preferences
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own email preferences" ON email_preferences;
CREATE POLICY "Users can view own email preferences" ON email_preferences
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

-- ============================================
-- PART 13: SMS SYSTEM TABLES
-- ============================================

DROP POLICY IF EXISTS "Users can insert sms logs for their company" ON sms_logs;
CREATE POLICY "Users can insert sms logs for their company" ON sms_logs
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update sms logs in their company" ON sms_logs;
CREATE POLICY "Users can update sms logs in their company" ON sms_logs
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view sms logs in their company" ON sms_logs;
CREATE POLICY "Users can view sms logs in their company" ON sms_logs
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own sms preferences" ON sms_preferences;
CREATE POLICY "Users can insert own sms preferences" ON sms_preferences
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own sms preferences" ON sms_preferences;
CREATE POLICY "Users can update own sms preferences" ON sms_preferences
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own sms preferences" ON sms_preferences;
CREATE POLICY "Users can view own sms preferences" ON sms_preferences
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

-- ============================================
-- PART 14: STRIPE/PAYMENT TABLES
-- ============================================

DROP POLICY IF EXISTS "Users can insert stripe accounts for their company" ON stripe_accounts;
CREATE POLICY "Users can insert stripe accounts for their company" ON stripe_accounts
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update stripe accounts in their company" ON stripe_accounts;
CREATE POLICY "Users can update stripe accounts in their company" ON stripe_accounts
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view stripe accounts in their company" ON stripe_accounts;
CREATE POLICY "Users can view stripe accounts in their company" ON stripe_accounts
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can delete invoices in their company" ON invoices;
CREATE POLICY "Users can delete invoices in their company" ON invoices
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert invoices for their company" ON invoices;
CREATE POLICY "Users can insert invoices for their company" ON invoices
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update invoices in their company" ON invoices;
CREATE POLICY "Users can update invoices in their company" ON invoices
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view invoices in their company" ON invoices;
CREATE POLICY "Users can view invoices in their company" ON invoices
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert payments for their company" ON payments;
CREATE POLICY "Users can insert payments for their company" ON payments
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update payments in their company" ON payments;
CREATE POLICY "Users can update payments in their company" ON payments
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view payments in their company" ON payments;
CREATE POLICY "Users can view payments in their company" ON payments
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert refunds for their company" ON refunds;
CREATE POLICY "Users can insert refunds for their company" ON refunds
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view refunds in their company" ON refunds;
CREATE POLICY "Users can view refunds in their company" ON refunds
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can delete payment methods in their company" ON payment_methods;
CREATE POLICY "Users can delete payment methods in their company" ON payment_methods
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert payment methods for their company" ON payment_methods;
CREATE POLICY "Users can insert payment methods for their company" ON payment_methods
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update payment methods in their company" ON payment_methods;
CREATE POLICY "Users can update payment methods in their company" ON payment_methods
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view payment methods in their company" ON payment_methods;
CREATE POLICY "Users can view payment methods in their company" ON payment_methods
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 15: WEBHOOK EVENTS
-- ============================================

DROP POLICY IF EXISTS "Admins can view company webhook events" ON webhook_events;
CREATE POLICY "Admins can view company webhook events" ON webhook_events
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Super admins can view all webhook events" ON webhook_events;
CREATE POLICY "Super admins can view all webhook events" ON webhook_events
  FOR SELECT
  USING (
    (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'role')::text = 'super_admin'
  );

-- ============================================
-- PART 16: WHATSAPP SYSTEM
-- ============================================

DROP POLICY IF EXISTS "Users can insert own company whatsapp logs" ON whatsapp_logs;
CREATE POLICY "Users can insert own company whatsapp logs" ON whatsapp_logs
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update own company whatsapp logs" ON whatsapp_logs;
CREATE POLICY "Users can update own company whatsapp logs" ON whatsapp_logs
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view own company whatsapp logs" ON whatsapp_logs;
CREATE POLICY "Users can view own company whatsapp logs" ON whatsapp_logs
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can delete own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can delete own company whatsapp templates" ON whatsapp_templates
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can insert own company whatsapp templates" ON whatsapp_templates
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can update own company whatsapp templates" ON whatsapp_templates
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can view own company whatsapp templates" ON whatsapp_templates
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 17: PUSH NOTIFICATIONS
-- ============================================

DROP POLICY IF EXISTS "Users delete own subscriptions" ON push_subscriptions;
CREATE POLICY "Users delete own subscriptions" ON push_subscriptions
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own subscriptions" ON push_subscriptions;
CREATE POLICY "Users insert own subscriptions" ON push_subscriptions
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users update own subscriptions" ON push_subscriptions;
CREATE POLICY "Users update own subscriptions" ON push_subscriptions
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users view own subscriptions" ON push_subscriptions;
CREATE POLICY "Users view own subscriptions" ON push_subscriptions
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users view company push logs" ON push_notification_logs;
CREATE POLICY "Users view company push logs" ON push_notification_logs
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users insert own push preferences" ON push_notification_preferences;
CREATE POLICY "Users insert own push preferences" ON push_notification_preferences
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users update own push preferences" ON push_notification_preferences;
CREATE POLICY "Users update own push preferences" ON push_notification_preferences
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users view own push preferences" ON push_notification_preferences;
CREATE POLICY "Users view own push preferences" ON push_notification_preferences
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

-- ============================================
-- PART 18: CALENDAR SYSTEM
-- ============================================

DROP POLICY IF EXISTS "Users can delete own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can delete own calendar tokens" ON google_calendar_tokens
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can insert own calendar tokens" ON google_calendar_tokens
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can update own calendar tokens" ON google_calendar_tokens
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can view own calendar tokens" ON google_calendar_tokens
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own ical tokens" ON ical_feed_tokens;
CREATE POLICY "Users can delete own ical tokens" ON ical_feed_tokens
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own ical tokens" ON ical_feed_tokens;
CREATE POLICY "Users can insert own ical tokens" ON ical_feed_tokens
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own ical tokens" ON ical_feed_tokens;
CREATE POLICY "Users can update own ical tokens" ON ical_feed_tokens
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own ical tokens" ON ical_feed_tokens;
CREATE POLICY "Users can view own ical tokens" ON ical_feed_tokens
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own calendar settings" ON calendar_sync_settings;
CREATE POLICY "Users can insert own calendar settings" ON calendar_sync_settings
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own calendar settings" ON calendar_sync_settings;
CREATE POLICY "Users can update own calendar settings" ON calendar_sync_settings
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own calendar settings" ON calendar_sync_settings;
CREATE POLICY "Users can view own calendar settings" ON calendar_sync_settings
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete company synced events" ON calendar_synced_events;
CREATE POLICY "Users can delete company synced events" ON calendar_synced_events
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert company synced events" ON calendar_synced_events;
CREATE POLICY "Users can insert company synced events" ON calendar_synced_events
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update company synced events" ON calendar_synced_events;
CREATE POLICY "Users can update company synced events" ON calendar_synced_events
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view company synced events" ON calendar_synced_events;
CREATE POLICY "Users can view company synced events" ON calendar_synced_events
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 19: GIFT TRACKING SYSTEM
-- ============================================

DROP POLICY IF EXISTS "companies_manage_gift_categories" ON gift_categories;
CREATE POLICY "companies_manage_gift_categories" ON gift_categories
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_manage_gifts" ON gifts_enhanced;
CREATE POLICY "companies_manage_gifts" ON gifts_enhanced
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_manage_templates" ON thank_you_note_templates;
CREATE POLICY "companies_manage_templates" ON thank_you_note_templates
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_view_reminders" ON thank_you_note_reminders;
CREATE POLICY "companies_view_reminders" ON thank_you_note_reminders
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- PART 20: WEDDING WEBSITES
-- ============================================

DROP POLICY IF EXISTS "companies_manage_websites" ON wedding_websites;
CREATE POLICY "companies_manage_websites" ON wedding_websites
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_read_analytics" ON website_visits;
CREATE POLICY "companies_read_analytics" ON website_visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_visits.website_id
      AND wedding_websites.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "companies_manage_dns_records" ON domain_dns_records;
CREATE POLICY "companies_manage_dns_records" ON domain_dns_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = domain_dns_records.website_id
      AND wedding_websites.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = domain_dns_records.website_id
      AND wedding_websites.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

-- ============================================
-- PART 21: FLOOR PLANS
-- ============================================

DROP POLICY IF EXISTS "Users can delete floor plans in their company" ON floor_plans;
CREATE POLICY "Users can delete floor plans in their company" ON floor_plans
  FOR DELETE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert floor plans for their company clients" ON floor_plans;
CREATE POLICY "Users can insert floor plans for their company clients" ON floor_plans
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can update floor plans in their company" ON floor_plans;
CREATE POLICY "Users can update floor plans in their company" ON floor_plans
  FOR UPDATE
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can view floor plans in their company" ON floor_plans;
CREATE POLICY "Users can view floor plans in their company" ON floor_plans
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can delete floor plan tables in their company" ON floor_plan_tables;
CREATE POLICY "Users can delete floor plan tables in their company" ON floor_plan_tables
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans
      WHERE floor_plans.id = floor_plan_tables.floor_plan_id
      AND floor_plans.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can insert floor plan tables for their company" ON floor_plan_tables;
CREATE POLICY "Users can insert floor plan tables for their company" ON floor_plan_tables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plans
      WHERE floor_plans.id = floor_plan_tables.floor_plan_id
      AND floor_plans.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can update floor plan tables in their company" ON floor_plan_tables;
CREATE POLICY "Users can update floor plan tables in their company" ON floor_plan_tables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans
      WHERE floor_plans.id = floor_plan_tables.floor_plan_id
      AND floor_plans.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plans
      WHERE floor_plans.id = floor_plan_tables.floor_plan_id
      AND floor_plans.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can view floor plan tables in their company" ON floor_plan_tables;
CREATE POLICY "Users can view floor plan tables in their company" ON floor_plan_tables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans
      WHERE floor_plans.id = floor_plan_tables.floor_plan_id
      AND floor_plans.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can delete floor plan guests in their company" ON floor_plan_guests;
CREATE POLICY "Users can delete floor plan guests in their company" ON floor_plan_guests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM floor_plan_tables fpt
      INNER JOIN floor_plans fp ON fp.id = fpt.floor_plan_id
      WHERE fpt.id = floor_plan_guests.table_id
      AND fp.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can insert floor plan guests for their company" ON floor_plan_guests;
CREATE POLICY "Users can insert floor plan guests for their company" ON floor_plan_guests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plan_tables fpt
      INNER JOIN floor_plans fp ON fp.id = fpt.floor_plan_id
      WHERE fpt.id = floor_plan_guests.table_id
      AND fp.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can update floor plan guests in their company" ON floor_plan_guests;
CREATE POLICY "Users can update floor plan guests in their company" ON floor_plan_guests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM floor_plan_tables fpt
      INNER JOIN floor_plans fp ON fp.id = fpt.floor_plan_id
      WHERE fpt.id = floor_plan_guests.table_id
      AND fp.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plan_tables fpt
      INNER JOIN floor_plans fp ON fp.id = fpt.floor_plan_id
      WHERE fpt.id = floor_plan_guests.table_id
      AND fp.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Users can view floor plan guests in their company" ON floor_plan_guests;
CREATE POLICY "Users can view floor plan guests in their company" ON floor_plan_guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM floor_plan_tables fpt
      INNER JOIN floor_plans fp ON fp.id = fpt.floor_plan_id
      WHERE fpt.id = floor_plan_guests.table_id
      AND fp.company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
    )
  );

-- ============================================
-- PART 22: ANALYTICS EXPORT SYSTEM
-- ============================================

DROP POLICY IF EXISTS "companies_manage_export_templates" ON export_templates;
CREATE POLICY "companies_manage_export_templates" ON export_templates
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_manage_generated_reports" ON generated_reports;
CREATE POLICY "companies_manage_generated_reports" ON generated_reports
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_manage_scheduled_reports" ON scheduled_reports;
CREATE POLICY "companies_manage_scheduled_reports" ON scheduled_reports
  FOR ALL
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "companies_read_analytics_snapshots" ON analytics_snapshots;
CREATE POLICY "companies_read_analytics_snapshots" ON analytics_snapshots
  FOR SELECT
  USING (
    company_id = (SELECT (SELECT auth.jwt()) -> 'user_metadata' ->> 'company_id')::uuid
  );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ All RLS policies have been optimized for performance';
  RAISE NOTICE '✅ auth.uid() and auth.jwt() calls are now wrapped in (SELECT ...)';
  RAISE NOTICE '✅ This will significantly improve query performance at scale';
END $$;
