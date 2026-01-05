/**
 * QR Code Encryption/Decryption utilities
 * Generates secure, time-limited tokens for QR codes
 */

export type QRCodeType = 'check-in' | 'rsvp' | 'guest-form' | 'gift-registry';

export interface QRToken {
  guestId: string;
  weddingId: string;
  type: QRCodeType;
  expiresAt: number;
  issuedAt: number;
  metadata?: Record<string, any>;
}

export interface EncryptedQRData {
  token: string;
  expiresAt: number;
}

/**
 * Simple encryption using base64 encoding with signature
 * In production, consider using a proper encryption library like crypto-js
 */
export function encryptQRToken(data: QRToken, secret: string = 'wedding-flow-secret'): EncryptedQRData {
  const payload = JSON.stringify(data);
  const signature = createSignature(payload, secret);

  // Use URL-safe base64 encoding
  const token = btoa(`${payload}.${signature}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    token,
    expiresAt: data.expiresAt,
  };
}

/**
 * Decrypt and verify QR token
 */
export function decryptQRToken(token: string, secret: string = 'wedding-flow-secret'): QRToken | null {
  try {
    // Convert URL-safe base64 back to standard base64
    let base64Token = token
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add back padding if needed
    while (base64Token.length % 4) {
      base64Token += '=';
    }

    const decoded = atob(base64Token);
    const [payload, signature] = decoded.split('.');

    // Verify signature
    const expectedSignature = createSignature(payload, secret);
    if (signature !== expectedSignature) {
      console.error('Invalid token signature');
      return null;
    }

    const data: QRToken = JSON.parse(payload);

    // Check expiration
    if (data.expiresAt < Date.now()) {
      console.error('Token has expired');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
}

/**
 * Create a simple signature for the payload
 */
function createSignature(payload: string, secret: string): string {
  // Simple hash using JavaScript's built-in capabilities
  // In production, use a proper HMAC implementation
  const combined = `${payload}${secret}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Generate a QR token for a guest
 */
export function generateGuestQRToken(
  guestId: string,
  weddingId: string,
  type: QRCodeType = 'check-in',
  expiryHours: number = 24 * 365, // Default: 1 year
  metadata?: Record<string, any>
): EncryptedQRData {
  const now = Date.now();
  const token: QRToken = {
    guestId,
    weddingId,
    type,
    issuedAt: now,
    expiresAt: now + (expiryHours * 60 * 60 * 1000),
    metadata,
  };

  return encryptQRToken(token);
}

/**
 * Verify if a token is valid
 */
export function isTokenValid(token: string): boolean {
  const decoded = decryptQRToken(token);
  return decoded !== null;
}

/**
 * Get token expiry status
 */
export function getTokenExpiry(token: string): { isValid: boolean; expiresAt: number; timeRemaining: number } {
  const decoded = decryptQRToken(token);

  if (!decoded) {
    return { isValid: false, expiresAt: 0, timeRemaining: 0 };
  }

  const timeRemaining = decoded.expiresAt - Date.now();

  return {
    isValid: timeRemaining > 0,
    expiresAt: decoded.expiresAt,
    timeRemaining,
  };
}
