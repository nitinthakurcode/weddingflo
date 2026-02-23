/**
 * Database Type Definitions
 *
 * TypeScript types derived from Drizzle ORM schema tables.
 * These provide type-safe access to database records.
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  companies,
  clients,
  weddingWebsites,
  events,
  guests,
} from './schema-features';
import type { user as authUser } from './schema';

// ============================================================================
// USER TYPES
// ============================================================================

export type User = InferSelectModel<typeof authUser>;
export type NewUser = InferInsertModel<typeof authUser>;

// ============================================================================
// COMPANY TYPES
// ============================================================================

export type Company = InferSelectModel<typeof companies>;
export type NewCompany = InferInsertModel<typeof companies>;

// User with company relation
export interface UserWithCompany extends User {
  company?: Company | null;
}

// ============================================================================
// CLIENT TYPES
// ============================================================================

export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;

// Client status enum
export type ClientStatus = 'planning' | 'active' | 'completed' | 'cancelled' | 'on_hold';

// ============================================================================
// EVENT TYPES
// ============================================================================

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

// Event status enum
export type EventStatus = 'draft' | 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

// ============================================================================
// GUEST TYPES
// ============================================================================

export type Guest = InferSelectModel<typeof guests>;
export type NewGuest = InferInsertModel<typeof guests>;

// Guest RSVP status
export type RsvpStatus = 'pending' | 'confirmed' | 'declined' | 'maybe';

// Guest side (gender-neutral for same-sex weddings)
export type { GuestSide } from '@/lib/constants/enums'

// ============================================================================
// WEDDING WEBSITE TYPES
// ============================================================================

export type WeddingWebsite = InferSelectModel<typeof weddingWebsites>;
export type NewWeddingWebsite = InferInsertModel<typeof weddingWebsites>;

// Website theme options
export type WebsiteTheme = 'classic' | 'modern' | 'elegant' | 'minimalist' | 'rustic' | 'bohemian';

// Website settings structure
export interface WebsiteSettings {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showCountdown?: boolean;
  showGuestbook?: boolean;
  showRsvpForm?: boolean;
  showGallery?: boolean;
  showTimeline?: boolean;
  showMap?: boolean;
  showAccommodations?: boolean;
  customCss?: string;
  metaTitle?: string;
  metaDescription?: string;
  favicon?: string;
  ogImage?: string;
  publishedAt?: string;
  isPasswordProtected?: boolean;
  password?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Sort params
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter params
export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Combined query params
export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
