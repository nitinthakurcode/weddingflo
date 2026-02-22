-- Migration: Add missing foreign key constraints
-- February 2026 - Database referential integrity fixes
--
-- This migration adds foreign key constraints that were missing from the schema.
-- Before running, ensure no orphaned records exist that would violate these constraints.

-- ============================================
-- PIPELINE MODULE FOREIGN KEYS
-- ============================================

-- pipeline_leads.stageId -> pipeline_stages.id
DO $$ BEGIN
ALTER TABLE "pipeline_leads"
ADD CONSTRAINT "pipeline_leads_stage_id_fkey"
FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pipeline_leads.assigneeId -> user.id
DO $$ BEGIN
ALTER TABLE "pipeline_leads"
ADD CONSTRAINT "pipeline_leads_assignee_id_fkey"
FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pipeline_leads.convertedToClientId -> clients.id
DO $$ BEGIN
ALTER TABLE "pipeline_leads"
ADD CONSTRAINT "pipeline_leads_converted_to_client_id_fkey"
FOREIGN KEY ("converted_to_client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pipeline_leads.companyId -> companies.id (via UUID cast)
-- Note: companies.id is UUID, pipeline_leads.companyId is TEXT
-- This requires either type change or application-level enforcement
-- Skipping FK here due to type mismatch - handled at application level

-- pipeline_activities.leadId -> pipeline_leads.id
DO $$ BEGIN
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "pipeline_leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pipeline_activities.userId -> user.id
DO $$ BEGIN
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pipeline_activities.previousStageId -> pipeline_stages.id
DO $$ BEGIN
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_previous_stage_id_fkey"
FOREIGN KEY ("previous_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pipeline_activities.newStageId -> pipeline_stages.id
DO $$ BEGIN
ALTER TABLE "pipeline_activities"
ADD CONSTRAINT "pipeline_activities_new_stage_id_fkey"
FOREIGN KEY ("new_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PROPOSALS & CONTRACTS MODULE FOREIGN KEYS
-- ============================================

-- proposals.templateId -> proposal_templates.id
DO $$ BEGIN
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "proposal_templates"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- proposals.leadId -> pipeline_leads.id
DO $$ BEGIN
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "pipeline_leads"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- proposals.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- proposals.createdBy -> user.id
DO $$ BEGIN
ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- contracts.templateId -> contract_templates.id
DO $$ BEGIN
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- contracts.proposalId -> proposals.id
DO $$ BEGIN
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_proposal_id_fkey"
FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- contracts.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- contracts.createdBy -> user.id
DO $$ BEGIN
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- WORKFLOWS MODULE FOREIGN KEYS
-- ============================================

-- workflow_steps.workflowId -> workflows.id
DO $$ BEGIN
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_workflow_id_fkey"
FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workflow_steps.onTrueStepId -> workflow_steps.id (self-reference)
DO $$ BEGIN
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_on_true_step_id_fkey"
FOREIGN KEY ("on_true_step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workflow_steps.onFalseStepId -> workflow_steps.id (self-reference)
DO $$ BEGIN
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_on_false_step_id_fkey"
FOREIGN KEY ("on_false_step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workflow_executions.workflowId -> workflows.id
DO $$ BEGIN
ALTER TABLE "workflow_executions"
ADD CONSTRAINT "workflow_executions_workflow_id_fkey"
FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workflow_executions.currentStepId -> workflow_steps.id
DO $$ BEGIN
ALTER TABLE "workflow_executions"
ADD CONSTRAINT "workflow_executions_current_step_id_fkey"
FOREIGN KEY ("current_step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workflow_execution_logs.executionId -> workflow_executions.id
DO $$ BEGIN
ALTER TABLE "workflow_execution_logs"
ADD CONSTRAINT "workflow_execution_logs_execution_id_fkey"
FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workflow_execution_logs.stepId -> workflow_steps.id
DO $$ BEGIN
ALTER TABLE "workflow_execution_logs"
ADD CONSTRAINT "workflow_execution_logs_step_id_fkey"
FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- INVITATIONS MODULE FOREIGN KEYS
-- ============================================

-- team_invitations.invitedBy -> user.id
DO $$ BEGIN
ALTER TABLE "team_invitations"
ADD CONSTRAINT "team_invitations_invited_by_fkey"
FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- team_invitations.acceptedBy -> user.id
DO $$ BEGIN
ALTER TABLE "team_invitations"
ADD CONSTRAINT "team_invitations_accepted_by_fkey"
FOREIGN KEY ("accepted_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- wedding_invitations.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "wedding_invitations"
ADD CONSTRAINT "wedding_invitations_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- wedding_invitations.invitedBy -> user.id
DO $$ BEGIN
ALTER TABLE "wedding_invitations"
ADD CONSTRAINT "wedding_invitations_invited_by_fkey"
FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- wedding_invitations.acceptedBy -> user.id
DO $$ BEGIN
ALTER TABLE "wedding_invitations"
ADD CONSTRAINT "wedding_invitations_accepted_by_fkey"
FOREIGN KEY ("accepted_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CORE FEATURES MODULE FOREIGN KEYS
-- ============================================

-- clients.createdBy -> user.id
DO $$ BEGIN
ALTER TABLE "clients"
ADD CONSTRAINT "clients_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- client_users.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "client_users"
ADD CONSTRAINT "client_users_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- client_users.userId -> user.id
DO $$ BEGIN
ALTER TABLE "client_users"
ADD CONSTRAINT "client_users_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guests.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "guests"
ADD CONSTRAINT "guests_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- events.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "events"
ADD CONSTRAINT "events_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- timeline.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "timeline"
ADD CONSTRAINT "timeline_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- timeline.eventId -> events.id
DO $$ BEGIN
ALTER TABLE "timeline"
ADD CONSTRAINT "timeline_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- budget.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "budget"
ADD CONSTRAINT "budget_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- budget.vendorId -> vendors.id
DO $$ BEGIN
ALTER TABLE "budget"
ADD CONSTRAINT "budget_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- documents.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "documents"
ADD CONSTRAINT "documents_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- VENDORS MODULE FOREIGN KEYS
-- ============================================

-- client_vendors.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "client_vendors"
ADD CONSTRAINT "client_vendors_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- client_vendors.vendorId -> vendors.id
DO $$ BEGIN
ALTER TABLE "client_vendors"
ADD CONSTRAINT "client_vendors_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vendor_comments.vendorId -> vendors.id
DO $$ BEGIN
ALTER TABLE "vendor_comments"
ADD CONSTRAINT "vendor_comments_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vendor_comments.userId -> user.id
DO $$ BEGIN
ALTER TABLE "vendor_comments"
ADD CONSTRAINT "vendor_comments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vendor_reviews.vendorId -> vendors.id
DO $$ BEGIN
ALTER TABLE "vendor_reviews"
ADD CONSTRAINT "vendor_reviews_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vendor_reviews.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "vendor_reviews"
ADD CONSTRAINT "vendor_reviews_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vendor_reviews.userId -> user.id
DO $$ BEGIN
ALTER TABLE "vendor_reviews"
ADD CONSTRAINT "vendor_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- HOTELS & TRANSPORT MODULE FOREIGN KEYS
-- ============================================

-- hotels.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "hotels"
ADD CONSTRAINT "hotels_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- hotels.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "hotels"
ADD CONSTRAINT "hotels_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- hotels.accommodationId -> accommodations.id
DO $$ BEGIN
ALTER TABLE "hotels"
ADD CONSTRAINT "hotels_accommodation_id_fkey"
FOREIGN KEY ("accommodation_id") REFERENCES "accommodations"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- accommodations.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "accommodations"
ADD CONSTRAINT "accommodations_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vehicles.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "vehicles"
ADD CONSTRAINT "vehicles_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_transport.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "guest_transport"
ADD CONSTRAINT "guest_transport_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_transport.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "guest_transport"
ADD CONSTRAINT "guest_transport_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_transport.vehicleId -> vehicles.id
DO $$ BEGIN
ALTER TABLE "guest_transport"
ADD CONSTRAINT "guest_transport_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GIFTS MODULE FOREIGN KEYS
-- ============================================

-- gifts.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "gifts"
ADD CONSTRAINT "gifts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gifts.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "gifts"
ADD CONSTRAINT "gifts_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gifts_enhanced.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "gifts_enhanced"
ADD CONSTRAINT "gifts_enhanced_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gifts_enhanced.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "gifts_enhanced"
ADD CONSTRAINT "gifts_enhanced_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gift_items.giftId -> gifts.id
DO $$ BEGIN
ALTER TABLE "gift_items"
ADD CONSTRAINT "gift_items_gift_id_fkey"
FOREIGN KEY ("gift_id") REFERENCES "gifts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_gifts.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "guest_gifts"
ADD CONSTRAINT "guest_gifts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_gifts.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "guest_gifts"
ADD CONSTRAINT "guest_gifts_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- FLOOR PLANS & SEATING MODULE FOREIGN KEYS
-- ============================================

-- floor_plans.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "floor_plans"
ADD CONSTRAINT "floor_plans_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- floor_plans.eventId -> events.id
DO $$ BEGIN
ALTER TABLE "floor_plans"
ADD CONSTRAINT "floor_plans_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- floor_plan_tables.floorPlanId -> floor_plans.id
DO $$ BEGIN
ALTER TABLE "floor_plan_tables"
ADD CONSTRAINT "floor_plan_tables_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- floor_plan_guests.floorPlanId -> floor_plans.id
-- NOTE: floor_plan_id column added in migration 0026. FK moved there.

-- floor_plan_guests.tableId -> floor_plan_tables.id
DO $$ BEGIN
ALTER TABLE "floor_plan_guests"
ADD CONSTRAINT "floor_plan_guests_table_id_fkey"
FOREIGN KEY ("table_id") REFERENCES "floor_plan_tables"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- floor_plan_guests.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "floor_plan_guests"
ADD CONSTRAINT "floor_plan_guests_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- seating_change_log.floorPlanId -> floor_plans.id
DO $$ BEGIN
ALTER TABLE "seating_change_log"
ADD CONSTRAINT "seating_change_log_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- seating_change_log.userId -> user.id
DO $$ BEGIN
ALTER TABLE "seating_change_log"
ADD CONSTRAINT "seating_change_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- seating_versions.floorPlanId -> floor_plans.id
DO $$ BEGIN
ALTER TABLE "seating_versions"
ADD CONSTRAINT "seating_versions_floor_plan_id_fkey"
FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_conflicts.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "guest_conflicts"
ADD CONSTRAINT "guest_conflicts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_conflicts.guest1Id -> guests.id
DO $$ BEGIN
ALTER TABLE "guest_conflicts"
ADD CONSTRAINT "guest_conflicts_guest1_id_fkey"
FOREIGN KEY ("guest1_id") REFERENCES "guests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_conflicts.guest2Id -> guests.id
DO $$ BEGIN
ALTER TABLE "guest_conflicts"
ADD CONSTRAINT "guest_conflicts_guest2_id_fkey"
FOREIGN KEY ("guest2_id") REFERENCES "guests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guest_preferences.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "guest_preferences"
ADD CONSTRAINT "guest_preferences_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PAYMENTS MODULE FOREIGN KEYS
-- ============================================

-- payments.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "payments"
ADD CONSTRAINT "payments_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- invoices.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- refunds.paymentId -> payments.id
DO $$ BEGIN
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- advance_payments.budgetItemId -> budget.id
DO $$ BEGIN
ALTER TABLE "advance_payments"
ADD CONSTRAINT "advance_payments_budget_item_id_fkey"
FOREIGN KEY ("budget_item_id") REFERENCES "budget"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- advance_payments.vendorId -> vendors.id
DO $$ BEGIN
ALTER TABLE "advance_payments"
ADD CONSTRAINT "advance_payments_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- COMMUNICATIONS MODULE FOREIGN KEYS
-- ============================================

-- email_logs.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "email_logs"
ADD CONSTRAINT "email_logs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- email_logs.userId -> user.id
DO $$ BEGIN
ALTER TABLE "email_logs"
ADD CONSTRAINT "email_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- email_preferences.userId -> user.id
DO $$ BEGIN
ALTER TABLE "email_preferences"
ADD CONSTRAINT "email_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- sms_logs.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "sms_logs"
ADD CONSTRAINT "sms_logs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- sms_preferences.userId -> user.id
DO $$ BEGIN
ALTER TABLE "sms_preferences"
ADD CONSTRAINT "sms_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- whatsapp_logs.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "whatsapp_logs"
ADD CONSTRAINT "whatsapp_logs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- push_logs.userId -> user.id
DO $$ BEGIN
ALTER TABLE "push_logs"
ADD CONSTRAINT "push_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- push_subscriptions.userId -> user.id
DO $$ BEGIN
ALTER TABLE "push_subscriptions"
ADD CONSTRAINT "push_subscriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- push_notification_logs.userId -> user.id
DO $$ BEGIN
ALTER TABLE "push_notification_logs"
ADD CONSTRAINT "push_notification_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- push_notification_preferences.userId -> user.id
DO $$ BEGIN
ALTER TABLE "push_notification_preferences"
ADD CONSTRAINT "push_notification_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notifications.userId -> user.id
DO $$ BEGIN
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- messages.senderId -> user.id
DO $$ BEGIN
ALTER TABLE "messages"
ADD CONSTRAINT "messages_sender_id_fkey"
FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- messages.receiverId -> user.id
DO $$ BEGIN
ALTER TABLE "messages"
ADD CONSTRAINT "messages_receiver_id_fkey"
FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- messages.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "messages"
ADD CONSTRAINT "messages_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- messages.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "messages"
ADD CONSTRAINT "messages_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- messages.parentId -> messages.id (self-reference)
-- NOTE: parent_id column is added in migration 0026. FK moved there.


-- ============================================
-- CALENDAR MODULE FOREIGN KEYS
-- ============================================

-- calendar_sync_settings.userId -> user.id
DO $$ BEGIN
ALTER TABLE "calendar_sync_settings"
ADD CONSTRAINT "calendar_sync_settings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- calendar_synced_events.settingsId -> calendar_sync_settings.id
DO $$ BEGIN
ALTER TABLE "calendar_synced_events"
ADD CONSTRAINT "calendar_synced_events_settings_id_fkey"
FOREIGN KEY ("settings_id") REFERENCES "calendar_sync_settings"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- calendar_synced_events.eventId -> events.id
DO $$ BEGIN
ALTER TABLE "calendar_synced_events"
ADD CONSTRAINT "calendar_synced_events_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- google_calendar_tokens.userId -> user.id
DO $$ BEGIN
ALTER TABLE "google_calendar_tokens"
ADD CONSTRAINT "google_calendar_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ical_feed_tokens.userId -> user.id
DO $$ BEGIN
ALTER TABLE "ical_feed_tokens"
ADD CONSTRAINT "ical_feed_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ical_feed_tokens.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "ical_feed_tokens"
ADD CONSTRAINT "ical_feed_tokens_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- WEBSITE MODULE FOREIGN KEYS
-- ============================================

-- wedding_websites.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "wedding_websites"
ADD CONSTRAINT "wedding_websites_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- website_builder_pages.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "website_builder_pages"
ADD CONSTRAINT "website_builder_pages_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- website_builder_pages.layoutId -> website_builder_layouts.id
DO $$ BEGIN
ALTER TABLE "website_builder_pages"
ADD CONSTRAINT "website_builder_pages_layout_id_fkey"
FOREIGN KEY ("layout_id") REFERENCES "website_builder_layouts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- website_builder_content.pageId -> website_builder_pages.id
DO $$ BEGIN
ALTER TABLE "website_builder_content"
ADD CONSTRAINT "website_builder_content_page_id_fkey"
FOREIGN KEY ("page_id") REFERENCES "website_builder_pages"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- QR CODES MODULE FOREIGN KEYS
-- ============================================

-- qr_codes.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "qr_codes"
ADD CONSTRAINT "qr_codes_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- qr_codes.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "qr_codes"
ADD CONSTRAINT "qr_codes_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- REPORTS MODULE FOREIGN KEYS
-- ============================================

-- generated_reports.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "generated_reports"
ADD CONSTRAINT "generated_reports_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- generated_reports.userId -> user.id
DO $$ BEGIN
ALTER TABLE "generated_reports"
ADD CONSTRAINT "generated_reports_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- scheduled_reports.userId -> user.id
DO $$ BEGIN
ALTER TABLE "scheduled_reports"
ADD CONSTRAINT "scheduled_reports_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ACTIVITY & CREATIVE JOBS MODULE FOREIGN KEYS
-- ============================================

-- activity.userId -> user.id
DO $$ BEGIN
ALTER TABLE "activity"
ADD CONSTRAINT "activity_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- activity.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "activity"
ADD CONSTRAINT "activity_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- creative_jobs.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "creative_jobs"
ADD CONSTRAINT "creative_jobs_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STRIPE MODULE FOREIGN KEYS
-- ============================================

-- stripe_connect_accounts.userId -> user.id
DO $$ BEGIN
ALTER TABLE "stripe_connect_accounts"
ADD CONSTRAINT "stripe_connect_accounts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- HOTEL BOOKINGS MODULE FOREIGN KEYS
-- ============================================

-- hotel_bookings.hotelId -> hotels.id
-- Note: hotels table id is UUID, hotelId is TEXT - type mismatch
-- Skipping FK - handled at application level

-- hotel_bookings.guestId -> guests.id
DO $$ BEGIN
ALTER TABLE "hotel_bookings"
ADD CONSTRAINT "hotel_bookings_guest_id_fkey"
FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TEAM ASSIGNMENTS MODULE FOREIGN KEYS
-- ============================================

-- team_client_assignments.teamMemberId -> user.id
DO $$ BEGIN
ALTER TABLE "team_client_assignments"
ADD CONSTRAINT "team_client_assignments_team_member_id_fkey"
FOREIGN KEY ("team_member_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- team_client_assignments.clientId -> clients.id
DO $$ BEGIN
ALTER TABLE "team_client_assignments"
ADD CONSTRAINT "team_client_assignments_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
