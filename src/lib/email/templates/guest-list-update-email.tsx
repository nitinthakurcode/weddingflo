import {
  Heading,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface GuestListUpdateEmailProps {
  recipientName: string;
  coupleName: string;
  updateType: 'rsvp' | 'new_guest' | 'guest_removed' | 'dietary_update';
  guestName: string;
  details?: string;
  totalGuests?: number;
  confirmedGuests?: number;
  locale?: string;
}

export function GuestListUpdateEmail({
  recipientName,
  coupleName,
  updateType,
  guestName,
  details,
  totalGuests,
  confirmedGuests,
  locale = 'en',
}: GuestListUpdateEmailProps) {
  const getUpdateMessage = () => {
    switch (updateType) {
      case 'rsvp':
        return `${guestName} has responded to the RSVP.`;
      case 'new_guest':
        return `${guestName} has been added to the guest list.`;
      case 'guest_removed':
        return `${guestName} has been removed from the guest list.`;
      case 'dietary_update':
        return `${guestName} has updated their dietary requirements.`;
      default:
        return `There's an update regarding ${guestName}.`;
    }
  };

  return (
    <BaseEmail
      preview={`Guest List Update: ${guestName}`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Guest List Update
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        There&apos;s been an update to the guest list for {coupleName}&apos;s wedding.
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          {getUpdateMessage()}
        </Text>
        {details && (
          <Text className="text-gray-600">
            {details}
          </Text>
        )}
      </Section>
      {totalGuests !== undefined && confirmedGuests !== undefined && (
        <Section className="border-t pt-4">
          <Text className="text-gray-600">
            <strong>Guest Summary:</strong> {confirmedGuests} confirmed / {totalGuests} invited
          </Text>
        </Section>
      )}
    </BaseEmail>
  );
}
