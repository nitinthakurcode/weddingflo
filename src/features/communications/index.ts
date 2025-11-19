/**
 * Communications Feature Pocket
 *
 * @description Multi-channel notification system with AI generation
 * @owner Communications Team
 * @stability stable
 *
 * ## Capabilities
 * - Email notifications (Resend)
 * - SMS messaging (Twilio)
 * - WhatsApp messages (Twilio)
 * - Web push notifications (Firebase)
 * - AI-powered content generation (OpenAI)
 *
 * ## External Dependencies
 * - Resend API: Transactional email
 * - Twilio API: SMS & WhatsApp
 * - Firebase Cloud Messaging: Push notifications
 * - OpenAI API: AI content generation
 * - Supabase: email_logs, sms_logs, whatsapp_logs, push_subscriptions, ai_usage
 *
 * ## Database Tables
 * - email_logs (primary)
 * - sms_logs (primary)
 * - whatsapp_logs (primary)
 * - push_subscriptions (primary)
 * - ai_usage (primary)
 *
 * ## Rate Limits (CRITICAL)
 * - Email: 100/day (Resend free tier)
 * - SMS: Based on Twilio account
 * - WhatsApp: Based on Twilio account + template approval
 * - Push: 1000/min per company
 * - AI: Based on OpenAI tier (monitor token usage)
 *
 * ## Cost Management
 * This pocket has external API costs - monitor usage closely
 * - Resend: $0.0001/email after free tier
 * - Twilio SMS: ~$0.0075/message
 * - Twilio WhatsApp: ~$0.005/message
 * - OpenAI: Token-based pricing
 *
 * ## Security
 * - API keys stored in environment variables
 * - Webhook signature verification (Resend, Twilio)
 * - Rate limiting per company to prevent abuse
 *
 * ## Scalability Notes
 * Queue system required for bulk operations
 * Consider dedicated message queue service (BullMQ, AWS SQS) at scale
 */

export * from './server/routers';
