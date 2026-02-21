/**
 * Default Timeline Templates by Event Type
 *
 * January 2026 - Shared template definitions used by:
 * - Event creation (auto-generate timeline items)
 * - Template customization (initialize company templates)
 *
 * Each event type has a predefined set of timeline items.
 * Times are relative to event start time (offsetMinutes).
 */

export type TimelineTemplateItem = {
  title: string
  description: string
  offsetMinutes: number // Minutes from event start time (negative for before)
  durationMinutes: number
  location?: string
  phase: 'setup' | 'showtime' | 'wrapup' // Event phase segmentation
}

export const eventTypeTemplates: Record<string, TimelineTemplateItem[]> = {
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
    { title: 'First Dance', description: "Couple's first dance", offsetMinutes: 135, durationMinutes: 5, phase: 'showtime' },
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
    { title: 'First Dance', description: "Couple's dance", offsetMinutes: 195, durationMinutes: 10, phase: 'showtime' },
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
    { title: 'First Dance', description: "Couple's first dance", offsetMinutes: 240, durationMinutes: 10, phase: 'showtime' },
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
    { title: 'Appetizers Service', description: "Passed hors d'oeuvres", offsetMinutes: 30, durationMinutes: 90, phase: 'showtime' },
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
    { title: 'Baraat Arrival', description: "Groom's family arrives", offsetMinutes: 0, durationMinutes: 20, phase: 'showtime' },
    { title: 'Welcome Ceremony', description: "Bride's family welcomes guests", offsetMinutes: 20, durationMinutes: 15, phase: 'showtime' },
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
    { title: "Welcome by Bride's Family", description: 'Milni ceremony', offsetMinutes: 90, durationMinutes: 20, phase: 'showtime' },
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
    { title: 'Departure', description: "Bride leaves with groom's family", offsetMinutes: 90, durationMinutes: 15, phase: 'wrapup' },
  ],
  griha_pravesh: [
    // Setup phase
    { title: 'Home Decoration', description: 'Welcome decorations ready', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
    // Showtime phase
    { title: 'Arrival at Home', description: "Couple arrives at groom's home", offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
    { title: 'Welcome Rituals', description: 'Aarti and kalash ceremony', offsetMinutes: 15, durationMinutes: 20, phase: 'showtime' },
    { title: 'Threshold Ceremony', description: 'Bride enters home with right foot', offsetMinutes: 35, durationMinutes: 10, phase: 'showtime' },
    { title: 'Blessings from Elders', description: 'Family members bless the couple', offsetMinutes: 45, durationMinutes: 20, phase: 'showtime' },
    { title: 'Ring Finding Game', description: 'Fun wedding game', offsetMinutes: 65, durationMinutes: 15, phase: 'showtime' },
    // Wrap Up phase
    { title: 'Family Dinner', description: 'First meal at new home', offsetMinutes: 80, durationMinutes: 60, phase: 'wrapup' },
  ],
}

// Default template for unknown event types
export const defaultTemplate: TimelineTemplateItem[] = [
  { title: 'Setup & Preparation', description: 'Venue and logistics setup', offsetMinutes: -60, durationMinutes: 45, phase: 'setup' },
  { title: 'Event Start', description: 'Event begins', offsetMinutes: 0, durationMinutes: 15, phase: 'showtime' },
  { title: 'Main Activity', description: 'Primary event activities', offsetMinutes: 15, durationMinutes: 120, phase: 'showtime' },
  { title: 'Event End', description: 'Event concludes', offsetMinutes: 135, durationMinutes: 15, phase: 'wrapup' },
]

/**
 * Get all available event types with display names
 */
export const eventTypeDisplayNames: Record<string, string> = {
  wedding: 'Wedding',
  sangeet: 'Sangeet',
  mehendi: 'Mehendi',
  haldi: 'Haldi',
  reception: 'Reception',
  rehearsal_dinner: 'Rehearsal Dinner',
  engagement: 'Engagement',
  destination_wedding: 'Destination Wedding',
  cocktail: 'Cocktail Party',
  welcome_dinner: 'Welcome Dinner',
  brunch: 'Brunch',
  bachelor_party: 'Bachelor Party',
  bachelorette_party: 'Bachelorette Party',
  pooja: 'Pooja',
  roka: 'Roka',
  tilak: 'Tilak',
  baraat: 'Baraat',
  vidaai: 'Vidaai',
  griha_pravesh: 'Griha Pravesh',
}

/**
 * Get timeline template for an event type
 */
export function getDefaultTemplate(eventType: string | null | undefined): TimelineTemplateItem[] {
  if (!eventType) return defaultTemplate
  const normalizedType = eventType.toLowerCase().replace(/[^a-z_]/g, '_')
  return eventTypeTemplates[normalizedType] || defaultTemplate
}

/**
 * Get all event types
 */
export function getAllEventTypes(): string[] {
  return Object.keys(eventTypeTemplates)
}
