import {
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface SignatureRequestEmailProps {
  recipientName: string;
  senderName: string;
  documentName: string;
  requestTitle: string;
  message?: string;
  signingUrl: string;
  expiresAt?: string;
  locale?: string;
}

export function SignatureRequestEmail({
  recipientName,
  senderName,
  documentName,
  requestTitle,
  message,
  signingUrl,
  expiresAt,
  locale = 'en',
}: SignatureRequestEmailProps) {
  return (
    <BaseEmail
      preview={`${senderName} has requested your signature on "${documentName}"`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Signature Requested
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        {senderName} has requested your signature on a document.
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text className="text-gray-900 font-semibold mb-1">
          {requestTitle}
        </Text>
        <Text className="text-gray-600 text-sm mb-0">
          Document: {documentName}
        </Text>
        {expiresAt && (
          <Text className="text-amber-600 text-sm mt-2 mb-0">
            Expires: {new Date(expiresAt).toLocaleDateString(locale, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        )}
      </Section>
      {message && (
        <Section className="bg-blue-50 p-4 rounded-lg mb-4">
          <Text className="text-gray-700 text-sm italic mb-0">
            &quot;{message}&quot;
          </Text>
        </Section>
      )}
      <Section className="text-center mb-6">
        <Link
          href={signingUrl}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold no-underline inline-block"
        >
          Review &amp; Sign Document
        </Link>
      </Section>
      <Text className="text-gray-500 text-sm">
        If you have any questions, please contact the sender directly.
        This link is unique to you and should not be shared.
      </Text>
    </BaseEmail>
  );
}

interface SignatureReminderEmailProps {
  recipientName: string;
  documentName: string;
  requestTitle: string;
  signingUrl: string;
  expiresAt?: string;
  locale?: string;
}

export function SignatureReminderEmail({
  recipientName,
  documentName,
  requestTitle,
  signingUrl,
  expiresAt,
  locale = 'en',
}: SignatureReminderEmailProps) {
  return (
    <BaseEmail
      preview={`Reminder: Your signature is needed on "${documentName}"`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Signature Reminder
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        This is a reminder that your signature is still needed on the following document:
      </Text>
      <Section className="bg-amber-50 p-4 rounded-lg mb-4 border border-amber-200">
        <Text className="text-gray-900 font-semibold mb-1">
          {requestTitle}
        </Text>
        <Text className="text-gray-600 text-sm mb-0">
          Document: {documentName}
        </Text>
        {expiresAt && (
          <Text className="text-red-600 text-sm mt-2 mb-0 font-semibold">
            Expires: {new Date(expiresAt).toLocaleDateString(locale, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        )}
      </Section>
      <Section className="text-center mb-6">
        <Link
          href={signingUrl}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold no-underline inline-block"
        >
          Sign Now
        </Link>
      </Section>
    </BaseEmail>
  );
}

interface SignatureCompleteEmailProps {
  recipientName: string;
  documentName: string;
  requestTitle: string;
  signerNames: string[];
  locale?: string;
}

export function SignatureCompleteEmail({
  recipientName,
  documentName,
  requestTitle,
  signerNames,
  locale = 'en',
}: SignatureCompleteEmailProps) {
  return (
    <BaseEmail
      preview={`All signatures collected for "${documentName}"`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        All Signatures Complete
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        All parties have signed &quot;{requestTitle}&quot;.
      </Text>
      <Section className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
        <Text className="text-gray-900 font-semibold mb-2">
          Document: {documentName}
        </Text>
        {signerNames.map((name, i) => (
          <Text key={i} className="text-green-700 text-sm mb-1">
            ✓ {name} — Signed
          </Text>
        ))}
      </Section>
    </BaseEmail>
  );
}
