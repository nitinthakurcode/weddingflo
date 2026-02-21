import {
  Heading,
  Section,
  Text,
  Link,
  Hr,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'
import { BaseEmail } from './base-email'

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

interface WeeklyDigestEmailProps {
  recipientName: string
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
  portalUrl?: string
}

const DIGEST_TEXT = {
  en: {
    preview: 'Your weekly wedding planning update',
    greeting: 'Hi',
    weeklyUpdate: 'Your Weekly Wedding Update',
    weddingCountdown: 'Wedding Countdown',
    daysToGo: 'days to go',
    thisWeek: "This Week's Highlights",
    upcomingEvents: 'Upcoming Events',
    quickStats: 'Quick Stats',
    rsvps: 'RSVPs Received',
    guestsConfirmed: 'Guests Confirmed',
    vendorsBooked: 'Vendors Booked',
    tasksComplete: 'Tasks Completed',
    viewPortal: 'View Full Dashboard',
    noUpdates: 'No major updates this week. Keep up the great work!',
    daysUntil: 'days until',
  },
  es: {
    preview: 'Tu actualización semanal de planificación de boda',
    greeting: 'Hola',
    weeklyUpdate: 'Tu Actualización Semanal de Boda',
    weddingCountdown: 'Cuenta Regresiva de la Boda',
    daysToGo: 'días para el gran día',
    thisWeek: 'Destacados de Esta Semana',
    upcomingEvents: 'Próximos Eventos',
    quickStats: 'Estadísticas Rápidas',
    rsvps: 'RSVPs Recibidos',
    guestsConfirmed: 'Invitados Confirmados',
    vendorsBooked: 'Proveedores Reservados',
    tasksComplete: 'Tareas Completadas',
    viewPortal: 'Ver Panel Completo',
    noUpdates: 'Sin actualizaciones importantes esta semana. ¡Sigue así!',
    daysUntil: 'días hasta',
  },
}

export function WeeklyDigestEmail({
  recipientName,
  coupleName,
  weddingDate,
  daysUntilWedding,
  digestItems,
  upcomingEvents,
  stats,
  locale = 'en',
  portalUrl = 'https://app.weddingflo.com/portal/dashboard',
}: WeeklyDigestEmailProps) {
  const t = DIGEST_TEXT[locale as keyof typeof DIGEST_TEXT] || DIGEST_TEXT.en

  const getItemIcon = (type: DigestItem['type']) => {
    switch (type) {
      case 'rsvp':
        return '✓'
      case 'vendor':
        return '🏢'
      case 'task':
        return '☑️'
      case 'message':
        return '💬'
      case 'payment':
        return '💰'
      case 'event':
        return '📅'
      default:
        return '•'
    }
  }

  return (
    <BaseEmail preview={t.preview} locale={locale}>
      {/* Greeting */}
      <Text style={greeting}>
        {t.greeting} {recipientName},
      </Text>

      <Heading as="h2" style={subheading}>
        {t.weeklyUpdate}
      </Heading>

      {/* Wedding Countdown */}
      {daysUntilWedding !== undefined && daysUntilWedding > 0 && (
        <Section style={countdownSection}>
          <Text style={countdownLabel}>{t.weddingCountdown}</Text>
          <Text style={countdownNumber}>{daysUntilWedding}</Text>
          <Text style={countdownLabel}>{t.daysToGo}</Text>
          {weddingDate && (
            <Text style={dateText}>{coupleName} • {weddingDate}</Text>
          )}
        </Section>
      )}

      <Hr style={divider} />

      {/* Quick Stats */}
      <Section style={statsSection}>
        <Text style={sectionTitle}>{t.quickStats}</Text>
        <Row>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.newRsvps}</Text>
            <Text style={statLabel}>{t.rsvps}</Text>
          </Column>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.totalGuests}</Text>
            <Text style={statLabel}>{t.guestsConfirmed}</Text>
          </Column>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.vendorsConfirmed}</Text>
            <Text style={statLabel}>{t.vendorsBooked}</Text>
          </Column>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.tasksCompleted}</Text>
            <Text style={statLabel}>{t.tasksComplete}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* This Week's Highlights */}
      <Section style={highlightsSection}>
        <Text style={sectionTitle}>{t.thisWeek}</Text>
        {digestItems.length === 0 ? (
          <Text style={noUpdatesText}>{t.noUpdates}</Text>
        ) : (
          digestItems.map((item, index) => (
            <Section key={index} style={digestItemRow}>
              <Text style={itemIcon}>{getItemIcon(item.type)}</Text>
              <Section style={itemContent}>
                <Text style={itemTitle}>{item.title}</Text>
                <Text style={itemDescription}>{item.description}</Text>
                {item.timestamp && (
                  <Text style={itemTimestamp}>{item.timestamp}</Text>
                )}
              </Section>
            </Section>
          ))
        )}
      </Section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <>
          <Hr style={divider} />
          <Section style={eventsSection}>
            <Text style={sectionTitle}>{t.upcomingEvents}</Text>
            {upcomingEvents.map((event, index) => (
              <Section key={index} style={eventRow}>
                <Text style={eventName}>{event.name}</Text>
                <Text style={eventDetails}>
                  {event.date} • {event.daysUntil} {t.daysUntil}
                </Text>
                {event.venue && (
                  <Text style={eventVenue}>{event.venue}</Text>
                )}
              </Section>
            ))}
          </Section>
        </>
      )}

      <Hr style={divider} />

      {/* CTA */}
      <Section style={ctaSection}>
        <Link href={portalUrl} style={ctaButton}>
          {t.viewPortal}
        </Link>
      </Section>
    </BaseEmail>
  )
}

// Styles
const greeting = {
  color: '#3D3027',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '8px',
}

const subheading = {
  color: '#3D3027',
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '24px',
}

const countdownSection = {
  textAlign: 'center' as const,
  padding: '24px',
  backgroundColor: '#FFF1F2', // rose-50
  borderRadius: '12px',
  marginBottom: '24px',
}

const countdownLabel = {
  color: '#8B7355',
  fontSize: '14px',
  margin: '0',
}

const countdownNumber = {
  color: '#E11D48', // rose-600
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '8px 0',
}

const dateText = {
  color: '#3D3027',
  fontSize: '14px',
  marginTop: '8px',
}

const divider = {
  borderColor: '#E5E7EB',
  margin: '24px 0',
}

const sectionTitle = {
  color: '#3D3027',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
}

const statsSection = {
  marginBottom: '8px',
}

const statColumn = {
  textAlign: 'center' as const,
  width: '25%',
}

const statNumber = {
  color: '#14B8A6', // teal-500
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
}

const statLabel = {
  color: '#8B7355',
  fontSize: '12px',
  margin: '4px 0 0',
}

const highlightsSection = {
  marginBottom: '8px',
}

const noUpdatesText = {
  color: '#8B7355',
  fontSize: '14px',
  fontStyle: 'italic',
}

const digestItemRow = {
  display: 'flex',
  padding: '12px 0',
  borderBottom: '1px solid #F3F4F6',
}

const itemIcon = {
  fontSize: '18px',
  marginRight: '12px',
  width: '24px',
}

const itemContent = {
  flex: '1',
}

const itemTitle = {
  color: '#3D3027',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const itemDescription = {
  color: '#6B7280',
  fontSize: '13px',
  margin: '0',
}

const itemTimestamp = {
  color: '#9CA3AF',
  fontSize: '12px',
  margin: '4px 0 0',
}

const eventsSection = {
  marginBottom: '8px',
}

const eventRow = {
  padding: '12px 16px',
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  marginBottom: '8px',
}

const eventName = {
  color: '#3D3027',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const eventDetails = {
  color: '#6B7280',
  fontSize: '13px',
  margin: '0',
}

const eventVenue = {
  color: '#9CA3AF',
  fontSize: '12px',
  margin: '4px 0 0',
}

const ctaSection = {
  textAlign: 'center' as const,
  padding: '24px 0',
}

const ctaButton = {
  backgroundColor: '#14B8A6',
  color: '#ffffff',
  padding: '12px 32px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
}

export default WeeklyDigestEmail
