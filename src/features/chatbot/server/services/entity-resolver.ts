/**
 * Entity Resolver Service
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Provides fuzzy name matching, date parsing, and entity resolution
 * for natural language command processing.
 */

import { db, eq, and, ilike, or, isNull } from '@/lib/db'
import { clients, guests, vendors, events } from '@/lib/db/schema'

// ============================================
// TYPES
// ============================================

export interface EntityMatch<T = unknown> {
  entity: T
  score: number
  matchType: 'exact' | 'fuzzy' | 'partial'
}

export interface ResolvedEntity {
  type: 'client' | 'guest' | 'vendor' | 'event'
  id: string
  displayName: string
  confidence: number
  data: unknown
}

export interface AmbiguousResult {
  isAmbiguous: true
  message: string
  options: Array<{
    id: string
    displayName: string
    score: number
  }>
}

export interface ResolvedResult {
  isAmbiguous: false
  entity: ResolvedEntity
}

export type EntityResolutionResult = AmbiguousResult | ResolvedResult

export interface DuplicateCandidate {
  id: string
  displayName: string
  matchType: 'exact_name' | 'similar_name' | 'same_email' | 'same_phone'
  similarity: number
  details: string
}

export interface DuplicateCheckResult {
  hasPotentialDuplicates: boolean
  candidates: DuplicateCandidate[]
  message: string
}

// ============================================
// LEVENSHTEIN DISTANCE
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize first row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first column
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
export function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim()
  const bLower = b.toLowerCase().trim()

  if (aLower === bLower) return 1

  const distance = levenshteinDistance(aLower, bLower)
  const maxLength = Math.max(aLower.length, bLower.length)

  if (maxLength === 0) return 1

  return 1 - (distance / maxLength)
}

/**
 * Check if string contains another (partial match)
 */
function containsMatch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

// ============================================
// DATE PARSING
// ============================================

/**
 * Parse natural language date strings into ISO format
 *
 * Supports:
 * - "June 15", "June 15th", "June 15, 2026"
 * - "next Saturday", "tomorrow", "today"
 * - "in 2 weeks", "in 3 months"
 * - "YYYY-MM-DD" (pass through)
 */
export function parseNaturalDate(input: string, referenceDate: Date = new Date()): string | null {
  const trimmed = input.trim().toLowerCase()

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Today, tomorrow, yesterday
  if (trimmed === 'today') {
    return formatDate(referenceDate)
  }
  if (trimmed === 'tomorrow') {
    const tomorrow = new Date(referenceDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDate(tomorrow)
  }
  if (trimmed === 'yesterday') {
    const yesterday = new Date(referenceDate)
    yesterday.setDate(yesterday.getDate() - 1)
    return formatDate(yesterday)
  }

  // Next [day of week]
  const nextDayMatch = trimmed.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i)
  if (nextDayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase())
    const currentDay = referenceDate.getDay()
    let daysAhead = targetDay - currentDay
    if (daysAhead <= 0) daysAhead += 7
    const result = new Date(referenceDate)
    result.setDate(result.getDate() + daysAhead)
    return formatDate(result)
  }

  // In X days/weeks/months
  const inTimeMatch = trimmed.match(/^in\s+(\d+)\s+(days?|weeks?|months?)$/i)
  if (inTimeMatch) {
    const amount = parseInt(inTimeMatch[1], 10)
    const unit = inTimeMatch[2].toLowerCase()
    const result = new Date(referenceDate)

    if (unit.startsWith('day')) {
      result.setDate(result.getDate() + amount)
    } else if (unit.startsWith('week')) {
      result.setDate(result.getDate() + (amount * 7))
    } else if (unit.startsWith('month')) {
      result.setMonth(result.getMonth() + amount)
    }

    return formatDate(result)
  }

  // Month day, year (e.g., "June 15, 2026" or "June 15th" or "June 15")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  const monthDayMatch = trimmed.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?$/i)
  if (monthDayMatch) {
    const month = monthNames.indexOf(monthDayMatch[1].toLowerCase())
    const day = parseInt(monthDayMatch[2], 10)
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : referenceDate.getFullYear()

    // If date has passed this year, use next year
    const result = new Date(year, month, day)
    if (!monthDayMatch[3] && result < referenceDate) {
      result.setFullYear(result.getFullYear() + 1)
    }

    return formatDate(result)
  }

  // Day/Month/Year or Month/Day/Year formats
  const numericMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/)
  if (numericMatch) {
    const a = parseInt(numericMatch[1], 10)
    const b = parseInt(numericMatch[2], 10)
    let year = numericMatch[3] ? parseInt(numericMatch[3], 10) : referenceDate.getFullYear()

    // Handle 2-digit years
    if (year < 100) {
      year += 2000
    }

    // Assume MM/DD/YYYY for US format
    const month = a - 1
    const day = b

    const result = new Date(year, month, day)
    return formatDate(result)
  }

  return null
}

/**
 * Format Date to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse time string to HH:MM format
 */
export function parseTime(input: string): string | null {
  const trimmed = input.trim().toLowerCase()

  // Already HH:MM format
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
    return trimmed.padStart(5, '0')
  }

  // 12-hour format (e.g., "3pm", "3:30pm", "3 PM")
  const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10)
    const minutes = twelveHourMatch[2] ? parseInt(twelveHourMatch[2], 10) : 0
    const isPM = twelveHourMatch[3].toLowerCase() === 'pm'

    if (isPM && hours !== 12) {
      hours += 12
    } else if (!isPM && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  return null
}

// ============================================
// ENTITY RESOLUTION
// ============================================

/**
 * Resolve a client by name or ID
 */
export async function resolveClient(
  query: string,
  companyId: string
): Promise<EntityResolutionResult> {
  // If it's a UUID, try direct lookup
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
    const [client] = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, query),
          eq(clients.companyId, companyId),
          isNull(clients.deletedAt)
        )
      )
      .limit(1)

    if (client) {
      return {
        isAmbiguous: false,
        entity: {
          type: 'client',
          id: client.id,
          displayName: `${client.partner1FirstName} ${client.partner1LastName || ''} & ${client.partner2FirstName || 'Partner'}`.trim(),
          confidence: 1,
          data: client,
        },
      }
    }
  }

  // Search by name
  const searchPattern = `%${query}%`
  const matches = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.companyId, companyId),
        isNull(clients.deletedAt),
        or(
          ilike(clients.partner1FirstName, searchPattern),
          ilike(clients.partner1LastName, searchPattern),
          ilike(clients.partner2FirstName, searchPattern),
          ilike(clients.partner2LastName, searchPattern),
          ilike(clients.weddingName, searchPattern)
        )
      )
    )
    .limit(10)

  if (matches.length === 0) {
    return {
      isAmbiguous: true,
      message: `No clients found matching "${query}"`,
      options: [],
    }
  }

  // Score matches
  const scored = matches.map(client => {
    const names = [
      client.partner1FirstName,
      client.partner1LastName,
      client.partner2FirstName,
      client.partner2LastName,
      client.weddingName,
    ].filter(Boolean).join(' ')

    const score = calculateSimilarity(query, names)
    const displayName = `${client.partner1FirstName} ${client.partner1LastName || ''} & ${client.partner2FirstName || 'Partner'}`.trim()

    return {
      client,
      score,
      displayName,
    }
  }).sort((a, b) => b.score - a.score)

  // If top match is significantly better (>0.8 score), return it
  if (scored[0].score > 0.8) {
    return {
      isAmbiguous: false,
      entity: {
        type: 'client',
        id: scored[0].client.id,
        displayName: scored[0].displayName,
        confidence: scored[0].score,
        data: scored[0].client,
      },
    }
  }

  // Multiple possible matches - return ambiguous
  if (scored.length > 1) {
    return {
      isAmbiguous: true,
      message: `Multiple clients match "${query}". Please select one:`,
      options: scored.slice(0, 5).map(s => ({
        id: s.client.id,
        displayName: s.displayName,
        score: s.score,
      })),
    }
  }

  // Single match with lower confidence
  return {
    isAmbiguous: false,
    entity: {
      type: 'client',
      id: scored[0].client.id,
      displayName: scored[0].displayName,
      confidence: scored[0].score,
      data: scored[0].client,
    },
  }
}

/**
 * Resolve a guest by name or ID
 *
 * @param companyId - Optional companyId for defense-in-depth tenant isolation.
 *   When provided, validates clientId belongs to this company before querying.
 */
export async function resolveGuest(
  query: string,
  clientId: string,
  companyId?: string
): Promise<EntityResolutionResult> {
  // SECURITY: Verify clientId belongs to companyId (defense-in-depth)
  if (companyId) {
    const [validClient] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .limit(1)

    if (!validClient) {
      return {
        isAmbiguous: true,
        message: 'Client not found or access denied',
        options: [],
      }
    }
  }

  // If it's a UUID, try direct lookup
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
    const [guest] = await db
      .select()
      .from(guests)
      .where(
        and(
          eq(guests.id, query),
          eq(guests.clientId, clientId)
        )
      )
      .limit(1)

    if (guest) {
      return {
        isAmbiguous: false,
        entity: {
          type: 'guest',
          id: guest.id,
          displayName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
          confidence: 1,
          data: guest,
        },
      }
    }
  }

  // Search by name
  const searchPattern = `%${query}%`
  const matches = await db
    .select()
    .from(guests)
    .where(
      and(
        eq(guests.clientId, clientId),
        or(
          ilike(guests.firstName, searchPattern),
          ilike(guests.lastName, searchPattern)
        )
      )
    )
    .limit(10)

  if (matches.length === 0) {
    return {
      isAmbiguous: true,
      message: `No guests found matching "${query}"`,
      options: [],
    }
  }

  // Score matches
  const scored = matches.map(guest => {
    const fullName = `${guest.firstName} ${guest.lastName || ''}`.trim()
    const score = calculateSimilarity(query, fullName)

    return {
      guest,
      score,
      displayName: fullName,
    }
  }).sort((a, b) => b.score - a.score)

  // If top match is significantly better
  if (scored[0].score > 0.8) {
    return {
      isAmbiguous: false,
      entity: {
        type: 'guest',
        id: scored[0].guest.id,
        displayName: scored[0].displayName,
        confidence: scored[0].score,
        data: scored[0].guest,
      },
    }
  }

  // Multiple possible matches
  if (scored.length > 1 && scored[0].score < 0.9) {
    return {
      isAmbiguous: true,
      message: `Multiple guests match "${query}". Please select one:`,
      options: scored.slice(0, 5).map(s => ({
        id: s.guest.id,
        displayName: s.displayName,
        score: s.score,
      })),
    }
  }

  return {
    isAmbiguous: false,
    entity: {
      type: 'guest',
      id: scored[0].guest.id,
      displayName: scored[0].displayName,
      confidence: scored[0].score,
      data: scored[0].guest,
    },
  }
}

/**
 * Resolve a vendor by name or ID
 */
export async function resolveVendor(
  query: string,
  companyId: string,
  clientId?: string
): Promise<EntityResolutionResult> {
  // If it's a UUID, try direct lookup
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(
        and(
          eq(vendors.id, query),
          eq(vendors.companyId, companyId)
        )
      )
      .limit(1)

    if (vendor) {
      return {
        isAmbiguous: false,
        entity: {
          type: 'vendor',
          id: vendor.id,
          displayName: vendor.name,
          confidence: 1,
          data: vendor,
        },
      }
    }
  }

  // Search by name
  const searchPattern = `%${query}%`
  const matches = await db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.companyId, companyId),
        ilike(vendors.name, searchPattern)
      )
    )
    .limit(10)

  if (matches.length === 0) {
    return {
      isAmbiguous: true,
      message: `No vendors found matching "${query}"`,
      options: [],
    }
  }

  // Score matches
  const scored = matches.map(vendor => {
    const score = calculateSimilarity(query, vendor.name)
    return {
      vendor,
      score,
      displayName: `${vendor.name} (${vendor.category})`,
    }
  }).sort((a, b) => b.score - a.score)

  if (scored[0].score > 0.8) {
    return {
      isAmbiguous: false,
      entity: {
        type: 'vendor',
        id: scored[0].vendor.id,
        displayName: scored[0].displayName,
        confidence: scored[0].score,
        data: scored[0].vendor,
      },
    }
  }

  if (scored.length > 1 && scored[0].score < 0.9) {
    return {
      isAmbiguous: true,
      message: `Multiple vendors match "${query}". Please select one:`,
      options: scored.slice(0, 5).map(s => ({
        id: s.vendor.id,
        displayName: s.displayName,
        score: s.score,
      })),
    }
  }

  return {
    isAmbiguous: false,
    entity: {
      type: 'vendor',
      id: scored[0].vendor.id,
      displayName: scored[0].displayName,
      confidence: scored[0].score,
      data: scored[0].vendor,
    },
  }
}

/**
 * Resolve an event by name or ID
 *
 * @param companyId - Optional companyId for defense-in-depth tenant isolation.
 *   When provided, validates clientId belongs to this company before querying.
 */
export async function resolveEvent(
  query: string,
  clientId: string,
  companyId?: string
): Promise<EntityResolutionResult> {
  // SECURITY: Verify clientId belongs to companyId (defense-in-depth)
  if (companyId) {
    const [validClient] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .limit(1)

    if (!validClient) {
      return {
        isAmbiguous: true,
        message: 'Client not found or access denied',
        options: [],
      }
    }
  }

  // If it's a UUID, try direct lookup
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
    const [event] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, query),
          eq(events.clientId, clientId),
          isNull(events.deletedAt)
        )
      )
      .limit(1)

    if (event) {
      return {
        isAmbiguous: false,
        entity: {
          type: 'event',
          id: event.id,
          displayName: `${event.title} (${event.eventType})`,
          confidence: 1,
          data: event,
        },
      }
    }
  }

  // Search by title or event type
  const searchPattern = `%${query}%`
  const matches = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.clientId, clientId),
        isNull(events.deletedAt),
        or(
          ilike(events.title, searchPattern),
          ilike(events.eventType, searchPattern)
        )
      )
    )
    .limit(10)

  if (matches.length === 0) {
    return {
      isAmbiguous: true,
      message: `No events found matching "${query}"`,
      options: [],
    }
  }

  // Score matches
  const scored = matches.map(event => {
    const text = `${event.title} ${event.eventType}`
    const score = calculateSimilarity(query, text)
    return {
      event,
      score,
      displayName: `${event.title} (${event.eventType})`,
    }
  }).sort((a, b) => b.score - a.score)

  if (scored[0].score > 0.7) {
    return {
      isAmbiguous: false,
      entity: {
        type: 'event',
        id: scored[0].event.id,
        displayName: scored[0].displayName,
        confidence: scored[0].score,
        data: scored[0].event,
      },
    }
  }

  if (scored.length > 1) {
    return {
      isAmbiguous: true,
      message: `Multiple events match "${query}". Please select one:`,
      options: scored.slice(0, 5).map(s => ({
        id: s.event.id,
        displayName: s.displayName,
        score: s.score,
      })),
    }
  }

  return {
    isAmbiguous: false,
    entity: {
      type: 'event',
      id: scored[0].event.id,
      displayName: scored[0].displayName,
      confidence: scored[0].score,
      data: scored[0].event,
    },
  }
}

/**
 * Multi-entity resolution for complex queries
 *
 * Example: "Add guest to Priya's wedding" resolves both guest context and client
 */
export async function resolveMultipleEntities(
  queries: Array<{ type: 'client' | 'guest' | 'vendor' | 'event'; query: string }>,
  companyId: string,
  clientId?: string
): Promise<Map<string, EntityResolutionResult>> {
  const results = new Map<string, EntityResolutionResult>()

  for (const { type, query } of queries) {
    let result: EntityResolutionResult

    switch (type) {
      case 'client':
        result = await resolveClient(query, companyId)
        break
      case 'guest':
        if (!clientId) {
          result = {
            isAmbiguous: true,
            message: 'Client context required to resolve guest',
            options: [],
          }
        } else {
          result = await resolveGuest(query, clientId, companyId)
        }
        break
      case 'vendor':
        result = await resolveVendor(query, companyId, clientId)
        break
      case 'event':
        if (!clientId) {
          result = {
            isAmbiguous: true,
            message: 'Client context required to resolve event',
            options: [],
          }
        } else {
          result = await resolveEvent(query, clientId, companyId)
        }
        break
      default:
        result = {
          isAmbiguous: true,
          message: `Unknown entity type: ${type}`,
          options: [],
        }
    }

    results.set(`${type}:${query}`, result)
  }

  return results
}

// ============================================
// DUPLICATE DETECTION
// ============================================

/**
 * Similarity threshold for duplicate detection
 * Higher = more strict matching (fewer false positives)
 * Lower = more lenient matching (catches more potential duplicates)
 */
const DUPLICATE_SIMILARITY_THRESHOLD = 0.75

/**
 * Check for potential duplicate guests when adding a new guest
 *
 * Checks:
 * - Exact name match (first + last)
 * - Similar name (Levenshtein distance)
 * - Same email
 * - Same phone
 *
 * Returns candidates that might be duplicates, letting the user decide
 */
export async function checkGuestDuplicates(
  firstName: string,
  lastName: string | undefined,
  email: string | undefined,
  phone: string | undefined,
  clientId: string
): Promise<DuplicateCheckResult> {
  const candidates: DuplicateCandidate[] = []
  const fullName = `${firstName} ${lastName || ''}`.trim().toLowerCase()

  // Get all guests for this client
  const existingGuests = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phone: guests.phone,
      groupName: guests.groupName,
    })
    .from(guests)
    .where(eq(guests.clientId, clientId))

  for (const guest of existingGuests) {
    const existingFullName = `${guest.firstName} ${guest.lastName || ''}`.trim().toLowerCase()
    const similarity = calculateSimilarity(fullName, existingFullName)
    const displayName = `${guest.firstName} ${guest.lastName || ''}`.trim()

    // Check exact name match
    if (fullName === existingFullName) {
      candidates.push({
        id: guest.id,
        displayName,
        matchType: 'exact_name',
        similarity: 1,
        details: guest.groupName ? `Group: ${guest.groupName}` : 'Existing guest',
      })
      continue
    }

    // Check similar name
    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
      candidates.push({
        id: guest.id,
        displayName,
        matchType: 'similar_name',
        similarity,
        details: `${Math.round(similarity * 100)}% name match${guest.groupName ? `, Group: ${guest.groupName}` : ''}`,
      })
      continue
    }

    // Check email match (if provided)
    if (email && guest.email && email.toLowerCase() === guest.email.toLowerCase()) {
      candidates.push({
        id: guest.id,
        displayName,
        matchType: 'same_email',
        similarity: 1,
        details: `Same email: ${guest.email}`,
      })
      continue
    }

    // Check phone match (if provided)
    if (phone && guest.phone) {
      // Normalize phone numbers (remove non-digits)
      const normalizedNew = phone.replace(/\D/g, '')
      const normalizedExisting = guest.phone.replace(/\D/g, '')

      if (normalizedNew.length >= 10 && normalizedExisting.length >= 10) {
        // Compare last 10 digits (handles country code variations)
        if (normalizedNew.slice(-10) === normalizedExisting.slice(-10)) {
          candidates.push({
            id: guest.id,
            displayName,
            matchType: 'same_phone',
            similarity: 1,
            details: `Same phone: ${guest.phone}`,
          })
        }
      }
    }
  }

  // Sort by similarity (highest first)
  candidates.sort((a, b) => b.similarity - a.similarity)

  if (candidates.length === 0) {
    return {
      hasPotentialDuplicates: false,
      candidates: [],
      message: 'No duplicates found',
    }
  }

  // Build message
  const exactMatches = candidates.filter(c => c.matchType === 'exact_name')
  const similarMatches = candidates.filter(c => c.matchType === 'similar_name')
  const emailMatches = candidates.filter(c => c.matchType === 'same_email')
  const phoneMatches = candidates.filter(c => c.matchType === 'same_phone')

  let message = '⚠️ Potential duplicate detected: '
  if (exactMatches.length > 0) {
    message += `Exact name match with "${exactMatches[0].displayName}". `
  } else if (similarMatches.length > 0) {
    message += `Similar to "${similarMatches[0].displayName}" (${similarMatches[0].details}). `
  } else if (emailMatches.length > 0) {
    message += `${emailMatches[0].details}. `
  } else if (phoneMatches.length > 0) {
    message += `${phoneMatches[0].details}. `
  }

  message += 'Is this the same person?'

  return {
    hasPotentialDuplicates: true,
    candidates: candidates.slice(0, 5), // Return top 5 candidates
    message,
  }
}

/**
 * Check for potential duplicate vendors when adding a new vendor
 */
export async function checkVendorDuplicates(
  name: string,
  email: string | undefined,
  phone: string | undefined,
  companyId: string,
  clientId?: string
): Promise<DuplicateCheckResult> {
  const candidates: DuplicateCandidate[] = []
  const normalizedName = name.toLowerCase().trim()

  // Get all vendors for this company
  const existingVendors = await db
    .select({
      id: vendors.id,
      name: vendors.name,
      category: vendors.category,
      email: vendors.email,
      phone: vendors.phone,
    })
    .from(vendors)
    .where(eq(vendors.companyId, companyId))

  for (const vendor of existingVendors) {
    const existingName = vendor.name.toLowerCase().trim()
    const similarity = calculateSimilarity(normalizedName, existingName)

    // Check exact name match
    if (normalizedName === existingName) {
      candidates.push({
        id: vendor.id,
        displayName: `${vendor.name} (${vendor.category || 'vendor'})`,
        matchType: 'exact_name',
        similarity: 1,
        details: 'Exact name match',
      })
      continue
    }

    // Check similar name
    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
      candidates.push({
        id: vendor.id,
        displayName: `${vendor.name} (${vendor.category || 'vendor'})`,
        matchType: 'similar_name',
        similarity,
        details: `${Math.round(similarity * 100)}% name match`,
      })
      continue
    }

    // Check email match
    if (email && vendor.email && email.toLowerCase() === vendor.email.toLowerCase()) {
      candidates.push({
        id: vendor.id,
        displayName: `${vendor.name} (${vendor.category || 'vendor'})`,
        matchType: 'same_email',
        similarity: 1,
        details: `Same email: ${vendor.email}`,
      })
      continue
    }

    // Check phone match
    if (phone && vendor.phone) {
      const normalizedNew = phone.replace(/\D/g, '')
      const normalizedExisting = vendor.phone.replace(/\D/g, '')

      if (normalizedNew.length >= 10 && normalizedExisting.length >= 10) {
        if (normalizedNew.slice(-10) === normalizedExisting.slice(-10)) {
          candidates.push({
            id: vendor.id,
            displayName: `${vendor.name} (${vendor.category || 'vendor'})`,
            matchType: 'same_phone',
            similarity: 1,
            details: `Same phone: ${vendor.phone}`,
          })
        }
      }
    }
  }

  candidates.sort((a, b) => b.similarity - a.similarity)

  if (candidates.length === 0) {
    return {
      hasPotentialDuplicates: false,
      candidates: [],
      message: 'No duplicates found',
    }
  }

  const exactMatches = candidates.filter(c => c.matchType === 'exact_name')
  let message = '⚠️ Potential duplicate vendor: '

  if (exactMatches.length > 0) {
    message += `"${exactMatches[0].displayName}" already exists. `
  } else {
    message += `Similar to "${candidates[0].displayName}" (${candidates[0].details}). `
  }

  message += 'Is this the same vendor?'

  return {
    hasPotentialDuplicates: true,
    candidates: candidates.slice(0, 5),
    message,
  }
}
