import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email subject lines in all 7 languages
export const EMAIL_SUBJECTS = {
  clientInvite: {
    en: "You've been invited to WeddingFlow Pro",
    es: 'Has sido invitado a WeddingFlow Pro',
    fr: "Vous avez été invité à WeddingFlow Pro",
    de: 'Sie wurden zu WeddingFlow Pro eingeladen',
    ja: 'WeddingFlow Proに招待されました',
    zh: '您已被邀请加入WeddingFlow Pro',
    hi: 'आपको WeddingFlow Pro में आमंत्रित किया गया है',
  },
  weddingReminder: {
    en: 'Wedding Reminder: {days} days to go',
    es: 'Recordatorio de boda: faltan {days} días',
    fr: 'Rappel de mariage: {days} jours restants',
    de: 'Hochzeitserinnerung: noch {days} Tage',
    ja: '結婚式のリマインダー：あと{days}日',
    zh: '婚礼提醒：还有{days}天',
    hi: 'शादी की याद दिलाना: {days} दिन शेष',
  },
  rsvpConfirmation: {
    en: 'RSVP Confirmation - Thank you!',
    es: 'Confirmación de RSVP - ¡Gracias!',
    fr: 'Confirmation RSVP - Merci!',
    de: 'RSVP-Bestätigung - Danke!',
    ja: 'RSVP確認 - ありがとうございます！',
    zh: 'RSVP确认 - 谢谢！',
    hi: 'RSVP पुष्टि - धन्यवाद!',
  },
  paymentReminder: {
    en: 'Payment Reminder: {amount} due',
    es: 'Recordatorio de pago: {amount} pendiente',
    fr: 'Rappel de paiement: {amount} dû',
    de: 'Zahlungserinnerung: {amount} fällig',
    ja: '支払いリマインダー：{amount}期限',
    zh: '付款提醒：应付{amount}',
    hi: 'भुगतान अनुस्मारक: {amount} बकाया',
  },
  paymentReceipt: {
    en: 'Payment Receipt - {amount} received',
    es: 'Recibo de pago - {amount} recibido',
    fr: 'Reçu de paiement - {amount} reçu',
    de: 'Zahlungsbeleg - {amount} erhalten',
    ja: '支払い領収書 - {amount}受領',
    zh: '付款收据 - 已收到{amount}',
    hi: 'भुगतान रसीद - {amount} प्राप्त',
  },
  vendorCommunication: {
    en: 'Message from your wedding planner',
    es: 'Mensaje de tu organizador de bodas',
    fr: 'Message de votre organisateur de mariage',
    de: 'Nachricht von Ihrem Hochzeitsplaner',
    ja: 'ウェディングプランナーからのメッセージ',
    zh: '来自您的婚礼策划师的消息',
    hi: 'आपके शादी के योजनाकार से संदेश',
  },
} as const;

export type EmailType = keyof typeof EMAIL_SUBJECTS;
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi';

// Helper to get subject with variable replacement
export function getEmailSubject(
  emailType: EmailType,
  locale: Locale = 'en',
  variables: Record<string, string> = {}
): string {
  let subject: string = EMAIL_SUBJECTS[emailType][locale];

  // Replace variables like {days}, {amount}
  Object.entries(variables).forEach(([key, value]) => {
    subject = subject.replace(`{${key}}`, value);
  });

  return subject;
}

// Base send email function
export async function sendEmail({
  to,
  subject,
  html,
  from = 'WeddingFlow Pro <noreply@weddingflow.com>',
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error };
  }
}

// Helper to format email address with name
export function formatEmailAddress(email: string, name?: string): string {
  return name ? `${name} <${email}>` : email;
}
