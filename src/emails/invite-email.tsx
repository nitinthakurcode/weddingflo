import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './layout';

interface InviteEmailProps {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  venueAddress?: string;
  rsvpUrl?: string;
  message?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function InviteEmail({
  guestName,
  eventName,
  eventDate,
  eventTime,
  venue,
  venueAddress,
  rsvpUrl,
  message,
  companyName,
  companyLogo,
  primaryColor = '#3b82f6',
}: InviteEmailProps) {
  const preview = `You're invited to ${eventName}!`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyLogo={companyLogo}
      primaryColor={primaryColor}
    >
      <Heading style={h1}>You&apos;re Invited! 💒</Heading>

      <Text style={text}>Dear {guestName},</Text>

      <Text style={text}>
        We are delighted to invite you to celebrate with us at:
      </Text>

      {/* Event Details Card */}
      <Section style={card}>
        <Heading style={h2}>{eventName}</Heading>
        <Hr style={hr} />
        <Text style={detailText}>
          <strong>📅 Date:</strong> {eventDate}
        </Text>
        <Text style={detailText}>
          <strong>🕒 Time:</strong> {eventTime}
        </Text>
        <Text style={detailText}>
          <strong>📍 Venue:</strong> {venue}
        </Text>
        {venueAddress && (
          <Text style={detailText}>
            <strong>Address:</strong> {venueAddress}
          </Text>
        )}
      </Section>

      {message && (
        <>
          <Hr style={hr} />
          <Text style={text}>{message}</Text>
        </>
      )}

      {rsvpUrl && (
        <Section style={buttonContainer}>
          <Button
            style={{
              ...button,
              backgroundColor: primaryColor,
            }}
            href={rsvpUrl}
          >
            RSVP Now
          </Button>
        </Section>
      )}

      <Hr style={hr} />

      <Text style={footer}>
        We look forward to celebrating this special day with you!
      </Text>

      <Text style={footer}>
        If you have any questions or dietary restrictions, please let us know.
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
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const card = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const detailText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
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
  margin: '8px 0',
  textAlign: 'center' as const,
};

export default InviteEmail;
