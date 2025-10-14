import twilio from 'twilio';

// Check if Twilio is configured
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const isTwilioConfigured = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);

// Initialize Twilio client if configured
const twilioClient = isTwilioConfigured
  ? twilio(twilioAccountSid, twilioAuthToken)
  : null;

/**
 * Send SMS using Twilio
 */
export async function sendSMS({
  to,
  message,
  from = twilioPhoneNumber,
}: {
  to: string;
  message: string;
  from?: string;
}) {
  if (!twilioClient || !from) {
    return {
      success: false,
      error: 'Twilio is not configured. Please check your environment variables.',
      data: null,
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from,
      to,
    });

    return {
      success: true,
      data: {
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
      },
      error: null,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSMS(
  messages: Array<{ to: string; message: string }>
) {
  if (!twilioClient) {
    return {
      total: messages.length,
      successful: 0,
      failed: messages.length,
      error: 'Twilio is not configured',
    };
  }

  const results = await Promise.allSettled(
    messages.map((msg) => sendSMS(msg))
  );

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;
  const failed = results.length - successful;

  return {
    total: messages.length,
    successful,
    failed,
    results,
  };
}

/**
 * Format phone number for Twilio (E.164 format)
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Add country code if not present
  if (!cleaned.startsWith('1') && countryCode === '+1') {
    return `+1${cleaned}`;
  }

  if (!cleaned.startsWith('+')) {
    return `${countryCode}${cleaned}`;
  }

  return cleaned;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][subscriber number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Check if Twilio is configured
 */
export function isTwilioEnabled(): boolean {
  return isTwilioConfigured;
}

/**
 * Get Twilio configuration status
 */
export function getTwilioStatus() {
  return {
    configured: isTwilioConfigured,
    accountSid: twilioAccountSid ? `${twilioAccountSid.slice(0, 8)}...` : null,
    phoneNumber: twilioPhoneNumber,
  };
}
