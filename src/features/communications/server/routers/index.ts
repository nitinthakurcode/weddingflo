/**
 * Communications Feature - tRPC Routers
 *
 * Business Domain: Multi-Channel Notifications
 * Routers:
 * - email: Email notifications via Resend
 * - sms: SMS notifications via Twilio
 * - whatsapp: WhatsApp messages via Twilio
 * - push: Web push notifications via Firebase
 * - ai: AI-powered communication generation (OpenAI)
 *
 * Dependencies:
 * - Supabase (email_logs, sms_logs, whatsapp_logs, push_subscriptions, ai_usage)
 * - Resend API
 * - Twilio API
 * - Firebase Cloud Messaging
 * - OpenAI API
 *
 * Rate Limits:
 * - Email: 100/day (Resend free tier)
 * - SMS: Based on Twilio account
 * - WhatsApp: Based on Twilio account
 * - Push: 1000/min per company
 * - AI: Based on OpenAI tier
 */

export { emailRouter } from './email.router';
export { smsRouter } from './sms.router';
export { whatsappRouter } from './whatsapp.router';
export { pushRouter } from './push.router';
export { aiRouter } from './ai.router';
