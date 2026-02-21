/**
 * Events Feature - tRPC Routers
 *
 * Business Domain: Event Planning & Logistics
 * Routers:
 * - events: Wedding events management
 * - timeline: Event timeline & scheduling
 * - hotels: Hotel accommodations
 * - calendar: Google Calendar & iCal sync
 * - gifts: Gift registry management
 * - giftsEnhanced: Enhanced gift tracking with thank you notes
 * - guestGifts: Gifts to be given to guests (party favors, welcome bags)
 * - guestTransport: Guest travel/transport logistics
 * - vendors: Vendor management
 * - floorPlans: Interactive floor plans with drag-and-drop seating
 * - eventFlow: Event flow/schedule tracking
 *
 * Dependencies:
 * - Drizzle ORM (December 2025 migration)
 * - Google Calendar API
 * - Clients feature (relationship)
 */

export { eventsRouter } from './events.router';
export { timelineRouter } from './timeline.router';
export { hotelsRouter } from './hotels.router';
export { calendarRouter } from './calendar.router';
export { giftsRouter } from './gifts.router';
export { giftsEnhancedRouter } from './gifts-enhanced.router';
export { guestGiftsRouter } from './guest-gifts.router';
export { guestTransportRouter } from './guest-transport.router';
export { giftTypesRouter } from './gift-types.router';
export { vendorsRouter } from './vendors.router';
export { floorPlansRouter } from './floor-plans.router';
export { eventFlowRouter } from './event-flow.router';
export { accommodationsRouter } from './accommodations.router';
export { timelineTemplatesRouter } from './timeline-templates.router';
