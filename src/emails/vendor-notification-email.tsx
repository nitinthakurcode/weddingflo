import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './layout';

interface VendorNotificationEmailProps {
  vendorName: string;
  notificationType: 'payment_due' | 'booking_confirmed' | 'update_required' | 'reminder';
  eventName: string;
  eventDate: string;
  message: string;
  dueDate?: string;
  amount?: number;
  actionUrl?: string;
  actionLabel?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function VendorNotificationEmail({
  vendorName,
  notificationType,
  eventName,
  eventDate,
  message,
  dueDate,
  amount,
  actionUrl,
  actionLabel,
  companyName,
  companyLogo,
  primaryColor = '#3b82f6',
}: VendorNotificationEmailProps) {
  const notificationConfig = {
    payment_due: {
      icon: '💰',
      title: 'Payment Due',
      color: '#f59e0b',
    },
    booking_confirmed: {
      icon: '✓',
      title: 'Booking Confirmed',
      color: '#22c55e',
    },
    update_required: {
      icon: '⚠️',
      title: 'Update Required',
      color: '#ef4444',
    },
    reminder: {
      icon: '🔔',
      title: 'Reminder',
      color: '#3b82f6',
    },
  };

  const config = notificationConfig[notificationType];
  const preview = `${config.title} - ${eventName}`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyLogo={companyLogo}
      primaryColor={primaryColor}
    >
      <Heading style={h1}>
        {config.icon} {config.title}
      </Heading>

      <Text style={text}>Hello {vendorName},</Text>

      <Text style={text}>{message}</Text>

      {/* Event Details Card */}
      <Section style={eventCard}>
        <Heading style={h2}>Event Details</Heading>
        <Hr style={hr} />
        <Text style={detailText}>
          <strong>Event:</strong> {eventName}
        </Text>
        <Text style={detailText}>
          <strong>Date:</strong> {eventDate}
        </Text>
      </Section>

      {/* Payment Info */}
      {notificationType === 'payment_due' && (amount || dueDate) && (
        <Section
          style={{
            ...alertCard,
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b',
          }}
        >
          <Heading style={h3}>Payment Information</Heading>
          {amount && (
            <Text style={alertText}>
              <strong>Amount Due:</strong> ${amount.toFixed(2)}
            </Text>
          )}
          {dueDate && (
            <Text style={alertText}>
              <strong>Due Date:</strong> {dueDate}
            </Text>
          )}
        </Section>
      )}

      {actionUrl && actionLabel && (
        <Section style={buttonContainer}>
          <Button
            style={{
              ...button,
              backgroundColor: config.color,
            }}
            href={actionUrl}
          >
            {actionLabel}
          </Button>
        </Section>
      )}

      <Hr style={hr} />

      <Text style={footer}>
        If you have any questions or concerns, please don&apos;t hesitate to contact
        us. Thank you for your partnership!
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
  margin: '0 0 16px',
};

const h3 = {
  color: '#92400e',
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

const eventCard = {
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

const alertCard = {
  border: '2px solid',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const alertText = {
  color: '#92400e',
  fontSize: '16px',
  lineHeight: '24px',
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

export default VendorNotificationEmail;
