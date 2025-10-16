"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const values_1 = require("convex/values");
exports.default = (0, server_1.defineSchema)({
    // Companies with AI Config
    companies: (0, server_1.defineTable)({
        company_name: values_1.v.string(),
        subdomain: values_1.v.string(),
        custom_domain: values_1.v.optional(values_1.v.string()),
        // White-label branding
        branding: values_1.v.object({
            logo_url: values_1.v.optional(values_1.v.string()),
            app_icon_url: values_1.v.optional(values_1.v.string()),
            primary_color: values_1.v.string(),
            secondary_color: values_1.v.string(),
            accent_color: values_1.v.string(),
            text_color: values_1.v.optional(values_1.v.string()), // Manual text color override
            font_family: values_1.v.string(),
            custom_css: values_1.v.optional(values_1.v.string()),
        }),
        // AI Configuration
        ai_config: values_1.v.object({
            enabled: values_1.v.boolean(),
            seating_ai_enabled: values_1.v.boolean(),
            budget_predictions_enabled: values_1.v.boolean(),
            auto_timeline_enabled: values_1.v.boolean(),
            email_assistant_enabled: values_1.v.boolean(),
            voice_assistant_enabled: values_1.v.boolean(),
        }),
        // Subscription with Stripe integration
        subscription: values_1.v.object({
            tier: values_1.v.union(values_1.v.literal('starter'), values_1.v.literal('professional'), values_1.v.literal('enterprise')),
            status: values_1.v.union(values_1.v.literal('active'), values_1.v.literal('trial'), values_1.v.literal('past_due'), values_1.v.literal('canceled'), values_1.v.literal('incomplete'), values_1.v.literal('incomplete_expired'), values_1.v.literal('trialing'), values_1.v.literal('unpaid'), values_1.v.literal('paused')),
            trial_ends_at: values_1.v.optional(values_1.v.number()),
            billing_cycle: values_1.v.string(),
            // Stripe IDs
            stripe_customer_id: values_1.v.optional(values_1.v.string()),
            stripe_subscription_id: values_1.v.optional(values_1.v.string()),
            stripe_price_id: values_1.v.optional(values_1.v.string()),
            // Billing details
            current_period_start: values_1.v.optional(values_1.v.number()),
            current_period_end: values_1.v.optional(values_1.v.number()),
            cancel_at_period_end: values_1.v.optional(values_1.v.boolean()),
            canceled_at: values_1.v.optional(values_1.v.number()),
        }),
        // Analytics
        usage_stats: values_1.v.object({
            total_weddings: values_1.v.number(),
            active_weddings: values_1.v.number(),
            total_guests: values_1.v.number(),
            storage_used_mb: values_1.v.number(),
            ai_queries_this_month: values_1.v.number(),
        }),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_subdomain', ['subdomain'])
        .index('by_custom_domain', ['custom_domain']),
    // Users with preferences
    users: (0, server_1.defineTable)({
        clerk_id: values_1.v.string(),
        email: values_1.v.string(),
        name: values_1.v.string(),
        avatar_url: values_1.v.optional(values_1.v.string()),
        company_id: values_1.v.id('companies'),
        role: values_1.v.union(values_1.v.literal('super_admin'), values_1.v.literal('company_admin'), values_1.v.literal('staff'), values_1.v.literal('client_viewer')),
        // User preferences
        preferences: values_1.v.object({
            theme: values_1.v.union(values_1.v.literal('light'), values_1.v.literal('dark'), values_1.v.literal('auto')),
            notifications_enabled: values_1.v.boolean(),
            email_digest: values_1.v.union(values_1.v.literal('daily'), values_1.v.literal('weekly'), values_1.v.literal('never')),
            language: values_1.v.string(),
            timezone: values_1.v.string(),
        }),
        // Activity tracking
        last_active_at: values_1.v.number(),
        last_ip: values_1.v.optional(values_1.v.string()),
        device_info: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
    })
        .index('by_clerk_id', ['clerk_id'])
        .index('by_company', ['company_id']),
    // Clients with AI insights
    clients: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        clerk_id: values_1.v.string(),
        // Basic info
        client_name: values_1.v.string(),
        email: values_1.v.string(),
        phone: values_1.v.optional(values_1.v.string()),
        wedding_date: values_1.v.number(),
        venue: values_1.v.optional(values_1.v.string()),
        venue_coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        // Planning status
        planning_stage: values_1.v.union(values_1.v.literal('inquiry'), values_1.v.literal('consultation'), values_1.v.literal('early_planning'), values_1.v.literal('mid_planning'), values_1.v.literal('final_details'), values_1.v.literal('week_of'), values_1.v.literal('completed')),
        // AI-generated insights
        ai_insights: values_1.v.object({
            completion_percentage: values_1.v.number(),
            risk_factors: values_1.v.array(values_1.v.string()),
            recommendations: values_1.v.array(values_1.v.string()),
            budget_health: values_1.v.string(),
            timeline_status: values_1.v.string(),
            predicted_completion_date: values_1.v.optional(values_1.v.number()),
        }),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_company', ['company_id'])
        .index('by_clerk_id', ['clerk_id'])
        .index('by_wedding_date', ['wedding_date'])
        .searchIndex('search_clients', {
        searchField: 'client_name',
        filterFields: ['company_id'],
    }),
    // Events - wedding events associated with clients
    events: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        name: values_1.v.string(),
        event_type: values_1.v.union(values_1.v.literal('wedding'), values_1.v.literal('corporate')),
        event_date: values_1.v.number(),
        venue: values_1.v.string(),
        guest_count: values_1.v.number(),
        status: values_1.v.union(values_1.v.literal('planning'), values_1.v.literal('confirmed'), values_1.v.literal('completed')),
        budget: values_1.v.number(),
    })
        .index('by_company', ['company_id'])
        .index('by_client', ['client_id'])
        .index('by_date', ['event_date']),
    // Guest List with AI
    guests: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        // Basic info
        serial_number: values_1.v.number(),
        guest_name: values_1.v.string(),
        phone_number: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        // Guest details
        number_of_packs: values_1.v.number(),
        additional_guest_names: values_1.v.array(values_1.v.string()),
        mode_of_arrival: values_1.v.optional(values_1.v.string()),
        arrival_date_time: values_1.v.optional(values_1.v.number()),
        mode_of_departure: values_1.v.optional(values_1.v.string()),
        departure_date_time: values_1.v.optional(values_1.v.number()),
        relationship_to_family: values_1.v.optional(values_1.v.string()),
        guest_category: values_1.v.optional(values_1.v.string()),
        events_attending: values_1.v.array(values_1.v.string()),
        // Preferences
        dietary_restrictions: values_1.v.array(values_1.v.string()),
        special_needs: values_1.v.optional(values_1.v.string()),
        seating_preferences: values_1.v.array(values_1.v.string()),
        // QR System
        qr_code_token: values_1.v.string(),
        qr_scan_count: values_1.v.number(),
        qr_last_scanned: values_1.v.optional(values_1.v.number()),
        // Form status
        form_submitted: values_1.v.boolean(),
        form_submitted_at: values_1.v.optional(values_1.v.number()),
        form_ip_address: values_1.v.optional(values_1.v.string()),
        // Check-in status
        checked_in: values_1.v.boolean(),
        checked_in_at: values_1.v.optional(values_1.v.number()),
        checked_in_by: values_1.v.optional(values_1.v.id('users')),
        checked_in_location: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        // AI-suggested seating
        ai_suggested_table: values_1.v.optional(values_1.v.number()),
        ai_compatibility_score: values_1.v.optional(values_1.v.number()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_qr_token', ['qr_code_token'])
        .index('by_check_in_status', ['client_id', 'checked_in'])
        .searchIndex('search_guests', {
        searchField: 'guest_name',
        filterFields: ['company_id', 'client_id'],
    }),
    // Hotel Details with smart allocation
    hotel_details: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        guest_id: values_1.v.id('guests'),
        accommodation_status: values_1.v.boolean(),
        hotel_name: values_1.v.optional(values_1.v.string()),
        hotel_id: values_1.v.optional(values_1.v.id('hotels')),
        room_number: values_1.v.optional(values_1.v.string()),
        room_type: values_1.v.optional(values_1.v.string()),
        check_in_date: values_1.v.optional(values_1.v.number()),
        check_out_date: values_1.v.optional(values_1.v.number()),
        // Smart allocation
        ai_hotel_recommendation: values_1.v.optional(values_1.v.string()),
        distance_from_venue_km: values_1.v.optional(values_1.v.number()),
        checked_in: values_1.v.boolean(),
        checked_out: values_1.v.boolean(),
        // Costs
        nightly_rate: values_1.v.optional(values_1.v.number()),
        total_cost: values_1.v.optional(values_1.v.number()),
        paid_by: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_guest', ['guest_id'])
        .index('by_hotel', ['hotel_id']),
    // Hotels database
    hotels: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        hotel_name: values_1.v.string(),
        address: values_1.v.string(),
        coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        phone: values_1.v.string(),
        email: values_1.v.optional(values_1.v.string()),
        website: values_1.v.optional(values_1.v.string()),
        // Room inventory
        room_types: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            capacity: values_1.v.number(),
            rate_per_night: values_1.v.number(),
            total_rooms: values_1.v.number(),
            blocked_rooms: values_1.v.number(),
            available_rooms: values_1.v.number(),
        })),
        amenities: values_1.v.array(values_1.v.string()),
        rating: values_1.v.optional(values_1.v.number()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    }).index('by_client', ['client_id']),
    // Weddings table (added for multi-wedding support)
    weddings: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        wedding_name: values_1.v.string(),
        wedding_date: values_1.v.number(),
        venue: values_1.v.optional(values_1.v.string()),
        status: values_1.v.string(),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_company', ['company_id']),
    // Gift Management with tracking
    gifts: (0, server_1.defineTable)({
        weddingId: values_1.v.id('weddings'),
        guestId: values_1.v.optional(values_1.v.id('guests')),
        guestName: values_1.v.string(),
        description: values_1.v.string(),
        category: values_1.v.optional(values_1.v.string()),
        estimatedValue: values_1.v.optional(values_1.v.number()),
        receivedDate: values_1.v.string(),
        deliveryStatus: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_transit'), values_1.v.literal('delivered'), values_1.v.literal('returned')),
        deliveryTrackingNumber: values_1.v.optional(values_1.v.string()),
        deliveryNotes: values_1.v.optional(values_1.v.string()),
        thankYouStatus: values_1.v.union(values_1.v.literal('not_sent'), values_1.v.literal('draft'), values_1.v.literal('sent')),
        thankYouSentDate: values_1.v.optional(values_1.v.string()),
        thankYouNotes: values_1.v.optional(values_1.v.string()),
        photoUrl: values_1.v.optional(values_1.v.string()),
        photoStorageId: values_1.v.optional(values_1.v.id('_storage')),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
        notes: values_1.v.optional(values_1.v.string()),
    })
        .index('by_wedding', ['weddingId'])
        .index('by_guest', ['guestId'])
        .index('by_delivery_status', ['weddingId', 'deliveryStatus'])
        .index('by_thank_you_status', ['weddingId', 'thankYouStatus']),
    // Vendor Management with performance tracking
    vendors: (0, server_1.defineTable)({
        weddingId: values_1.v.id('weddings'),
        name: values_1.v.string(),
        category: values_1.v.union(values_1.v.literal('venue'), values_1.v.literal('catering'), values_1.v.literal('photography'), values_1.v.literal('videography'), values_1.v.literal('florist'), values_1.v.literal('music'), values_1.v.literal('decor'), values_1.v.literal('transportation'), values_1.v.literal('stationery'), values_1.v.literal('hair_makeup'), values_1.v.literal('attire'), values_1.v.literal('cake'), values_1.v.literal('other')),
        contactName: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        phone: values_1.v.optional(values_1.v.string()),
        website: values_1.v.optional(values_1.v.string()),
        address: values_1.v.optional(values_1.v.string()),
        status: values_1.v.union(values_1.v.literal('prospect'), values_1.v.literal('contacted'), values_1.v.literal('quoted'), values_1.v.literal('booked'), values_1.v.literal('confirmed'), values_1.v.literal('completed'), values_1.v.literal('cancelled')),
        contractDate: values_1.v.optional(values_1.v.string()),
        serviceDate: values_1.v.optional(values_1.v.string()),
        totalCost: values_1.v.number(),
        depositAmount: values_1.v.optional(values_1.v.number()),
        depositPaidDate: values_1.v.optional(values_1.v.string()),
        balance: values_1.v.optional(values_1.v.number()),
        payments: values_1.v.array(values_1.v.object({
            id: values_1.v.string(),
            amount: values_1.v.number(),
            dueDate: values_1.v.string(),
            paidDate: values_1.v.optional(values_1.v.string()),
            status: values_1.v.union(values_1.v.literal('unpaid'), values_1.v.literal('partial'), values_1.v.literal('paid')),
            method: values_1.v.optional(values_1.v.string()),
            notes: values_1.v.optional(values_1.v.string()),
        })),
        budgetItemId: values_1.v.optional(values_1.v.id('event_budget')),
        contractUrl: values_1.v.optional(values_1.v.string()),
        contractStorageId: values_1.v.optional(values_1.v.id('_storage')),
        rating: values_1.v.optional(values_1.v.number()),
        performanceNotes: values_1.v.optional(values_1.v.string()),
        wouldRecommend: values_1.v.optional(values_1.v.boolean()),
        notes: values_1.v.optional(values_1.v.string()),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
    })
        .index('by_wedding', ['weddingId'])
        .index('by_category', ['weddingId', 'category'])
        .index('by_status', ['weddingId', 'status'])
        .searchIndex('search_vendors', {
        searchField: 'name',
        filterFields: ['weddingId'],
    }),
    // Creatives Management with progress tracking
    creatives: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        creative_name: values_1.v.string(),
        creative_type: values_1.v.string(),
        creative_category: values_1.v.optional(values_1.v.string()),
        // Job details
        num_of_jobs_quantity: values_1.v.number(),
        jobs_completed: values_1.v.number(),
        job_start_date: values_1.v.number(),
        job_end_date: values_1.v.number(),
        actual_end_date: values_1.v.optional(values_1.v.number()),
        // Status with progress
        status: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed')),
        progress_percentage: values_1.v.number(),
        // Files
        file_urls: values_1.v.array(values_1.v.string()),
        thumbnail_url: values_1.v.optional(values_1.v.string()),
        // Assignment
        assigned_to: values_1.v.optional(values_1.v.string()),
        details: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_status', ['client_id', 'status']),
    // Event Budget with AI predictions
    event_budget: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        expense_details: values_1.v.string(),
        category: values_1.v.string(),
        subcategory: values_1.v.optional(values_1.v.string()),
        event_name: values_1.v.string(),
        // Financial
        budget: values_1.v.number(),
        estimated_cost: values_1.v.number(),
        actual_cost: values_1.v.number(),
        variance: values_1.v.number(),
        variance_percentage: values_1.v.number(),
        // Payment tracking
        paid_amount: values_1.v.number(),
        pending_amount: values_1.v.number(),
        transaction_date: values_1.v.optional(values_1.v.number()),
        payment_method: values_1.v.optional(values_1.v.string()),
        paid_by: values_1.v.optional(values_1.v.string()),
        // Receipt
        receipt_url: values_1.v.optional(values_1.v.string()),
        receipt_ocr_data: values_1.v.optional(values_1.v.any()),
        // Vendor link
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        // AI prediction
        ai_predicted_final_cost: values_1.v.optional(values_1.v.number()),
        ai_confidence_score: values_1.v.optional(values_1.v.number()),
        // Priority
        priority: values_1.v.union(values_1.v.literal('critical'), values_1.v.literal('high'), values_1.v.literal('medium'), values_1.v.literal('low')),
        notes: values_1.v.optional(values_1.v.string()),
        tags: values_1.v.array(values_1.v.string()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_category', ['client_id', 'category'])
        .index('by_vendor', ['vendor_id']),
    // Budget summary (materialized view)
    budget_summary: (0, server_1.defineTable)({
        client_id: values_1.v.id('clients'),
        total_budget: values_1.v.number(),
        total_estimated: values_1.v.number(),
        total_actual: values_1.v.number(),
        total_paid: values_1.v.number(),
        total_pending: values_1.v.number(),
        // By category
        category_breakdown: values_1.v.array(values_1.v.object({
            category: values_1.v.string(),
            budget: values_1.v.number(),
            actual: values_1.v.number(),
            variance: values_1.v.number(),
        })),
        // AI insights
        budget_health: values_1.v.union(values_1.v.literal('excellent'), values_1.v.literal('good'), values_1.v.literal('warning'), values_1.v.literal('critical')),
        overbudget_categories: values_1.v.array(values_1.v.string()),
        savings_opportunities: values_1.v.array(values_1.v.string()),
        last_updated: values_1.v.number(),
    }).index('by_client', ['client_id']),
    // Event Brief
    event_brief: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        event_name: values_1.v.string(),
        event_type: values_1.v.string(),
        date: values_1.v.number(),
        // Timing
        start_time: values_1.v.string(),
        end_time: values_1.v.string(),
        duration_hours: values_1.v.number(),
        // Venue
        venue: values_1.v.string(),
        venue_address: values_1.v.optional(values_1.v.string()),
        venue_coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        venue_capacity: values_1.v.optional(values_1.v.number()),
        // Activity details
        activity: values_1.v.string(),
        activity_description: values_1.v.optional(values_1.v.string()),
        // Vendors & Resources
        required_vendors: values_1.v.array(values_1.v.id('vendors')),
        required_equipment: values_1.v.array(values_1.v.string()),
        // Booking status
        already_booked: values_1.v.boolean(),
        booking_confirmation: values_1.v.optional(values_1.v.string()),
        // Weather consideration (AI)
        weather_forecast: values_1.v.optional(values_1.v.object({
            temperature: values_1.v.number(),
            condition: values_1.v.string(),
            rain_probability: values_1.v.number(),
            fetched_at: values_1.v.number(),
        })),
        backup_plan: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_date', ['client_id', 'date']),
    // Event Flow with AI optimization
    event_flow: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        event_id: values_1.v.optional(values_1.v.id('event_brief')),
        date: values_1.v.number(),
        activity: values_1.v.string(),
        activity_type: values_1.v.string(),
        activity_description: values_1.v.optional(values_1.v.string()),
        // Timing (auto-calculated end_time)
        start_time: values_1.v.string(),
        duration_minutes: values_1.v.number(),
        end_time: values_1.v.string(),
        buffer_minutes: values_1.v.optional(values_1.v.number()),
        // Location & Assignment
        event: values_1.v.string(),
        location: values_1.v.string(),
        manager: values_1.v.string(),
        responsible_vendor: values_1.v.optional(values_1.v.id('vendors')),
        // Order for timeline
        order: values_1.v.number(),
        // Dependencies
        depends_on: values_1.v.array(values_1.v.id('event_flow')),
        blocks: values_1.v.array(values_1.v.id('event_flow')),
        // AI optimization
        ai_optimized: values_1.v.boolean(),
        ai_suggested_start_time: values_1.v.optional(values_1.v.string()),
        ai_conflict_detected: values_1.v.boolean(),
        ai_suggestions: values_1.v.array(values_1.v.string()),
        // Status
        status: values_1.v.union(values_1.v.literal('planned'), values_1.v.literal('confirmed'), values_1.v.literal('in_progress'), values_1.v.literal('completed'), values_1.v.literal('delayed')),
        notes: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_client', ['client_id'])
        .index('by_event', ['event_id', 'order'])
        .index('by_date_order', ['client_id', 'date', 'order']),
    // Timeline conflicts (auto-detected)
    timeline_conflicts: (0, server_1.defineTable)({
        client_id: values_1.v.id('clients'),
        event_flow_id_1: values_1.v.id('event_flow'),
        event_flow_id_2: values_1.v.id('event_flow'),
        conflict_type: values_1.v.string(),
        severity: values_1.v.union(values_1.v.literal('critical'), values_1.v.literal('warning'), values_1.v.literal('minor')),
        description: values_1.v.string(),
        ai_resolution_suggestion: values_1.v.optional(values_1.v.string()),
        resolved: values_1.v.boolean(),
        resolved_at: values_1.v.optional(values_1.v.number()),
        created_at: values_1.v.number(),
    }).index('by_client', ['client_id', 'resolved']),
    // Internal Chat with AI assistant
    messages: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        sender_type: values_1.v.union(values_1.v.literal('company'), values_1.v.literal('client'), values_1.v.literal('ai_assistant')),
        sender_id: values_1.v.optional(values_1.v.string()),
        sender_name: values_1.v.string(),
        message: values_1.v.string(),
        message_html: values_1.v.optional(values_1.v.string()),
        // Attachments
        attachments: values_1.v.array(values_1.v.object({
            url: values_1.v.string(),
            filename: values_1.v.string(),
            size: values_1.v.number(),
            type: values_1.v.string(),
        })),
        // Thread
        thread_id: values_1.v.optional(values_1.v.string()),
        reply_to: values_1.v.optional(values_1.v.id('messages')),
        // Status
        read: values_1.v.boolean(),
        read_by: values_1.v.array(values_1.v.string()),
        read_at: values_1.v.optional(values_1.v.number()),
        // AI features
        ai_generated: values_1.v.boolean(),
        sentiment: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
        edited_at: values_1.v.optional(values_1.v.number()),
    })
        .index('by_client', ['client_id', 'created_at'])
        .index('by_thread', ['thread_id']),
    // AI Conversation Context
    ai_conversations: (0, server_1.defineTable)({
        client_id: values_1.v.id('clients'),
        user_id: values_1.v.string(),
        conversation_history: values_1.v.array(values_1.v.object({
            role: values_1.v.string(),
            content: values_1.v.string(),
            timestamp: values_1.v.number(),
        })),
        context_embedding: values_1.v.optional(values_1.v.any()),
        last_interaction: values_1.v.number(),
        created_at: values_1.v.number(),
    }).index('by_client_user', ['client_id', 'user_id']),
    // Notifications with push support
    notifications: (0, server_1.defineTable)({
        user_id: values_1.v.string(),
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.optional(values_1.v.id('clients')),
        type: values_1.v.string(),
        title: values_1.v.string(),
        message: values_1.v.string(),
        // Actions
        action_url: values_1.v.optional(values_1.v.string()),
        action_label: values_1.v.optional(values_1.v.string()),
        // Status
        read: values_1.v.boolean(),
        read_at: values_1.v.optional(values_1.v.number()),
        // Push notification
        push_sent: values_1.v.boolean(),
        push_sent_at: values_1.v.optional(values_1.v.number()),
        priority: values_1.v.union(values_1.v.literal('high'), values_1.v.literal('normal'), values_1.v.literal('low')),
        created_at: values_1.v.number(),
        expires_at: values_1.v.optional(values_1.v.number()),
    })
        .index('by_user', ['user_id', 'read'])
        .index('by_client', ['client_id']),
    // Activity Log with audit trail
    activity_log: (0, server_1.defineTable)({
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.optional(values_1.v.id('clients')),
        user_id: values_1.v.string(),
        action: values_1.v.string(),
        entity_type: values_1.v.string(),
        entity_id: values_1.v.string(),
        // Change tracking
        changes: values_1.v.optional(values_1.v.any()),
        previous_value: values_1.v.optional(values_1.v.any()),
        new_value: values_1.v.optional(values_1.v.any()),
        // Context
        ip_address: values_1.v.optional(values_1.v.string()),
        user_agent: values_1.v.optional(values_1.v.string()),
        device_type: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
    })
        .index('by_company', ['company_id', 'created_at'])
        .index('by_client', ['client_id', 'created_at'])
        .index('by_user', ['user_id', 'created_at']),
    // Creative Jobs (Kanban-based workflow)
    creative_jobs: (0, server_1.defineTable)({
        weddingId: values_1.v.id('weddings'),
        type: values_1.v.union(values_1.v.literal('invitation'), values_1.v.literal('save_the_date'), values_1.v.literal('program'), values_1.v.literal('menu'), values_1.v.literal('place_card'), values_1.v.literal('table_number'), values_1.v.literal('signage'), values_1.v.literal('thank_you_card'), values_1.v.literal('website'), values_1.v.literal('photo_album'), values_1.v.literal('video'), values_1.v.literal('other')),
        title: values_1.v.string(),
        description: values_1.v.optional(values_1.v.string()),
        status: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed'), values_1.v.literal('cancelled')),
        priority: values_1.v.union(values_1.v.literal('low'), values_1.v.literal('medium'), values_1.v.literal('high'), values_1.v.literal('urgent')),
        assigned_to: values_1.v.optional(values_1.v.string()),
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        due_date: values_1.v.optional(values_1.v.string()),
        completed_date: values_1.v.optional(values_1.v.string()),
        progress: values_1.v.number(), // 0-100
        budget: values_1.v.optional(values_1.v.number()),
        actual_cost: values_1.v.optional(values_1.v.number()),
        files: values_1.v.array(values_1.v.object({
            id: values_1.v.string(),
            name: values_1.v.string(),
            type: values_1.v.string(),
            size: values_1.v.number(),
            storage_id: values_1.v.optional(values_1.v.id('_storage')),
            url: values_1.v.optional(values_1.v.string()),
            thumbnail_url: values_1.v.optional(values_1.v.string()),
            uploaded_at: values_1.v.number(),
            version: values_1.v.number(),
        })),
        feedback: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    })
        .index('by_wedding', ['weddingId'])
        .index('by_status', ['weddingId', 'status'])
        .index('by_priority', ['weddingId', 'priority']),
    // Analytics & Insights
    analytics_snapshots: (0, server_1.defineTable)({
        client_id: values_1.v.id('clients'),
        snapshot_date: values_1.v.number(),
        metrics: values_1.v.object({
            guests_total: values_1.v.number(),
            guests_confirmed: values_1.v.number(),
            guests_checked_in: values_1.v.number(),
            budget_spent_percentage: values_1.v.number(),
            tasks_completed_percentage: values_1.v.number(),
            vendors_confirmed: values_1.v.number(),
            days_until_wedding: values_1.v.number(),
        }),
        insights: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            severity: values_1.v.string(),
            message: values_1.v.string(),
            recommendation: values_1.v.string(),
        })),
        created_at: values_1.v.number(),
    }).index('by_client', ['client_id', 'snapshot_date']),
});
