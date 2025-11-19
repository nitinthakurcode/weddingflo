/**
 * Guests Feature Pocket
 *
 * @description Guest management, check-in, and real-time messaging
 * @owner Guest Experience Team
 * @stability stable
 *
 * ## Capabilities
 * - Guest CRUD operations
 * - RSVP tracking
 * - QR code generation & scanning
 * - Guest check-in system
 * - Real-time messaging (client ↔ guests)
 * - Guest portal access
 *
 * ## External Dependencies
 * - Supabase: guests, messages, qr_tokens tables
 * - QR Code libraries: qrcode, html5-qrcode
 * - Clients feature: Client relationship
 *
 * ## Database Tables
 * - guests (primary)
 * - messages (primary)
 * - qr_tokens (primary)
 * - clients (relationship)
 *
 * ## Real-time Features
 * - Live message updates (Supabase Realtime)
 * - Check-in status updates
 * - RSVP notifications
 *
 * ## User-Facing
 * This pocket powers the guest portal - highest traffic pocket
 * Expect 100-1000x more reads than other features during events
 *
 * ## Rate Limits
 * - Read: 5000/min per event (high traffic during check-in)
 * - Write: 500/min per event
 * - QR generation: 1000/day per client
 *
 * ## Scalability Notes
 * Critical for user experience - consider CDN for QR codes
 * Database read replicas recommended for large events (>500 guests)
 */

export * from './server/routers';
