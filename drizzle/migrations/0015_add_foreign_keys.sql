-- Migration: Add missing foreign key constraints
-- February 2026 - Database referential integrity fixes
--
-- This migration adds foreign key constraints that were missing from the schema.
-- Before running, ensure no orphaned records exist that would violate these constraints.

-- ============================================
-- PIPELINE MODULE FOREIGN KEYS
-- ============================================

-- pipeline_leads.stageId -> pipeline_stages.id
ALTER TABLE "pipeline_leads"
ADD CONSTRAINT "pipeline_leads_stage_id_fkey"
FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;

-- pipeline_leads.assigneeId -> user.id
ALTER TABLE "pipeline_leads"
ADD CONSTRAINT "pipeline_leads_assignee_id_fkey"
FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- pipeline_leads.convertedToClientId -> clients.id
ALTER TABLE "pipeline_leads"
ADD CONSTRAINT "pipeline_leads_converted_to_client_id_fkey"
FOREIGN KEY ("converted_to_client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- pipeline_leads.companyId -> companies.id (via UUID cast)
-- Note: companies.id is UUID, pipeline_leads.companyId is TEXT
-- This requires either type change or application-level enforcement
-- Skipping FK here due to type mismatch - handled at application level

-- pipeline_activities.leadId -> pipeline_leads.id
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "pipeline_leads"("id") ON DELETE CASCADE;

-- pipeline_activities.userId -> user.id
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- pipeline_activities.previousStageId -> pipeline_stages.id
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_previous_stage_id_fkey"
FOREIGN KEY ("previous_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;

-- pipeline_activities.newStageId -> pipeline_stages.id
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_new_stage_id_fkey"
FOREIGN KEY ("new_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;

-- ============================================
-- PROPOSALS & CONTRACTS MODULE FOREIGN KEYS
-- ============================================

-- proposals.templateId -> proposal_templates.id
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "proposal_templates"("id") ON DELETE SET NULL;

-- proposals.leadId -> pipeline_leads.id
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "pipeline_leads"("id") ON DELETE SET NULL;

-- proposals.clientId -> clients.id
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- proposals.createdBy -> user.id
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- contracts.templateId -> contract_templates.id
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL;

-- contracts.proposalId -> proposals.id
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_proposal_id_fkey"
FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL;

-- contracts.clientId -> clients.id
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- contracts.createdBy -> user.id
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- ============================================
-- WORKFLOWS MODULE FOREIGN KEYS
-- ============================================

-- workflow_steps.workflowId -> workflows.id
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_workflow_id_fkey"
FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;

-- workflow_steps.onTrueStepId -> workflow_steps.id (self-reference)
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_on_true_step_id_fkey"
FOREIGN KEY ("on_true_step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;

-- workflow_steps.onFalseStepId -> workflow_steps.id (self-reference)
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_on_false_step_id_fkey"
FOREIGN KEY ("on_false_step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;

-- workflow_executions.workflowId -> workflows.id
ALTER TABLE "workflow_executions"
ADD CONSTRAINT "workflow_executions_workflow_id_fkey"
FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;

-- workflow_executions.currentStepId -> workflow_steps.id
ALTER TABLE "workflow_executions"
ADD CONSTRAINT "workflow_executions_current_step_id_fkey"
FOREIGN KEY ("current_step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;

-- workflow_execution_logs.executionId -> workflow_executions.id
ALTER TABLE "workflow_execution_logs"
ADD CONSTRAINT "workflow_execution_logs_execution_id_fkey"
FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE;

-- workflow_execution_logs.stepId -> workflow_steps.id
ALTER TABLE "workflow_execution_logs"
ADD CONSTRAINT "workflow_execution_logs_step_id_fkey"
FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;

-- ============================================
-- INVITATIONS MODULE FOREIGN KEYS
-- ============================================

-- team_invitations.invitedBy -> user.id
ALTER TABLE "team_invitations"
ADD CONSTRAINT "team_invitations_invited_by_fkey"
FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- team_invitations.acceptedBy -> user.id
ALTER TABLE "team_invitations"
ADD CONSTRAINT "team_invitations_accepted_by_fkey"
FOREIGN KEY ("accepted_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- wedding_invitations.clientId -> clients.id
ALTER TABLE "wedding_invitations"
ADD CONSTRAINT "wedding_invitations_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- wedding_invitations.invitedBy -> user.id
ALTER TABLE "wedding_invitations"
ADD CONSTRAINT "wedding_invitations_invited_by_fkey"
FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- wedding_invitations.acceptedBy -> user.id
ALTER TABLE "wedding_invitations"
ADD CONSTRAINT "wedding_invitations_accepted_by_fkey"
FOREIGN KEY ("accepted_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- ============================================
-- CORE FEATURES MODULE FOREIGN KEYS
-- ============================================

-- clients.createdBy -> user.id
ALTER TABLE "clients"
ADD CONSTRAINT "clients_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;

-- client_users.clientId -> clients.id
ALTER TABLE "client_users"
ADD CONSTRAINT "client_users_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- client_users.userId -> user.id
ALTER TABLE "client_users"
ADD CONSTRAINT "client_users_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- guests.clientId -> clients.id
ALTER TABLE "guests"
ADD CONSTRAINT "guests_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- events.clientId -> clients.id
ALTER TABLE "events"
ADD CONSTRAINT "events_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- timeline.clientId -> clients.id
ALTER TABLE "timeline"
ADD CONSTRAINT "timeline_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- timeline.eventId -> events.id
ALTER TABLE "timeline"
ADD CONSTRAINT "timeline_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;

-- budget.clientId -> clients.id
ALTER TABLE "budget"
ADD CONSTRAINT "budget_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- budget.vendorId -> vendors.id
ALTER TABLE "budget"
ADD CONSTRAINT "budget_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL;

-- documents.clientId -> clients.id
ALTER TABLE "documents"
ADD CONSTRAINT "documents_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- ============================================
-- VENDORS MODULE FOREIGN KEYS
-- ============================================

-- client_vendors.clientId -> clients.id
ALTER TABLE "client_vendors"
ADD CONSTRAINT "client_vendors_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- client_vendors.vendorId -> vendors.id
ALTER TABLE "client_vendors"
ADD CONSTRAINT "client_vendors_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;

-- vendor_comments.vendorId -> vendors.id
ALTER TABLE "vendor_comments"
ADD CONSTRAINT "vendor_comments_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;

-- vendor_comments.userId -> user.id
ALTER TABLE "vendor_comments"
ADD CONSTRAINT "vendor_comments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- vendor_reviews.vendorId -> vendors.id
ALTER TABLE "vendor_reviews"
ADD CONSTRAINT "vendor_reviews_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;

-- vendor_reviews.clientId -> clients.id
ALTER TABLE "vendor_reviews"
ADD CONSTRAINT "vendor_reviews_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- vendor_reviews.userId -> user.id
ALTER TABLE "vendor_reviews"
ADD CONSTRAINT "vendor_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- ============================================
-- HOTELS & TRANSPORT MODULE FOREIGN KEYS
-- ============================================

-- hotels.clientId -> clients.id
ALTER TABLE "hotels"
ADD CONSTRAINT "hotels_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- hotels.guestId -> guests.id
ALTER TABLE "hotels"
ADD CONSTRAINT "hotels_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- hotels.accommodationId -> accommodations.id
ALTER TABLE "hotels"
ADD CONSTRAINT "hotels_accommodation_id_fkey"
FOREIGN KEY ("accommodation_id") REFERENCES "accommodations"("id") ON DELETE SET NULL;

-- accommodations.clientId -> clients.id
ALTER TABLE "accommodations"
ADD CONSTRAINT "accommodations_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- vehicles.clientId -> clients.id
ALTER TABLE "vehicles"
ADD CONSTRAINT "vehicles_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- guest_transport.clientId -> clients.id
ALTER TABLE "guest_transport"
ADD CONSTRAINT "guest_transport_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- guest_transport.guestId -> guests.id
ALTER TABLE "guest_transport"
ADD CONSTRAINT "guest_transport_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- guest_transport.vehicleId -> vehicles.id
ALTER TABLE "guest_transport"
ADD CONSTRAINT "guest_transport_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL;

-- ============================================
-- GIFTS MODULE FOREIGN KEYS
-- ============================================

-- gifts.clientId -> clients.id
ALTER TABLE "gifts"
ADD CONSTRAINT "gifts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- gifts.guestId -> guests.id
ALTER TABLE "gifts"
ADD CONSTRAINT "gifts_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- gifts_enhanced.clientId -> clients.id
ALTER TABLE "gifts_enhanced"
ADD CONSTRAINT "gifts_enhanced_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- gifts_enhanced.guestId -> guests.id
ALTER TABLE "gifts_enhanced"
ADD CONSTRAINT "gifts_enhanced_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- gift_items.giftId -> gifts.id
ALTER TABLE "gift_items"
ADD CONSTRAINT "gift_items_gift_id_fkey"
FOREIGN KEY ("gift_id") REFERENCES "gifts"("id") ON DELETE CASCADE;

-- guest_gifts.clientId -> clients.id
ALTER TABLE "guest_gifts"
ADD CONSTRAINT "guest_gifts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- guest_gifts.guestId -> guests.id
ALTER TABLE "guest_gifts"
ADD CONSTRAINT "guest_gifts_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- ============================================
-- FLOOR PLANS & SEATING MODULE FOREIGN KEYS
-- ============================================

-- floor_plans.clientId -> clients.id
ALTER TABLE "floor_plans"
ADD CONSTRAINT "floor_plans_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- floor_plans.eventId -> events.id
ALTER TABLE "floor_plans"
ADD CONSTRAINT "floor_plans_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;

-- floor_plan_tables.floorPlanId -> floor_plans.id
ALTER TABLE "floor_plan_tables"
ADD CONSTRAINT "floor_plan_tables_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;

-- floor_plan_guests.floorPlanId -> floor_plans.id
ALTER TABLE "floor_plan_guests"
ADD CONSTRAINT "floor_plan_guests_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;

-- floor_plan_guests.tableId -> floor_plan_tables.id
ALTER TABLE "floor_plan_guests"
ADD CONSTRAINT "floor_plan_guests_table_id_fkey"
FOREIGN KEY ("table_id") REFERENCES "floor_plan_tables"("id") ON DELETE CASCADE;

-- floor_plan_guests.guestId -> guests.id
ALTER TABLE "floor_plan_guests"
ADD CONSTRAINT "floor_plan_guests_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- seating_change_log.floorPlanId -> floor_plans.id
ALTER TABLE "seating_change_log"
ADD CONSTRAINT "seating_change_log_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;

-- seating_change_log.userId -> user.id
ALTER TABLE "seating_change_log"
ADD CONSTRAINT "seating_change_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- seating_versions.floorPlanId -> floor_plans.id
ALTER TABLE "seating_versions"
ADD CONSTRAINT "seating_versions_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;

-- guest_conflicts.clientId -> clients.id
ALTER TABLE "guest_conflicts"
ADD CONSTRAINT "guest_conflicts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- guest_conflicts.guest1Id -> guests.id
ALTER TABLE "guest_conflicts"
ADD CONSTRAINT "guest_conflicts_guest1_id_fkey"
FOREIGN KEY ("guest1_id") REFERENCES "guests"("id") ON DELETE CASCADE;

-- guest_conflicts.guest2Id -> guests.id
ALTER TABLE "guest_conflicts"
ADD CONSTRAINT "guest_conflicts_guest2_id_fkey"
FOREIGN KEY ("guest2_id") REFERENCES "guests"("id") ON DELETE CASCADE;

-- guest_preferences.guestId -> guests.id
ALTER TABLE "guest_preferences"
ADD CONSTRAINT "guest_preferences_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE;

-- ============================================
-- PAYMENTS MODULE FOREIGN KEYS
-- ============================================

-- payments.clientId -> clients.id
ALTER TABLE "payments"
ADD CONSTRAINT "payments_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- invoices.clientId -> clients.id
ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- refunds.paymentId -> payments.id
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE;

-- advance_payments.budgetItemId -> budget.id
ALTER TABLE "advance_payments"
ADD CONSTRAINT "advance_payments_budget_item_id_fkey"
FOREIGN KEY ("budget_item_id") REFERENCES "budget"("id") ON DELETE SET NULL;

-- advance_payments.vendorId -> vendors.id
ALTER TABLE "advance_payments"
ADD CONSTRAINT "advance_payments_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL;

-- ============================================
-- COMMUNICATIONS MODULE FOREIGN KEYS
-- ============================================

-- email_logs.clientId -> clients.id
ALTER TABLE "email_logs"
ADD CONSTRAINT "email_logs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- email_logs.userId -> user.id
ALTER TABLE "email_logs"
ADD CONSTRAINT "email_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- email_preferences.userId -> user.id
ALTER TABLE "email_preferences"
ADD CONSTRAINT "email_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- sms_logs.clientId -> clients.id
ALTER TABLE "sms_logs"
ADD CONSTRAINT "sms_logs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- sms_preferences.userId -> user.id
ALTER TABLE "sms_preferences"
ADD CONSTRAINT "sms_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- whatsapp_logs.clientId -> clients.id
ALTER TABLE "whatsapp_logs"
ADD CONSTRAINT "whatsapp_logs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- push_logs.userId -> user.id
ALTER TABLE "push_logs"
ADD CONSTRAINT "push_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- push_subscriptions.userId -> user.id
ALTER TABLE "push_subscriptions"
ADD CONSTRAINT "push_subscriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- push_notification_logs.userId -> user.id
ALTER TABLE "push_notification_logs"
ADD CONSTRAINT "push_notification_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- push_notification_preferences.userId -> user.id
ALTER TABLE "push_notification_preferences"
ADD CONSTRAINT "push_notification_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- notifications.userId -> user.id
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- messages.senderId -> user.id
ALTER TABLE "messages"
ADD CONSTRAINT "messages_sender_id_fkey"
FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- messages.receiverId -> user.id
ALTER TABLE "messages"
ADD CONSTRAINT "messages_receiver_id_fkey"
FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- messages.clientId -> clients.id
ALTER TABLE "messages"
ADD CONSTRAINT "messages_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- messages.guestId -> guests.id
ALTER TABLE "messages"
ADD CONSTRAINT "messages_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- messages.parentId -> messages.id (self-reference)
ALTER TABLE "messages"
ADD CONSTRAINT "messages_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE CASCADE;

-- ============================================
-- CALENDAR MODULE FOREIGN KEYS
-- ============================================

-- calendar_sync_settings.userId -> user.id
ALTER TABLE "calendar_sync_settings"
ADD CONSTRAINT "calendar_sync_settings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- calendar_synced_events.settingsId -> calendar_sync_settings.id
ALTER TABLE "calendar_synced_events"
ADD CONSTRAINT "calendar_synced_events_settings_id_fkey"
FOREIGN KEY ("settings_id") REFERENCES "calendar_sync_settings"("id") ON DELETE CASCADE;

-- calendar_synced_events.eventId -> events.id
ALTER TABLE "calendar_synced_events"
ADD CONSTRAINT "calendar_synced_events_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;

-- google_calendar_tokens.userId -> user.id
ALTER TABLE "google_calendar_tokens"
ADD CONSTRAINT "google_calendar_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- ical_feed_tokens.userId -> user.id
ALTER TABLE "ical_feed_tokens"
ADD CONSTRAINT "ical_feed_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- ical_feed_tokens.clientId -> clients.id
ALTER TABLE "ical_feed_tokens"
ADD CONSTRAINT "ical_feed_tokens_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- ============================================
-- WEBSITE MODULE FOREIGN KEYS
-- ============================================

-- wedding_websites.clientId -> clients.id
ALTER TABLE "wedding_websites"
ADD CONSTRAINT "wedding_websites_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- website_builder_pages.clientId -> clients.id
ALTER TABLE "website_builder_pages"
ADD CONSTRAINT "website_builder_pages_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- website_builder_pages.layoutId -> website_builder_layouts.id
ALTER TABLE "website_builder_pages"
ADD CONSTRAINT "website_builder_pages_layout_id_fkey"
FOREIGN KEY ("layout_id") REFERENCES "website_builder_layouts"("id") ON DELETE SET NULL;

-- website_builder_content.pageId -> website_builder_pages.id
ALTER TABLE "website_builder_content"
ADD CONSTRAINT "website_builder_content_page_id_fkey"
FOREIGN KEY ("page_id") REFERENCES "website_builder_pages"("id") ON DELETE CASCADE;

-- ============================================
-- QR CODES MODULE FOREIGN KEYS
-- ============================================

-- qr_codes.clientId -> clients.id
ALTER TABLE "qr_codes"
ADD CONSTRAINT "qr_codes_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;

-- qr_codes.guestId -> guests.id
ALTER TABLE "qr_codes"
ADD CONSTRAINT "qr_codes_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;

-- ============================================
-- REPORTS MODULE FOREIGN KEYS
-- ============================================

-- generated_reports.clientId -> clients.id
ALTER TABLE "generated_reports"
ADD CONSTRAINT "generated_reports_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- generated_reports.userId -> user.id
ALTER TABLE "generated_reports"
ADD CONSTRAINT "generated_reports_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- scheduled_reports.userId -> user.id
ALTER TABLE "scheduled_reports"
ADD CONSTRAINT "scheduled_reports_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- ============================================
-- ACTIVITY & CREATIVE JOBS MODULE FOREIGN KEYS
-- ============================================

-- activity.userId -> user.id
ALTER TABLE "activity"
ADD CONSTRAINT "activity_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- activity.clientId -> clients.id
ALTER TABLE "activity"
ADD CONSTRAINT "activity_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- creative_jobs.clientId -> clients.id
ALTER TABLE "creative_jobs"
ADD CONSTRAINT "creative_jobs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;

-- ============================================
-- STRIPE MODULE FOREIGN KEYS
-- ============================================

-- stripe_connect_accounts.userId -> user.id
ALTER TABLE "stripe_connect_accounts"
ADD CONSTRAINT "stripe_connect_accounts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- ============================================
-- HOTEL BOOKINGS MODULE FOREIGN KEYS
-- ============================================

-- hotel_bookings.hotelId -> hotels.id
-- Note: hotels table id is UUID, hotelId is TEXT - type mismatch
-- Skipping FK - handled at application level

-- hotel_bookings.guestId -> guests.id
ALTER TABLE "hotel_bookings"
ADD CONSTRAINT "hotel_bookings_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE;

-- ============================================
-- TEAM ASSIGNMENTS MODULE FOREIGN KEYS
-- ============================================

-- team_client_assignments.teamMemberId -> user.id
ALTER TABLE "team_client_assignments"
ADD CONSTRAINT "team_client_assignments_team_member_id_fkey"
FOREIGN KEY ("team_member_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- team_client_assignments.clientId -> clients.id
ALTER TABLE "team_client_assignments"
ADD CONSTRAINT "team_client_assignments_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
