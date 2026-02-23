import type { RsvpStatus } from '@/lib/constants/enums'
export type { RsvpStatus }

// Drizzle types - camelCase naming convention
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

export type TravelMode = 'flight' | 'car' | 'train' | 'bus' | 'other';

export interface Guest {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;

  // Basic info
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  serialNumber?: number | null;

  // Party information
  partySize: number;
  additionalGuestNames?: string[] | null;

  // Travel information
  arrivalDatetime?: string | null;
  arrivalMode?: TravelMode | null;
  departureDatetime?: string | null;
  departureMode?: TravelMode | null;

  // Relationship and events
  relationshipToFamily?: string | null;
  groupName?: string | null;
  attendingEvents?: string[] | null;

  // RSVP and meal
  rsvpStatus: RsvpStatus;
  mealPreference?: MealPreference | null;
  dietaryRestrictions?: string | null;

  // Plus one
  plusOneAllowed: boolean;
  plusOneName?: string | null;
  plusOneRsvp?: RsvpStatus | null;
  plusOneMealPreference?: MealPreference | null;

  // Seating
  tableNumber?: number | null;

  // Accommodation
  hotelRequired?: boolean | null;
  hotelName?: string | null;
  hotelCheckIn?: string | null;
  hotelCheckOut?: string | null;
  hotelRoomType?: string | null;

  // Transport
  transportRequired?: boolean | null;
  transportType?: string | null;
  transportPickupLocation?: string | null;
  transportPickupTime?: string | null;
  transportNotes?: string | null;

  // Planner-only fields
  giftToGive?: string | null;
  notes?: string | null;

  // Check-in status
  checkedIn?: boolean | null;
  checkedInAt?: Date | null;
  checkedInBy?: string | null;
  checkInTime?: Date | null;

  // Side/family
  sideFamily?: string | null;

  // Accessibility
  accessibilityNeeds?: string | null;

  // Metadata
  metadata?: Record<string, any> | null;
}

export interface GuestFormData {
  // Basic info
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;

  // Party info
  partySize: number;
  additionalGuestNames: string[];

  // Travel info
  arrivalDatetime?: string;
  arrivalMode?: TravelMode;
  departureDatetime?: string;
  departureMode?: TravelMode;

  // Relationship
  relationshipToFamily?: string;
  groupName?: string;
  attendingEvents: string[];

  // RSVP and preferences
  rsvpStatus: RsvpStatus;
  mealPreference?: MealPreference;
  dietaryRestrictions?: string;

  // Plus one
  plusOneAllowed: boolean;
  plusOneName?: string;

  // Accommodation
  hotelRequired: boolean;
  hotelName?: string;
  hotelCheckIn?: string;
  hotelCheckOut?: string;
  hotelRoomType?: string;

  // Transport
  transportRequired: boolean;
  transportType?: string;
  transportPickupLocation?: string;
  transportPickupTime?: string;
  transportNotes?: string;

  // Planner-only
  giftToGive?: string;
  notes?: string;
}

export interface GuestStats {
  total: number;
  invited: number;
  confirmed: number;
  checkedIn: number;
  accommodationNeeded: number;
  pending: number;
}

export interface BulkImportRow {
  // Basic info
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;

  // Party info
  partySize?: string;
  additionalGuestNames?: string;

  // Travel info
  arrivalDatetime?: string;
  arrivalMode?: string;
  departureDatetime?: string;
  departureMode?: string;

  // Relationship
  relationshipToFamily?: string;
  groupName?: string;
  attendingEvents?: string;

  // Preferences
  rsvpStatus?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;

  // Accommodation
  hotelRequired?: string;

  // Transport
  transportRequired?: string;

  // Planner fields
  giftToGive?: string;
  notes?: string;
}
