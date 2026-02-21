import {
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface WelcomeEmailProps {
  userName: string;
  companyName?: string;
  dashboardUrl: string;
  locale?: string;
}

export function WelcomeEmail({
  userName,
  companyName,
  dashboardUrl,
  locale = 'en',
}: WelcomeEmailProps) {
  return (
    <BaseEmail
      preview="Welcome to WeddingFlo - Your Wedding Planning Journey Starts Here!"
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Welcome to WeddingFlo!
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {userName},
      </Text>
      <Text className="text-gray-700 mb-4">
        Thank you for joining WeddingFlo{companyName ? ` with ${companyName}` : ''}!
        We&apos;re excited to help you create unforgettable wedding experiences.
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Heading className="text-lg font-semibold text-gray-900 mb-3">
          Get Started:
        </Heading>
        <Text className="text-gray-600 mb-2">
          ✓ Set up your company profile
        </Text>
        <Text className="text-gray-600 mb-2">
          ✓ Add your first client
        </Text>
        <Text className="text-gray-600 mb-2">
          ✓ Create your first event timeline
        </Text>
        <Text className="text-gray-600 mb-2">
          ✓ Invite your team members
        </Text>
      </Section>
      <Section className="text-center mb-4">
        <Link
          href={dashboardUrl}
          className="bg-gold-500 text-white px-6 py-3 rounded-full inline-block font-semibold"
        >
          Go to Dashboard
        </Link>
      </Section>
      <Text className="text-gray-600 text-sm">
        If you have any questions, our support team is here to help.
        Just reply to this email or visit our help center.
      </Text>
    </BaseEmail>
  );
}
