import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
}

export function EmailLayout({
  preview,
  children,
  companyName = 'WeddingFlo',
  companyLogo,
  primaryColor = '#3b82f6',
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            {companyLogo ? (
              <Img src={companyLogo} alt={companyName} style={logo} />
            ) : (
              <Heading style={logoText}>{companyName}</Heading>
            )}
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="#" style={footerLink}>
                Unsubscribe
              </Link>{' '}
              |{' '}
              <Link href="#" style={footerLink}>
                Privacy Policy
              </Link>{' '}
              |{' '}
              <Link href="#" style={footerLink}>
                Contact Us
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
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  borderBottom: '1px solid #e5e7eb',
};

const logo = {
  height: '48px',
  width: 'auto',
};

const logoText = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '32px 24px',
};

const footer = {
  borderTop: '1px solid #e5e7eb',
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
};

const footerLink = {
  color: '#6b7280',
  textDecoration: 'underline',
};
