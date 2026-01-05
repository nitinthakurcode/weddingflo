import { Heading, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface VendorCommunicationEmailProps {
  recipientName: string;
  senderName: string;
  senderRole: string;
  subject: string;
  message: string;
  eventName?: string;
  eventDate?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  locale?: string;
}

const TRANSLATIONS = {
  en: {
    greeting: (name: string) => `Hello ${name},`,
    from: (sender: string, role: string) => `Message from ${sender} (${role})`,
    regarding: 'Regarding:',
    event: 'Event:',
    eventDate: 'Event Date:',
    priority: {
      low: 'Low Priority',
      normal: 'Normal Priority',
      high: 'High Priority',
      urgent: 'URGENT',
    },
    footer: 'This message was sent through WeddingFlo.',
  },
  es: {
    greeting: (name: string) => `Hola ${name},`,
    from: (sender: string, role: string) => `Mensaje de ${sender} (${role})`,
    regarding: 'Acerca de:',
    event: 'Evento:',
    eventDate: 'Fecha del Evento:',
    priority: {
      low: 'Prioridad Baja',
      normal: 'Prioridad Normal',
      high: 'Prioridad Alta',
      urgent: 'URGENTE',
    },
    footer: 'Este mensaje fue enviado a través de WeddingFlo.',
  },
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    from: (sender: string, role: string) => `Message de ${sender} (${role})`,
    regarding: 'Concernant:',
    event: 'Événement:',
    eventDate: "Date de l'Événement:",
    priority: {
      low: 'Priorité Basse',
      normal: 'Priorité Normale',
      high: 'Priorité Haute',
      urgent: 'URGENT',
    },
    footer: 'Ce message a été envoyé via WeddingFlo.',
  },
  de: {
    greeting: (name: string) => `Hallo ${name},`,
    from: (sender: string, role: string) => `Nachricht von ${sender} (${role})`,
    regarding: 'Betreffend:',
    event: 'Veranstaltung:',
    eventDate: 'Veranstaltungsdatum:',
    priority: {
      low: 'Niedrige Priorität',
      normal: 'Normale Priorität',
      high: 'Hohe Priorität',
      urgent: 'DRINGEND',
    },
    footer: 'Diese Nachricht wurde über WeddingFlo gesendet.',
  },
  ja: {
    greeting: (name: string) => `${name}様`,
    from: (sender: string, role: string) => `${sender}（${role}）からのメッセージ`,
    regarding: '件名：',
    event: 'イベント：',
    eventDate: 'イベント日：',
    priority: {
      low: '優先度：低',
      normal: '優先度：通常',
      high: '優先度：高',
      urgent: '緊急',
    },
    footer: 'このメッセージはWeddingFloを通じて送信されました。',
  },
  zh: {
    greeting: (name: string) => `你好${name}，`,
    from: (sender: string, role: string) => `来自${sender}（${role}）的消息`,
    regarding: '关于：',
    event: '活动：',
    eventDate: '活动日期：',
    priority: {
      low: '低优先级',
      normal: '正常优先级',
      high: '高优先级',
      urgent: '紧急',
    },
    footer: '此消息通过WeddingFlo发送。',
  },
  hi: {
    greeting: (name: string) => `नमस्ते ${name},`,
    from: (sender: string, role: string) => `${sender} (${role}) से संदेश`,
    regarding: 'विषय:',
    event: 'कार्यक्रम:',
    eventDate: 'कार्यक्रम तिथि:',
    priority: {
      low: 'कम प्राथमिकता',
      normal: 'सामान्य प्राथमिकता',
      high: 'उच्च प्राथमिकता',
      urgent: 'तत्काल',
    },
    footer: 'यह संदेश WeddingFlo के माध्यम से भेजा गया था।',
  },
};

/**
 * Email priority colors using WeddingFlo design tokens
 * Note: Email clients don't support CSS variables
 */
const PRIORITY_COLORS = {
  low: '#B8A089',     // mocha-400 (neutral)
  normal: '#14B8A6',  // teal-500 (primary)
  high: '#D4A853',    // gold-500 (warning)
  urgent: '#E11D48',  // rose-500 (danger)
};

const PRIORITY_BG_COLORS = {
  low: '#F5F0EB',     // mocha-50
  normal: '#F0FDFA',  // teal-50
  high: '#FFFEF7',    // gold-50
  urgent: '#FFF5F6',  // rose-50
};

export function VendorCommunicationEmail({
  recipientName,
  senderName,
  senderRole,
  subject,
  message,
  eventName,
  eventDate,
  priority = 'normal',
  locale = 'en',
}: VendorCommunicationEmailProps) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  const priorityColor = PRIORITY_COLORS[priority];
  const priorityBgColor = PRIORITY_BG_COLORS[priority];

  return (
    <BaseEmail preview={subject} locale={locale}>
      <Heading style={h1}>{t.greeting(recipientName)}</Heading>

      <Text style={fromText}>{t.from(senderName, senderRole)}</Text>

      {(eventName || eventDate) && (
        <div style={eventCard}>
          {eventName && (
            <Text style={eventDetail}>
              <strong>{t.event}</strong> {eventName}
            </Text>
          )}
          {eventDate && (
            <Text style={eventDetail}>
              <strong>{t.eventDate}</strong> {eventDate}
            </Text>
          )}
        </div>
      )}

      <Hr style={divider} />

      <div style={priorityBadge(priorityColor, priorityBgColor)}>
        <Text style={priorityText}>{t.priority[priority]}</Text>
      </div>

      <Heading style={h2}>
        {t.regarding} {subject}
      </Heading>

      <div style={messageCard(priorityColor)}>
        <Text style={messageText}>{message}</Text>
      </div>

      <Text style={footerNote}>{t.footer}</Text>
    </BaseEmail>
  );
}

/**
 * Email styles using WeddingFlo design token colors
 * Note: Email clients don't support CSS variables
 */
const EMAIL_COLORS = {
  text: '#3D3027',          // mocha-900
  textSecondary: '#6B5D4F', // mocha-700
  textMuted: '#8B7355',     // mocha-500
  background: '#F6F9F4',    // sage-50
  border: '#D4C4B5',        // mocha-200
} as const;

const h1 = {
  color: EMAIL_COLORS.text,
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 16px',
};

const fromText = {
  color: EMAIL_COLORS.textMuted,
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 16px',
  fontWeight: '500',
};

const eventCard = {
  backgroundColor: EMAIL_COLORS.background,
  borderRadius: '6px',
  padding: '16px',
  margin: '0 0 16px',
  border: `1px solid ${EMAIL_COLORS.border}`,
};

const eventDetail = {
  color: EMAIL_COLORS.textSecondary,
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const divider = {
  borderColor: EMAIL_COLORS.border,
  margin: '16px 0',
};

const priorityBadge = (color: string, bgColor: string) => ({
  backgroundColor: bgColor,
  borderRadius: '6px',
  padding: '8px 12px',
  margin: '0 0 16px',
  border: `2px solid ${color}`,
  display: 'inline-block',
});

const priorityText = {
  color: EMAIL_COLORS.text,
  fontSize: '12px',
  fontWeight: '700',
  lineHeight: '16px',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const h2 = {
  color: EMAIL_COLORS.text,
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '0 0 16px',
};

const messageCard = (borderColor: string) => ({
  backgroundColor: EMAIL_COLORS.background,
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 24px',
  border: `1px solid ${EMAIL_COLORS.border}`,
  borderLeft: `4px solid ${borderColor}`,
});

const messageText = {
  color: EMAIL_COLORS.textSecondary,
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const footerNote = {
  color: EMAIL_COLORS.textMuted,
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
};
