import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID) {
  throw new Error('TWILIO_ACCOUNT_SID is not set');
}

if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('TWILIO_AUTH_TOKEN is not set');
}

if (!process.env.TWILIO_PHONE_NUMBER) {
  throw new Error('TWILIO_PHONE_NUMBER is not set');
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// SMS message templates by locale (keep concise for SMS limits)
export const SMS_TEMPLATES = {
  weddingReminder: {
    en: (days: number, eventName: string) =>
      `Wedding Reminder: ${eventName} in ${days} ${days === 1 ? 'day' : 'days'}! 💍`,
    es: (days: number, eventName: string) =>
      `Recordatorio: ${eventName} en ${days} ${days === 1 ? 'día' : 'días'}! 💍`,
    fr: (days: number, eventName: string) =>
      `Rappel: ${eventName} dans ${days} jour${days === 1 ? '' : 's'}! 💍`,
    de: (days: number, eventName: string) =>
      `Erinnerung: ${eventName} in ${days} Tag${days === 1 ? '' : 'en'}! 💍`,
    ja: (days: number, eventName: string) =>
      `リマインダー: ${eventName}まであと${days}日! 💍`,
    zh: (days: number, eventName: string) =>
      `提醒: ${eventName}还有${days}天! 💍`,
    hi: (days: number, eventName: string) =>
      `रिमाइंडर: ${eventName} ${days} दिन में! 💍`,
  },
  rsvpConfirmation: {
    en: (guestName: string, eventName: string) =>
      `Hi ${guestName}! Your RSVP for ${eventName} is confirmed. Thank you! ✅`,
    es: (guestName: string, eventName: string) =>
      `¡Hola ${guestName}! Tu RSVP para ${eventName} está confirmado. ¡Gracias! ✅`,
    fr: (guestName: string, eventName: string) =>
      `Bonjour ${guestName}! Votre RSVP pour ${eventName} est confirmé. Merci! ✅`,
    de: (guestName: string, eventName: string) =>
      `Hallo ${guestName}! Ihr RSVP für ${eventName} ist bestätigt. Danke! ✅`,
    ja: (guestName: string, eventName: string) =>
      `${guestName}様、${eventName}のRSVPが確認されました。ありがとうございます! ✅`,
    zh: (guestName: string, eventName: string) =>
      `${guestName}您好！您的${eventName} RSVP已确认。谢谢！ ✅`,
    hi: (guestName: string, eventName: string) =>
      `नमस्ते ${guestName}! ${eventName} के लिए आपका RSVP पुष्टि हो गया है। धन्यवाद! ✅`,
  },
  paymentReminder: {
    en: (amount: string, dueDate: string) =>
      `Payment Reminder: ${amount} due on ${dueDate}. Please complete payment soon. 💳`,
    es: (amount: string, dueDate: string) =>
      `Recordatorio de Pago: ${amount} vence el ${dueDate}. Complete el pago pronto. 💳`,
    fr: (amount: string, dueDate: string) =>
      `Rappel de Paiement: ${amount} dû le ${dueDate}. Veuillez payer bientôt. 💳`,
    de: (amount: string, dueDate: string) =>
      `Zahlungserinnerung: ${amount} fällig am ${dueDate}. Bitte bald bezahlen. 💳`,
    ja: (amount: string, dueDate: string) =>
      `支払いリマインダー: ${amount}が${dueDate}期限です。お早めにお支払いください。 💳`,
    zh: (amount: string, dueDate: string) =>
      `付款提醒: ${amount}将于${dueDate}到期。请尽快付款。 💳`,
    hi: (amount: string, dueDate: string) =>
      `भुगतान रिमाइंडर: ${amount} ${dueDate} तक देय है। कृपया जल्द भुगतान करें। 💳`,
  },
  paymentReceived: {
    en: (amount: string) =>
      `Payment Received: ${amount} has been successfully processed. Thank you! ✅`,
    es: (amount: string) =>
      `Pago Recibido: ${amount} procesado exitosamente. ¡Gracias! ✅`,
    fr: (amount: string) =>
      `Paiement Reçu: ${amount} traité avec succès. Merci! ✅`,
    de: (amount: string) =>
      `Zahlung Erhalten: ${amount} erfolgreich verarbeitet. Danke! ✅`,
    ja: (amount: string) =>
      `支払い受領: ${amount}が正常に処理されました。ありがとうございます! ✅`,
    zh: (amount: string) =>
      `已收到付款: ${amount}已成功处理。谢谢！ ✅`,
    hi: (amount: string) =>
      `भुगतान प्राप्त: ${amount} सफलतापूर्वक प्रोसेस किया गया। धन्यवाद! ✅`,
  },
  vendorNotification: {
    en: (message: string) =>
      `Message from your wedding planner: ${message}`,
    es: (message: string) =>
      `Mensaje de tu organizador: ${message}`,
    fr: (message: string) =>
      `Message de votre organisateur: ${message}`,
    de: (message: string) =>
      `Nachricht von Ihrem Planer: ${message}`,
    ja: (message: string) =>
      `プランナーからのメッセージ: ${message}`,
    zh: (message: string) =>
      `策划师留言: ${message}`,
    hi: (message: string) =>
      `आपके योजनाकार का संदेश: ${message}`,
  },
  eventUpdate: {
    en: (eventName: string, update: string) =>
      `Update: ${eventName} - ${update}`,
    es: (eventName: string, update: string) =>
      `Actualización: ${eventName} - ${update}`,
    fr: (eventName: string, update: string) =>
      `Mise à jour: ${eventName} - ${update}`,
    de: (eventName: string, update: string) =>
      `Update: ${eventName} - ${update}`,
    ja: (eventName: string, update: string) =>
      `更新: ${eventName} - ${update}`,
    zh: (eventName: string, update: string) =>
      `更新: ${eventName} - ${update}`,
    hi: (eventName: string, update: string) =>
      `अपडेट: ${eventName} - ${update}`,
  },
} as const;

export type SmsTemplateType = keyof typeof SMS_TEMPLATES;
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi';

// Format phone number to E.164 format (+1234567890)
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it doesn't start with country code, assume US (+1)
  if (!digits.startsWith('1') && digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // For other country codes, assume it's already formatted
  return `+${digits}`;
}

// Validate phone number format
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Basic E.164 validation: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(formatted);
}

// Get SMS message from template
export function getSmsMessage(
  templateType: SmsTemplateType,
  locale: Locale = 'en',
  ...params: any[]
): string {
  const template = SMS_TEMPLATES[templateType][locale] as (...args: any[]) => string;
  return template(...params);
}

// Base send SMS function
export async function sendSms({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  try {
    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    const formattedTo = formatPhoneNumber(to);

    // Check message length (SMS limit is 160 characters for single message)
    if (message.length > 1600) {
      console.warn(`SMS message is ${message.length} characters (will be sent as ${Math.ceil(message.length / 160)} segments)`);
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });

    console.log('✅ SMS sent successfully:', result.sid);

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      segments: Math.ceil(message.length / 160),
    };
  } catch (error) {
    console.error('❌ SMS send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check SMS delivery status
export async function getSmsStatus(messageSid: string) {
  try {
    const message = await twilioClient.messages(messageSid).fetch();
    return {
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated,
    };
  } catch (error) {
    console.error('❌ Error fetching SMS status:', error);
    return null;
  }
}
