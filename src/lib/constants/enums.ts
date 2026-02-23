/**
 * Canonical RSVP Status Enum
 *
 * Single source of truth for RSVP status values across the entire codebase.
 * The database column is TEXT with DEFAULT 'pending'.
 *
 * Canonical values: 'pending' | 'confirmed' | 'declined' | 'maybe'
 */

export const RSVP_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  MAYBE: 'maybe',
} as const

export type RsvpStatus = (typeof RSVP_STATUS)[keyof typeof RSVP_STATUS]

export const RSVP_STATUS_VALUES = Object.values(RSVP_STATUS) as [string, ...string[]]

/**
 * Normalizes external/legacy RSVP values to canonical enum.
 * Used during imports (Google Sheets, CSV, Excel) and data migration.
 */
export function normalizeRsvpStatus(raw: string): RsvpStatus {
  const map: Record<string, RsvpStatus> = {
    'attending': 'confirmed',
    'accepted': 'confirmed',
    'not_attending': 'declined',
    'tentative': 'maybe',
    'yes': 'confirmed',
    'no': 'declined',
  }
  const normalized = raw.toLowerCase().trim()
  return map[normalized] ?? (RSVP_STATUS_VALUES.includes(normalized as any) ? normalized as RsvpStatus : 'pending')
}

// ============================================
// GUEST SIDE ENUM
// ============================================

/**
 * Canonical Guest Side Enum
 *
 * Single source of truth for guest side values across the entire codebase.
 * Uses gender-neutral labels to support same-sex weddings.
 * The database column is TEXT with DEFAULT 'mutual'.
 *
 * Canonical values: 'partner1' | 'partner2' | 'mutual'
 */

export const GUEST_SIDE = {
  PARTNER1: 'partner1',
  PARTNER2: 'partner2',
  MUTUAL: 'mutual',
} as const

export type GuestSide = (typeof GUEST_SIDE)[keyof typeof GUEST_SIDE]

export const GUEST_SIDE_VALUES = Object.values(GUEST_SIDE) as [string, ...string[]]

/**
 * Normalizes external/legacy guest side values to canonical enum.
 * Used during imports (Google Sheets, CSV, Excel) and data migration.
 */
export function normalizeGuestSide(raw: string): GuestSide {
  const map: Record<string, GuestSide> = {
    'bride': 'partner1',
    'groom': 'partner2',
    'bride_side': 'partner1',
    'groom_side': 'partner2',
    'both': 'mutual',
    'common': 'mutual',
  }
  const normalized = raw.toLowerCase().trim()
  return map[normalized] ?? (GUEST_SIDE_VALUES.includes(normalized as any) ? normalized as GuestSide : 'mutual')
}
