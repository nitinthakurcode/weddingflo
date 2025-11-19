/**
 * Guests Feature - tRPC Routers
 *
 * Business Domain: Guest Management & Communication
 * Routers:
 * - guests: Guest list management, RSVP tracking
 * - qr: QR code generation for check-in
 * - messages: Guest messaging system
 * - websites: Wedding guest websites with custom domains
 *
 * Dependencies:
 * - Supabase (guests, messages, wedding_websites tables)
 * - Clients feature (relationship)
 * - QR generation library
 * - bcryptjs (password protection)
 */

export { guestsRouter } from './guests.router';
export { qrRouter } from './qr.router';
export { messagesRouter } from './messages.router';
export { websitesRouter } from './websites.router';
