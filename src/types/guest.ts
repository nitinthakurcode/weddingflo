// Supabase types - no Convex dependencies
export type GuestCategory =
  | 'bride_family'
  | 'groom_family'
  | 'bride_friends'
  | 'groom_friends'
  | 'colleagues'
  | 'relatives'
  | 'vip';

export type GuestInviteStatus =
  | 'invited'
  | 'not_invited'
  | 'save_the_date_sent';

export type MealPreference =
  | 'veg'
  | 'non_veg'
  | 'vegan'
  | 'jain'
  | 'custom';

export interface Guest {
  id: string; // UUID
  created_at: string;
  company_id: string;
  client_id: string;

  // Basic info (matching Convex schema)
  serial_number: number;
  guest_name: string;
  phone_number?: string;
  email?: string;

  // Guest details
  number_of_packs: number;
  additional_guest_names: string[];
  mode_of_arrival?: string;
  arrival_date_time?: number;
  mode_of_departure?: string;
  departure_date_time?: number;
  relationship_to_family?: string;
  guest_category?: string;
  events_attending: string[];

  // Preferences
  dietary_restrictions: string[];
  special_needs?: string;
  seating_preferences: string[];

  // QR System
  qr_code_token: string;
  qr_scan_count: number;
  qr_last_scanned?: number;

  // Form status
  form_submitted: boolean;
  form_submitted_at?: number;
  form_ip_address?: string;

  // Check-in status
  checked_in: boolean;
  checked_in_at?: number;
  checked_in_by?: string; // UUID
  checked_in_location?: {
    lat: number;
    lng: number;
  };

  // AI-suggested seating
  ai_suggested_table?: number;
  ai_compatibility_score?: number;

  updated_at: string;
}

export interface GuestFormData {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_category: GuestCategory;
  guest_side: 'bride' | 'groom' | 'neutral';
  plus_one_allowed: boolean;
  plus_one_name?: string;
  invite_status: GuestInviteStatus;
  meal_preference?: MealPreference;
  dietary_restrictions?: string;
  accommodation_needed: boolean;
  special_requests?: string;
  seating_preference?: string;
  tags: string[];
}

export interface GuestStats {
  total: number;
  invited: number;
  confirmed: number;
  checked_in: number;
  accommodation_needed: number;
  pending: number;
}

export interface BulkImportRow {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_category: string;
  guest_side: string;
  plus_one_allowed: string;
  plus_one_name?: string;
  meal_preference?: string;
  accommodation_needed: string;
}
