// Supabase types - no Convex dependencies
export type EventType =
  | 'ceremony'
  | 'reception'
  | 'sangeet'
  | 'mehendi'
  | 'haldi'
  | 'engagement'
  | 'cocktail'
  | 'rehearsal'
  | 'other';

export type EventStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled';

export interface VenueDetails {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  capacity?: number;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface WeatherData {
  temperature?: number;
  condition?: string;
  humidity?: number;
  wind_speed?: number;
  precipitation_chance?: number;
  icon?: string;
}

export interface Event {
  id: string; // UUID
  created_at: string;
  company_id: string;
  client_id: string;
  event_name: string;
  event_type: EventType;
  event_date: number;
  event_start_time: string;
  event_end_time: string;
  event_status: EventStatus;
  venue_details: VenueDetails;
  estimated_guests: number;
  actual_guests?: number;
  weather_data?: WeatherData;
  description?: string;
  dress_code?: string;
  special_instructions?: string;
  budget_allocated?: number;
  budget_spent?: number;
  tags: string[];
  updated_at: string;
}

export interface EventFormData {
  event_name: string;
  event_type: EventType;
  event_date: number;
  event_start_time: string;
  event_end_time: string;
  event_status: EventStatus;
  venue_details: VenueDetails;
  estimated_guests: number;
  actual_guests?: number;
  description?: string;
  dress_code?: string;
  special_instructions?: string;
  budget_allocated?: number;
  tags: string[];
}

export interface EventStats {
  total: number;
  upcoming: number;
  completed: number;
  this_month: number;
  total_guests: number;
  total_budget: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  status: EventStatus;
  venue: string;
}
