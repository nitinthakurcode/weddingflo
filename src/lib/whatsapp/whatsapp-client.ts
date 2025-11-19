import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+14155238886

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials');
}

export const twilioWhatsAppClient = twilio(accountSid, authToken);

export interface WhatsAppMessage {
  to: string; // Format: whatsapp:+1234567890
  body: string;
  mediaUrl?: string[];
  from?: string; // Default to env var if not provided
}

export interface WhatsAppTemplateMessage {
  to: string;
  contentSid: string; // Twilio Content Template SID
  contentVariables?: Record<string, string>;
  from?: string;
}

/**
 * Send a WhatsApp message
 * @param message Message details
 * @returns Twilio message response
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  try {
    if (!whatsappNumber) {
      throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
    }

    // Ensure 'to' number has whatsapp: prefix
    const toNumber = message.to.startsWith('whatsapp:')
      ? message.to
      : `whatsapp:${message.to}`;

    const fromNumber = message.from || whatsappNumber;

    const twilioMessage = await twilioWhatsAppClient.messages.create({
      body: message.body,
      from: fromNumber,
      to: toNumber,
      ...(message.mediaUrl && { mediaUrl: message.mediaUrl }),
    });

    return {
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      from: twilioMessage.from,
      body: twilioMessage.body,
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
      code: error.code,
    };
  }
}

/**
 * Send a WhatsApp template message (for approved templates)
 * @param message Template message details
 * @returns Twilio message response
 */
export async function sendWhatsAppTemplateMessage(message: WhatsAppTemplateMessage) {
  try {
    if (!whatsappNumber) {
      throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
    }

    // Ensure 'to' number has whatsapp: prefix
    const toNumber = message.to.startsWith('whatsapp:')
      ? message.to
      : `whatsapp:${message.to}`;

    const fromNumber = message.from || whatsappNumber;

    const twilioMessage = await twilioWhatsAppClient.messages.create({
      contentSid: message.contentSid,
      from: fromNumber,
      to: toNumber,
      ...(message.contentVariables && {
        contentVariables: JSON.stringify(message.contentVariables)
      }),
    });

    return {
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      from: twilioMessage.from,
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp template message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp template message',
      code: error.code,
    };
  }
}

/**
 * Format phone number for WhatsApp (add whatsapp: prefix)
 * @param phoneNumber Phone number with country code
 * @returns Formatted WhatsApp number
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove any existing whatsapp: prefix
  const cleanNumber = phoneNumber.replace('whatsapp:', '');

  // Ensure it starts with +
  const numberWithPlus = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

  return `whatsapp:${numberWithPlus}`;
}

/**
 * Validate WhatsApp number format
 * @param phoneNumber Phone number to validate
 * @returns True if valid format
 */
export function isValidWhatsAppNumber(phoneNumber: string): boolean {
  // Remove whatsapp: prefix if present
  const cleanNumber = phoneNumber.replace('whatsapp:', '');

  // Must start with + and have 10-15 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(cleanNumber);
}
