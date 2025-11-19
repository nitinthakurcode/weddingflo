// SMS log type
export interface SmsLog {
  id: string;
  company_id: string;
  client_id: string | null;
  sms_type: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_body: string;
  locale: string;
  twilio_sid: string | null;
  segments: number;
  status: string;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

// SMS preferences type
export interface SmsPreferences {
  id: string;
  user_id: string;
  company_id: string;
  receive_wedding_reminders: boolean;
  receive_payment_reminders: boolean;
  receive_rsvp_notifications: boolean;
  receive_vendor_messages: boolean;
  receive_event_updates: boolean;
  sms_frequency: 'immediate' | 'daily' | 'off';
  created_at: string;
  updated_at: string;
}

// SMS stats type
export interface SmsStats {
  total_sms: number;
  sent_sms: number;
  delivered_sms: number;
  failed_sms: number;
  total_segments: number;
  success_rate: number;
}
