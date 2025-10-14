import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './layout';

interface ReminderEmailProps {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  daysUntilEvent: number;
  checkInUrl?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function ReminderEmail({
  guestName,
  eventName,
  eventDate,
  eventTime,
  venue,
  daysUntilEvent,
  checkInUrl,
  companyName,
  companyLogo,
  primaryColor = '#3b82f6',
}: ReminderEmailProps) {
  const preview = `${eventName} is in ${daysUntilEvent} ${daysUntilEvent === 1 ? 'day' : 'days'}!`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyLogo={companyLogo}
      primaryColor={primaryColor}
    >
      <Heading style={h1}>Event Reminder 📅</Heading>

      <Text style={text}>Hi {guestName},</Text>

      <Text style={text}>
        This is a friendly reminder that <strong>{eventName}</strong> is coming
        up soon!
      </Text>

      {/* Countdown */}
      <Section style={countdownCard}>
        <Heading style={countdownNumber}>{daysUntilEvent}</Heading>
        <Text style={countdownLabel}>
          {daysUntilEvent === 1 ? 'Day' : 'Days'} to Go!
        </Text>
      </Section>

      {/* Event Details */}
      <Section style={detailsCard}>
        <Text style={detailText}>
          <strong>📅 Date:</strong> {eventDate}
        </Text>
        <Text style={detailText}>
          <strong>🕒 Time:</strong> {eventTime}
        </Text>
        <Text style={detailText}>
          <strong>📍 Venue:</strong> {venue}
        </Text>
      </Section>

      <Hr style={hr} />

      <Heading style={h2}>What to Bring:</Heading>
      <Text style={text}>• Your invitation (physical or digital)</Text>
      <Text style={text}>• A smile and good vibes! 😊</Text>
      <Text style={text}>• Any gifts (if applicable)</Text>

      {checkInUrl && (
        <Section style={buttonContainer}>
          <Button
            style={{
              ...button,
              backgroundColor: primaryColor,
            }}
            href={checkInUrl}
          >
            Quick Check-In
          </Button>
        </Section>
      )}

      <Hr style={hr} />

      <Text style={footer}>
        We can't wait to see you! If you have any last-minute questions, please
        don't hesitate to reach out.
      </Text>
    </EmailLayout>
  );
}

// Styles
const h1 = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
};

const countdownCard = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #22c55e',
  borderRadius: '12px',
  padding: '32px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const countdownNumber = {
  color: '#16a34a',
  fontSize: '64px',
  fontWeight: 'bold',
  margin: '0',
};

const countdownLabel = {
  color: '#16a34a',
  fontSize: '20px',
  fontWeight: '600',
  margin: '8px 0 0',
};

const detailsCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const detailText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

export default ReminderEmail;
