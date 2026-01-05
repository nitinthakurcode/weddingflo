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

interface BaseEmailProps {
  preview: string;
  children: React.ReactNode;
  locale?: string;
}

const FOOTER_TEXT = {
  en: {
    copyright: '© 2025 WeddingFlo. All rights reserved.',
    unsubscribe: 'Unsubscribe from these emails',
    contact: 'Contact us',
  },
  es: {
    copyright: '© 2025 WeddingFlo. Todos los derechos reservados.',
    unsubscribe: 'Darse de baja de estos correos',
    contact: 'Contáctenos',
  },
  fr: {
    copyright: '© 2025 WeddingFlo. Tous droits réservés.',
    unsubscribe: 'Se désabonner de ces emails',
    contact: 'Nous contacter',
  },
  de: {
    copyright: '© 2025 WeddingFlo. Alle Rechte vorbehalten.',
    unsubscribe: 'Von diesen E-Mails abmelden',
    contact: 'Kontaktieren Sie uns',
  },
  ja: {
    copyright: '© 2025 WeddingFlo. 無断転載禁止。',
    unsubscribe: 'これらのメールの配信を停止',
    contact: 'お問い合わせ',
  },
  zh: {
    copyright: '© 2025 WeddingFlo. 保留所有权利。',
    unsubscribe: '取消订阅这些邮件',
    contact: '联系我们',
  },
  hi: {
    copyright: '© 2025 WeddingFlo. सर्वाधिकार सुरक्षित।',
    unsubscribe: 'इन ईमेल से सदस्यता समाप्त करें',
    contact: 'हमसे संपर्क करें',
  },
};

export function BaseEmail({ preview, children, locale = 'en' }: BaseEmailProps) {
  const footer = FOOTER_TEXT[locale as keyof typeof FOOTER_TEXT] || FOOTER_TEXT.en;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>WeddingFlo</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>{footer.copyright}</Text>
            <Text style={footerLinks}>
              <Link href="https://weddingflow.com/contact" style={link}>
                {footer.contact}
              </Link>
              {' | '}
              <Link href="https://weddingflow.com/unsubscribe" style={link}>
                {footer.unsubscribe}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Email Template Theme Colors
 * These match the WeddingFlo design tokens in src/styles/tokens/colors.css
 * Note: Email clients don't support CSS variables, so we use static values here
 */
const EMAIL_COLORS = {
  background: '#F6F9F4',    // sage-50 (light background)
  white: '#ffffff',
  primary: '#14B8A6',       // teal-500 (primary brand)
  text: '#3D3027',          // mocha-900 (dark text)
  muted: '#8B7355',         // mocha-500 (muted text)
  border: '#D4C4B5',        // mocha-200 (borders)
} as const;

// Styles using design token colors
const main = {
  backgroundColor: EMAIL_COLORS.background,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: EMAIL_COLORS.white,
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: EMAIL_COLORS.primary,
};

const heading = {
  color: EMAIL_COLORS.white,
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '24px',
};

const footerSection = {
  padding: '24px',
  backgroundColor: EMAIL_COLORS.background,
};

const footerText = {
  color: EMAIL_COLORS.muted,
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
};

const footerLinks = {
  color: EMAIL_COLORS.muted,
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '0',
};

const link = {
  color: EMAIL_COLORS.primary,
  textDecoration: 'none',
};
