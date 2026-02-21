/**
 * Cultural Wedding Templates
 *
 * February 2026 - Pre-built wedding templates for various cultural traditions
 *
 * Supports:
 * - Hindu weddings (North/South Indian)
 * - Muslim weddings
 * - Sikh weddings
 * - Chinese weddings
 * - Jewish weddings
 * - Western/Traditional weddings
 *
 * Each template includes:
 * - Event structure (ceremonies, celebrations)
 * - Default timeline
 * - Budget categories
 * - Vendor categories
 */

export interface CulturalEventTemplate {
  id: string;
  name: string;
  description: string;
  culture: string;
  region?: string;
  events: EventTemplate[];
  budgetCategories: BudgetCategory[];
  vendorCategories: string[];
  timelinePhases: TimelinePhase[];
  traditions?: Tradition[];
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  dayOffset: number; // Days before main wedding (negative) or after (positive)
  defaultDuration: number; // Hours
  isOptional: boolean;
  suggestedTime?: string; // e.g., "morning", "evening", "afternoon"
  attire?: string;
  keyActivities?: string[];
}

export interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  suggestedPercentage: number; // Of total budget
  subcategories?: string[];
}

export interface TimelinePhase {
  id: string;
  name: string;
  dayOffset: number;
  items: TimelineItem[];
}

export interface TimelineItem {
  time: string;
  activity: string;
  duration: number; // Minutes
  notes?: string;
}

export interface Tradition {
  name: string;
  description: string;
  significance: string;
  timing?: string;
}

// ===================== HINDU WEDDING TEMPLATES =====================

export const HINDU_NORTH_INDIAN_TEMPLATE: CulturalEventTemplate = {
  id: 'hindu_north_indian',
  name: 'Hindu Wedding (North Indian)',
  description: 'Traditional North Indian Hindu wedding with full ceremony sequence',
  culture: 'Hindu',
  region: 'North India',
  events: [
    {
      id: 'roka',
      name: 'Roka / Engagement',
      description: 'Formal engagement ceremony where families exchange gifts',
      dayOffset: -60,
      defaultDuration: 3,
      isOptional: true,
      suggestedTime: 'evening',
      keyActivities: ['Ring exchange', 'Gift exchange', 'Blessing ceremony'],
    },
    {
      id: 'mehendi',
      name: 'Mehendi',
      description: 'Henna application ceremony for the bride and female guests',
      dayOffset: -2,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'afternoon',
      attire: 'Colorful traditional (green, yellow)',
      keyActivities: ['Henna application', 'Music and dance', 'Refreshments'],
    },
    {
      id: 'sangeet',
      name: 'Sangeet',
      description: 'Music and dance celebration with performances from both families',
      dayOffset: -1,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'evening',
      attire: 'Festive traditional',
      keyActivities: [
        'Family performances',
        'Couple dance',
        'DJ/Band',
        'Dinner',
      ],
    },
    {
      id: 'haldi',
      name: 'Haldi',
      description: 'Turmeric paste application ceremony for bride and groom',
      dayOffset: 0,
      defaultDuration: 2,
      isOptional: false,
      suggestedTime: 'morning',
      attire: 'Yellow traditional wear',
      keyActivities: ['Haldi application', 'Blessings', 'Family gathering'],
    },
    {
      id: 'baraat',
      name: 'Baraat',
      description: 'Groom\'s wedding procession to the venue',
      dayOffset: 0,
      defaultDuration: 1.5,
      isOptional: false,
      suggestedTime: 'evening',
      keyActivities: [
        'Groom on horse/car',
        'Band/DJ',
        'Dancing procession',
        'Milni ceremony',
      ],
    },
    {
      id: 'wedding_ceremony',
      name: 'Wedding Ceremony',
      description: 'Main wedding ceremony with Pheras and rituals',
      dayOffset: 0,
      defaultDuration: 3,
      isOptional: false,
      suggestedTime: 'evening',
      attire: 'Bride: Red/Pink lehenga, Groom: Sherwani',
      keyActivities: [
        'Jaimala (garland exchange)',
        'Kanyadaan',
        'Pheras (7 rounds)',
        'Sindoor and Mangalsutra',
      ],
    },
    {
      id: 'reception',
      name: 'Reception',
      description: 'Grand celebration dinner and party',
      dayOffset: 1,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'evening',
      keyActivities: [
        'Grand entrance',
        'Cake cutting',
        'Dinner',
        'Speeches',
        'Dancing',
      ],
    },
    {
      id: 'vidaai',
      name: 'Vidaai',
      description: 'Emotional farewell as bride leaves for groom\'s home',
      dayOffset: 1,
      defaultDuration: 0.5,
      isOptional: false,
      suggestedTime: 'night',
      keyActivities: ['Bidding farewell', 'Rice throwing', 'Departure'],
    },
  ],
  budgetCategories: [
    {
      id: 'venue',
      name: 'Venue & Catering',
      suggestedPercentage: 35,
      subcategories: ['Venue rental', 'Catering', 'Bar service', 'Decor'],
    },
    {
      id: 'attire',
      name: 'Bridal & Groom Attire',
      suggestedPercentage: 15,
      subcategories: [
        'Bridal lehenga',
        'Groom sherwani',
        'Jewelry',
        'Accessories',
      ],
    },
    {
      id: 'photo_video',
      name: 'Photography & Videography',
      suggestedPercentage: 10,
      subcategories: ['Pre-wedding shoot', 'Wedding day', 'Album', 'Drone'],
    },
    {
      id: 'decor_florals',
      name: 'Decor & Florals',
      suggestedPercentage: 12,
      subcategories: ['Stage decor', 'Mandap', 'Florals', 'Lighting'],
    },
    {
      id: 'music_entertainment',
      name: 'Music & Entertainment',
      suggestedPercentage: 8,
      subcategories: ['DJ', 'Band', 'Baraat band', 'Choreographer'],
    },
    {
      id: 'makeup_hair',
      name: 'Makeup & Hair',
      suggestedPercentage: 5,
      subcategories: ['Bridal makeup', 'Family makeup', 'Hair styling'],
    },
    {
      id: 'invitations',
      name: 'Invitations & Stationery',
      suggestedPercentage: 3,
      subcategories: ['Wedding cards', 'E-invites', 'Thank you cards'],
    },
    {
      id: 'gifts_favors',
      name: 'Gifts & Favors',
      suggestedPercentage: 5,
      subcategories: ['Guest favors', 'Family gifts', 'Trousseau'],
    },
    {
      id: 'transport',
      name: 'Transportation',
      suggestedPercentage: 3,
      subcategories: ['Baraat car', 'Guest transport', 'Decorations'],
    },
    {
      id: 'misc',
      name: 'Miscellaneous',
      suggestedPercentage: 4,
      subcategories: ['Pandit fees', 'Tips', 'Emergency fund'],
    },
  ],
  vendorCategories: [
    'Venue',
    'Caterer',
    'Decorator',
    'Photographer',
    'Videographer',
    'DJ/Band',
    'Makeup Artist',
    'Mehendi Artist',
    'Florist',
    'Pandit/Priest',
    'Choreographer',
    'Invitation Designer',
    'Jeweler',
    'Bridal Boutique',
  ],
  timelinePhases: [
    {
      id: 'mehendi_day',
      name: 'Mehendi Day',
      dayOffset: -2,
      items: [
        { time: '14:00', activity: 'Mehendi artists arrive', duration: 30 },
        { time: '14:30', activity: 'Bride\'s mehendi begins', duration: 180 },
        { time: '15:00', activity: 'Guest mehendi starts', duration: 240 },
        { time: '18:00', activity: 'Snacks and refreshments', duration: 60 },
        { time: '19:00', activity: 'Music and dancing', duration: 120 },
      ],
    },
    {
      id: 'sangeet_day',
      name: 'Sangeet Day',
      dayOffset: -1,
      items: [
        { time: '18:00', activity: 'Guests arrive', duration: 30 },
        { time: '18:30', activity: 'Welcome drinks', duration: 30 },
        { time: '19:00', activity: 'Family performances begin', duration: 120 },
        { time: '21:00', activity: 'Dinner service', duration: 60 },
        { time: '22:00', activity: 'DJ/Dancing', duration: 120 },
      ],
    },
    {
      id: 'wedding_day',
      name: 'Wedding Day',
      dayOffset: 0,
      items: [
        { time: '08:00', activity: 'Haldi ceremony (separate)', duration: 120 },
        { time: '14:00', activity: 'Bride makeup starts', duration: 180 },
        { time: '17:00', activity: 'Groom gets ready', duration: 90 },
        { time: '18:30', activity: 'Baraat procession', duration: 60 },
        { time: '19:30', activity: 'Milni ceremony', duration: 30 },
        { time: '20:00', activity: 'Jaimala (garlands)', duration: 30 },
        { time: '20:30', activity: 'Wedding ceremony begins', duration: 150 },
        { time: '23:00', activity: 'Dinner service', duration: 90 },
      ],
    },
  ],
  traditions: [
    {
      name: 'Pheras',
      description: 'Seven rounds around the sacred fire',
      significance:
        'Each round represents a vow for a successful marriage',
      timing: 'During wedding ceremony',
    },
    {
      name: 'Sindoor & Mangalsutra',
      description: 'Groom applies vermillion and ties the sacred necklace',
      significance: 'Marks the bride as married',
      timing: 'After pheras',
    },
    {
      name: 'Kanyadaan',
      description: 'Father gives away the bride',
      significance: 'Symbol of parents entrusting daughter to groom',
      timing: 'Before pheras',
    },
  ],
};

export const HINDU_SOUTH_INDIAN_TEMPLATE: CulturalEventTemplate = {
  id: 'hindu_south_indian',
  name: 'Hindu Wedding (South Indian)',
  description: 'Traditional South Indian Hindu wedding with Muhurtham',
  culture: 'Hindu',
  region: 'South India',
  events: [
    {
      id: 'nischayam',
      name: 'Nischayam / Engagement',
      description: 'Formal engagement ceremony',
      dayOffset: -30,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'morning',
    },
    {
      id: 'nalangu',
      name: 'Nalangu',
      description: 'Playful ceremony with turmeric and games',
      dayOffset: -1,
      defaultDuration: 3,
      isOptional: false,
      suggestedTime: 'evening',
      keyActivities: [
        'Turmeric application',
        'Games between bride and groom',
        'Music',
      ],
    },
    {
      id: 'muhurtham',
      name: 'Muhurtham (Wedding Ceremony)',
      description: 'Main wedding ceremony at auspicious time',
      dayOffset: 0,
      defaultDuration: 2,
      isOptional: false,
      suggestedTime: 'morning',
      attire: 'Bride: Silk saree (Kanjeevaram), Groom: Dhoti/Veshti',
      keyActivities: [
        'Tying Thali (Mangalsutra)',
        'Saptapadi (7 steps)',
        'Exchange of garlands',
      ],
    },
    {
      id: 'reception',
      name: 'Reception',
      description: 'Grand dinner celebration',
      dayOffset: 0,
      defaultDuration: 4,
      isOptional: false,
      suggestedTime: 'evening',
    },
  ],
  budgetCategories: [
    { id: 'venue', name: 'Venue & Catering', suggestedPercentage: 40 },
    { id: 'attire', name: 'Silk Sarees & Jewelry', suggestedPercentage: 20 },
    { id: 'photo_video', name: 'Photography & Video', suggestedPercentage: 10 },
    { id: 'decor', name: 'Decor & Flowers', suggestedPercentage: 10 },
    { id: 'music', name: 'Nadaswaram & Music', suggestedPercentage: 5 },
    { id: 'makeup', name: 'Makeup & Hair', suggestedPercentage: 5 },
    { id: 'misc', name: 'Priest & Miscellaneous', suggestedPercentage: 10 },
  ],
  vendorCategories: [
    'Marriage Hall/Venue',
    'Caterer',
    'Decorator',
    'Photographer',
    'Nadaswaram/Music',
    'Makeup Artist',
    'Priest',
    'Silk Saree Shop',
    'Florist',
  ],
  timelinePhases: [
    {
      id: 'wedding_day',
      name: 'Wedding Day',
      dayOffset: 0,
      items: [
        { time: '05:00', activity: 'Bride makeup starts', duration: 120 },
        { time: '07:00', activity: 'Groom arrives', duration: 30 },
        { time: '07:30', activity: 'Muhurtham ceremony', duration: 90 },
        { time: '09:00', activity: 'Breakfast served', duration: 60 },
        { time: '12:00', activity: 'Lunch service', duration: 120 },
        { time: '18:00', activity: 'Reception begins', duration: 240 },
      ],
    },
  ],
};

// ===================== MUSLIM WEDDING TEMPLATES =====================

export const MUSLIM_WEDDING_TEMPLATE: CulturalEventTemplate = {
  id: 'muslim_indian',
  name: 'Muslim Wedding (Indian/Pakistani)',
  description: 'Traditional Muslim wedding with Nikah and Walima',
  culture: 'Muslim',
  events: [
    {
      id: 'dholki',
      name: 'Dholki / Sangeet',
      description: 'Musical celebration with traditional songs',
      dayOffset: -3,
      defaultDuration: 4,
      isOptional: true,
      suggestedTime: 'evening',
      keyActivities: ['Dholki drum', 'Traditional songs', 'Dancing'],
    },
    {
      id: 'mehndi',
      name: 'Mehndi',
      description: 'Henna ceremony for the bride',
      dayOffset: -2,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'afternoon',
      attire: 'Yellow and green traditional wear',
      keyActivities: ['Henna application', 'Music', 'Dance'],
    },
    {
      id: 'mayun',
      name: 'Mayun / Haldi',
      description: 'Turmeric and oil application',
      dayOffset: -1,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'afternoon',
    },
    {
      id: 'nikah',
      name: 'Nikah',
      description: 'Islamic marriage ceremony',
      dayOffset: 0,
      defaultDuration: 2,
      isOptional: false,
      suggestedTime: 'afternoon',
      attire: 'Bride: Red/Maroon sharara/lehenga, Groom: Sherwani',
      keyActivities: [
        'Nikah recitation',
        'Mehr (dower) announcement',
        'Signing of contract',
        'Dua (prayers)',
      ],
    },
    {
      id: 'walima',
      name: 'Walima',
      description: 'Wedding banquet hosted by groom\'s family',
      dayOffset: 1,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'evening',
      keyActivities: ['Grand dinner', 'Photos', 'Celebration'],
    },
    {
      id: 'rukhsati',
      name: 'Rukhsati',
      description: 'Bride\'s farewell to her family',
      dayOffset: 0,
      defaultDuration: 0.5,
      isOptional: false,
      suggestedTime: 'night',
    },
  ],
  budgetCategories: [
    { id: 'venue', name: 'Venue & Catering', suggestedPercentage: 35 },
    { id: 'attire', name: 'Bridal & Groom Attire', suggestedPercentage: 15 },
    { id: 'photo_video', name: 'Photography & Video', suggestedPercentage: 10 },
    { id: 'decor', name: 'Decor & Stage', suggestedPercentage: 12 },
    { id: 'jewelry', name: 'Jewelry', suggestedPercentage: 10 },
    { id: 'makeup', name: 'Makeup & Hair', suggestedPercentage: 5 },
    { id: 'music', name: 'DJ & Entertainment', suggestedPercentage: 5 },
    { id: 'misc', name: 'Imam & Miscellaneous', suggestedPercentage: 8 },
  ],
  vendorCategories: [
    'Banquet Hall',
    'Caterer',
    'Decorator',
    'Photographer',
    'Videographer',
    'DJ',
    'Makeup Artist',
    'Mehendi Artist',
    'Imam/Qazi',
  ],
  timelinePhases: [
    {
      id: 'nikah_day',
      name: 'Nikah Day',
      dayOffset: 0,
      items: [
        { time: '12:00', activity: 'Bride makeup starts', duration: 180 },
        { time: '15:00', activity: 'Guests arrive', duration: 60 },
        { time: '16:00', activity: 'Nikah ceremony', duration: 90 },
        { time: '17:30', activity: 'Photos and refreshments', duration: 90 },
        { time: '19:00', activity: 'Dinner service', duration: 120 },
        { time: '21:00', activity: 'Rukhsati', duration: 30 },
      ],
    },
  ],
};

// ===================== SIKH WEDDING TEMPLATES =====================

export const SIKH_WEDDING_TEMPLATE: CulturalEventTemplate = {
  id: 'sikh',
  name: 'Sikh Wedding (Anand Karaj)',
  description: 'Traditional Sikh wedding ceremony at Gurudwara',
  culture: 'Sikh',
  events: [
    {
      id: 'roka',
      name: 'Roka',
      description: 'Formal engagement ceremony',
      dayOffset: -60,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'morning',
    },
    {
      id: 'chunni_ceremony',
      name: 'Chunni Ceremony',
      description: 'Groom\'s family presents red chunni to bride',
      dayOffset: -30,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'afternoon',
    },
    {
      id: 'mehendi',
      name: 'Mehendi',
      description: 'Henna ceremony',
      dayOffset: -2,
      defaultDuration: 4,
      isOptional: false,
      suggestedTime: 'afternoon',
    },
    {
      id: 'jaggo',
      name: 'Jaggo',
      description: 'Night-long singing and dancing ceremony',
      dayOffset: -1,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'night',
      keyActivities: [
        'Dancing with lit pots',
        'Traditional songs (boliyan)',
        'Dhol',
      ],
    },
    {
      id: 'anand_karaj',
      name: 'Anand Karaj',
      description: 'Main wedding ceremony at Gurudwara',
      dayOffset: 0,
      defaultDuration: 3,
      isOptional: false,
      suggestedTime: 'morning',
      attire: 'Bride: Red salwar/lehenga, Groom: Sherwani with turban',
      keyActivities: [
        'Laavan (4 rounds around Guru Granth Sahib)',
        'Kirtan',
        'Ardas',
        'Langar',
      ],
    },
    {
      id: 'doli',
      name: 'Doli',
      description: 'Bride\'s farewell',
      dayOffset: 0,
      defaultDuration: 0.5,
      isOptional: false,
      suggestedTime: 'afternoon',
    },
    {
      id: 'reception',
      name: 'Reception',
      description: 'Evening celebration',
      dayOffset: 0,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'evening',
    },
  ],
  budgetCategories: [
    { id: 'venue', name: 'Venue & Catering', suggestedPercentage: 35 },
    { id: 'attire', name: 'Attire & Jewelry', suggestedPercentage: 15 },
    { id: 'photo', name: 'Photography & Video', suggestedPercentage: 10 },
    { id: 'decor', name: 'Decor', suggestedPercentage: 12 },
    { id: 'dhol', name: 'Dhol & Music', suggestedPercentage: 8 },
    { id: 'gurudwara', name: 'Gurudwara & Langar', suggestedPercentage: 5 },
    { id: 'misc', name: 'Miscellaneous', suggestedPercentage: 15 },
  ],
  vendorCategories: [
    'Gurudwara',
    'Banquet Hall',
    'Caterer',
    'Decorator',
    'Photographer',
    'Dhol Players',
    'DJ',
    'Makeup Artist',
    'Mehendi Artist',
  ],
  timelinePhases: [
    {
      id: 'wedding_day',
      name: 'Wedding Day',
      dayOffset: 0,
      items: [
        { time: '06:00', activity: 'Bride makeup starts', duration: 180 },
        { time: '09:00', activity: 'Groom\'s procession arrives', duration: 30 },
        { time: '09:30', activity: 'Milni ceremony', duration: 30 },
        { time: '10:00', activity: 'Anand Karaj begins', duration: 120 },
        { time: '12:00', activity: 'Langar (community meal)', duration: 90 },
        { time: '14:00', activity: 'Doli ceremony', duration: 30 },
        { time: '19:00', activity: 'Reception begins', duration: 300 },
      ],
    },
  ],
};

// ===================== CHINESE WEDDING TEMPLATES =====================

export const CHINESE_WEDDING_TEMPLATE: CulturalEventTemplate = {
  id: 'chinese',
  name: 'Chinese Wedding',
  description: 'Traditional Chinese wedding with tea ceremony',
  culture: 'Chinese',
  events: [
    {
      id: 'betrothal',
      name: 'Betrothal / Guo Da Li',
      description: 'Formal gift-giving ceremony',
      dayOffset: -30,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'morning',
    },
    {
      id: 'door_games',
      name: 'Door Games / Chuang Men',
      description: 'Fun challenges for groom to reach bride',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'morning',
      keyActivities: ['Games and challenges', 'Red packets', 'Fun tasks'],
    },
    {
      id: 'tea_ceremony_bride',
      name: 'Tea Ceremony (Bride\'s Family)',
      description: 'Serving tea to bride\'s family',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'morning',
      keyActivities: ['Tea serving', 'Receiving jewelry', 'Blessings'],
    },
    {
      id: 'fetching_bride',
      name: 'Fetching the Bride',
      description: 'Groom takes bride to his home',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'late morning',
    },
    {
      id: 'tea_ceremony_groom',
      name: 'Tea Ceremony (Groom\'s Family)',
      description: 'Serving tea to groom\'s family',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'afternoon',
    },
    {
      id: 'wedding_banquet',
      name: 'Wedding Banquet',
      description: 'Grand dinner celebration',
      dayOffset: 0,
      defaultDuration: 4,
      isOptional: false,
      suggestedTime: 'evening',
      attire: 'Bride: Qipao/Cheongsam or Kua, Groom: Tang suit',
      keyActivities: [
        'Grand entrance',
        'Toasting (Yum Seng)',
        '8-course dinner',
        'Dress changes',
      ],
    },
  ],
  budgetCategories: [
    { id: 'banquet', name: 'Wedding Banquet', suggestedPercentage: 40 },
    { id: 'attire', name: 'Qipao & Kua', suggestedPercentage: 10 },
    { id: 'photo', name: 'Photography & Video', suggestedPercentage: 15 },
    { id: 'decor', name: 'Decorations', suggestedPercentage: 10 },
    { id: 'betrothal_gifts', name: 'Betrothal Gifts', suggestedPercentage: 10 },
    { id: 'jewelry', name: 'Gold Jewelry', suggestedPercentage: 10 },
    { id: 'misc', name: 'Red Packets & Misc', suggestedPercentage: 5 },
  ],
  vendorCategories: [
    'Restaurant/Hotel',
    'Bridal Studio',
    'Photographer',
    'Videographer',
    'Emcee',
    'Makeup Artist',
    'Florist',
    'Lion Dance Troupe',
  ],
  timelinePhases: [
    {
      id: 'wedding_day',
      name: 'Wedding Day',
      dayOffset: 0,
      items: [
        { time: '06:00', activity: 'Bride makeup starts', duration: 180 },
        { time: '09:00', activity: 'Groom arrives for door games', duration: 60 },
        { time: '10:00', activity: 'Tea ceremony (bride\'s side)', duration: 60 },
        { time: '11:30', activity: 'Fetching bride ceremony', duration: 30 },
        { time: '13:00', activity: 'Tea ceremony (groom\'s side)', duration: 60 },
        { time: '14:00', activity: 'Rest and outfit change', duration: 180 },
        { time: '18:00', activity: 'Banquet begins', duration: 240 },
      ],
    },
  ],
  traditions: [
    {
      name: 'Double Happiness',
      description: 'Symbol displayed throughout wedding',
      significance: 'Represents joy and good fortune for the couple',
    },
    {
      name: 'Red & Gold Colors',
      description: 'Primary wedding colors',
      significance: 'Red for luck, gold for prosperity',
    },
  ],
};

// ===================== JEWISH WEDDING TEMPLATES =====================

export const JEWISH_WEDDING_TEMPLATE: CulturalEventTemplate = {
  id: 'jewish',
  name: 'Jewish Wedding',
  description: 'Traditional Jewish wedding with Chuppah ceremony',
  culture: 'Jewish',
  events: [
    {
      id: 'aufruf',
      name: 'Aufruf',
      description: 'Groom called to Torah before wedding',
      dayOffset: -7,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'morning',
    },
    {
      id: 'bedeken',
      name: 'Bedeken (Veiling)',
      description: 'Groom veils the bride',
      dayOffset: 0,
      defaultDuration: 0.5,
      isOptional: false,
      suggestedTime: 'afternoon',
      keyActivities: ['Groom lifts veil', 'Blessing', 'Signing Ketubah'],
    },
    {
      id: 'ketubah_signing',
      name: 'Ketubah Signing',
      description: 'Signing of the marriage contract',
      dayOffset: 0,
      defaultDuration: 0.5,
      isOptional: false,
      suggestedTime: 'afternoon',
    },
    {
      id: 'chuppah',
      name: 'Chuppah Ceremony',
      description: 'Main wedding ceremony under the canopy',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'late afternoon',
      attire: 'Bride: White gown, Groom: Kittel (white robe)',
      keyActivities: [
        'Circling (7 times)',
        'Kiddushin (ring ceremony)',
        'Sheva Brachot (7 blessings)',
        'Breaking the glass',
      ],
    },
    {
      id: 'yichud',
      name: 'Yichud',
      description: 'Private moment for newly married couple',
      dayOffset: 0,
      defaultDuration: 0.25,
      isOptional: false,
      suggestedTime: 'late afternoon',
    },
    {
      id: 'reception',
      name: 'Reception / Simcha',
      description: 'Joyful celebration with dancing',
      dayOffset: 0,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'evening',
      keyActivities: [
        'Hora dance',
        'Chair lifting',
        'Dinner',
        'Dancing',
        'Sheva Brachot',
      ],
    },
  ],
  budgetCategories: [
    { id: 'venue', name: 'Venue & Catering (Kosher)', suggestedPercentage: 40 },
    { id: 'attire', name: 'Bridal & Groom Attire', suggestedPercentage: 10 },
    { id: 'photo', name: 'Photography & Video', suggestedPercentage: 12 },
    { id: 'music', name: 'Band & Entertainment', suggestedPercentage: 12 },
    { id: 'florals', name: 'Chuppah & Florals', suggestedPercentage: 8 },
    { id: 'ketubah', name: 'Ketubah & Rabbi', suggestedPercentage: 5 },
    { id: 'misc', name: 'Miscellaneous', suggestedPercentage: 13 },
  ],
  vendorCategories: [
    'Venue',
    'Kosher Caterer',
    'Rabbi/Officiant',
    'Band/Musicians',
    'Photographer',
    'Videographer',
    'Florist',
    'Ketubah Artist',
    'Makeup Artist',
  ],
  timelinePhases: [
    {
      id: 'wedding_day',
      name: 'Wedding Day',
      dayOffset: 0,
      items: [
        { time: '14:00', activity: 'Bride makeup starts', duration: 120 },
        { time: '16:00', activity: 'Ketubah signing', duration: 30 },
        { time: '16:30', activity: 'Bedeken ceremony', duration: 30 },
        { time: '17:00', activity: 'Chuppah ceremony', duration: 60 },
        { time: '18:00', activity: 'Yichud', duration: 15 },
        { time: '18:30', activity: 'Cocktail hour', duration: 60 },
        { time: '19:30', activity: 'Grand entrance & Hora', duration: 30 },
        { time: '20:00', activity: 'Dinner', duration: 90 },
        { time: '21:30', activity: 'Dancing', duration: 150 },
      ],
    },
  ],
  traditions: [
    {
      name: 'Breaking the Glass',
      description: 'Groom breaks glass at end of ceremony',
      significance:
        'Remembrance of destruction of Temple; marks transition',
      timing: 'End of Chuppah ceremony',
    },
    {
      name: 'Hora',
      description: 'Circle dance with couple lifted on chairs',
      significance: 'Joyful celebration of marriage',
      timing: 'Start of reception',
    },
  ],
};

// ===================== WESTERN/TRADITIONAL TEMPLATE =====================

export const WESTERN_WEDDING_TEMPLATE: CulturalEventTemplate = {
  id: 'western',
  name: 'Western/Traditional Wedding',
  description: 'Classic Western-style wedding ceremony and reception',
  culture: 'Western',
  events: [
    {
      id: 'rehearsal_dinner',
      name: 'Rehearsal Dinner',
      description: 'Pre-wedding dinner for wedding party',
      dayOffset: -1,
      defaultDuration: 3,
      isOptional: true,
      suggestedTime: 'evening',
    },
    {
      id: 'ceremony',
      name: 'Wedding Ceremony',
      description: 'Exchange of vows and rings',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'afternoon',
      keyActivities: [
        'Processional',
        'Readings',
        'Vows',
        'Ring exchange',
        'First kiss',
        'Recessional',
      ],
    },
    {
      id: 'cocktail_hour',
      name: 'Cocktail Hour',
      description: 'Drinks and appetizers while couple takes photos',
      dayOffset: 0,
      defaultDuration: 1,
      isOptional: false,
      suggestedTime: 'late afternoon',
    },
    {
      id: 'reception',
      name: 'Reception',
      description: 'Dinner, toasts, and dancing',
      dayOffset: 0,
      defaultDuration: 5,
      isOptional: false,
      suggestedTime: 'evening',
      keyActivities: [
        'Grand entrance',
        'First dance',
        'Parent dances',
        'Toasts',
        'Dinner',
        'Cake cutting',
        'Bouquet/garter toss',
        'Dancing',
        'Last dance',
      ],
    },
    {
      id: 'brunch',
      name: 'Morning-After Brunch',
      description: 'Casual gathering for out-of-town guests',
      dayOffset: 1,
      defaultDuration: 2,
      isOptional: true,
      suggestedTime: 'morning',
    },
  ],
  budgetCategories: [
    { id: 'venue', name: 'Venue', suggestedPercentage: 15 },
    { id: 'catering', name: 'Catering & Bar', suggestedPercentage: 25 },
    { id: 'photo', name: 'Photography & Video', suggestedPercentage: 12 },
    { id: 'music', name: 'Band/DJ', suggestedPercentage: 8 },
    { id: 'florals', name: 'Flowers & Decor', suggestedPercentage: 10 },
    { id: 'attire', name: 'Attire & Beauty', suggestedPercentage: 10 },
    { id: 'stationery', name: 'Invitations', suggestedPercentage: 3 },
    { id: 'officiant', name: 'Officiant', suggestedPercentage: 2 },
    { id: 'favors', name: 'Favors & Gifts', suggestedPercentage: 3 },
    { id: 'transportation', name: 'Transportation', suggestedPercentage: 3 },
    { id: 'misc', name: 'Miscellaneous', suggestedPercentage: 9 },
  ],
  vendorCategories: [
    'Venue',
    'Caterer',
    'Photographer',
    'Videographer',
    'DJ/Band',
    'Florist',
    'Officiant',
    'Hair & Makeup',
    'Baker',
    'Stationer',
    'Transportation',
    'Planner/Coordinator',
  ],
  timelinePhases: [
    {
      id: 'wedding_day',
      name: 'Wedding Day',
      dayOffset: 0,
      items: [
        { time: '09:00', activity: 'Hair & makeup begins', duration: 180 },
        { time: '12:00', activity: 'Photographer arrives', duration: 30 },
        { time: '12:30', activity: 'Getting ready photos', duration: 90 },
        { time: '14:00', activity: 'First look (optional)', duration: 30 },
        { time: '14:30', activity: 'Wedding party photos', duration: 60 },
        { time: '15:30', activity: 'Guests arrive', duration: 30 },
        { time: '16:00', activity: 'Ceremony begins', duration: 45 },
        { time: '16:45', activity: 'Family photos', duration: 30 },
        { time: '17:15', activity: 'Cocktail hour', duration: 60 },
        { time: '18:15', activity: 'Reception entrance', duration: 15 },
        { time: '18:30', activity: 'First dance', duration: 10 },
        { time: '18:45', activity: 'Dinner service', duration: 75 },
        { time: '20:00', activity: 'Toasts', duration: 20 },
        { time: '20:20', activity: 'Parent dances', duration: 10 },
        { time: '20:30', activity: 'Cake cutting', duration: 10 },
        { time: '20:45', activity: 'Open dancing', duration: 135 },
        { time: '23:00', activity: 'Last dance & send-off', duration: 15 },
      ],
    },
  ],
};

// ===================== ALL TEMPLATES COLLECTION =====================

export const CULTURAL_WEDDING_TEMPLATES: CulturalEventTemplate[] = [
  HINDU_NORTH_INDIAN_TEMPLATE,
  HINDU_SOUTH_INDIAN_TEMPLATE,
  MUSLIM_WEDDING_TEMPLATE,
  SIKH_WEDDING_TEMPLATE,
  CHINESE_WEDDING_TEMPLATE,
  JEWISH_WEDDING_TEMPLATE,
  WESTERN_WEDDING_TEMPLATE,
];

/**
 * Get template by ID
 */
export function getCulturalTemplateById(
  id: string
): CulturalEventTemplate | undefined {
  return CULTURAL_WEDDING_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by culture
 */
export function getCulturalTemplatesByCulture(
  culture: string
): CulturalEventTemplate[] {
  return CULTURAL_WEDDING_TEMPLATES.filter(
    (t) => t.culture.toLowerCase() === culture.toLowerCase()
  );
}

/**
 * Get all available cultures
 */
export function getAvailableCultures(): string[] {
  return [...new Set(CULTURAL_WEDDING_TEMPLATES.map((t) => t.culture))];
}

/**
 * Apply cultural template to create events for a client
 * Returns event data ready to be inserted
 */
export function applyTemplateToClient(
  templateId: string,
  weddingDate: Date,
  companyId: string,
  clientId: string
): {
  events: Array<{
    name: string;
    description: string;
    eventDate: Date;
    startTime: string;
    endTime: string;
    eventType: string;
  }>;
  budgetCategories: BudgetCategory[];
  vendorCategories: string[];
} {
  const template = getCulturalTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Create events based on template
  const events = template.events.map((eventTemplate) => {
    const eventDate = new Date(weddingDate);
    eventDate.setDate(eventDate.getDate() + eventTemplate.dayOffset);

    // Calculate times based on suggested time
    let startHour = 18; // Default evening
    if (eventTemplate.suggestedTime === 'morning') startHour = 9;
    else if (eventTemplate.suggestedTime === 'afternoon') startHour = 14;
    else if (eventTemplate.suggestedTime === 'late afternoon') startHour = 16;
    else if (eventTemplate.suggestedTime === 'late morning') startHour = 11;
    else if (eventTemplate.suggestedTime === 'night') startHour = 21;

    const endHour = startHour + Math.ceil(eventTemplate.defaultDuration);

    return {
      name: eventTemplate.name,
      description: eventTemplate.description,
      eventDate,
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${endHour.toString().padStart(2, '0')}:00`,
      eventType: eventTemplate.id,
    };
  });

  return {
    events,
    budgetCategories: template.budgetCategories,
    vendorCategories: template.vendorCategories,
  };
}
