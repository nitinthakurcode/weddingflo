/**
 * Push Notifications Type Definitions
 *
 * Defines types for push notification system including
 * subscriptions, logs, preferences, and payloads
 */

// Notification types (must match database CHECK constraint)
export type NotificationType =
  | 'payment_alert'
  | 'rsvp_update'
  | 'event_reminder'
  | 'task_deadline'
  | 'vendor_message'
  | 'system_notification';

// Notification status (must match database CHECK constraint)
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

// Device types (must match database CHECK constraint)
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

// Push subscription from database
export interface PushSubscription {
  id: string;
  user_id: string;
  company_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  device_type: DeviceType | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Push notification log from database
export interface PushNotificationLog {
  id: string;
  company_id: string;
  user_id: string;
  subscription_id: string | null;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: NotificationStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

// Push notification preferences from database
export interface PushNotificationPreferences {
  id: string;
  user_id: string;
  company_id: string;
  enabled: boolean;
  payment_alerts: boolean;
  rsvp_updates: boolean;
  event_reminders: boolean;
  task_deadlines: boolean;
  vendor_messages: boolean;
  created_at: string;
  updated_at: string;
}

// Firebase Cloud Messaging payload
export interface FCMNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// FCM data payload (custom data sent with notification)
export interface FCMDataPayload {
  notification_type: NotificationType;
  click_action?: string;
  url?: string;
  [key: string]: unknown;
}

// Complete FCM message
export interface FCMMessage {
  notification: FCMNotificationPayload;
  data: FCMDataPayload;
  token: string; // FCM token for the target device
}

// Web Push subscription (browser API format)
export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Subscription request (for creating new subscription)
export interface SubscriptionRequest {
  company_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  device_type?: DeviceType;
}

// Notification request (for sending notification)
export interface NotificationRequest {
  user_id: string;
  company_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
  requireInteraction?: boolean;
}

// Notification response (result of sending)
export interface NotificationResponse {
  success: boolean;
  log_id?: string;
  error?: string;
  sent_count?: number;
  failed_count?: number;
}

// Preference update request
export interface PreferenceUpdateRequest {
  enabled?: boolean;
  payment_alerts?: boolean;
  rsvp_updates?: boolean;
  event_reminders?: boolean;
  task_deadlines?: boolean;
  vendor_messages?: boolean;
}

// Browser notification permission status
export type NotificationPermission = 'default' | 'granted' | 'denied';

// Push subscription status
export interface SubscriptionStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  token?: string;
}
