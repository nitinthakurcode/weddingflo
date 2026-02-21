import {
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface EventReminderEmailProps {
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  coupleName?: string;
  additionalDetails?: string;
  websiteUrl?: string;
  locale?: string;
}

export function EventReminderEmail({
  recipientName,
  eventName,
  eventDate,
  eventTime,
  venue,
  coupleName,
  additionalDetails,
  websiteUrl,
  locale = 'en',
}: EventReminderEmailProps) {
  return (
    <BaseEmail preview={`Reminder: ${eventName} on ${eventDate}`} locale={locale}>
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Event Reminder
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        This is a friendly reminder about the upcoming event:
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          {eventName}
        </Text>
        {coupleName && (
          <Text className="text-gray-600 mb-1">
            For: {coupleName}
          </Text>
        )}
        <Text className="text-gray-600 mb-1">
          Date: {eventDate}
        </Text>
        {eventTime && (
          <Text className="text-gray-600 mb-1">
            Time: {eventTime}
          </Text>
        )}
        {venue && (
          <Text className="text-gray-600">
            Venue: {venue}
          </Text>
        )}
      </Section>
      {additionalDetails && (
        <Text className="text-gray-600 mb-4">
          {additionalDetails}
        </Text>
      )}
      {websiteUrl && (
        <Section className="text-center">
          <Link
            href={websiteUrl}
            className="bg-gold-500 text-white px-6 py-3 rounded-full inline-block font-semibold"
          >
            View Details
          </Link>
        </Section>
      )}
    </BaseEmail>
  );
}
