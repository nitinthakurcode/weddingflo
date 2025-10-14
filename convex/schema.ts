import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Companies with AI Config
  companies: defineTable({
    company_name: v.string(),
    subdomain: v.string(),
    custom_domain: v.optional(v.string()),

    // White-label branding
    branding: v.object({
      logo_url: v.optional(v.string()),
      app_icon_url: v.optional(v.string()),
      primary_color: v.string(),
      secondary_color: v.string(),
      accent_color: v.string(),
      font_family: v.string(),
      custom_css: v.optional(v.string()),
    }),

    // AI Configuration
    ai_config: v.object({
      enabled: v.boolean(),
      seating_ai_enabled: v.boolean(),
      budget_predictions_enabled: v.boolean(),
      auto_timeline_enabled: v.boolean(),
      email_assistant_enabled: v.boolean(),
      voice_assistant_enabled: v.boolean(),
    }),

    // Subscription with Stripe integration
    subscription: v.object({
      tier: v.union(
        v.literal('starter'),
        v.literal('professional'),
        v.literal('enterprise')
      ),
      status: v.union(
        v.literal('active'),
        v.literal('trial'),
        v.literal('past_due'),
        v.literal('canceled'),
        v.literal('incomplete'),
        v.literal('incomplete_expired'),
        v.literal('trialing'),
        v.literal('unpaid')
      ),
      trial_ends_at: v.optional(v.number()),
      billing_cycle: v.string(),

      // Stripe IDs
      stripe_customer_id: v.optional(v.string()),
      stripe_subscription_id: v.optional(v.string()),
      stripe_price_id: v.optional(v.string()),

      // Billing details
      current_period_start: v.optional(v.number()),
      current_period_end: v.optional(v.number()),
      cancel_at_period_end: v.optional(v.boolean()),
      canceled_at: v.optional(v.number()),
    }),

    // Analytics
    usage_stats: v.object({
      total_weddings: v.number(),
      active_weddings: v.number(),
      total_guests: v.number(),
      storage_used_mb: v.number(),
      ai_queries_this_month: v.number(),
    }),

    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_subdomain', ['subdomain'])
    .index('by_custom_domain', ['custom_domain']),

  // Users with preferences
  users: defineTable({
    clerk_id: v.string(),
    email: v.string(),
    name: v.string(),
    avatar_url: v.optional(v.string()),
    company_id: v.id('companies'),

    role: v.union(
      v.literal('super_admin'),
      v.literal('company_admin'),
      v.literal('staff'),
      v.literal('client_viewer')
    ),

    // User preferences
    preferences: v.object({
      theme: v.union(v.literal('light'), v.literal('dark'), v.literal('auto')),
      notifications_enabled: v.boolean(),
      email_digest: v.union(v.literal('daily'), v.literal('weekly'), v.literal('never')),
      language: v.string(),
      timezone: v.string(),
    }),

    // Activity tracking
    last_active_at: v.number(),
    last_ip: v.optional(v.string()),
    device_info: v.optional(v.string()),

    created_at: v.number(),
  })
    .index('by_clerk_id', ['clerk_id'])
    .index('by_company', ['company_id']),

  // Clients with AI insights
  clients: defineTable({
    company_id: v.id('companies'),
    clerk_id: v.string(),

    // Basic info
    client_name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    wedding_date: v.number(),
    venue: v.optional(v.string()),
    venue_coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),

    // Planning status
    planning_stage: v.union(
      v.literal('inquiry'),
      v.literal('consultation'),
      v.literal('early_planning'),
      v.literal('mid_planning'),
      v.literal('final_details'),
      v.literal('week_of'),
      v.literal('completed')
    ),

    // AI-generated insights
    ai_insights: v.object({
      completion_percentage: v.number(),
      risk_factors: v.array(v.string()),
      recommendations: v.array(v.string()),
      budget_health: v.string(),
      timeline_status: v.string(),
      predicted_completion_date: v.optional(v.number()),
    }),

    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_company', ['company_id'])
    .index('by_clerk_id', ['clerk_id'])
    .index('by_wedding_date', ['wedding_date'])
    .searchIndex('search_clients', {
      searchField: 'client_name',
      filterFields: ['company_id'],
    }),

  // Events - wedding events associated with clients
  events: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    name: v.string(),
    event_type: v.union(v.literal('wedding'), v.literal('corporate')),
    event_date: v.number(),
    venue: v.string(),
    guest_count: v.number(),
    status: v.union(
      v.literal('planning'),
      v.literal('confirmed'),
      v.literal('completed')
    ),
    budget: v.number(),
  })
    .index('by_company', ['company_id'])
    .index('by_client', ['client_id'])
    .index('by_date', ['event_date']),

  // Guest List with AI
  guests: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),

    // Basic info
    serial_number: v.number(),
    guest_name: v.string(),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),

    // Guest details
    number_of_packs: v.number(),
    additional_guest_names: v.array(v.string()),
    mode_of_arrival: v.optional(v.string()),
    arrival_date_time: v.optional(v.number()),
    mode_of_departure: v.optional(v.string()),
    departure_date_time: v.optional(v.number()),
    relationship_to_family: v.optional(v.string()),
    guest_category: v.optional(v.string()),
    events_attending: v.array(v.string()),

    // Preferences
    dietary_restrictions: v.array(v.string()),
    special_needs: v.optional(v.string()),
    seating_preferences: v.array(v.string()),

    // QR System
    qr_code_token: v.string(),
    qr_scan_count: v.number(),
    qr_last_scanned: v.optional(v.number()),

    // Form status
    form_submitted: v.boolean(),
    form_submitted_at: v.optional(v.number()),
    form_ip_address: v.optional(v.string()),

    // Check-in status
    checked_in: v.boolean(),
    checked_in_at: v.optional(v.number()),
    checked_in_by: v.optional(v.id('users')),
    checked_in_location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),

    // AI-suggested seating
    ai_suggested_table: v.optional(v.number()),
    ai_compatibility_score: v.optional(v.number()),

    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_qr_token', ['qr_code_token'])
    .index('by_check_in_status', ['client_id', 'checked_in'])
    .searchIndex('search_guests', {
      searchField: 'guest_name',
      filterFields: ['company_id', 'client_id'],
    }),

  // Hotel Details with smart allocation
  hotel_details: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    guest_id: v.id('guests'),

    accommodation_status: v.boolean(),
    hotel_name: v.optional(v.string()),
    hotel_id: v.optional(v.id('hotels')),
    room_number: v.optional(v.string()),
    room_type: v.optional(v.string()),
    check_in_date: v.optional(v.number()),
    check_out_date: v.optional(v.number()),

    // Smart allocation
    ai_hotel_recommendation: v.optional(v.string()),
    distance_from_venue_km: v.optional(v.number()),

    checked_in: v.boolean(),
    checked_out: v.boolean(),

    // Costs
    nightly_rate: v.optional(v.number()),
    total_cost: v.optional(v.number()),
    paid_by: v.optional(v.string()),

    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_guest', ['guest_id'])
    .index('by_hotel', ['hotel_id']),

  // Hotels database
  hotels: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),

    hotel_name: v.string(),
    address: v.string(),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    phone: v.string(),
    email: v.optional(v.string()),
    website: v.optional(v.string()),

    // Room inventory
    room_types: v.array(
      v.object({
        type: v.string(),
        capacity: v.number(),
        rate_per_night: v.number(),
        total_rooms: v.number(),
        blocked_rooms: v.number(),
        available_rooms: v.number(),
      })
    ),

    amenities: v.array(v.string()),
    rating: v.optional(v.number()),

    created_at: v.number(),
    updated_at: v.number(),
  }).index('by_client', ['client_id']),

  // Weddings table (added for multi-wedding support)
  weddings: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    wedding_name: v.string(),
    wedding_date: v.number(),
    venue: v.optional(v.string()),
    status: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_company', ['company_id']),

  // Gift Management with tracking
  gifts: defineTable({
    weddingId: v.id('weddings'),
    guestId: v.optional(v.id('guests')),
    guestName: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    receivedDate: v.string(),
    deliveryStatus: v.union(
      v.literal('pending'),
      v.literal('in_transit'),
      v.literal('delivered'),
      v.literal('returned')
    ),
    deliveryTrackingNumber: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    thankYouStatus: v.union(
      v.literal('not_sent'),
      v.literal('draft'),
      v.literal('sent')
    ),
    thankYouSentDate: v.optional(v.string()),
    thankYouNotes: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    photoStorageId: v.optional(v.id('_storage')),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  })
    .index('by_wedding', ['weddingId'])
    .index('by_guest', ['guestId'])
    .index('by_delivery_status', ['weddingId', 'deliveryStatus'])
    .index('by_thank_you_status', ['weddingId', 'thankYouStatus']),

  // Vendor Management with performance tracking
  vendors: defineTable({
    weddingId: v.id('weddings'),
    name: v.string(),
    category: v.union(
      v.literal('venue'),
      v.literal('catering'),
      v.literal('photography'),
      v.literal('videography'),
      v.literal('florist'),
      v.literal('music'),
      v.literal('decor'),
      v.literal('transportation'),
      v.literal('stationery'),
      v.literal('hair_makeup'),
      v.literal('attire'),
      v.literal('cake'),
      v.literal('other')
    ),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.union(
      v.literal('prospect'),
      v.literal('contacted'),
      v.literal('quoted'),
      v.literal('booked'),
      v.literal('confirmed'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
    contractDate: v.optional(v.string()),
    serviceDate: v.optional(v.string()),
    totalCost: v.number(),
    depositAmount: v.optional(v.number()),
    depositPaidDate: v.optional(v.string()),
    balance: v.optional(v.number()),
    payments: v.array(
      v.object({
        id: v.string(),
        amount: v.number(),
        dueDate: v.string(),
        paidDate: v.optional(v.string()),
        status: v.union(v.literal('unpaid'), v.literal('partial'), v.literal('paid')),
        method: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    budgetItemId: v.optional(v.id('event_budget')),
    contractUrl: v.optional(v.string()),
    contractStorageId: v.optional(v.id('_storage')),
    rating: v.optional(v.number()),
    performanceNotes: v.optional(v.string()),
    wouldRecommend: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
    .index('by_wedding', ['weddingId'])
    .index('by_category', ['weddingId', 'category'])
    .index('by_status', ['weddingId', 'status'])
    .searchIndex('search_vendors', {
      searchField: 'name',
      filterFields: ['weddingId'],
    }),

  // Creatives Management with progress tracking
  creatives: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),

    creative_name: v.string(),
    creative_type: v.string(),
    creative_category: v.optional(v.string()),

    // Job details
    num_of_jobs_quantity: v.number(),
    jobs_completed: v.number(),
    job_start_date: v.number(),
    job_end_date: v.number(),
    actual_end_date: v.optional(v.number()),

    // Status with progress
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('review'),
      v.literal('approved'),
      v.literal('completed')
    ),
    progress_percentage: v.number(),

    // Files
    file_urls: v.array(v.string()),
    thumbnail_url: v.optional(v.string()),

    // Assignment
    assigned_to: v.optional(v.string()),

    details: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_status', ['client_id', 'status']),

  // Event Budget with AI predictions
  event_budget: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),

    expense_details: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    event_name: v.string(),

    // Financial
    budget: v.number(),
    estimated_cost: v.number(),
    actual_cost: v.number(),
    variance: v.number(),
    variance_percentage: v.number(),

    // Payment tracking
    paid_amount: v.number(),
    pending_amount: v.number(),
    transaction_date: v.optional(v.number()),
    payment_method: v.optional(v.string()),
    paid_by: v.optional(v.string()),

    // Receipt
    receipt_url: v.optional(v.string()),
    receipt_ocr_data: v.optional(v.any()),

    // Vendor link
    vendor_id: v.optional(v.id('vendors')),

    // AI prediction
    ai_predicted_final_cost: v.optional(v.number()),
    ai_confidence_score: v.optional(v.number()),

    // Priority
    priority: v.union(
      v.literal('critical'),
      v.literal('high'),
      v.literal('medium'),
      v.literal('low')
    ),

    notes: v.optional(v.string()),
    tags: v.array(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_category', ['client_id', 'category'])
    .index('by_vendor', ['vendor_id']),

  // Budget summary (materialized view)
  budget_summary: defineTable({
    client_id: v.id('clients'),

    total_budget: v.number(),
    total_estimated: v.number(),
    total_actual: v.number(),
    total_paid: v.number(),
    total_pending: v.number(),

    // By category
    category_breakdown: v.array(
      v.object({
        category: v.string(),
        budget: v.number(),
        actual: v.number(),
        variance: v.number(),
      })
    ),

    // AI insights
    budget_health: v.union(
      v.literal('excellent'),
      v.literal('good'),
      v.literal('warning'),
      v.literal('critical')
    ),
    overbudget_categories: v.array(v.string()),
    savings_opportunities: v.array(v.string()),

    last_updated: v.number(),
  }).index('by_client', ['client_id']),

  // Event Brief
  event_brief: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),

    event_name: v.string(),
    event_type: v.string(),
    date: v.number(),

    // Timing
    start_time: v.string(),
    end_time: v.string(),
    duration_hours: v.number(),

    // Venue
    venue: v.string(),
    venue_address: v.optional(v.string()),
    venue_coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    venue_capacity: v.optional(v.number()),

    // Activity details
    activity: v.string(),
    activity_description: v.optional(v.string()),

    // Vendors & Resources
    required_vendors: v.array(v.id('vendors')),
    required_equipment: v.array(v.string()),

    // Booking status
    already_booked: v.boolean(),
    booking_confirmation: v.optional(v.string()),

    // Weather consideration (AI)
    weather_forecast: v.optional(
      v.object({
        temperature: v.number(),
        condition: v.string(),
        rain_probability: v.number(),
        fetched_at: v.number(),
      })
    ),
    backup_plan: v.optional(v.string()),

    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_date', ['client_id', 'date']),

  // Event Flow with AI optimization
  event_flow: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    event_id: v.optional(v.id('event_brief')),

    date: v.number(),
    activity: v.string(),
    activity_type: v.string(),
    activity_description: v.optional(v.string()),

    // Timing (auto-calculated end_time)
    start_time: v.string(),
    duration_minutes: v.number(),
    end_time: v.string(),
    buffer_minutes: v.optional(v.number()),

    // Location & Assignment
    event: v.string(),
    location: v.string(),
    manager: v.string(),
    responsible_vendor: v.optional(v.id('vendors')),

    // Order for timeline
    order: v.number(),

    // Dependencies
    depends_on: v.array(v.id('event_flow')),
    blocks: v.array(v.id('event_flow')),

    // AI optimization
    ai_optimized: v.boolean(),
    ai_suggested_start_time: v.optional(v.string()),
    ai_conflict_detected: v.boolean(),
    ai_suggestions: v.array(v.string()),

    // Status
    status: v.union(
      v.literal('planned'),
      v.literal('confirmed'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('delayed')
    ),

    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_client', ['client_id'])
    .index('by_event', ['event_id', 'order'])
    .index('by_date_order', ['client_id', 'date', 'order']),

  // Timeline conflicts (auto-detected)
  timeline_conflicts: defineTable({
    client_id: v.id('clients'),
    event_flow_id_1: v.id('event_flow'),
    event_flow_id_2: v.id('event_flow'),

    conflict_type: v.string(),
    severity: v.union(v.literal('critical'), v.literal('warning'), v.literal('minor')),

    description: v.string(),
    ai_resolution_suggestion: v.optional(v.string()),

    resolved: v.boolean(),
    resolved_at: v.optional(v.number()),

    created_at: v.number(),
  }).index('by_client', ['client_id', 'resolved']),

  // Internal Chat with AI assistant
  messages: defineTable({
    company_id: v.id('companies'),
    client_id: v.id('clients'),

    sender_type: v.union(
      v.literal('company'),
      v.literal('client'),
      v.literal('ai_assistant')
    ),
    sender_id: v.optional(v.string()),
    sender_name: v.string(),

    message: v.string(),
    message_html: v.optional(v.string()),

    // Attachments
    attachments: v.array(
      v.object({
        url: v.string(),
        filename: v.string(),
        size: v.number(),
        type: v.string(),
      })
    ),

    // Thread
    thread_id: v.optional(v.string()),
    reply_to: v.optional(v.id('messages')),

    // Status
    read: v.boolean(),
    read_by: v.array(v.string()),
    read_at: v.optional(v.number()),

    // AI features
    ai_generated: v.boolean(),
    sentiment: v.optional(v.string()),

    created_at: v.number(),
    edited_at: v.optional(v.number()),
  })
    .index('by_client', ['client_id', 'created_at'])
    .index('by_thread', ['thread_id']),

  // AI Conversation Context
  ai_conversations: defineTable({
    client_id: v.id('clients'),
    user_id: v.string(),

    conversation_history: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),

    context_embedding: v.optional(v.any()),

    last_interaction: v.number(),
    created_at: v.number(),
  }).index('by_client_user', ['client_id', 'user_id']),

  // Notifications with push support
  notifications: defineTable({
    user_id: v.string(),
    company_id: v.id('companies'),
    client_id: v.optional(v.id('clients')),

    type: v.string(),
    title: v.string(),
    message: v.string(),

    // Actions
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),

    // Status
    read: v.boolean(),
    read_at: v.optional(v.number()),

    // Push notification
    push_sent: v.boolean(),
    push_sent_at: v.optional(v.number()),

    priority: v.union(v.literal('high'), v.literal('normal'), v.literal('low')),

    created_at: v.number(),
    expires_at: v.optional(v.number()),
  })
    .index('by_user', ['user_id', 'read'])
    .index('by_client', ['client_id']),

  // Activity Log with audit trail
  activity_log: defineTable({
    company_id: v.id('companies'),
    client_id: v.optional(v.id('clients')),
    user_id: v.string(),

    action: v.string(),
    entity_type: v.string(),
    entity_id: v.string(),

    // Change tracking
    changes: v.optional(v.any()),
    previous_value: v.optional(v.any()),
    new_value: v.optional(v.any()),

    // Context
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    device_type: v.optional(v.string()),

    created_at: v.number(),
  })
    .index('by_company', ['company_id', 'created_at'])
    .index('by_client', ['client_id', 'created_at'])
    .index('by_user', ['user_id', 'created_at']),

  // Creative Jobs (Kanban-based workflow)
  creative_jobs: defineTable({
    weddingId: v.id('weddings'),
    type: v.union(
      v.literal('invitation'),
      v.literal('save_the_date'),
      v.literal('program'),
      v.literal('menu'),
      v.literal('place_card'),
      v.literal('table_number'),
      v.literal('signage'),
      v.literal('thank_you_card'),
      v.literal('website'),
      v.literal('photo_album'),
      v.literal('video'),
      v.literal('other')
    ),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('review'),
      v.literal('approved'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('urgent')
    ),
    assigned_to: v.optional(v.string()),
    vendor_id: v.optional(v.id('vendors')),
    due_date: v.optional(v.string()),
    completed_date: v.optional(v.string()),
    progress: v.number(), // 0-100
    budget: v.optional(v.number()),
    actual_cost: v.optional(v.number()),
    files: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
        size: v.number(),
        storage_id: v.optional(v.id('_storage')),
        url: v.optional(v.string()),
        thumbnail_url: v.optional(v.string()),
        uploaded_at: v.number(),
        version: v.number(),
      })
    ),
    feedback: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_wedding', ['weddingId'])
    .index('by_status', ['weddingId', 'status'])
    .index('by_priority', ['weddingId', 'priority']),

  // Analytics & Insights
  analytics_snapshots: defineTable({
    client_id: v.id('clients'),
    snapshot_date: v.number(),

    metrics: v.object({
      guests_total: v.number(),
      guests_confirmed: v.number(),
      guests_checked_in: v.number(),
      budget_spent_percentage: v.number(),
      tasks_completed_percentage: v.number(),
      vendors_confirmed: v.number(),
      days_until_wedding: v.number(),
    }),

    insights: v.array(
      v.object({
        type: v.string(),
        severity: v.string(),
        message: v.string(),
        recommendation: v.string(),
      })
    ),

    created_at: v.number(),
  }).index('by_client', ['client_id', 'snapshot_date']),
});
