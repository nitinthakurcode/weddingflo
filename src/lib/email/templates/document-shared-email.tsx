import {
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface DocumentSharedEmailProps {
  recipientName: string;
  senderName: string;
  documentName: string;
  documentType: 'contract' | 'invoice' | 'proposal' | 'questionnaire' | 'other';
  message?: string;
  viewUrl: string;
  expiresAt?: string;
  locale?: string;
}

export function DocumentSharedEmail({
  recipientName,
  senderName,
  documentName,
  documentType,
  message,
  viewUrl,
  expiresAt,
  locale = 'en',
}: DocumentSharedEmailProps) {
  const getDocumentIcon = () => {
    switch (documentType) {
      case 'contract':
        return '📝';
      case 'invoice':
        return '💰';
      case 'proposal':
        return '📋';
      case 'questionnaire':
        return '❓';
      default:
        return '📄';
    }
  };

  return (
    <BaseEmail
      preview={`${senderName} shared a ${documentType} with you`}
      locale={locale}
    >
      <Heading className="text-2xl font-bold text-gray-900 mb-4">
        Document Shared
      </Heading>
      <Text className="text-gray-700 mb-4">
        Dear {recipientName},
      </Text>
      <Text className="text-gray-700 mb-4">
        {senderName} has shared a document with you.
      </Text>
      <Section className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text className="text-2xl mb-2">{getDocumentIcon()}</Text>
        <Text className="text-lg font-semibold text-gray-900 mb-1">
          {documentName}
        </Text>
        <Text className="text-gray-600 capitalize">
          Type: {documentType}
        </Text>
        {expiresAt && (
          <Text className="text-amber-600 text-sm mt-2">
            This link expires on {expiresAt}
          </Text>
        )}
      </Section>
      {message && (
        <Section className="bg-blue-50 p-4 rounded-lg mb-4">
          <Text className="text-gray-700 italic">
            &quot;{message}&quot;
          </Text>
          <Text className="text-gray-500 text-sm mt-2">
            - {senderName}
          </Text>
        </Section>
      )}
      <Section className="text-center">
        <Link
          href={viewUrl}
          className="bg-gold-500 text-white px-6 py-3 rounded-full inline-block font-semibold"
        >
          View Document
        </Link>
      </Section>
    </BaseEmail>
  );
}
