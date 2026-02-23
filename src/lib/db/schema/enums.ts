/**
 * Database Enums
 *
 * TypeScript enums and types for database column values.
 * These provide type safety for enum columns.
 */

// User roles
export type UserRole = 'company_admin' | 'staff' | 'client_user' | 'super_admin';

export const USER_ROLES: UserRole[] = ['company_admin', 'staff', 'client_user', 'super_admin'];

// Subscription tiers
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'starter', 'professional', 'enterprise'];

// Subscription status
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
];

// Wedding types
export type WeddingType =
  | 'traditional'
  | 'destination'
  | 'intimate'
  | 'elopement'
  | 'cultural'
  | 'religious'
  | 'modern'
  | 'bohemian'
  | 'rustic'
  | 'luxury'
  | 'multi_day';

export const WEDDING_TYPES: WeddingType[] = [
  'traditional',
  'destination',
  'intimate',
  'elopement',
  'cultural',
  'religious',
  'modern',
  'bohemian',
  'rustic',
  'luxury',
  'multi_day',
];

// Budget segments
export type BudgetSegment = 'budget' | 'moderate' | 'premium' | 'luxury' | 'ultra_luxury';

export const BUDGET_SEGMENTS: BudgetSegment[] = [
  'budget',
  'moderate',
  'premium',
  'luxury',
  'ultra_luxury',
];

// Client status
export type ClientStatus = 'lead' | 'active' | 'planning' | 'completed' | 'cancelled' | 'on_hold';

export const CLIENT_STATUSES: ClientStatus[] = [
  'lead',
  'active',
  'planning',
  'completed',
  'cancelled',
  'on_hold',
];

// Event status
export type EventStatus =
  | 'draft'
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed';

export const EVENT_STATUSES: EventStatus[] = [
  'draft',
  'planning',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
];

// Event types
export type EventType =
  | 'ceremony'
  | 'reception'
  | 'sangeet'
  | 'mehendi'
  | 'haldi'
  | 'engagement'
  | 'cocktail'
  | 'rehearsal'
  | 'baraat'
  | 'vidaai'
  | 'other';

export const EVENT_TYPES: EventType[] = [
  'ceremony',
  'reception',
  'sangeet',
  'mehendi',
  'haldi',
  'engagement',
  'cocktail',
  'rehearsal',
  'baraat',
  'vidaai',
  'other',
];

// Guest RSVP status
export type RsvpStatus = 'pending' | 'confirmed' | 'declined' | 'maybe' | 'no_response';

export const RSVP_STATUSES: RsvpStatus[] = [
  'pending',
  'confirmed',
  'declined',
  'maybe',
  'no_response',
];

// Guest side (gender-neutral for same-sex weddings)
export type { GuestSide } from '@/lib/constants/enums'
export { GUEST_SIDE_VALUES as GUEST_SIDES } from '@/lib/constants/enums'

// Payment status
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled',
];

// Document types
export type DocumentType = 'contract' | 'invoice' | 'proposal' | 'questionnaire' | 'photo' | 'other';

export const DOCUMENT_TYPES: DocumentType[] = [
  'contract',
  'invoice',
  'proposal',
  'questionnaire',
  'photo',
  'other',
];

// Vendor status
export type VendorStatus = 'active' | 'pending' | 'inactive' | 'blacklisted';

export const VENDOR_STATUSES: VendorStatus[] = ['active', 'pending', 'inactive', 'blacklisted'];

// Vendor categories
export type VendorCategory =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'videography'
  | 'florist'
  | 'dj'
  | 'band'
  | 'decorator'
  | 'makeup'
  | 'transportation'
  | 'officiant'
  | 'cake'
  | 'invitations'
  | 'jewelry'
  | 'attire'
  | 'rentals'
  | 'other';

export const VENDOR_CATEGORIES: VendorCategory[] = [
  'venue',
  'catering',
  'photography',
  'videography',
  'florist',
  'dj',
  'band',
  'decorator',
  'makeup',
  'transportation',
  'officiant',
  'cake',
  'invitations',
  'jewelry',
  'attire',
  'rentals',
  'other',
];
