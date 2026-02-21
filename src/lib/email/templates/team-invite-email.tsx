import {
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface TeamInviteEmailProps {
  recipientName?: string;
  recipientEmail: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
  expiresAt?: string;
  locale?: string;
}

export function TeamInviteEmail({
  recipientName,
  recipientEmail,
  inviterName,
  companyName,
  role,
  inviteUrl,
  expiresAt,
  locale = 'en',
}: TeamInviteEmailProps) {
  return (
    <BaseEmail
      preview={`You've been invited to join ${companyName} on WeddingFlo`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Team Invitation
      </Heading>
      <Text className="text-gray-700 mb-4">
        {recipientName ? `Dear ${recipientName},` : 'Hello,'}
      </Text>
      <Text className="text-gray-700 mb-4">
        {inviterName} has invited you to join <strong>{companyName}</strong> on WeddingFlo.
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text className="text-gray-600 mb-2">
          <strong>Company:</strong> {companyName}
        </Text>
        <Text className="text-gray-600 mb-2">
          <strong>Role:</strong> {role}
        </Text>
        <Text className="text-gray-600">
          <strong>Email:</strong> {recipientEmail}
        </Text>
      </Section>
      <Section className="text-center mb-4">
        <Link
          href={inviteUrl}
          className="bg-gold-500 text-white px-6 py-3 rounded-full inline-block font-semibold"
        >
          Accept Invitation
        </Link>
      </Section>
      {expiresAt && (
        <Text className="text-amber-600 text-sm text-center mb-4">
          This invitation expires on {expiresAt}
        </Text>
      )}
      <Text className="text-gray-500 text-sm">
        If you didn&apos;t expect this invitation, you can safely ignore this email.
      </Text>
    </BaseEmail>
  );
}
