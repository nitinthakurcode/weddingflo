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
    copyright: '© 2025 WeddingFlow Pro. All rights reserved.',
    unsubscribe: 'Unsubscribe from these emails',
    contact: 'Contact us',
  },
  es: {
    copyright: '© 2025 WeddingFlow Pro. Todos los derechos reservados.',
    unsubscribe: 'Darse de baja de estos correos',
    contact: 'Contáctenos',
  },
  fr: {
    copyright: '© 2025 WeddingFlow Pro. Tous droits réservés.',
    unsubscribe: 'Se désabonner de ces emails',
    contact: 'Nous contacter',
  },
  de: {
    copyright: '© 2025 WeddingFlow Pro. Alle Rechte vorbehalten.',
    unsubscribe: 'Von diesen E-Mails abmelden',
    contact: 'Kontaktieren Sie uns',
  },
  ja: {
    copyright: '© 2025 WeddingFlow Pro. 無断転載禁止。',
    unsubscribe: 'これらのメールの配信を停止',
    contact: 'お問い合わせ',
  },
  zh: {
    copyright: '© 2025 WeddingFlow Pro. 保留所有权利。',
    unsubscribe: '取消订阅这些邮件',
    contact: '联系我们',
  },
  hi: {
    copyright: '© 2025 WeddingFlow Pro. सर्वाधिकार सुरक्षित।',
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
            <Heading style={heading}>WeddingFlow Pro</Heading>
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

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#6366f1',
};

const heading = {
  color: '#ffffff',
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
  backgroundColor: '#f6f9fc',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
};

const footerLinks = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '0',
};

const link = {
  color: '#6366f1',
  textDecoration: 'none',
};
