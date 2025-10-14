import {
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './layout';

interface ThankYouEmailProps {
  guestName: string;
  giftDescription?: string;
  personalMessage?: string;
  coupleName?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function ThankYouEmail({
  guestName,
  giftDescription,
  personalMessage,
  coupleName = 'the happy couple',
  companyName,
  companyLogo,
  primaryColor = '#3b82f6',
}: ThankYouEmailProps) {
  const preview = `Thank you for your thoughtful gift!`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyLogo={companyLogo}
      primaryColor={primaryColor}
    >
      <Heading style={h1}>Thank You! 💝</Heading>

      <Text style={text}>Dear {guestName},</Text>

      <Text style={text}>
        We wanted to take a moment to express our heartfelt gratitude for your
        presence at our special day and for your generous gift.
      </Text>

      {giftDescription && (
        <Section style={giftCard}>
          <Text style={giftLabel}>Your Thoughtful Gift:</Text>
          <Text style={giftText}>{giftDescription}</Text>
        </Section>
      )}

      {personalMessage ? (
        <Section style={messageCard}>
          <Text style={messageText}>{personalMessage}</Text>
        </Section>
      ) : (
        <>
          <Text style={text}>
            Your thoughtfulness and generosity mean the world to us. We are so
            grateful to have shared our special day with you, and your gift will
            be cherished as we begin this new chapter together.
          </Text>

          <Text style={text}>
            Thank you for being such an important part of our lives and for
            making our wedding day even more memorable.
          </Text>
        </>
      )}

      <Hr style={hr} />

      <Text style={signature}>
        With love and appreciation,
        <br />
        {coupleName}
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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const giftCard = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const giftLabel = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
};

const giftText = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const messageCard = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const messageText = {
  color: '#1e3a8a',
  fontSize: '16px',
  lineHeight: '24px',
  fontStyle: 'italic',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const signature = {
  color: '#1f2937',
  fontSize: '18px',
  lineHeight: '28px',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  margin: '24px 0',
};

export default ThankYouEmail;
