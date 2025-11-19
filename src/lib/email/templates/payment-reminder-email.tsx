import { Button, Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface PaymentReminderEmailProps {
  clientName: string;
  amount: string;
  dueDate: string;
  description: string;
  paymentLink: string;
  locale?: string;
}

const TRANSLATIONS = {
  en: {
    greeting: (name: string) => `Hello ${name},`,
    subject: 'Payment Reminder',
    message: 'This is a friendly reminder about an upcoming payment.',
    amount: (amt: string) => `Amount Due: ${amt}`,
    due: (date: string) => `Due Date: ${date}`,
    description: 'Description:',
    cta: 'Make Payment',
    footer: 'If you have already made this payment, please disregard this email.',
  },
  es: {
    greeting: (name: string) => `Hola ${name},`,
    subject: 'Recordatorio de Pago',
    message: 'Este es un recordatorio amistoso sobre un pago próximo.',
    amount: (amt: string) => `Monto a Pagar: ${amt}`,
    due: (date: string) => `Fecha de Vencimiento: ${date}`,
    description: 'Descripción:',
    cta: 'Realizar Pago',
    footer: 'Si ya realizó este pago, ignore este correo.',
  },
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    subject: 'Rappel de Paiement',
    message: 'Ceci est un rappel amical concernant un paiement à venir.',
    amount: (amt: string) => `Montant Dû: ${amt}`,
    due: (date: string) => `Date d'Échéance: ${date}`,
    description: 'Description:',
    cta: 'Effectuer le Paiement',
    footer: 'Si vous avez déjà effectué ce paiement, veuillez ignorer cet email.',
  },
  de: {
    greeting: (name: string) => `Hallo ${name},`,
    subject: 'Zahlungserinnerung',
    message: 'Dies ist eine freundliche Erinnerung an eine bevorstehende Zahlung.',
    amount: (amt: string) => `Fälliger Betrag: ${amt}`,
    due: (date: string) => `Fälligkeitsdatum: ${date}`,
    description: 'Beschreibung:',
    cta: 'Zahlung Leisten',
    footer: 'Wenn Sie diese Zahlung bereits geleistet haben, ignorieren Sie bitte diese E-Mail.',
  },
  ja: {
    greeting: (name: string) => `${name}様`,
    subject: '支払いリマインダー',
    message: '今後の支払いに関する親切なリマインダーです。',
    amount: (amt: string) => `支払額：${amt}`,
    due: (date: string) => `期限：${date}`,
    description: '説明：',
    cta: '支払いを行う',
    footer: 'この支払いを既に行った場合は、このメールを無視してください。',
  },
  zh: {
    greeting: (name: string) => `你好${name}，`,
    subject: '付款提醒',
    message: '这是关于即将到来的付款的友好提醒。',
    amount: (amt: string) => `应付金额：${amt}`,
    due: (date: string) => `到期日期：${date}`,
    description: '描述：',
    cta: '进行付款',
    footer: '如果您已经完成此付款，请忽略此邮件。',
  },
  hi: {
    greeting: (name: string) => `नमस्ते ${name},`,
    subject: 'भुगतान अनुस्मारक',
    message: 'यह आगामी भुगतान के बारे में एक मैत्रीपूर्ण अनुस्मारक है।',
    amount: (amt: string) => `देय राशि: ${amt}`,
    due: (date: string) => `नियत तारीख: ${date}`,
    description: 'विवरण:',
    cta: 'भुगतान करें',
    footer: 'यदि आपने पहले ही यह भुगतान कर दिया है, तो कृपया इस ईमेल को अनदेखा करें।',
  },
};

export function PaymentReminderEmail({
  clientName,
  amount,
  dueDate,
  description,
  paymentLink,
  locale = 'en',
}: PaymentReminderEmailProps) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  return (
    <BaseEmail preview={t.subject} locale={locale}>
      <Heading style={h1}>{t.greeting(clientName)}</Heading>
      <Heading style={h2}>{t.subject}</Heading>
      <Text style={text}>{t.message}</Text>

      <div style={paymentCard}>
        <Text style={amountText}>{t.amount(amount)}</Text>
        <Text style={dueText}>{t.due(dueDate)}</Text>
        <Text style={descLabel}>{t.description}</Text>
        <Text style={descText}>{description}</Text>
      </div>

      <Button href={paymentLink} style={button}>
        {t.cta}
      </Button>

      <Text style={footerNote}>{t.footer}</Text>
    </BaseEmail>
  );
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 8px',
};

const h2 = {
  color: '#6366f1',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '0 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const paymentCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  border: '1px solid #e5e7eb',
};

const amountText = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '32px',
  margin: '0 0 12px',
};

const dueText = {
  color: '#ef4444',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const descLabel = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 4px',
  fontWeight: '600',
};

const descText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic',
};
