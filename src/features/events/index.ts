/**
 * Events Feature Pocket
 *
 * @description Event planning, scheduling, and logistics management
 * @owner Events Team
 * @stability stable
 *
 * ## Capabilities
 * - Wedding events management
 * - Timeline & scheduling
 * - Hotel accommodations booking
 * - Google Calendar & iCal sync
 * - Gift registry management
 * - Vendor management & contracts
 *
 * ## External Dependencies
 * - Supabase: events, timeline, hotels, gifts, vendors tables
 * - Google Calendar API: Calendar sync
 * - Clients feature: Client relationship
 *
 * ## Database Tables
 * - events (primary)
 * - timeline (primary)
 * - hotels (primary)
 * - gifts (primary)
 * - vendors (primary)
 * - clients (relationship)
 *
 * ## Real-time Updates
 * - Timeline conflicts detection
 * - Hotel availability updates
 * - Vendor status changes
 *
 * ## Rate Limits
 * - Read: 1000/min per company
 * - Write: 100/min per company
 * - Calendar sync: 100/day per client (Google API)
 *
 * ## Scalability Notes
 * High-traffic pocket - consider caching for timeline queries
 * Real-time updates via Supabase Realtime
 */

export * from './server/routers';
