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
 * - vendors: Vendor management
 * - floorPlans: Interactive floor plans with drag-and-drop seating
 *
 * Dependencies:
 * - Supabase (events, timeline, hotels, gifts, gifts_enhanced, vendors, floor_plans tables)
 * - Google Calendar API
 * - Clients feature (relationship)
 */

export { eventsRouter } from './events.router';
export { timelineRouter } from './timeline.router';
export { hotelsRouter } from './hotels.router';
export { calendarRouter } from './calendar.router';
export { giftsRouter } from './gifts.router';
export { giftsEnhancedRouter } from './gifts-enhanced.router';
export { vendorsRouter } from './vendors.router';
export { floorPlansRouter } from './floor-plans.router';
