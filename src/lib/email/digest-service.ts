import { db, eq, and, sql, gte, lte } from '@/lib/db'
import {
  clients,
  guests,
  clientVendors,
  timeline,
  events,
  messages,
  users,
} from '@/lib/db/schema'
import { sendEmail } from './resend'
import { WeeklyDigestEmail } from './templates/weekly-digest-email'
import { render } from '@react-email/render'

interface DigestItem {
  type: 'rsvp' | 'vendor' | 'task' | 'message' | 'payment' | 'event'
  title: string
  description: string
  timestamp?: string
  link?: string
}

interface UpcomingEvent {
  name: string
  date: string
  daysUntil: number
  venue?: string
}

interface DigestData {
  recipientName: string
  recipientEmail: string
  coupleName: string
  weddingDate?: string
  daysUntilWedding?: number
  digestItems: DigestItem[]
  upcomingEvents: UpcomingEvent[]
  stats: {
    newRsvps: number
    totalGuests: number
    rsvpPercentage: number
    vendorsConfirmed: number
    tasksCompleted: number
    messagesReceived: number
  }
  locale?: string
}

/**
 * Generate digest data for a specific client
 */
export async function generateDigestForClient(
  clientId: string,
  companyId: string
): Promise<DigestData | null> {
  // Get the client data
  const clientResult = await db
    .select({
      id: clients.id,
      partner1FirstName: clients.partner1FirstName,
      partner1LastName: clients.partner1LastName,
      partner1Email: clients.partner1Email,
      partner2FirstName: clients.partner2FirstName,
      partner2LastName: clients.partner2LastName,
      weddingDate: clients.weddingDate,
    })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.companyId, companyId)
      )
    )
    .limit(1)

  if (!clientResult[0]) {
    return null
  }

  const client = clientResult[0]

  // Calculate days until wedding
  let daysUntilWedding: number | undefined
  let weddingDateFormatted: string | undefined
  if (client.weddingDate) {
    const weddingDate = new Date(client.weddingDate)
    weddingDateFormatted = weddingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const today = new Date()
    const diffTime = weddingDate.getTime() - today.getTime()
    daysUntilWedding = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (daysUntilWedding < 0) daysUntilWedding = 0
  }

  // Calculate the date range for "this week"
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get guest stats and new RSVPs this week
  const guestStats = await db
    .select({
      total: sql<number>`count(*)::int`,
      attending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'attending')::int`,
      responded: sql<number>`count(*) filter (where ${guests.rsvpStatus} != 'pending' and ${guests.rsvpStatus} is not null)::int`,
      newRsvps: sql<number>`count(*) filter (where ${guests.updatedAt} >= ${oneWeekAgo} and ${guests.rsvpStatus} != 'pending')::int`,
    })
    .from(guests)
    .where(eq(guests.clientId, clientId))

  const guestData = guestStats[0] || { total: 0, attending: 0, responded: 0, newRsvps: 0 }
  const rsvpPercentage = guestData.total > 0
    ? Math.round((guestData.responded / guestData.total) * 100)
    : 0

  // Get vendor stats
  const vendorStats = await db
    .select({
      confirmed: sql<number>`count(*) filter (where ${clientVendors.status} = 'confirmed')::int`,
    })
    .from(clientVendors)
    .where(eq(clientVendors.clientId, clientId))

  const vendorData = vendorStats[0] || { confirmed: 0 }

  // Get completed tasks this week (timeline items)
  const taskStats = await db
    .select({
      completed: sql<number>`count(*) filter (where ${timeline.completed} = true)::int`,
    })
    .from(timeline)
    .where(eq(timeline.clientId, clientId))

  const taskData = taskStats[0] || { completed: 0 }

  // Get message count this week
  const messageStats = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.clientId, clientId),
        gte(messages.createdAt, oneWeekAgo)
      )
    )

  const messageData = messageStats[0] || { count: 0 }

  // Generate digest items from recent activity
  const digestItems: DigestItem[] = []

  // Add RSVP updates
  if (guestData.newRsvps > 0) {
    digestItems.push({
      type: 'rsvp',
      title: `${guestData.newRsvps} new RSVP${guestData.newRsvps > 1 ? 's' : ''} received`,
      description: `Your guest list is ${rsvpPercentage}% confirmed`,
    })
  }

  // Add message notification
  if (messageData.count > 0) {
    digestItems.push({
      type: 'message',
      title: `${messageData.count} new message${messageData.count > 1 ? 's' : ''}`,
      description: 'Check your inbox for updates from your planner',
    })
  }

  // Get upcoming events (next 30 days)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const upcomingEventsResult = await db
    .select({
      title: events.title,
      eventDate: events.eventDate,
      venueName: events.venueName,
    })
    .from(events)
    .where(
      and(
        eq(events.clientId, clientId),
        gte(events.eventDate, now.toISOString().split('T')[0]),
        lte(events.eventDate, thirtyDaysFromNow.toISOString().split('T')[0])
      )
    )
    .orderBy(events.eventDate)
    .limit(5)

  const upcomingEvents: UpcomingEvent[] = upcomingEventsResult
    .filter(event => event.eventDate) // Filter out events without dates
    .map(event => {
    const eventDate = new Date(event.eventDate!)
    const daysUntil = Math.ceil(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      name: event.title,
      date: eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      daysUntil,
      venue: event.venueName || undefined,
    }
  })

  // Add upcoming event notifications to digest
  upcomingEvents.forEach(event => {
    if (event.daysUntil <= 7) {
      digestItems.push({
        type: 'event',
        title: `${event.name} is coming up`,
        description: `${event.daysUntil} day${event.daysUntil > 1 ? 's' : ''} away${event.venue ? ` at ${event.venue}` : ''}`,
      })
    }
  })

  const coupleName = [
    client.partner1FirstName,
    client.partner2FirstName,
  ]
    .filter(Boolean)
    .join(' & ')

  const recipientName = client.partner1FirstName || 'there'

  return {
    recipientName,
    recipientEmail: client.partner1Email || '',
    coupleName,
    weddingDate: weddingDateFormatted,
    daysUntilWedding,
    digestItems,
    upcomingEvents,
    stats: {
      newRsvps: guestData.newRsvps,
      totalGuests: guestData.attending,
      rsvpPercentage,
      vendorsConfirmed: vendorData.confirmed,
      tasksCompleted: taskData.completed,
      messagesReceived: messageData.count,
    },
    locale: 'en',
  }
}

/**
 * Send weekly digest email to a client
 */
export async function sendWeeklyDigest(
  clientId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const digestData = await generateDigestForClient(clientId, companyId)

    if (!digestData) {
      return { success: false, error: 'Client not found' }
    }

    if (!digestData.recipientEmail) {
      return { success: false, error: 'No email address for client' }
    }

    // Skip if no activity this week and no upcoming events
    if (digestData.digestItems.length === 0 && digestData.upcomingEvents.length === 0) {
      return { success: true } // No email needed
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.weddingflo.com'}/portal/dashboard`

    const emailHtml = await render(
      WeeklyDigestEmail({
        ...digestData,
        portalUrl,
      })
    )

    await sendEmail({
      to: digestData.recipientEmail,
      subject: `Weekly Wedding Update - ${digestData.coupleName}`,
      html: emailHtml,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send weekly digest:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send weekly digests to all active clients in a company
 */
export async function sendCompanyWeeklyDigests(
  companyId: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  const results = { sent: 0, failed: 0, skipped: 0 }

  // Get all clients with upcoming weddings (next 6 months) or recent activity
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

  const activeClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.companyId, companyId),
        // Only clients with wedding date in next 6 months or no date set
        sql`(${clients.weddingDate} is null or ${clients.weddingDate} <= ${sixMonthsFromNow.toISOString().split('T')[0]})`
      )
    )

  for (const client of activeClients) {
    const result = await sendWeeklyDigest(client.id, companyId)

    if (result.success) {
      results.sent++
    } else if (result.error === 'No email address for client') {
      results.skipped++
    } else {
      results.failed++
    }
  }

  return results
}
