import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc, gte, lte, inArray } from 'drizzle-orm'
import { events, clients, timeline } from '@/lib/db/schema'

/**
 * Event-Type Timeline Templates
 *
 * Each event type has a predefined set of timeline items that are auto-generated
 * when the event is created. Times are relative to event start time.
 */
type TimelineTemplateItem = {
  title: string
  description: string
  offsetMinutes: number // Minutes from event start time
  durationMinutes: number
  location?: string
  phase: 'setup' | 'showtime' | 'wrapup' // Event phase segmentation
}

const eventTypeTemplates: Record<string, TimelineTemplateItem[]> = {
  wedding: [
    // Setup phase
    { title: 'Bride Getting Ready', description: 'Hair, makeup, and dress', offsetMinutes: -420, durationMinutes: 180, location: 'Bridal Suite', phase: 'setup' },
    { title: 'Groom Getting Ready', description: 'Suit and preparation', offsetMinutes: -300, durationMinutes: 120, location: 'Groom Suite', phase: 'setup' },
    { title: 'First Look (Optional)', description: 'Private moment before ceremony', offsetMinutes: -180, durationMinutes: 30, phase: 'setup' },
    { title: 'Wedding Party Photos', description: 'Bridesmaids, groomsmen, family', offsetMinutes: -150, durationMinutes: 90, phase: 'setup' },
    // Showtime phase
    { title: 'Ceremony', description: 'Exchange of vows', offsetMinutes: 0, durationMinutes: 45, phase: 'showtime' },
    { title: 'Cocktail Hour', description: 'Drinks and appetizers', offsetMinutes: 60, durationMinutes: 60, phase: 'showtime' },
    { title: 'Reception Entrance', description: 'Grand entrance announcement', offsetMinutes: 120, durationMinutes: 15, phase: 'showtime' },
    { title: 'First Dance', description: 'Couple\'s first dance', offsetMinutes: 135, durationMinutes: 5, phase: 'showtime' },
    { title: 'Dinner Service', description: 'Main meal', offsetMinutes: 150, durationMinutes: 90, phase: 'showtime' },
    { title: 'Speeches & Toasts', description: 'Best man, maid of honor, parents', offsetMinutes: 240, durationMinutes: 30, phase: 'showtime' },
    { title: 'Cake Cutting', description: 'Traditional cake cutting', offsetMinutes: 270, durationMinutes: 15, phase: 'showtime' },
    { title: 'Dancing & Party', description: 'Open dance floor', offsetMinutes: 285, durationMinutes: 135, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Last Dance & Send Off', description: 'Final dance and farewell', offsetMinutes: 420, durationMinutes: 30, phase: 'wrapup' },
  ],
  sangeet: [
    // Setup phase
    { title: 'Venue Setup & Decor Check', description: 'Verify decorations and setup', offsetMinutes: -120, durationMinutes: 60, phase: 'setup' },
    { title: 'Sound & Light Check', description: 'Technical setup verification', offsetMinutes: -60, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome guests', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Welcome & Opening', description: 'MC introduction and opening', offsetMinutes: 30, durationMinutes: 15, phase: 'showtime' },
    { title: 'Family Performances', description: 'Dance performances by family', offsetMinutes: 45, durationMinutes: 90, phase: 'showtime' },
    { title: 'Dinner Break', description: 'Buffet dinner service', offsetMinutes: 135, durationMinutes: 60, phase: 'showtime' },
    { title: 'Couple Performance', description: 'Bride & groom performance', offsetMinutes: 195, durationMinutes: 15, phase: 'showtime' },
    { title: 'Open Dance Floor', description: 'DJ and dancing', offsetMinutes: 210, durationMinutes: 90, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Event Wrap Up', description: 'Thank you and farewell', offsetMinutes: 300, durationMinutes: 15, phase: 'wrapup' },
  ],
  mehendi: [
    // Setup phase
    { title: 'Artist Setup', description: 'Mehendi artists prepare stations', offsetMinutes: -60, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome guests', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Bride Mehendi', description: 'Bridal mehendi application', offsetMinutes: 30, durationMinutes: 180, location: 'Bridal Area', phase: 'showtime' },
    { title: 'Family & Friends Mehendi', description: 'Guests get mehendi', offsetMinutes: 30, durationMinutes: 240, phase: 'showtime' },
    { title: 'Snacks & Refreshments', description: 'Light food service', offsetMinutes: 120, durationMinutes: 60, phase: 'showtime' },
    { title: 'Entertainment', description: 'Music and games', offsetMinutes: 180, durationMinutes: 90, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Wrap Up', description: 'Event conclusion', offsetMinutes: 300, durationMinutes: 30, phase: 'wrapup' },
  ],
  haldi: [
    // Setup phase
    { title: 'Setup & Preparation', description: 'Prepare haldi paste and area', offsetMinutes: -60, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome guests', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
    { title: 'Bride Haldi Ceremony', description: 'Apply haldi to bride', offsetMinutes: 15, durationMinutes: 45, location: 'Bride Side', phase: 'showtime' },
    { title: 'Groom Haldi Ceremony', description: 'Apply haldi to groom', offsetMinutes: 15, durationMinutes: 45, location: 'Groom Side', phase: 'showtime' },
    { title: 'Photos & Celebration', description: 'Fun photos and dancing', offsetMinutes: 60, durationMinutes: 60, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Lunch', description: 'Traditional lunch', offsetMinutes: 120, durationMinutes: 90, phase: 'wrapup' },
  ],
  reception: [
    // Setup phase
    { title: 'Venue Final Setup', description: 'Last-minute arrangements', offsetMinutes: -120, durationMinutes: 60, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival & Welcome', description: 'Welcome drinks and seating', offsetMinutes: 0, durationMinutes: 45, phase: 'showtime' },
    { title: 'Couple Grand Entrance', description: 'Newlyweds enter reception', offsetMinutes: 45, durationMinutes: 15, phase: 'showtime' },
    { title: 'Dinner Service', description: 'Main course dinner', offsetMinutes: 60, durationMinutes: 90, phase: 'showtime' },
    { title: 'Cake Cutting', description: 'Wedding cake ceremony', offsetMinutes: 150, durationMinutes: 15, phase: 'showtime' },
    { title: 'Toasts & Speeches', description: 'Speeches from family & friends', offsetMinutes: 165, durationMinutes: 30, phase: 'showtime' },
    { title: 'First Dance', description: 'Couple\'s dance', offsetMinutes: 195, durationMinutes: 10, phase: 'showtime' },
    { title: 'Entertainment & Dancing', description: 'DJ and open floor', offsetMinutes: 205, durationMinutes: 120, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Farewell', description: 'Send off the couple', offsetMinutes: 325, durationMinutes: 15, phase: 'wrapup' },
  ],
  rehearsal_dinner: [
    // Setup phase
    { title: 'Venue Setup', description: 'Table arrangements and decor check', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome wedding party', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Rehearsal (if applicable)', description: 'Wedding rehearsal run-through', offsetMinutes: 30, durationMinutes: 60, phase: 'showtime' },
    { title: 'Cocktails', description: 'Pre-dinner drinks', offsetMinutes: 90, durationMinutes: 30, phase: 'showtime' },
    { title: 'Dinner', description: 'Seated dinner', offsetMinutes: 120, durationMinutes: 90, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Toasts', description: 'Informal speeches', offsetMinutes: 210, durationMinutes: 30, phase: 'wrapup' },
  ],
  engagement: [
    // Setup phase
    { title: 'Venue & Stage Setup', description: 'Decorations and seating arrangement', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome guests', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Ring Ceremony', description: 'Exchange of rings', offsetMinutes: 30, durationMinutes: 30, phase: 'showtime' },
    { title: 'Photos', description: 'Couple and family photos', offsetMinutes: 60, durationMinutes: 45, phase: 'showtime' },
    { title: 'Celebration & Dancing', description: 'Music and celebration', offsetMinutes: 105, durationMinutes: 60, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Dinner', description: 'Celebration dinner', offsetMinutes: 165, durationMinutes: 90, phase: 'wrapup' },
  ],
  destination_wedding: [
    // Setup phase
    { title: 'Venue Setup & Decor', description: 'Destination venue preparation', offsetMinutes: -180, durationMinutes: 120, phase: 'setup' },
    { title: 'Bride Getting Ready', description: 'Hair, makeup, and dress', offsetMinutes: -300, durationMinutes: 180, location: 'Bridal Suite', phase: 'setup' },
    { title: 'Groom Getting Ready', description: 'Suit and preparation', offsetMinutes: -180, durationMinutes: 120, location: 'Groom Suite', phase: 'setup' },
    { title: 'Pre-ceremony Photos', description: 'Couple and wedding party photos', offsetMinutes: -60, durationMinutes: 60, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Seating', description: 'Guests take their seats', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
    { title: 'Ceremony', description: 'Wedding ceremony at destination', offsetMinutes: 15, durationMinutes: 45, phase: 'showtime' },
    { title: 'Cocktail Hour', description: 'Drinks with scenic views', offsetMinutes: 60, durationMinutes: 60, phase: 'showtime' },
    { title: 'Reception Dinner', description: 'Dinner at destination venue', offsetMinutes: 120, durationMinutes: 90, phase: 'showtime' },
    { title: 'Speeches & Toasts', description: 'Heartfelt speeches', offsetMinutes: 210, durationMinutes: 30, phase: 'showtime' },
    { title: 'First Dance', description: 'Couple\'s first dance', offsetMinutes: 240, durationMinutes: 10, phase: 'showtime' },
    { title: 'Dancing & Party', description: 'Celebration under the stars', offsetMinutes: 250, durationMinutes: 120, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Sparkler Send Off', description: 'Grand farewell', offsetMinutes: 370, durationMinutes: 15, phase: 'wrapup' },
  ],
  cocktail: [
    // Setup phase
    { title: 'Venue Setup', description: 'Bar and seating arrangement', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome drinks', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Mingling & Networking', description: 'Casual socializing', offsetMinutes: 30, durationMinutes: 60, phase: 'showtime' },
    { title: 'Appetizers Service', description: 'Passed hors d\'oeuvres', offsetMinutes: 30, durationMinutes: 90, phase: 'showtime' },
    { title: 'Toasts', description: 'Brief speeches', offsetMinutes: 90, durationMinutes: 15, phase: 'showtime' },
    { title: 'Continued Celebration', description: 'Music and conversation', offsetMinutes: 105, durationMinutes: 75, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Event Close', description: 'Thank guests and farewell', offsetMinutes: 180, durationMinutes: 15, phase: 'wrapup' },
  ],
  welcome_dinner: [
    // Setup phase
    { title: 'Venue Preparation', description: 'Table settings and decor', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome and seating', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Welcome Speech', description: 'Hosts welcome guests', offsetMinutes: 30, durationMinutes: 15, phase: 'showtime' },
    { title: 'Dinner Service', description: 'Multi-course dinner', offsetMinutes: 45, durationMinutes: 90, phase: 'showtime' },
    { title: 'Casual Mingling', description: 'Guests get to know each other', offsetMinutes: 135, durationMinutes: 45, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Farewell', description: 'Thank guests for coming', offsetMinutes: 180, durationMinutes: 15, phase: 'wrapup' },
  ],
  brunch: [
    // Setup phase
    { title: 'Venue Setup', description: 'Buffet and table setup', offsetMinutes: -45, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Guest Arrival', description: 'Welcome with mimosas', offsetMinutes: 0, durationMinutes: 20, phase: 'showtime' },
    { title: 'Brunch Buffet Opens', description: 'Guests serve themselves', offsetMinutes: 20, durationMinutes: 60, phase: 'showtime' },
    { title: 'Casual Toasts', description: 'Informal well wishes', offsetMinutes: 60, durationMinutes: 15, phase: 'showtime' },
    { title: 'Dessert & Coffee', description: 'Sweet treats and caffeine', offsetMinutes: 75, durationMinutes: 30, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Farewell', description: 'Guests depart', offsetMinutes: 105, durationMinutes: 15, phase: 'wrapup' },
  ],
  bachelor_party: [
    // Setup phase
    { title: 'Venue/Transport Ready', description: 'Prepare for the party', offsetMinutes: -30, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Group Assembly', description: 'Everyone arrives', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Activity 1', description: 'First planned activity', offsetMinutes: 30, durationMinutes: 120, phase: 'showtime' },
    { title: 'Dinner', description: 'Group dinner', offsetMinutes: 150, durationMinutes: 90, phase: 'showtime' },
    { title: 'Evening Entertainment', description: 'Night out activities', offsetMinutes: 240, durationMinutes: 180, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Night Ends', description: 'Safe transport home', offsetMinutes: 420, durationMinutes: 30, phase: 'wrapup' },
  ],
  bachelorette_party: [
    // Setup phase
    { title: 'Venue/Transport Ready', description: 'Prepare for the celebration', offsetMinutes: -30, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Group Assembly', description: 'Bridesmaids arrive', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Spa/Activity', description: 'Relaxation or fun activity', offsetMinutes: 30, durationMinutes: 120, phase: 'showtime' },
    { title: 'Getting Ready Together', description: 'Hair and makeup', offsetMinutes: 150, durationMinutes: 60, phase: 'showtime' },
    { title: 'Dinner', description: 'Celebration dinner', offsetMinutes: 210, durationMinutes: 90, phase: 'showtime' },
    { title: 'Night Out', description: 'Dancing and fun', offsetMinutes: 300, durationMinutes: 180, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Night Ends', description: 'Safe return', offsetMinutes: 480, durationMinutes: 30, phase: 'wrapup' },
  ],
  pooja: [
    // Setup phase
    { title: 'Mandap Setup', description: 'Prepare sacred space and items', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    { title: 'Priest Arrival', description: 'Pandit arrives and prepares', offsetMinutes: -15, durationMinutes: 15, phase: 'setup' },
    // Showtime phase
    { title: 'Family Gathering', description: 'Family assembles', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
    { title: 'Main Pooja', description: 'Religious ceremony', offsetMinutes: 15, durationMinutes: 60, phase: 'showtime' },
    { title: 'Aarti & Blessings', description: 'Concluding rituals', offsetMinutes: 75, durationMinutes: 15, phase: 'showtime' },
    { title: 'Prasad Distribution', description: 'Sacred food sharing', offsetMinutes: 90, durationMinutes: 20, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Lunch/Snacks', description: 'Meal after ceremony', offsetMinutes: 110, durationMinutes: 60, phase: 'wrapup' },
  ],
  roka: [
    // Setup phase
    { title: 'Venue Decoration', description: 'Flower and decor setup', offsetMinutes: -45, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Families Arrive', description: 'Both families gather', offsetMinutes: 0, durationMinutes: 20, phase: 'showtime' },
    { title: 'Roka Ceremony', description: 'Exchange of gifts and blessings', offsetMinutes: 20, durationMinutes: 45, phase: 'showtime' },
    { title: 'Ring Exchange', description: 'Couple exchanges rings', offsetMinutes: 65, durationMinutes: 15, phase: 'showtime' },
    { title: 'Photos', description: 'Family photographs', offsetMinutes: 80, durationMinutes: 30, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Celebration Lunch/Dinner', description: 'Meal together', offsetMinutes: 110, durationMinutes: 90, phase: 'wrapup' },
  ],
  tilak: [
    // Setup phase
    { title: 'Venue Setup', description: 'Traditional decor arrangement', offsetMinutes: -45, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Baraat Arrival', description: 'Groom\'s family arrives', offsetMinutes: 0, durationMinutes: 20, phase: 'showtime' },
    { title: 'Welcome Ceremony', description: 'Bride\'s family welcomes guests', offsetMinutes: 20, durationMinutes: 15, phase: 'showtime' },
    { title: 'Tilak Ceremony', description: 'Sacred tilak application', offsetMinutes: 35, durationMinutes: 30, phase: 'showtime' },
    { title: 'Gift Exchange', description: 'Families exchange gifts', offsetMinutes: 65, durationMinutes: 20, phase: 'showtime' },
    { title: 'Blessings', description: 'Elders bless the groom', offsetMinutes: 85, durationMinutes: 15, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Feast', description: 'Traditional meal', offsetMinutes: 100, durationMinutes: 90, phase: 'wrapup' },
  ],
  baraat: [
    // Setup phase
    { title: 'Band & Decorations Ready', description: 'Music and horses prepared', offsetMinutes: -30, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Groom Departs', description: 'Procession begins from home', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
    { title: 'Baraat Procession', description: 'Dancing and celebration en route', offsetMinutes: 15, durationMinutes: 60, phase: 'showtime' },
    { title: 'Arrival at Venue', description: 'Baraat reaches wedding venue', offsetMinutes: 75, durationMinutes: 15, phase: 'showtime' },
    { title: 'Welcome by Bride\'s Family', description: 'Milni ceremony', offsetMinutes: 90, durationMinutes: 20, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Proceed to Mandap', description: 'Move to wedding ceremony', offsetMinutes: 110, durationMinutes: 10, phase: 'wrapup' },
  ],
  vidaai: [
    // Setup phase
    { title: 'Car Decoration', description: 'Decorate the departure vehicle', offsetMinutes: -45, durationMinutes: 30, phase: 'setup' },
    // Showtime phase
    { title: 'Bride Preparation', description: 'Final touches and emotional moments', offsetMinutes: 0, durationMinutes: 30, phase: 'showtime' },
    { title: 'Family Blessings', description: 'Parents and elders bless the bride', offsetMinutes: 30, durationMinutes: 20, phase: 'showtime' },
    { title: 'Vidaai Ceremony', description: 'Emotional farewell rituals', offsetMinutes: 50, durationMinutes: 30, phase: 'showtime' },
    { title: 'Throwing Rice', description: 'Traditional rice throwing', offsetMinutes: 80, durationMinutes: 10, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Departure', description: 'Bride leaves with groom\'s family', offsetMinutes: 90, durationMinutes: 15, phase: 'wrapup' },
  ],
  griha_pravesh: [
    // Setup phase
    { title: 'Home Decoration', description: 'Welcome decorations ready', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    // Showtime phase
    { title: 'Arrival at Home', description: 'Couple arrives at groom\'s home', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
    { title: 'Welcome Rituals', description: 'Aarti and kalash ceremony', offsetMinutes: 15, durationMinutes: 20, phase: 'showtime' },
    { title: 'Threshold Ceremony', description: 'Bride enters home with right foot', offsetMinutes: 35, durationMinutes: 10, phase: 'showtime' },
    { title: 'Blessings from Elders', description: 'Family members bless the couple', offsetMinutes: 45, durationMinutes: 20, phase: 'showtime' },
    { title: 'Ring Finding Game', description: 'Fun wedding game', offsetMinutes: 65, durationMinutes: 15, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Family Dinner', description: 'First meal at new home', offsetMinutes: 80, durationMinutes: 60, phase: 'wrapup' },
  ],
}

// Default template for unknown event types
const defaultTemplate: TimelineTemplateItem[] = [
  { title: 'Setup & Preparation', description: 'Venue and logistics setup', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
  { title: 'Event Start', description: 'Event begins', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
  { title: 'Main Activity', description: 'Primary event activities', offsetMinutes: 15, durationMinutes: 120, phase: 'showtime' },
  { title: 'Event End', description: 'Event concludes', offsetMinutes: 135, durationMinutes: 15, phase: 'wrapup' },
]

/**
 * Get timeline template for an event type
 */
function getEventTypeTemplate(eventType: string | null | undefined): TimelineTemplateItem[] {
  if (!eventType) return defaultTemplate
  const normalizedType = eventType.toLowerCase().replace(/[^a-z_]/g, '_')
  return eventTypeTemplates[normalizedType] || defaultTemplate
}

/**
 * Events tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding events with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const eventsRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch events
      const eventList = await ctx.db
        .select()
        .from(events)
        .where(eq(events.clientId, input.clientId))
        .orderBy(asc(events.eventDate))

      return eventList
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [event] = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1)

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return event
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      eventType: z.string().optional(),
      eventDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      venueName: z.string().optional(),
      address: z.string().optional(),
      guestCount: z.number().int().optional(),
      notes: z.string().optional(),
      status: z.enum(['draft', 'planned', 'confirmed', 'completed', 'cancelled']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Default status is 'planned' unless explicitly provided (synced with pipeline)
      const eventStatus = input.status || 'planned'

      // Create event
      const [event] = await ctx.db
        .insert(events)
        .values({
          clientId: input.clientId,
          title: input.title,
          description: input.description || null,
          eventType: input.eventType || null,
          eventDate: input.eventDate,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          location: input.location || null,
          venueName: input.venueName || null,
          address: input.address || null,
          guestCount: input.guestCount || null,
          notes: input.notes || null,
          status: eventStatus,
        })
        .returning()

      if (!event) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create event'
        })
      }

      // TIMELINE SYNC: Auto-generate timeline items for this event based on event type
      try {
        // Parse event date and time for timeline
        let eventStartDateTime = new Date(input.eventDate)
        if (input.startTime) {
          const [hours, minutes] = input.startTime.split(':').map(Number)
          eventStartDateTime.setHours(hours || 0, minutes || 0, 0, 0)
        } else {
          // Default to noon if no start time provided
          eventStartDateTime.setHours(12, 0, 0, 0)
        }

        // Get template for this event type
        const template = getEventTypeTemplate(input.eventType)
        const eventLocation = input.location || input.venueName || null

        // Generate timeline items from template
        const timelineItems = template.map((item, index) => {
          const itemStartTime = new Date(eventStartDateTime.getTime() + item.offsetMinutes * 60 * 1000)
          const itemEndTime = new Date(itemStartTime.getTime() + item.durationMinutes * 60 * 1000)

          return {
            clientId: input.clientId,
            eventId: event.id, // Link to specific event
            title: item.title,
            description: item.description,
            phase: item.phase, // setup | showtime | wrapup
            startTime: itemStartTime,
            endTime: itemEndTime,
            durationMinutes: item.durationMinutes,
            location: item.location || eventLocation, // Use item location if specified, else event location
            sortOrder: index,
            sourceModule: 'events',
            sourceId: event.id,
            metadata: JSON.stringify({ eventType: input.eventType || 'Wedding Event', eventTitle: input.title }),
          }
        })

        // Insert all timeline items
        if (timelineItems.length > 0) {
          await ctx.db.insert(timeline).values(timelineItems)
          console.log(`[Timeline] Auto-created ${timelineItems.length} items for event: ${input.title} (${input.eventType})`)
        }
      } catch (timelineError) {
        // Log but don't fail - event was created successfully
        console.warn('[Timeline] Failed to auto-create timeline entries for event:', timelineError)
      }

      return event
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        eventDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        location: z.string().optional(),
        venueName: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(['draft', 'planned', 'confirmed', 'completed', 'cancelled']).optional(),
        guestCount: z.number().int().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.title !== undefined) updateData.title = input.data.title
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.eventType !== undefined) updateData.eventType = input.data.eventType
      if (input.data.eventDate !== undefined) updateData.eventDate = input.data.eventDate
      if (input.data.startTime !== undefined) updateData.startTime = input.data.startTime
      if (input.data.endTime !== undefined) updateData.endTime = input.data.endTime
      if (input.data.location !== undefined) updateData.location = input.data.location
      if (input.data.venueName !== undefined) updateData.venueName = input.data.venueName
      if (input.data.address !== undefined) updateData.address = input.data.address
      if (input.data.status !== undefined) updateData.status = input.data.status
      if (input.data.guestCount !== undefined) updateData.guestCount = input.data.guestCount
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update event
      const [event] = await ctx.db
        .update(events)
        .set(updateData)
        .where(eq(events.id, input.id))
        .returning()

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      // TIMELINE SYNC: Update linked timeline entry using efficient DB query
      try {
        const timelineUpdate: Record<string, any> = { updatedAt: new Date() }

        if (input.data.title !== undefined) timelineUpdate.title = input.data.title
        if (input.data.description !== undefined) timelineUpdate.description = input.data.description
        if (input.data.location !== undefined || input.data.venueName !== undefined) {
          timelineUpdate.location = input.data.location || input.data.venueName
        }
        if (input.data.notes !== undefined) timelineUpdate.notes = input.data.notes

        // Update date/time if changed
        if (input.data.eventDate !== undefined || input.data.startTime !== undefined) {
          const eventDate = input.data.eventDate || event.eventDate
          const startTime = input.data.startTime || event.startTime
          let startDateTime = new Date(eventDate)
          if (startTime) {
            const [hours, minutes] = startTime.split(':').map(Number)
            startDateTime.setHours(hours || 0, minutes || 0, 0, 0)
          }
          timelineUpdate.startTime = startDateTime
        }

        if (input.data.endTime !== undefined) {
          const eventDate = input.data.eventDate || event.eventDate
          let endDateTime = new Date(eventDate)
          const [hours, minutes] = input.data.endTime.split(':').map(Number)
          endDateTime.setHours(hours || 0, minutes || 0, 0, 0)
          timelineUpdate.endTime = endDateTime
        }

        // Direct DB update using sourceModule and sourceId columns
        await ctx.db
          .update(timeline)
          .set(timelineUpdate)
          .where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, input.id)
            )
          )

        console.log(`[Timeline] Updated entry for event: ${event.title}`)
      } catch (timelineError) {
        console.warn('[Timeline] Failed to sync timeline entry for event update:', timelineError)
      }

      return event
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Delete event
      await ctx.db
        .delete(events)
        .where(eq(events.id, input.id))

      // TIMELINE SYNC: Delete linked timeline entry using efficient DB query
      try {
        await ctx.db
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, input.id)
            )
          )
        console.log(`[Timeline] Deleted entry for event: ${input.id}`)
      } catch (timelineError) {
        console.warn('[Timeline] Failed to delete timeline entry for event:', timelineError)
      }

      return { success: true }
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [event] = await ctx.db
        .update(events)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id))
        .returning()

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      return event
    }),

  getUpcoming: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get today's date
      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events
      const eventList = await ctx.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.clientId, input.clientId),
            gte(events.eventDate, today)
          )
        )
        .orderBy(asc(events.eventDate))

      return eventList
    }),

  getStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get events
      const eventList = await ctx.db
        .select({ status: events.status })
        .from(events)
        .where(eq(events.clientId, input.clientId))

      const stats = {
        total: eventList.length,
        planned: eventList.filter(e => e.status === 'planned').length,
        confirmed: eventList.filter(e => e.status === 'confirmed').length,
        completed: eventList.filter(e => e.status === 'completed').length,
        cancelled: eventList.filter(e => e.status === 'cancelled').length,
      }

      return stats
    }),

  /**
   * Get all events for the current month across all clients in the company.
   * Used for dashboard stats like "Active This Month".
   */
  getEventsThisMonth: adminProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get first and last day of current month (using UTC to avoid timezone issues)
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      // Format as YYYY-MM-DD strings directly to avoid timezone conversion
      const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
      // Get last day of month (day 0 of next month = last day of current month)
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

      // Get all client IDs for this company
      const companyClients = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )

      if (companyClients.length === 0) {
        return []
      }

      const clientIds = companyClients.map(c => c.id)

      // Get events for these clients in current month
      const eventList = await ctx.db
        .select({
          id: events.id,
          clientId: events.clientId,
          title: events.title,
          eventDate: events.eventDate,
        })
        .from(events)
        .where(
          and(
            inArray(events.clientId, clientIds),
            gte(events.eventDate, firstDayStr),
            lte(events.eventDate, lastDayStr)
          )
        )
        .orderBy(asc(events.eventDate))

      return eventList
    }),
})
