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
