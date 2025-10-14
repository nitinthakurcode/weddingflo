import { Id } from '@/convex/_generated/dataModel';

export type RoomType =
  | 'single'
  | 'double'
  | 'suite'
  | 'deluxe'
  | 'presidential';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

export interface Hotel {
  _id: Id<'hotels'>;
  _creationTime: number;
  company_id: Id<'companies'>;
  client_id: Id<'clients'>;
  hotel_name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  amenities: string[];
  rating?: number;
  room_types: {
    type: string;
    capacity: number;
    rate_per_night: number;
    total_rooms: number;
    blocked_rooms: number;
    available_rooms: number;
  }[];
  created_at: number;
  updated_at: number;
}

export interface HotelDetail {
  _id: Id<'hotel_details'>;
  _creationTime: number;
  company_id: Id<'companies'>;
  client_id: Id<'clients'>;
  guest_id: Id<'guests'>;
  accommodation_status: boolean;
  hotel_name?: string;
  hotel_id?: Id<'hotels'>;
  room_number?: string;
  room_type?: string;
  check_in_date?: number;
  check_out_date?: number;

  // Smart allocation
  ai_hotel_recommendation?: string;
  distance_from_venue_km?: number;

  checked_in: boolean;
  checked_out: boolean;

  // Costs
  nightly_rate?: number;
  total_cost?: number;
  paid_by?: string;

  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface HotelFormData {
  hotel_name: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_email?: string;
  hotel_website?: string;
  star_rating?: number;
  distance_from_venue_km?: number;
  amenities: string[];
  room_types: {
    room_type: RoomType;
    total_rooms: number;
    rooms_booked: number;
    rate_per_night: number;
  }[];
  check_in_date?: Date;
  check_out_date?: Date;
  booking_reference?: string;
  contact_person?: string;
  notes?: string;
}

export interface HotelDetailFormData {
  guest_id: Id<'guests'>;
  hotel_id: Id<'hotels'>;
  room_type: RoomType;
  room_number?: string;
  check_in_date: Date;
  check_out_date: Date;
  rate_per_night: number;
  booking_status: BookingStatus;
  booking_confirmation_number?: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  special_requests?: string;
  arrival_time?: string;
  departure_time?: string;
  notes?: string;
}

export interface HotelStats {
  total_hotels: number;
  total_rooms_booked: number;
  total_guests_accommodated: number;
  occupancy_rate: number;
  pending_bookings: number;
  confirmed_bookings: number;
}

export interface RoomTypeAvailability {
  room_type: RoomType;
  total: number;
  booked: number;
  available: number;
}
