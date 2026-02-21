/**
 * Chatbot Tool Definitions - OpenAI Function Calling Format
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Defines 18 tools covering all CRUD operations for wedding planning.
 * Uses OpenAI function calling format with strict JSON schema validation.
 *
 * Tool Categories:
 * - Client Management (3)
 * - Guest Management (4)
 * - Event Management (2)
 * - Timeline Management (2)
 * - Vendor Management (2)
 * - Hotel Management (2)
 * - Budget (2)
 * - Search (1)
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

/**
 * Tool types for categorization and routing
 */
export type ToolCategory =
  | 'client'
  | 'guest'
  | 'event'
  | 'timeline'
  | 'vendor'
  | 'hotel'
  | 'budget'
  | 'search'
  | 'communication'
  | 'pipeline'
  | 'gifts'
  | 'proposals'
  | 'invoices'
  | 'exports'
  | 'website'
  | 'creatives'
  | 'team'
  | 'analytics'
  | 'weather'
  | 'seating'
  | 'workflows'
  | 'qr_codes'
  | 'calendar'
  | 'documents'

export type ToolType = 'query' | 'mutation'

export interface ToolMetadata {
  name: string
  category: ToolCategory
  type: ToolType
  description: string
  cascadeEffects?: string[]
}

/**
 * Tool metadata for routing and preview generation
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  create_client: {
    name: 'create_client',
    category: 'client',
    type: 'mutation',
    description: 'Create a new wedding client',
    cascadeEffects: [
      'Auto-creates main wedding event if wedding_date provided',
      'Auto-generates budget categories based on wedding type',
      'Creates default timeline template',
    ],
  },
  update_client: {
    name: 'update_client',
    category: 'client',
    type: 'mutation',
    description: 'Update an existing client',
    cascadeEffects: [
      'Syncs wedding details to main event (date, venue, guest count)',
    ],
  },
  get_client_summary: {
    name: 'get_client_summary',
    category: 'client',
    type: 'query',
    description: 'Get client overview with all statistics',
  },
  get_wedding_summary: {
    name: 'get_wedding_summary',
    category: 'client',
    type: 'query',
    description: 'Get comprehensive wedding summary report with all stats',
  },
  check_in_guest: {
    name: 'check_in_guest',
    category: 'guest',
    type: 'mutation',
    description: 'Fast check-in for day-of event management',
  },
  get_recommendations: {
    name: 'get_recommendations',
    category: 'client',
    type: 'query',
    description: 'Get proactive recommendations and alerts',
  },
  add_guest: {
    name: 'add_guest',
    category: 'guest',
    type: 'mutation',
    description: 'Add a new guest to a wedding',
    cascadeEffects: [
      'Auto-creates hotel booking if needsHotel=true',
      'Auto-creates transport record if needsTransport=true',
    ],
  },
  update_guest_rsvp: {
    name: 'update_guest_rsvp',
    category: 'guest',
    type: 'mutation',
    description: 'Update guest RSVP status',
    cascadeEffects: [
      'Updates guest count aggregations',
      'May affect meal counts and seating',
    ],
  },
  get_guest_stats: {
    name: 'get_guest_stats',
    category: 'guest',
    type: 'query',
    description: 'Get guest statistics (confirmed, pending, declined, dietary)',
  },
  bulk_update_guests: {
    name: 'bulk_update_guests',
    category: 'guest',
    type: 'mutation',
    description: 'Update multiple guests at once',
    cascadeEffects: [
      'May create multiple hotel/transport records',
      'Updates aggregations for all affected guests',
    ],
  },
  create_event: {
    name: 'create_event',
    category: 'event',
    type: 'mutation',
    description: 'Create a new event (ceremony, reception, etc.)',
    cascadeEffects: [
      'Auto-generates timeline items based on event type',
    ],
  },
  update_event: {
    name: 'update_event',
    category: 'event',
    type: 'mutation',
    description: 'Update an existing event',
    cascadeEffects: [
      'May shift timeline items if date changes',
    ],
  },
  add_timeline_item: {
    name: 'add_timeline_item',
    category: 'timeline',
    type: 'mutation',
    description: 'Add an item to the wedding timeline',
  },
  shift_timeline: {
    name: 'shift_timeline',
    category: 'timeline',
    type: 'mutation',
    description: 'Shift all timeline items by a duration',
    cascadeEffects: [
      'Updates start/end times for all affected items',
      'May affect vendor schedules',
    ],
  },
  add_vendor: {
    name: 'add_vendor',
    category: 'vendor',
    type: 'mutation',
    description: 'Add a new vendor',
    cascadeEffects: [
      'Auto-creates budget item for vendor',
      'Auto-creates timeline entry if service date provided',
    ],
  },
  update_vendor: {
    name: 'update_vendor',
    category: 'vendor',
    type: 'mutation',
    description: 'Update vendor details or payment status',
    cascadeEffects: [
      'Updates linked budget item amounts',
    ],
  },
  add_hotel_booking: {
    name: 'add_hotel_booking',
    category: 'hotel',
    type: 'mutation',
    description: 'Add a hotel booking for a guest',
    cascadeEffects: [
      'Links to guest record',
      'Updates accommodation count',
    ],
  },
  sync_hotel_guests: {
    name: 'sync_hotel_guests',
    category: 'hotel',
    type: 'query',
    description: 'Get hotel accommodation summary by hotel',
  },
  get_budget_overview: {
    name: 'get_budget_overview',
    category: 'budget',
    type: 'query',
    description: 'Get budget overview with totals and breakdown',
  },
  update_budget_item: {
    name: 'update_budget_item',
    category: 'budget',
    type: 'mutation',
    description: 'Update a budget item',
  },
  search_entities: {
    name: 'search_entities',
    category: 'search',
    type: 'query',
    description: 'Search across all entity types',
  },
  send_communication: {
    name: 'send_communication',
    category: 'communication',
    type: 'mutation',
    description: 'Send email communications to guests, clients, or vendors',
    cascadeEffects: [
      'Logs email in communication history',
      'May update RSVP reminder status for guests',
      'Supports vendor coordination messages',
      'Supports questionnaire reminders',
    ],
  },
  update_pipeline: {
    name: 'update_pipeline',
    category: 'pipeline',
    type: 'mutation',
    description: 'Update a pipeline lead stage or status',
    cascadeEffects: [
      'Creates activity log for stage change',
      'May trigger follow-up reminders',
    ],
  },
  assign_transport: {
    name: 'assign_transport',
    category: 'guest',
    type: 'mutation',
    description: 'Assign transport to guests filtered by hotel, group, or event',
    cascadeEffects: [
      'Creates guest transport records',
      'Updates transport needs flags',
      'May auto-assign to available vehicles',
    ],
  },
  assign_guests_to_events: {
    name: 'assign_guests_to_events',
    category: 'guest',
    type: 'mutation',
    description: 'Assign guests to multiple events (e.g., add family to Mehndi and Reception)',
    cascadeEffects: [
      'Updates attendingEvents array for each guest',
      'May affect event guest counts',
    ],
  },

  // ============================================
  // PHASE 1: QUERY ENHANCEMENT TOOLS
  // ============================================
  query_data: {
    name: 'query_data',
    category: 'search',
    type: 'query',
    description: 'Universal query tool with aggregations (count, sum, avg, list) and filters',
  },
  query_cross_client_events: {
    name: 'query_cross_client_events',
    category: 'search',
    type: 'query',
    description: 'Query events across all clients for a date range',
  },
  budget_currency_convert: {
    name: 'budget_currency_convert',
    category: 'budget',
    type: 'query',
    description: 'Convert budget amounts between currencies',
  },
  get_weather: {
    name: 'get_weather',
    category: 'weather',
    type: 'query',
    description: 'Get weather forecast for wedding date and location',
  },

  // ============================================
  // PHASE 2: BULK & MANAGEMENT TOOLS
  // ============================================
  bulk_add_hotel_bookings: {
    name: 'bulk_add_hotel_bookings',
    category: 'hotel',
    type: 'mutation',
    description: 'Add multiple hotel bookings at once',
    cascadeEffects: [
      'Creates accommodation records for each guest',
      'Updates hotel room counts',
    ],
  },
  update_table_dietary: {
    name: 'update_table_dietary',
    category: 'guest',
    type: 'mutation',
    description: 'Update dietary preferences for all guests at a table',
    cascadeEffects: [
      'Updates meal preference for all guests at the table',
    ],
  },
  add_seating_constraint: {
    name: 'add_seating_constraint',
    category: 'seating',
    type: 'mutation',
    description: 'Add seating constraint (keep guests together or apart)',
    cascadeEffects: [
      'Updates floor plan constraints',
      'May trigger seating revalidation',
    ],
  },
  add_gift: {
    name: 'add_gift',
    category: 'gifts',
    type: 'mutation',
    description: 'Record a gift received from a guest',
    cascadeEffects: [
      'Links gift to guest record',
      'Updates gift statistics',
    ],
  },
  update_gift: {
    name: 'update_gift',
    category: 'gifts',
    type: 'mutation',
    description: 'Update gift status (received, thank you sent)',
    cascadeEffects: [
      'May trigger thank you reminder',
    ],
  },
  update_creative: {
    name: 'update_creative',
    category: 'creatives',
    type: 'mutation',
    description: 'Update creative job status (invitation designs, etc.)',
    cascadeEffects: [
      'Updates approval workflow',
    ],
  },
  assign_team_member: {
    name: 'assign_team_member',
    category: 'team',
    type: 'mutation',
    description: 'Assign team member to a client or task',
    cascadeEffects: [
      'Creates team assignment record',
      'May send notification to team member',
    ],
  },

  // ============================================
  // PHASE 3: BUSINESS OPERATIONS TOOLS
  // ============================================
  create_proposal: {
    name: 'create_proposal',
    category: 'proposals',
    type: 'mutation',
    description: 'Create a new proposal for a lead or client',
    cascadeEffects: [
      'Generates proposal document',
      'Creates public viewing link',
      'Logs pipeline activity',
    ],
  },
  create_invoice: {
    name: 'create_invoice',
    category: 'invoices',
    type: 'mutation',
    description: 'Create an invoice for a client payment',
    cascadeEffects: [
      'Creates invoice record',
      'May trigger payment reminder workflow',
    ],
  },
  export_data: {
    name: 'export_data',
    category: 'exports',
    type: 'query',
    description: 'Export data to Excel or PDF format',
  },
  update_website: {
    name: 'update_website',
    category: 'website',
    type: 'mutation',
    description: 'Update wedding website content or settings',
    cascadeEffects: [
      'Updates website content',
      'May trigger republish',
    ],
  },
  query_analytics: {
    name: 'query_analytics',
    category: 'analytics',
    type: 'query',
    description: 'Query business analytics (revenue, conversions, etc.)',
  },

  // ============================================
  // PHASE 5: AUTOMATION TOOLS
  // ============================================
  create_workflow: {
    name: 'create_workflow',
    category: 'workflows',
    type: 'mutation',
    description: 'Create an automated workflow (e.g., send email on RSVP)',
    cascadeEffects: [
      'Creates workflow definition',
      'Activates trigger listeners',
    ],
  },
  generate_qr_codes: {
    name: 'generate_qr_codes',
    category: 'qr_codes',
    type: 'mutation',
    description: 'Generate QR codes for event check-in',
    cascadeEffects: [
      'Generates QR images for each guest',
      'Creates downloadable PDF',
    ],
  },

  // ============================================
  // CALENDAR SYNC TOOL
  // ============================================
  sync_calendar: {
    name: 'sync_calendar',
    category: 'calendar',
    type: 'mutation',
    description: 'Sync client events to external calendar (Google Calendar or iCal)',
    cascadeEffects: [
      'Creates calendar events for each wedding event',
      'Updates existing synced events if dates changed',
    ],
  },

  // ============================================
  // DOCUMENT UPLOAD TOOL
  // ============================================
  get_document_upload_url: {
    name: 'get_document_upload_url',
    category: 'documents',
    type: 'query',
    description: 'Get a pre-signed URL to upload a document for a client',
  },
}

/**
 * OpenAI function calling tool definitions
 */
export const CHATBOT_TOOLS: ChatCompletionTool[] = [
  // ============================================
  // CLIENT MANAGEMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_client',
      description: 'Create a new wedding client. Auto-creates main event if wedding_date is provided. Auto-generates budget categories based on wedding type.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['partner1FirstName', 'partner1Email'],
        additionalProperties: false,
        properties: {
          partner1FirstName: {
            type: 'string',
            description: 'First name of partner 1 (bride)',
          },
          partner1LastName: {
            type: 'string',
            description: 'Last name of partner 1',
          },
          partner1Email: {
            type: 'string',
            description: 'Email of partner 1',
          },
          partner1Phone: {
            type: 'string',
            description: 'Phone number of partner 1',
          },
          partner2FirstName: {
            type: 'string',
            description: 'First name of partner 2 (groom)',
          },
          partner2LastName: {
            type: 'string',
            description: 'Last name of partner 2',
          },
          partner2Email: {
            type: 'string',
            description: 'Email of partner 2',
          },
          weddingDate: {
            type: 'string',
            description: 'Wedding date in YYYY-MM-DD format',
          },
          venue: {
            type: 'string',
            description: 'Wedding venue name',
          },
          budget: {
            type: 'number',
            description: 'Total wedding budget',
          },
          guestCount: {
            type: 'number',
            description: 'Expected guest count',
          },
          weddingType: {
            type: 'string',
            enum: ['traditional', 'destination', 'intimate', 'elopement', 'multi_day', 'cultural', 'modern', 'rustic', 'bohemian', 'religious', 'luxury'],
            description: 'Type of wedding',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_client',
      description: 'Update an existing wedding client. Changes to wedding details are synced to the main event.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['clientId'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID to update',
          },
          partner1FirstName: {
            type: 'string',
            description: 'First name of partner 1',
          },
          partner1LastName: {
            type: 'string',
            description: 'Last name of partner 1',
          },
          partner1Email: {
            type: 'string',
            description: 'Email of partner 1',
          },
          partner2FirstName: {
            type: 'string',
            description: 'First name of partner 2',
          },
          partner2LastName: {
            type: 'string',
            description: 'Last name of partner 2',
          },
          weddingDate: {
            type: 'string',
            description: 'Wedding date in YYYY-MM-DD format',
          },
          venue: {
            type: 'string',
            description: 'Wedding venue name',
          },
          budget: {
            type: 'number',
            description: 'Total wedding budget',
          },
          guestCount: {
            type: 'number',
            description: 'Expected guest count',
          },
          status: {
            type: 'string',
            enum: ['draft', 'planning', 'confirmed', 'in_progress', 'completed'],
            description: 'Client status',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_client_summary',
      description: 'Get a comprehensive summary of a wedding client including guest count, budget status, upcoming events, and tasks.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID. If not provided, uses current context.',
          },
        },
      },
    },
  },

  // ============================================
  // GUEST MANAGEMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'add_guest',
      description: 'Add a new guest to a wedding. Optionally creates hotel booking or transport record if needed.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['firstName'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID. Uses current context if not provided.',
          },
          firstName: {
            type: 'string',
            description: 'Guest first name',
          },
          lastName: {
            type: 'string',
            description: 'Guest last name',
          },
          email: {
            type: 'string',
            description: 'Guest email',
          },
          phone: {
            type: 'string',
            description: 'Guest phone number',
          },
          rsvpStatus: {
            type: 'string',
            enum: ['pending', 'confirmed', 'declined', 'maybe'],
            description: 'RSVP status',
          },
          mealPreference: {
            type: 'string',
            enum: ['standard', 'vegetarian', 'vegan', 'gluten_free', 'kosher', 'halal', 'other'],
            description: 'Meal preference',
          },
          dietaryRestrictions: {
            type: 'string',
            description: 'Dietary restrictions or allergies',
          },
          groupName: {
            type: 'string',
            description: 'Guest group (e.g., "Bride Family", "College Friends")',
          },
          plusOne: {
            type: 'boolean',
            description: 'Whether guest has a plus one',
          },
          tableNumber: {
            type: 'number',
            description: 'Assigned table number',
          },
          needsHotel: {
            type: 'boolean',
            description: 'Whether guest needs hotel accommodation',
          },
          needsTransport: {
            type: 'boolean',
            description: 'Whether guest needs transportation',
          },
          side: {
            type: 'string',
            enum: ['bride', 'groom', 'mutual'],
            description: 'Which side the guest belongs to',
          },
          eventId: {
            type: 'string',
            description: 'Specific event UUID to associate guest with',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_guest_rsvp',
      description: 'Update the RSVP status for a guest. Can identify guest by ID or name.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['rsvpStatus'],
        additionalProperties: false,
        properties: {
          guestId: {
            type: 'string',
            description: 'Guest UUID',
          },
          guestName: {
            type: 'string',
            description: 'Guest name for fuzzy matching if guestId not provided',
          },
          clientId: {
            type: 'string',
            description: 'Client UUID for context',
          },
          rsvpStatus: {
            type: 'string',
            enum: ['pending', 'confirmed', 'declined', 'maybe'],
            description: 'New RSVP status',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_guest_stats',
      description: 'Get guest statistics including RSVP counts, dietary requirements, hotel needs, and transport needs.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID. Uses current context if not provided.',
          },
          eventId: {
            type: 'string',
            description: 'Filter by specific event',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_update_guests',
      description: 'Update multiple guests at once by IDs or group name.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['updates'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          guestIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific guest UUIDs to update',
          },
          groupName: {
            type: 'string',
            description: 'Update guests in this group',
          },
          updates: {
            type: 'object',
            additionalProperties: false,
            properties: {
              rsvpStatus: {
                type: 'string',
                enum: ['pending', 'confirmed', 'declined', 'maybe'],
              },
              tableNumber: {
                type: 'number',
              },
              needsHotel: {
                type: 'boolean',
              },
              needsTransport: {
                type: 'boolean',
              },
            },
          },
        },
      },
    },
  },

  // ============================================
  // EVENT MANAGEMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Create a new event for a wedding (ceremony, reception, sangeet, etc.). Auto-generates timeline items.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['title', 'eventType', 'eventDate'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID. Uses current context if not provided.',
          },
          title: {
            type: 'string',
            description: 'Event title',
          },
          eventType: {
            type: 'string',
            enum: ['Wedding', 'Mehendi', 'Sangeet', 'Haldi', 'Reception', 'Rehearsal Dinner', 'Engagement', 'Bachelor Party', 'Bridal Shower', 'Other'],
            description: 'Type of event',
          },
          eventDate: {
            type: 'string',
            description: 'Event date in YYYY-MM-DD format',
          },
          startTime: {
            type: 'string',
            description: 'Start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'End time (HH:MM)',
          },
          venueName: {
            type: 'string',
            description: 'Venue name',
          },
          venueAddress: {
            type: 'string',
            description: 'Full venue address',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          guestCount: {
            type: 'number',
            description: 'Expected guests for this event',
          },
          dressCode: {
            type: 'string',
            description: 'Dress code',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event',
      description: 'Update an existing event. Date changes may shift associated timeline items.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['eventId'],
        additionalProperties: false,
        properties: {
          eventId: {
            type: 'string',
            description: 'Event UUID to update',
          },
          title: {
            type: 'string',
            description: 'Event title',
          },
          eventDate: {
            type: 'string',
            description: 'Event date in YYYY-MM-DD format',
          },
          startTime: {
            type: 'string',
            description: 'Start time (HH:MM)',
          },
          endTime: {
            type: 'string',
            description: 'End time (HH:MM)',
          },
          venueName: {
            type: 'string',
            description: 'Venue name',
          },
          venueAddress: {
            type: 'string',
            description: 'Full venue address',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          status: {
            type: 'string',
            enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
            description: 'Event status',
          },
        },
      },
    },
  },

  // ============================================
  // TIMELINE MANAGEMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'add_timeline_item',
      description: 'Add an item to the wedding day timeline.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['title', 'startTime'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          eventId: {
            type: 'string',
            description: 'Event to add timeline item to',
          },
          title: {
            type: 'string',
            description: 'Timeline item title',
          },
          description: {
            type: 'string',
            description: 'Timeline item description',
          },
          startTime: {
            type: 'string',
            description: 'Start time (HH:MM or full datetime)',
          },
          endTime: {
            type: 'string',
            description: 'End time (HH:MM or full datetime)',
          },
          durationMinutes: {
            type: 'number',
            description: 'Duration in minutes',
          },
          location: {
            type: 'string',
            description: 'Location within venue',
          },
          vendorId: {
            type: 'string',
            description: 'Associated vendor UUID',
          },
          assignee: {
            type: 'string',
            description: 'Person responsible',
          },
          phase: {
            type: 'string',
            enum: ['preparation', 'ceremony', 'reception', 'post_event'],
            description: 'Timeline phase',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'shift_timeline',
      description: 'Shift all timeline items by a specified duration. Useful when schedule needs to be pushed back or forward.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['shiftMinutes'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID',
          },
          shiftMinutes: {
            type: 'number',
            description: 'Minutes to shift (positive = later, negative = earlier)',
          },
          startFromItemId: {
            type: 'string',
            description: 'Only shift items after this item',
          },
          affectedPhase: {
            type: 'string',
            enum: ['preparation', 'ceremony', 'reception', 'post_event'],
            description: 'Only shift items in this phase',
          },
        },
      },
    },
  },

  // ============================================
  // VENDOR MANAGEMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'add_vendor',
      description: 'Add a new vendor to a wedding. Auto-creates budget item and timeline entry if service date provided.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['name', 'category'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          name: {
            type: 'string',
            description: 'Vendor name',
          },
          category: {
            type: 'string',
            enum: ['venue', 'catering', 'photography', 'videography', 'florals', 'music', 'dj', 'decor', 'bakery', 'transportation', 'beauty', 'officiant', 'rentals', 'stationery', 'planner', 'entertainment', 'other'],
            description: 'Vendor category',
          },
          contactName: {
            type: 'string',
            description: 'Contact person name',
          },
          email: {
            type: 'string',
            description: 'Vendor email',
          },
          phone: {
            type: 'string',
            description: 'Vendor phone',
          },
          website: {
            type: 'string',
            description: 'Vendor website',
          },
          estimatedCost: {
            type: 'number',
            description: 'Estimated cost',
          },
          depositAmount: {
            type: 'number',
            description: 'Deposit amount',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
          eventId: {
            type: 'string',
            description: 'Specific event to associate with',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_vendor',
      description: 'Update vendor details or payment status. Can identify vendor by ID or name.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          vendorId: {
            type: 'string',
            description: 'Vendor UUID',
          },
          vendorName: {
            type: 'string',
            description: 'Vendor name for fuzzy matching',
          },
          clientId: {
            type: 'string',
            description: 'Client UUID for context',
          },
          contactName: {
            type: 'string',
            description: 'Contact person name',
          },
          email: {
            type: 'string',
            description: 'Vendor email',
          },
          phone: {
            type: 'string',
            description: 'Vendor phone',
          },
          estimatedCost: {
            type: 'number',
            description: 'Estimated cost',
          },
          depositAmount: {
            type: 'number',
            description: 'Deposit amount',
          },
          paymentStatus: {
            type: 'string',
            enum: ['pending', 'deposit_paid', 'partial', 'paid', 'refunded'],
            description: 'Payment status',
          },
          approvalStatus: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
            description: 'Approval status',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
  },

  // ============================================
  // HOTEL MANAGEMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'add_hotel_booking',
      description: 'Add a hotel booking for a guest. Can identify guest by ID or name.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['hotelName', 'checkInDate', 'checkOutDate'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          guestId: {
            type: 'string',
            description: 'Guest UUID',
          },
          guestName: {
            type: 'string',
            description: 'Guest name for matching',
          },
          hotelName: {
            type: 'string',
            description: 'Hotel name',
          },
          roomType: {
            type: 'string',
            description: 'Room type (e.g., "King Suite")',
          },
          checkInDate: {
            type: 'string',
            description: 'Check-in date (YYYY-MM-DD)',
          },
          checkOutDate: {
            type: 'string',
            description: 'Check-out date (YYYY-MM-DD)',
          },
          confirmationNumber: {
            type: 'string',
            description: 'Hotel confirmation number',
          },
          roomRate: {
            type: 'number',
            description: 'Nightly room rate',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sync_hotel_guests',
      description: 'Get hotel accommodation summary grouped by hotel.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          hotelName: {
            type: 'string',
            description: 'Filter to specific hotel',
          },
        },
      },
    },
  },

  // ============================================
  // BUDGET
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_budget_overview',
      description: 'Get budget overview with totals, breakdown by category, and payment status.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          category: {
            type: 'string',
            description: 'Filter by budget category',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_budget_item',
      description: 'Update a budget item amount or payment status.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          budgetItemId: {
            type: 'string',
            description: 'Budget item UUID',
          },
          clientId: {
            type: 'string',
            description: 'Client UUID for context',
          },
          category: {
            type: 'string',
            description: 'Category to find item',
          },
          item: {
            type: 'string',
            description: 'Item name to find',
          },
          estimatedCost: {
            type: 'number',
            description: 'Estimated cost',
          },
          actualCost: {
            type: 'number',
            description: 'Actual cost',
          },
          paidAmount: {
            type: 'number',
            description: 'Amount paid',
          },
          paymentStatus: {
            type: 'string',
            enum: ['pending', 'deposit_paid', 'partial', 'paid'],
            description: 'Payment status',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
  },

  // ============================================
  // SEARCH
  // ============================================
  {
    type: 'function',
    function: {
      name: 'search_entities',
      description: 'Search across all entity types (clients, guests, events, vendors, etc.).',
      strict: true,
      parameters: {
        type: 'object',
        required: ['query'],
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          clientId: {
            type: 'string',
            description: 'Limit search to specific client',
          },
          entityTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['client', 'guest', 'event', 'vendor', 'hotel', 'budget', 'timeline'],
            },
            description: 'Filter to specific entity types',
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default 10)',
          },
        },
      },
    },
  },

  // ============================================
  // COMMUNICATION
  // ============================================
  {
    type: 'function',
    function: {
      name: 'send_communication',
      description: 'Send email communications to guests, clients, or vendors. Supports RSVP reminders, wedding reminders, vendor coordination, questionnaire reminders, and custom messages.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['communicationType'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          communicationType: {
            type: 'string',
            enum: ['rsvp_reminder', 'wedding_reminder', 'vendor_reminder', 'questionnaire_reminder', 'custom'],
            description: 'Type of communication to send',
          },
          recipientType: {
            type: 'string',
            enum: ['all_guests', 'pending_rsvp', 'confirmed_guests', 'specific_guest', 'client', 'all_vendors', 'vendor_category', 'specific_vendor'],
            description: 'Who to send the communication to',
          },
          guestId: {
            type: 'string',
            description: 'Specific guest UUID (if recipientType is specific_guest)',
          },
          guestName: {
            type: 'string',
            description: 'Guest name for fuzzy matching (if recipientType is specific_guest)',
          },
          vendorId: {
            type: 'string',
            description: 'Specific vendor UUID (if recipientType is specific_vendor)',
          },
          vendorName: {
            type: 'string',
            description: 'Vendor name for fuzzy matching',
          },
          vendorCategory: {
            type: 'string',
            enum: ['venue', 'catering', 'photography', 'videography', 'florals', 'music', 'dj', 'decor', 'bakery', 'transportation', 'beauty', 'officiant', 'rentals', 'stationery', 'planner', 'entertainment', 'other'],
            description: 'Vendor category (if recipientType is vendor_category)',
          },
          subject: {
            type: 'string',
            description: 'Email subject (for custom communications)',
          },
          message: {
            type: 'string',
            description: 'Custom message content',
          },
          language: {
            type: 'string',
            enum: ['en', 'es', 'hi', 'fr', 'de', 'pt', 'zh'],
            description: 'Language for template-based messages (default: en)',
          },
        },
      },
    },
  },

  // ============================================
  // PIPELINE
  // ============================================
  {
    type: 'function',
    function: {
      name: 'update_pipeline',
      description: 'Update a pipeline lead - move to different stage, update status, or add activity.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          leadId: {
            type: 'string',
            description: 'Lead UUID',
          },
          leadName: {
            type: 'string',
            description: 'Lead name for fuzzy matching',
          },
          stageId: {
            type: 'string',
            description: 'New stage UUID to move lead to',
          },
          stageName: {
            type: 'string',
            description: 'Stage name for matching (e.g., "proposal", "negotiation", "won")',
          },
          status: {
            type: 'string',
            enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost'],
            description: 'New lead status',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Lead priority',
          },
          notes: {
            type: 'string',
            description: 'Activity notes to add',
          },
        },
      },
    },
  },

  // ============================================
  // WEDDING SUMMARY (Full Report)
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_wedding_summary',
      description: 'Get a comprehensive wedding summary report including all events, guest statistics, budget breakdown, vendor status, upcoming tasks, and action items. Use this when the user asks for a "summary", "overview", or "status report" of a wedding.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          includeActionItems: {
            type: 'boolean',
            description: 'Include recommended action items (default true)',
          },
        },
      },
    },
  },

  // ============================================
  // DAY-OF ASSISTANT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'check_in_guest',
      description: 'Fast check-in for day-of event management. Marks a guest as arrived and returns their details (table, dietary, notes).',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          guestId: {
            type: 'string',
            description: 'Guest UUID',
          },
          guestName: {
            type: 'string',
            description: 'Guest name for fuzzy matching',
          },
          guestNumber: {
            type: 'number',
            description: 'Guest list number (for quick check-in)',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID to check into',
          },
        },
      },
    },
  },

  // ============================================
  // PROACTIVE RECOMMENDATIONS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description: 'Get proactive recommendations and alerts for a wedding. Returns payment reminders, incomplete RSVPs, seating issues, and other action items.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['payments', 'rsvp', 'seating', 'timeline', 'vendors', 'all'],
            },
            description: 'Categories of recommendations to include',
          },
        },
      },
    },
  },

  // ============================================
  // TRANSPORT ASSIGNMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'assign_transport',
      description: 'Assign transport (vehicle/shuttle) to guests. Can filter by hotel, group name, event, or specific guests. Example: "Assign shuttle A to all guests at Marriott for ceremony transport"',
      strict: true,
      parameters: {
        type: 'object',
        required: ['vehicleInfo'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          vehicleInfo: {
            type: 'string',
            description: 'Vehicle description (e.g., "Shuttle A", "Bus 1", "Sedan")',
          },
          vehicleType: {
            type: 'string',
            enum: ['sedan', 'suv', 'bus', 'van', 'tempo', 'shuttle', 'other'],
            description: 'Type of vehicle',
          },
          hotelName: {
            type: 'string',
            description: 'Filter guests by hotel name',
          },
          groupName: {
            type: 'string',
            description: 'Filter guests by group name',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID for transport destination',
          },
          eventName: {
            type: 'string',
            description: 'Event name for fuzzy matching (e.g., "ceremony", "reception")',
          },
          guestIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific guest UUIDs to assign',
          },
          pickupDate: {
            type: 'string',
            description: 'Pickup date (YYYY-MM-DD)',
          },
          pickupTime: {
            type: 'string',
            description: 'Pickup time (HH:MM)',
          },
          pickupFrom: {
            type: 'string',
            description: 'Pickup location',
          },
          dropTo: {
            type: 'string',
            description: 'Drop-off location',
          },
          driverPhone: {
            type: 'string',
            description: 'Driver phone number',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
  },

  // ============================================
  // MULTI-EVENT GUEST ASSIGNMENT
  // ============================================
  {
    type: 'function',
    function: {
      name: 'assign_guests_to_events',
      description: 'Assign guests to multiple events. Can filter by last name (family), group name, or specific guests. Example: "Add all Sharma family guests to Mehndi and Reception events"',
      strict: true,
      parameters: {
        type: 'object',
        required: ['eventIds'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          eventIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Event UUIDs to assign guests to',
          },
          eventNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Event names for fuzzy matching (e.g., ["Mehndi", "Reception"])',
          },
          lastName: {
            type: 'string',
            description: 'Filter guests by last name (family)',
          },
          groupName: {
            type: 'string',
            description: 'Filter guests by group name',
          },
          guestIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific guest UUIDs to assign',
          },
          side: {
            type: 'string',
            enum: ['bride', 'groom', 'mutual'],
            description: 'Filter guests by side',
          },
          rsvpStatus: {
            type: 'string',
            enum: ['pending', 'confirmed', 'declined', 'maybe'],
            description: 'Filter guests by RSVP status',
          },
          replaceExisting: {
            type: 'boolean',
            description: 'Replace existing event assignments (default: false, adds to existing)',
          },
        },
      },
    },
  },

  // ============================================
  // PHASE 1: QUERY ENHANCEMENT TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'query_data',
      description: 'Universal query tool with aggregations and filters. Use for questions like "How many guests confirmed?", "Total budget spent?", "List vendors by category". Supports count, sum, avg, and list operations.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['entityType', 'operation'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID. Uses current context if not provided.',
          },
          entityType: {
            type: 'string',
            enum: ['guests', 'events', 'vendors', 'budget', 'timeline', 'hotels', 'gifts', 'tasks'],
            description: 'Type of entity to query',
          },
          operation: {
            type: 'string',
            enum: ['count', 'sum', 'avg', 'list', 'group_by'],
            description: 'Operation to perform',
          },
          field: {
            type: 'string',
            description: 'Field to aggregate (for sum/avg operations)',
          },
          groupByField: {
            type: 'string',
            description: 'Field to group by (for group_by operation)',
          },
          filters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: {
                type: 'string',
                description: 'Filter by status (e.g., confirmed, pending)',
              },
              category: {
                type: 'string',
                description: 'Filter by category',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter by date range start (YYYY-MM-DD or natural language like "today", "this week")',
              },
              dateTo: {
                type: 'string',
                description: 'Filter by date range end',
              },
              paymentStatus: {
                type: 'string',
                enum: ['pending', 'deposit_paid', 'partial', 'paid'],
                description: 'Filter by payment status',
              },
              rsvpStatus: {
                type: 'string',
                enum: ['pending', 'confirmed', 'declined', 'maybe'],
                description: 'Filter by RSVP status',
              },
              mealPreference: {
                type: 'string',
                enum: ['standard', 'vegetarian', 'vegan', 'gluten_free', 'kosher', 'halal', 'other'],
                description: 'Filter by meal preference',
              },
              eventId: {
                type: 'string',
                description: 'Filter by event',
              },
              side: {
                type: 'string',
                enum: ['bride', 'groom', 'mutual'],
                description: 'Filter by guest side',
              },
            },
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return for list operation (default 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_cross_client_events',
      description: 'Query events across all clients. Use for questions like "All events this weekend", "Upcoming weddings in March". Returns events from all clients you have access to.',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          dateFrom: {
            type: 'string',
            description: 'Start date (YYYY-MM-DD or "today", "this weekend", "next week")',
          },
          dateTo: {
            type: 'string',
            description: 'End date (YYYY-MM-DD)',
          },
          eventType: {
            type: 'string',
            enum: ['Wedding', 'Mehendi', 'Sangeet', 'Haldi', 'Reception', 'Rehearsal Dinner', 'Engagement', 'Bachelor Party', 'Bridal Shower', 'Other'],
            description: 'Filter by event type',
          },
          status: {
            type: 'string',
            enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
            description: 'Filter by event status',
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default 20)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'budget_currency_convert',
      description: 'Convert budget amounts between currencies. Use for questions like "Show total in USD", "What is ₹150,000 in USD?". Supports major currencies.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['targetCurrency'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID to get budget totals',
          },
          amount: {
            type: 'number',
            description: 'Specific amount to convert',
          },
          sourceCurrency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN'],
            description: 'Source currency (default: client currency or USD)',
          },
          targetCurrency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN'],
            description: 'Target currency to convert to',
          },
          includeBreakdown: {
            type: 'boolean',
            description: 'Include category breakdown in target currency',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather forecast for wedding date and location. Use for questions like "What\'s the weather for the wedding date?", "Will it rain on Saturday?"',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID to get wedding date and venue',
          },
          date: {
            type: 'string',
            description: 'Specific date to check (YYYY-MM-DD or "tomorrow", "Saturday")',
          },
          location: {
            type: 'string',
            description: 'Location to check (uses venue if not provided)',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID to get date and location from',
          },
        },
      },
    },
  },

  // ============================================
  // PHASE 2: BULK & MANAGEMENT TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'bulk_add_hotel_bookings',
      description: 'Add hotel bookings for multiple guests at once. Use for "Book 20 rooms at Hilton for groom\'s family" or "Assign all out-of-town guests to Marriott".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['hotelName', 'checkInDate', 'checkOutDate'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          hotelName: {
            type: 'string',
            description: 'Hotel name',
          },
          roomType: {
            type: 'string',
            description: 'Room type (e.g., "Standard", "Deluxe", "Suite")',
          },
          checkInDate: {
            type: 'string',
            description: 'Check-in date (YYYY-MM-DD)',
          },
          checkOutDate: {
            type: 'string',
            description: 'Check-out date (YYYY-MM-DD)',
          },
          roomRate: {
            type: 'number',
            description: 'Nightly room rate',
          },
          guestIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific guest UUIDs to assign',
          },
          groupName: {
            type: 'string',
            description: 'Filter guests by group (e.g., "Groom Family")',
          },
          side: {
            type: 'string',
            enum: ['bride', 'groom', 'mutual'],
            description: 'Filter guests by side',
          },
          needsHotelOnly: {
            type: 'boolean',
            description: 'Only assign to guests marked as needing hotel (default true)',
          },
          roomCount: {
            type: 'number',
            description: 'Maximum number of rooms to book',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_table_dietary',
      description: 'Update dietary preference for all guests at a table. Use for "Mark table 7 as vegetarian" or "Set table 3 as gluten-free".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['tableNumber', 'mealPreference'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID (if seating varies by event)',
          },
          tableNumber: {
            type: 'number',
            description: 'Table number to update',
          },
          mealPreference: {
            type: 'string',
            enum: ['standard', 'vegetarian', 'vegan', 'gluten_free', 'kosher', 'halal', 'other'],
            description: 'Meal preference to set',
          },
          dietaryRestrictions: {
            type: 'string',
            description: 'Additional dietary restrictions note',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_seating_constraint',
      description: 'Add a seating constraint to keep guests together or apart. Use for "Keep Raj and Vikram 3 tables apart" or "Seat all Sharma family together".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['constraintType'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID',
          },
          constraintType: {
            type: 'string',
            enum: ['keep_together', 'keep_apart', 'same_table', 'different_table', 'near_head_table', 'away_from_speakers'],
            description: 'Type of seating constraint',
          },
          guestIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Guest UUIDs involved in constraint',
          },
          guestNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Guest names for fuzzy matching',
          },
          groupName: {
            type: 'string',
            description: 'Group name (e.g., "Sharma family")',
          },
          minimumDistance: {
            type: 'number',
            description: 'Minimum tables apart (for keep_apart)',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'required'],
            description: 'Constraint priority',
          },
          reason: {
            type: 'string',
            description: 'Reason for constraint',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_gift',
      description: 'Record a gift received from a guest. Use for "Add gift from Sharma family: Silver serving set worth $500".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          guestId: {
            type: 'string',
            description: 'Guest UUID who gave the gift',
          },
          guestName: {
            type: 'string',
            description: 'Guest name for matching',
          },
          name: {
            type: 'string',
            description: 'Gift name/description',
          },
          type: {
            type: 'string',
            enum: ['physical', 'cash', 'check', 'registry', 'experience', 'other'],
            description: 'Gift type',
          },
          value: {
            type: 'number',
            description: 'Estimated value',
          },
          quantity: {
            type: 'number',
            description: 'Quantity (default 1)',
          },
          notes: {
            type: 'string',
            description: 'Additional notes',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_gift',
      description: 'Update gift status. Use for "Mark gift from Sharma family as received" or "Send thank you for Johnson gift".',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          giftId: {
            type: 'string',
            description: 'Gift UUID',
          },
          clientId: {
            type: 'string',
            description: 'Client UUID for context',
          },
          guestName: {
            type: 'string',
            description: 'Guest name to find gift by',
          },
          giftName: {
            type: 'string',
            description: 'Gift name to find',
          },
          status: {
            type: 'string',
            enum: ['pending', 'received', 'acknowledged', 'returned'],
            description: 'Gift status',
          },
          thankYouSent: {
            type: 'boolean',
            description: 'Mark thank you as sent',
          },
          notes: {
            type: 'string',
            description: 'Update notes',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_creative',
      description: 'Update creative job status (invitations, signage, etc.). Use for "Update invitation status to approved" or "Mark save-the-dates as completed".',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          creativeId: {
            type: 'string',
            description: 'Creative job UUID',
          },
          clientId: {
            type: 'string',
            description: 'Client UUID for context',
          },
          creativeName: {
            type: 'string',
            description: 'Creative job name to find',
          },
          creativeType: {
            type: 'string',
            description: 'Creative type to find (e.g., "invitation", "signage")',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'review', 'approved', 'rejected', 'completed'],
            description: 'New status',
          },
          approvalStatus: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'needs_revision'],
            description: 'Approval status',
          },
          approvalComments: {
            type: 'string',
            description: 'Approval comments',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Priority level',
          },
          assignedTo: {
            type: 'string',
            description: 'Team member to assign to',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_team_member',
      description: 'Assign a team member to handle a client or specific task. Use for "Assign Sarah to vendor coordination" or "Add Maria to Sharma wedding team".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['teamMemberName'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          teamMemberId: {
            type: 'string',
            description: 'Team member UUID',
          },
          teamMemberName: {
            type: 'string',
            description: 'Team member name for matching',
          },
          role: {
            type: 'string',
            enum: ['lead_planner', 'coordinator', 'assistant', 'vendor_liaison', 'guest_coordinator', 'day_of_coordinator'],
            description: 'Role on this client',
          },
          responsibilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific responsibilities (e.g., ["vendor coordination", "timeline management"])',
          },
        },
      },
    },
  },

  // ============================================
  // PHASE 3: BUSINESS OPERATIONS TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_proposal',
      description: 'Create a proposal for a lead or client. Use for "Create proposal for new lead, $15,000 package" or "Generate proposal for Sharma wedding".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          leadId: {
            type: 'string',
            description: 'Lead UUID',
          },
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          leadName: {
            type: 'string',
            description: 'Lead name for matching',
          },
          title: {
            type: 'string',
            description: 'Proposal title',
          },
          templateId: {
            type: 'string',
            description: 'Proposal template UUID to use',
          },
          packageAmount: {
            type: 'number',
            description: 'Total package amount',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN'],
            description: 'Currency (default USD)',
          },
          services: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of services to include',
          },
          validDays: {
            type: 'number',
            description: 'Days until proposal expires (default 30)',
          },
          notes: {
            type: 'string',
            description: 'Custom notes for proposal',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: 'Create an invoice for a client. Use for "Create invoice for Patel, $5,000 first installment" or "Invoice for final payment".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['amount'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          clientName: {
            type: 'string',
            description: 'Client name for matching',
          },
          amount: {
            type: 'number',
            description: 'Invoice amount',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN'],
            description: 'Currency (default USD)',
          },
          description: {
            type: 'string',
            description: 'Invoice description',
          },
          invoiceType: {
            type: 'string',
            enum: ['deposit', 'progress', 'final', 'custom'],
            description: 'Type of invoice',
          },
          dueDate: {
            type: 'string',
            description: 'Due date (YYYY-MM-DD or "in 14 days")',
          },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                amount: { type: 'number' },
              },
            },
            description: 'Individual line items',
          },
          notes: {
            type: 'string',
            description: 'Invoice notes',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_data',
      description: 'Export data to Excel or PDF. Use for "Export guest list for caterer" or "Download budget breakdown".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['exportType', 'format'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          exportType: {
            type: 'string',
            enum: ['guest_list', 'budget', 'vendor_list', 'timeline', 'seating_chart', 'dietary_summary', 'hotel_manifest', 'transport_schedule'],
            description: 'Type of data to export',
          },
          format: {
            type: 'string',
            enum: ['excel', 'pdf', 'csv'],
            description: 'Export format',
          },
          filters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              eventId: { type: 'string' },
              rsvpStatus: { type: 'string' },
              includeContactInfo: { type: 'boolean' },
              includeDietary: { type: 'boolean' },
            },
          },
          recipientEmail: {
            type: 'string',
            description: 'Email to send export to',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_website',
      description: 'Update wedding website content. Use for "Update venue on Sharma website" or "Change RSVP deadline on website".',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          websiteId: {
            type: 'string',
            description: 'Website UUID',
          },
          section: {
            type: 'string',
            enum: ['hero', 'our_story', 'event_details', 'travel', 'registry', 'gallery', 'rsvp', 'faq'],
            description: 'Section to update',
          },
          content: {
            type: 'object',
            description: 'Content to update (depends on section)',
          },
          settings: {
            type: 'object',
            additionalProperties: false,
            properties: {
              theme: { type: 'string' },
              published: { type: 'boolean' },
              passwordProtected: { type: 'boolean' },
              rsvpDeadline: { type: 'string' },
            },
          },
          venueName: {
            type: 'string',
            description: 'Update venue name',
          },
          venueAddress: {
            type: 'string',
            description: 'Update venue address',
          },
          weddingDate: {
            type: 'string',
            description: 'Update wedding date',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_analytics',
      description: 'Query business analytics. Use for "Show revenue this quarter" or "How many weddings completed this year?".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['metric'],
        additionalProperties: false,
        properties: {
          metric: {
            type: 'string',
            enum: ['revenue', 'bookings', 'leads', 'conversions', 'average_deal_size', 'weddings_completed', 'upcoming_weddings'],
            description: 'Metric to query',
          },
          period: {
            type: 'string',
            enum: ['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'last_month', 'last_quarter', 'last_year', 'custom'],
            description: 'Time period',
          },
          dateFrom: {
            type: 'string',
            description: 'Custom start date (YYYY-MM-DD)',
          },
          dateTo: {
            type: 'string',
            description: 'Custom end date (YYYY-MM-DD)',
          },
          groupBy: {
            type: 'string',
            enum: ['day', 'week', 'month', 'quarter', 'source', 'planner'],
            description: 'Group results by',
          },
          compareWithPrevious: {
            type: 'boolean',
            description: 'Compare with previous period',
          },
        },
      },
    },
  },

  // ============================================
  // PHASE 5: AUTOMATION TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_workflow',
      description: 'Create an automated workflow. Use for "When RSVP received, send confirmation email" or "Send reminder 1 week before wedding".',
      strict: true,
      parameters: {
        type: 'object',
        required: ['name', 'triggerType', 'actionType'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            description: 'Workflow name',
          },
          description: {
            type: 'string',
            description: 'Workflow description',
          },
          triggerType: {
            type: 'string',
            enum: ['rsvp_received', 'rsvp_confirmed', 'rsvp_declined', 'payment_received', 'payment_overdue', 'event_approaching', 'lead_stage_change', 'client_created', 'proposal_accepted', 'contract_signed', 'scheduled', 'manual'],
            description: 'What triggers this workflow',
          },
          triggerConfig: {
            type: 'object',
            additionalProperties: false,
            properties: {
              daysBeforeEvent: { type: 'number' },
              stageId: { type: 'string' },
              stageName: { type: 'string' },
              scheduleTime: { type: 'string' },
            },
          },
          actionType: {
            type: 'string',
            enum: ['send_email', 'send_sms', 'create_task', 'update_status', 'notify_team', 'webhook'],
            description: 'Action to perform',
          },
          actionConfig: {
            type: 'object',
            additionalProperties: false,
            properties: {
              emailTemplateId: { type: 'string' },
              emailSubject: { type: 'string' },
              emailBody: { type: 'string' },
              smsMessage: { type: 'string' },
              taskTitle: { type: 'string' },
              assignTo: { type: 'string' },
              webhookUrl: { type: 'string' },
            },
          },
          isActive: {
            type: 'boolean',
            description: 'Activate workflow immediately (default true)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_qr_codes',
      description: 'Generate QR codes for guest check-in. Use for "Generate QR codes for sangeet guests" or "Create check-in QR sheet".',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID',
          },
          eventId: {
            type: 'string',
            description: 'Event UUID to generate QR for',
          },
          eventName: {
            type: 'string',
            description: 'Event name for matching',
          },
          guestIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific guest UUIDs (optional, generates for all if not provided)',
          },
          rsvpStatusFilter: {
            type: 'string',
            enum: ['confirmed', 'all'],
            description: 'Filter by RSVP status (default confirmed)',
          },
          format: {
            type: 'string',
            enum: ['pdf', 'images', 'individual'],
            description: 'Output format (default pdf)',
          },
          includeDetails: {
            type: 'boolean',
            description: 'Include guest details on QR sheet',
          },
        },
      },
    },
  },

  // ============================================
  // CALENDAR SYNC TOOL
  // ============================================
  {
    type: 'function',
    function: {
      name: 'sync_calendar',
      description: 'Sync client events to external calendar (Google Calendar or iCal feed). Use for "Sync all Patel events to my Google Calendar" or "Set up calendar sync for this wedding".',
      strict: true,
      parameters: {
        type: 'object',
        required: [],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID to sync events for',
          },
          clientName: {
            type: 'string',
            description: 'Client name for fuzzy matching',
          },
          calendarType: {
            type: 'string',
            enum: ['google', 'ical'],
            description: 'Calendar type to sync to (default: google if connected, otherwise ical)',
          },
          eventIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific event UUIDs to sync (syncs all if not provided)',
          },
          includeTimeline: {
            type: 'boolean',
            description: 'Include timeline items as sub-events (default false)',
          },
        },
      },
    },
  },

  // ============================================
  // DOCUMENT UPLOAD TOOL
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_document_upload_url',
      description: 'Get a pre-signed URL to upload a document. Use for "Upload new version of the contract" or "I want to upload a document for the Sharma wedding". Returns an upload URL that the UI will use to open a file picker.',
      strict: true,
      parameters: {
        type: 'object',
        required: ['fileName'],
        additionalProperties: false,
        properties: {
          clientId: {
            type: 'string',
            description: 'Client UUID to upload document for',
          },
          clientName: {
            type: 'string',
            description: 'Client name for fuzzy matching',
          },
          fileName: {
            type: 'string',
            description: 'Name for the document file',
          },
          fileType: {
            type: 'string',
            enum: ['contract', 'invoice', 'photo', 'proposal', 'questionnaire', 'other'],
            description: 'Type of document (default: other)',
          },
          description: {
            type: 'string',
            description: 'Description of the document',
          },
        },
      },
    },
  },
]

/**
 * Get tool metadata by name
 */
export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return TOOL_METADATA[toolName]
}

/**
 * Check if a tool is a query (read-only) or mutation
 */
export function isQueryTool(toolName: string): boolean {
  const metadata = TOOL_METADATA[toolName]
  return metadata?.type === 'query'
}

/**
 * Check if a tool is a mutation
 */
export function isMutationTool(toolName: string): boolean {
  const metadata = TOOL_METADATA[toolName]
  return metadata?.type === 'mutation'
}

/**
 * Get cascade effects for a tool
 */
export function getCascadeEffects(toolName: string): string[] {
  const metadata = TOOL_METADATA[toolName]
  return metadata?.cascadeEffects || []
}
