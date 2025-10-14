/**
 * QR Code Generation utilities
 * Handles QR code data generation and URL creation
 */

import { generateGuestQRToken, type EncryptedQRData } from './qr-encryptor';

export interface QRCodeData {
  url: string;
  token: string;
  expiresAt: number;
  guestId: string;
  weddingId: string;
  type: 'check-in' | 'rsvp' | 'gift-registry';
}

/**
 * Generate QR code data for a guest
 */
export function generateGuestQRCode(
  guestId: string,
  weddingId: string,
  baseUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com',
  type: 'check-in' | 'rsvp' | 'gift-registry' = 'check-in',
  expiryHours: number = 24 * 365
): QRCodeData {
  const encryptedData = generateGuestQRToken(guestId, weddingId, type, expiryHours);

  return {
    url: `${baseUrl}/qr/${encryptedData.token}`,
    token: encryptedData.token,
    expiresAt: encryptedData.expiresAt,
    guestId,
    weddingId,
    type,
  };
}

/**
 * Generate multiple QR codes for a list of guests
 */
export function generateBulkGuestQRCodes(
  guests: Array<{ id: string; name: string }>,
  weddingId: string,
  baseUrl?: string,
  type: 'check-in' | 'rsvp' | 'gift-registry' = 'check-in',
  expiryHours: number = 24 * 365
): Array<QRCodeData & { guestName: string }> {
  return guests.map(guest => ({
    ...generateGuestQRCode(guest.id, weddingId, baseUrl, type, expiryHours),
    guestName: guest.name,
  }));
}

/**
 * Generate QR code URL for direct check-in
 */
export function generateCheckInQRCode(
  guestId: string,
  weddingId: string,
  baseUrl?: string
): QRCodeData {
  return generateGuestQRCode(guestId, weddingId, baseUrl, 'check-in');
}

/**
 * Generate QR code URL for RSVP
 */
export function generateRSVPQRCode(
  guestId: string,
  weddingId: string,
  baseUrl?: string
): QRCodeData {
  return generateGuestQRCode(guestId, weddingId, baseUrl, 'rsvp');
}

/**
 * Generate QR code URL for gift registry
 */
export function generateGiftRegistryQRCode(
  guestId: string,
  weddingId: string,
  baseUrl?: string
): QRCodeData {
  return generateGuestQRCode(guestId, weddingId, baseUrl, 'gift-registry');
}

/**
 * Parse QR code URL to extract token
 */
export function parseQRCodeURL(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const tokenIndex = pathParts.indexOf('qr') + 1;

    if (tokenIndex > 0 && tokenIndex < pathParts.length) {
      return pathParts[tokenIndex];
    }

    return null;
  } catch (error) {
    console.error('Failed to parse QR code URL:', error);
    return null;
  }
}

/**
 * Generate QR code data with custom metadata
 */
export function generateCustomQRCode(
  guestId: string,
  weddingId: string,
  metadata: Record<string, any>,
  baseUrl?: string,
  type: 'check-in' | 'rsvp' | 'gift-registry' = 'check-in',
  expiryHours: number = 24 * 365
): QRCodeData {
  return generateGuestQRCode(guestId, weddingId, baseUrl, type, expiryHours);
}
