import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './layout';

interface RsvpConfirmationEmailProps {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  attendingStatus: 'yes' | 'no' | 'maybe';
  guestCount?: number;
  dietaryRestrictions?: string;
  specialRequests?: string;
  calendarUrl?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function RsvpConfirmationEmail({
  guestName,
  eventName,
  eventDate,
  eventTime,
  venue,
  attendingStatus,
  guestCount,
  dietaryRestrictions,
  specialRequests,
  calendarUrl,
  companyName,
  companyLogo,
  primaryColor = '#3b82f6',
}: RsvpConfirmationEmailProps) {
  const preview = `Your RSVP for ${eventName} has been confirmed`;

  const statusColors = {
    yes: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
    no: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    maybe: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  };

  const statusLabels = {
    yes: '✓ Attending',
    no: '✗ Unable to Attend',
    maybe: '? Maybe',
  };

  const color = statusColors[attendingStatus];

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyLogo={companyLogo}
      primaryColor={primaryColor}
    >
      <Heading style={h1}>RSVP Confirmed! ✓</Heading>

      <Text style={text}>Hi {guestName},</Text>

      <Text style={text}>
        Thank you for your response! We&apos;ve received your RSVP for {eventName}.
      </Text>

      {/* Status Card */}
      <Section
        style={{
          ...statusCard,
          backgroundColor: color.bg,
          borderColor: color.border,
        }}
      >
        <Text
          style={{
            ...statusText,
            color: color.text,
          }}
        >
          {statusLabels[attendingStatus]}
        </Text>
        {guestCount && guestCount > 1 && (
          <Text style={{ ...statusSubtext, color: color.text }}>
            {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
          </Text>
        )}
      </Section>

      {attendingStatus === 'yes' && (
        <>
          {/* Event Details */}
          <Section style={detailsCard}>
            <Heading style={h2}>Event Details</Heading>
            <Hr style={hr} />
            <Text style={detailText}>
              <strong>Event:</strong> {eventName}
            </Text>
            <Text style={detailText}>
              <strong>Date:</strong> {eventDate}
            </Text>
            <Text style={detailText}>
              <strong>Time:</strong> {eventTime}
            </Text>
            <Text style={detailText}>
              <strong>Venue:</strong> {venue}
            </Text>
          </Section>

          {/* Additional Info */}
          {(dietaryRestrictions || specialRequests) && (
            <Section style={infoCard}>
              <Heading style={h3}>Your Preferences</Heading>
              {dietaryRestrictions && (
                <Text style={infoText}>
                  <strong>Dietary Restrictions:</strong> {dietaryRestrictions}
                </Text>
              )}
              {specialRequests && (
                <Text style={infoText}>
                  <strong>Special Requests:</strong> {specialRequests}
                </Text>
              )}
            </Section>
          )}

          {calendarUrl && (
            <Section style={buttonContainer}>
              <Button
                style={{
                  ...button,
                  backgroundColor: primaryColor,
                }}
                href={calendarUrl}
              >
                Add to Calendar
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            We&apos;re so excited to celebrate with you! If you need to make any
            changes to your RSVP, please let us know as soon as possible.
          </Text>
        </>
      )}

      {attendingStatus === 'no' && (
        <Text style={footer}>
          We&apos;re sorry you won&apos;t be able to join us, but we appreciate you
          letting us know. We&apos;ll miss you!
        </Text>
      )}

      {attendingStatus === 'maybe' && (
        <Text style={footer}>
          We understand you&apos;re not sure yet. Please let us know your final
          decision as soon as you can. We hope to see you there!
        </Text>
      )}
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
  margin: '0 0 16px',
};

const h3 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const statusCard = {
  border: '2px solid',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const statusText = {
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
};

const statusSubtext = {
  fontSize: '16px',
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

const infoCard = {
  backgroundColor: '#eff6ff',
  border: '1px solid #dbeafe',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
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

export default RsvpConfirmationEmail;
