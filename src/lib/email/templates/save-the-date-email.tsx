import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface SaveTheDateEmailProps {
  coupleName: string;
  weddingDate: string;
  venue?: string;
  websiteUrl?: string;
  locale?: string;
}

export function SaveTheDateEmail({
  coupleName,
  weddingDate,
  venue,
  websiteUrl,
  locale = 'en',
}: SaveTheDateEmailProps) {
  return (
    <BaseEmail preview={`Save the Date - ${coupleName}'s Wedding`} locale={locale}>
      <Heading className="text-2xl font-bold text-center text-gray-900 mb-6">
        Save the Date
      </Heading>
      <Text className="text-gray-700 text-lg text-center mb-4">
        You&apos;re invited to celebrate the wedding of
      </Text>
      <Heading className="text-3xl font-serif text-center text-gold-600 mb-6">
        {coupleName}
      </Heading>
      <Text className="text-gray-700 text-xl text-center font-semibold mb-2">
        {weddingDate}
      </Text>
      {venue && (
        <Text className="text-gray-600 text-center mb-6">
          {venue}
        </Text>
      )}
      {websiteUrl && (
        <Section className="text-center">
          <Link
            href={websiteUrl}
            className="bg-gold-500 text-white px-6 py-3 rounded-full inline-block font-semibold"
          >
            View Wedding Website
          </Link>
        </Section>
      )}
      <Text className="text-gray-500 text-sm text-center mt-8">
        Formal invitation to follow
      </Text>
    </BaseEmail>
  );
}
