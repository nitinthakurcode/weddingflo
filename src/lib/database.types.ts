export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          client_id: string | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          company_id: string
          completion_tokens: number
          cost_usd: number | null
          created_at: string | null
          feature_type: string
          id: string
          model: string
          prompt_tokens: number
          request_data: Json | null
          response_data: Json | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          company_id: string
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string | null
          feature_type: string
          id?: string
          model: string
          prompt_tokens?: number
          request_data?: Json | null
          response_data?: Json | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          company_id?: string
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string | null
          feature_type?: string
          id?: string
          model?: string
          prompt_tokens?: number
          request_data?: Json | null
          response_data?: Json | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metrics: Json
          snapshot_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metrics: Json
          snapshot_date: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metrics?: Json
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget: {
        Row: {
          actual_cost: number | null
          category: string
          client_id: string
          created_at: string
          currency: string | null
          estimated_cost: number | null
          id: string
          item: string
          metadata: Json | null
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_status: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          category: string
          client_id: string
          created_at?: string
          currency?: string | null
          estimated_cost?: number | null
          id?: string
          item: string
          metadata?: Json | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string
          client_id?: string
          created_at?: string
          currency?: string | null
          estimated_cost?: number | null
          id?: string
          item?: string
          metadata?: Json | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_settings: {
        Row: {
          company_id: string
          created_at: string
          google_auto_sync: boolean
          google_sync_enabled: boolean
          google_sync_events: boolean
          google_sync_timeline: boolean
          ical_feed_enabled: boolean
          ical_include_events: boolean
          ical_include_tasks: boolean
          ical_include_timeline: boolean
          id: string
          reminder_minutes_before: number | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          google_auto_sync?: boolean
          google_sync_enabled?: boolean
          google_sync_events?: boolean
          google_sync_timeline?: boolean
          ical_feed_enabled?: boolean
          ical_include_events?: boolean
          ical_include_tasks?: boolean
          ical_include_timeline?: boolean
          id?: string
          reminder_minutes_before?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          google_auto_sync?: boolean
          google_sync_enabled?: boolean
          google_sync_events?: boolean
          google_sync_timeline?: boolean
          ical_feed_enabled?: boolean
          ical_include_events?: boolean
          ical_include_tasks?: boolean
          ical_include_timeline?: boolean
          id?: string
          reminder_minutes_before?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_synced_events: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          event_id: string
          google_calendar_id: string
          google_event_id: string
          id: string
          last_synced_at: string
          sync_direction: string
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          event_id: string
          google_calendar_id: string
          google_event_id: string
          id?: string
          last_synced_at?: string
          sync_direction?: string
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          event_id?: string
          google_calendar_id?: string
          google_event_id?: string
          id?: string
          last_synced_at?: string
          sync_direction?: string
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_synced_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_synced_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_primary: boolean
          permissions: Json | null
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          permissions?: Json | null
          relationship?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          permissions?: Json | null
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_vendors: {
        Row: {
          client_id: string
          contract_amount: number | null
          contract_signed_at: string | null
          created_at: string
          currency: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          service_date: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          client_id: string
          contract_amount?: number | null
          contract_signed_at?: string | null
          created_at?: string
          currency?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          service_date?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          client_id?: string
          contract_amount?: number | null
          contract_signed_at?: string | null
          created_at?: string
          currency?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          service_date?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_vendors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          budget: number | null
          company_id: string
          created_at: string
          created_by: string
          guest_count: number | null
          id: string
          metadata: Json | null
          notes: string | null
          partner1_email: string
          partner1_first_name: string
          partner1_last_name: string
          partner1_phone: string | null
          partner2_email: string | null
          partner2_first_name: string | null
          partner2_last_name: string | null
          partner2_phone: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          venue: string | null
          wedding_date: string | null
        }
        Insert: {
          budget?: number | null
          company_id: string
          created_at?: string
          created_by: string
          guest_count?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          partner1_email: string
          partner1_first_name: string
          partner1_last_name: string
          partner1_phone?: string | null
          partner2_email?: string | null
          partner2_first_name?: string | null
          partner2_last_name?: string | null
          partner2_phone?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          wedding_date?: string | null
        }
        Update: {
          budget?: number | null
          company_id?: string
          created_at?: string
          created_by?: string
          guest_count?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          partner1_email?: string
          partner1_first_name?: string
          partner1_last_name?: string
          partner1_phone?: string | null
          partner2_email?: string | null
          partner2_first_name?: string | null
          partner2_last_name?: string | null
          partner2_phone?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_last_reset_at: string | null
          ai_queries_this_month: number | null
          branding: Json | null
          created_at: string
          default_currency: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_data: Json | null
          onboarding_started_at: string | null
          onboarding_step: number | null
          settings: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdomain: string | null
          subscription_ends_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          supported_currencies: string[] | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          ai_last_reset_at?: string | null
          ai_queries_this_month?: number | null
          branding?: Json | null
          created_at?: string
          default_currency?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_data?: Json | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string | null
          subscription_ends_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          supported_currencies?: string[] | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_last_reset_at?: string | null
          ai_queries_this_month?: number | null
          branding?: Json | null
          created_at?: string
          default_currency?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_data?: Json | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string | null
          subscription_ends_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          supported_currencies?: string[] | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creative_jobs: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          file_url: string | null
          id: string
          job_type: string
          notes: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          job_type: string
          notes?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          job_type?: string
          notes?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          base_currency: string
          created_at: string | null
          id: string
          last_updated: string | null
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          file_size: number
          file_type: string
          file_url: string
          folder: string | null
          id: string
          metadata: Json | null
          name: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          file_size: number
          file_type: string
          file_url: string
          folder?: string | null
          id?: string
          metadata?: Json | null
          name: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          file_size?: number
          file_type?: string
          file_url?: string
          folder?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_dns_records: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          record_name: string
          record_type: string
          record_value: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          website_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          record_name: string
          record_type: string
          record_value: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          website_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          record_name?: string
          record_type?: string
          record_value?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_dns_records_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "wedding_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          clicked_count: number | null
          client_id: string | null
          company_id: string
          complained_at: string | null
          created_at: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          locale: string
          metadata: Json | null
          opened_at: string | null
          opened_count: number | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          clicked_count?: number | null
          client_id?: string | null
          company_id: string
          complained_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          locale?: string
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          clicked_count?: number | null
          client_id?: string | null
          company_id?: string
          complained_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          locale?: string
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          company_id: string
          created_at: string | null
          email_frequency: string | null
          id: string
          receive_marketing: boolean | null
          receive_payment_reminders: boolean | null
          receive_rsvp_notifications: boolean | null
          receive_vendor_messages: boolean | null
          receive_wedding_reminders: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email_frequency?: string | null
          id?: string
          receive_marketing?: boolean | null
          receive_payment_reminders?: boolean | null
          receive_rsvp_notifications?: boolean | null
          receive_vendor_messages?: boolean | null
          receive_wedding_reminders?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email_frequency?: string | null
          id?: string
          receive_marketing?: boolean | null
          receive_payment_reminders?: boolean | null
          receive_rsvp_notifications?: boolean | null
          receive_vendor_messages?: boolean | null
          receive_wedding_reminders?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          client_id: string
          created_at: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          guest_count: number | null
          id: string
          location: string | null
          notes: string | null
          start_time: string | null
          status: string | null
          title: string
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          guest_count?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          guest_count?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      export_templates: {
        Row: {
          company_colors: Json | null
          company_id: string
          company_logo: string | null
          config: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          include_charts: boolean
          include_summary: boolean
          is_public: boolean
          name: string
          report_type: string
          updated_at: string
        }
        Insert: {
          company_colors?: Json | null
          company_id: string
          company_logo?: string | null
          config?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          include_charts?: boolean
          include_summary?: boolean
          is_public?: boolean
          name: string
          report_type: string
          updated_at?: string
        }
        Update: {
          company_colors?: Json | null
          company_id?: string
          company_logo?: string | null
          config?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          include_charts?: boolean
          include_summary?: boolean
          is_public?: boolean
          name?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_guests: {
        Row: {
          assigned_at: string
          floor_plan_id: string
          guest_id: string
          id: string
          seat_number: number | null
          seat_position: Json | null
          table_id: string
        }
        Insert: {
          assigned_at?: string
          floor_plan_id: string
          guest_id: string
          id?: string
          seat_number?: number | null
          seat_position?: Json | null
          table_id: string
        }
        Update: {
          assigned_at?: string
          floor_plan_id?: string
          guest_id?: string
          id?: string
          seat_number?: number | null
          seat_position?: Json | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_guests_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_guests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_guests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_tables: {
        Row: {
          capacity: number
          created_at: string
          fill_color: string
          floor_plan_id: string
          height: number
          id: string
          is_vip: boolean
          max_capacity: number
          min_capacity: number
          notes: string | null
          rotation: number
          stroke_color: string
          stroke_width: number
          table_name: string | null
          table_number: string
          table_shape: string
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          fill_color?: string
          floor_plan_id: string
          height?: number
          id?: string
          is_vip?: boolean
          max_capacity?: number
          min_capacity?: number
          notes?: string | null
          rotation?: number
          stroke_color?: string
          stroke_width?: number
          table_name?: string | null
          table_number: string
          table_shape: string
          updated_at?: string
          width?: number
          x: number
          y: number
        }
        Update: {
          capacity?: number
          created_at?: string
          fill_color?: string
          floor_plan_id?: string
          height?: number
          id?: string
          is_vip?: boolean
          max_capacity?: number
          min_capacity?: number
          notes?: string | null
          rotation?: number
          stroke_color?: string
          stroke_width?: number
          table_name?: string | null
          table_number?: string
          table_shape?: string
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_tables_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          background_image_url: string | null
          canvas_height: number
          canvas_width: number
          client_id: string
          company_id: string
          created_at: string
          event_date: string | null
          grid_size: number
          id: string
          name: string
          notes: string | null
          pan_x: number
          pan_y: number
          show_grid: boolean
          updated_at: string
          venue_name: string | null
          zoom_level: number
        }
        Insert: {
          background_image_url?: string | null
          canvas_height?: number
          canvas_width?: number
          client_id: string
          company_id: string
          created_at?: string
          event_date?: string | null
          grid_size?: number
          id?: string
          name?: string
          notes?: string | null
          pan_x?: number
          pan_y?: number
          show_grid?: boolean
          updated_at?: string
          venue_name?: string | null
          zoom_level?: number
        }
        Update: {
          background_image_url?: string | null
          canvas_height?: number
          canvas_width?: number
          client_id?: string
          company_id?: string
          created_at?: string
          event_date?: string | null
          grid_size?: number
          id?: string
          name?: string
          notes?: string | null
          pan_x?: number
          pan_y?: number
          show_grid?: boolean
          updated_at?: string
          venue_name?: string | null
          zoom_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          company_id: string
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          download_count: number
          expires_at: string | null
          file_format: string
          file_size: number | null
          file_url: string
          filters: Json
          generated_by: string
          generation_time_ms: number | null
          id: string
          last_downloaded_at: string | null
          report_name: string
          report_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          download_count?: number
          expires_at?: string | null
          file_format: string
          file_size?: number | null
          file_url: string
          filters?: Json
          generated_by: string
          generation_time_ms?: number | null
          id?: string
          last_downloaded_at?: string | null
          report_name: string
          report_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          download_count?: number
          expires_at?: string | null
          file_format?: string
          file_size?: number | null
          file_url?: string
          filters?: Json
          generated_by?: string
          generation_time_ms?: number | null
          id?: string
          last_downloaded_at?: string | null
          report_name?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          client_id: string
          created_at: string | null
          currency: string | null
          delivery_date: string | null
          delivery_status: string | null
          estimated_value: number | null
          from_email: string | null
          from_name: string | null
          gift_name: string
          id: string
          notes: string | null
          thank_you_sent: boolean | null
          thank_you_sent_date: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_status?: string | null
          estimated_value?: number | null
          from_email?: string | null
          from_name?: string | null
          gift_name: string
          id?: string
          notes?: string | null
          thank_you_sent?: boolean | null
          thank_you_sent_date?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_status?: string | null
          estimated_value?: number | null
          from_email?: string | null
          from_name?: string | null
          gift_name?: string
          id?: string
          notes?: string | null
          thank_you_sent?: boolean | null
          thank_you_sent_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts_enhanced: {
        Row: {
          category_id: string | null
          client_id: string
          company_id: string
          created_at: string
          currency: string | null
          delivery_status: string
          description: string | null
          estimated_value: number | null
          gift_name: string
          gift_type: string
          group_gift_contributors: string[] | null
          group_gift_organizer: string | null
          guest_id: string | null
          id: string
          internal_notes: string | null
          is_group_gift: boolean
          monetary_value: number | null
          ordered_date: string | null
          receipt_url: string | null
          received_date: string | null
          registry_item_id: string | null
          registry_name: string | null
          registry_url: string | null
          shipped_date: string | null
          tags: string[] | null
          thank_you_due_date: string | null
          thank_you_note: string | null
          thank_you_sent: boolean
          thank_you_sent_date: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          currency?: string | null
          delivery_status?: string
          description?: string | null
          estimated_value?: number | null
          gift_name: string
          gift_type?: string
          group_gift_contributors?: string[] | null
          group_gift_organizer?: string | null
          guest_id?: string | null
          id?: string
          internal_notes?: string | null
          is_group_gift?: boolean
          monetary_value?: number | null
          ordered_date?: string | null
          receipt_url?: string | null
          received_date?: string | null
          registry_item_id?: string | null
          registry_name?: string | null
          registry_url?: string | null
          shipped_date?: string | null
          tags?: string[] | null
          thank_you_due_date?: string | null
          thank_you_note?: string | null
          thank_you_sent?: boolean
          thank_you_sent_date?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          currency?: string | null
          delivery_status?: string
          description?: string | null
          estimated_value?: number | null
          gift_name?: string
          gift_type?: string
          group_gift_contributors?: string[] | null
          group_gift_organizer?: string | null
          guest_id?: string | null
          id?: string
          internal_notes?: string | null
          is_group_gift?: boolean
          monetary_value?: number | null
          ordered_date?: string | null
          receipt_url?: string | null
          received_date?: string | null
          registry_item_id?: string | null
          registry_name?: string | null
          registry_url?: string | null
          shipped_date?: string | null
          tags?: string[] | null
          thank_you_due_date?: string | null
          thank_you_note?: string | null
          thank_you_sent?: boolean
          thank_you_sent_date?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_enhanced_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gift_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_enhanced_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_enhanced_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_enhanced_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          company_id: string
          created_at: string
          id: string
          refresh_token: string
          scope: string
          token_expiry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          refresh_token: string
          scope: string
          token_expiry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          scope?: string
          token_expiry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          checked_in: boolean | null
          checked_in_at: string | null
          checked_in_by: string | null
          client_id: string
          created_at: string
          dietary_restrictions: string | null
          email: string | null
          first_name: string
          group_name: string | null
          id: string
          last_name: string
          meal_preference: Database["public"]["Enums"]["meal_preference"] | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          plus_one_allowed: boolean
          plus_one_meal_preference:
            | Database["public"]["Enums"]["meal_preference"]
            | null
          plus_one_name: string | null
          plus_one_rsvp: Database["public"]["Enums"]["rsvp_status"] | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          table_number: number | null
          updated_at: string
        }
        Insert: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          client_id: string
          created_at?: string
          dietary_restrictions?: string | null
          email?: string | null
          first_name: string
          group_name?: string | null
          id?: string
          last_name: string
          meal_preference?:
            | Database["public"]["Enums"]["meal_preference"]
            | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          plus_one_allowed?: boolean
          plus_one_meal_preference?:
            | Database["public"]["Enums"]["meal_preference"]
            | null
          plus_one_name?: string | null
          plus_one_rsvp?: Database["public"]["Enums"]["rsvp_status"] | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          table_number?: number | null
          updated_at?: string
        }
        Update: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          client_id?: string
          created_at?: string
          dietary_restrictions?: string | null
          email?: string | null
          first_name?: string
          group_name?: string | null
          id?: string
          last_name?: string
          meal_preference?:
            | Database["public"]["Enums"]["meal_preference"]
            | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          plus_one_allowed?: boolean
          plus_one_meal_preference?:
            | Database["public"]["Enums"]["meal_preference"]
            | null
          plus_one_name?: string | null
          plus_one_rsvp?: Database["public"]["Enums"]["rsvp_status"] | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          table_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          accommodation_needed: boolean | null
          booking_confirmed: boolean | null
          check_in_date: string | null
          check_out_date: string | null
          checked_in: boolean | null
          client_id: string
          cost: number | null
          created_at: string | null
          currency: string | null
          guest_id: string | null
          guest_name: string
          hotel_name: string | null
          id: string
          notes: string | null
          payment_status: string | null
          room_number: string | null
          room_type: string | null
          updated_at: string | null
        }
        Insert: {
          accommodation_needed?: boolean | null
          booking_confirmed?: boolean | null
          check_in_date?: string | null
          check_out_date?: string | null
          checked_in?: boolean | null
          client_id: string
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          guest_id?: string | null
          guest_name: string
          hotel_name?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          room_number?: string | null
          room_type?: string | null
          updated_at?: string | null
        }
        Update: {
          accommodation_needed?: boolean | null
          booking_confirmed?: boolean | null
          check_in_date?: string | null
          check_out_date?: string | null
          checked_in?: boolean | null
          client_id?: string
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          guest_id?: string | null
          guest_name?: string
          hotel_name?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          room_number?: string | null
          room_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_feed_tokens: {
        Row: {
          access_count: number
          company_id: string
          created_at: string
          feed_token: string
          id: string
          is_active: boolean
          last_accessed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number
          company_id: string
          created_at?: string
          feed_token: string
          id?: string
          is_active?: boolean
          last_accessed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number
          company_id?: string
          created_at?: string
          feed_token?: string
          id?: string
          is_active?: boolean
          last_accessed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_feed_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          billing_details: Json | null
          client_id: string | null
          company_id: string
          created_at: string | null
          currency: string
          description: string | null
          discount_amount: number | null
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          line_items: Json | null
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          billing_details?: Json | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          currency?: string
          description?: string | null
          discount_amount?: number | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          line_items?: Json | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          billing_details?: Json | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          discount_amount?: number | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          line_items?: Json | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string
          company_id: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          parent_message_id: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          sender_name: string | null
          sender_type: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          client_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          sender_name?: string | null
          sender_type?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          client_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_type?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          billing_details: Json | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          client_id: string | null
          company_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          metadata: Json | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          billing_details?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          billing_details?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_fee_amount: number | null
          captured_at: string | null
          client_id: string | null
          client_secret: string | null
          company_id: string
          created_at: string | null
          currency: string
          description: string | null
          error_code: string | null
          error_message: string | null
          failure_reason: string | null
          id: string
          initiated_at: string | null
          invoice_id: string | null
          last_error_code: string | null
          metadata: Json | null
          payment_method: string | null
          payment_method_details: Json | null
          payment_method_type: string | null
          receipt_email: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          application_fee_amount?: number | null
          captured_at?: string | null
          client_id?: string | null
          client_secret?: string | null
          company_id: string
          created_at?: string | null
          currency?: string
          description?: string | null
          error_code?: string | null
          error_message?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string | null
          invoice_id?: string | null
          last_error_code?: string | null
          metadata?: Json | null
          payment_method?: string | null
          payment_method_details?: Json | null
          payment_method_type?: string | null
          receipt_email?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          application_fee_amount?: number | null
          captured_at?: string | null
          client_id?: string | null
          client_secret?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          error_code?: string | null
          error_message?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string | null
          invoice_id?: string | null
          last_error_code?: string | null
          metadata?: Json | null
          payment_method?: string | null
          payment_method_details?: Json | null
          payment_method_type?: string | null
          receipt_email?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stripe_account_id_fkey"
            columns: ["stripe_account_id"]
            isOneToOne: false
            referencedRelation: "stripe_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_logs: {
        Row: {
          body: string
          company_id: string
          created_at: string
          data: Json | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          status: string
          subscription_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          company_id: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_preferences: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          event_reminders: boolean
          id: string
          payment_alerts: boolean
          rsvp_updates: boolean
          task_deadlines: boolean
          updated_at: string
          user_id: string
          vendor_messages: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          event_reminders?: boolean
          id?: string
          payment_alerts?: boolean
          rsvp_updates?: boolean
          task_deadlines?: boolean
          updated_at?: string
          user_id: string
          vendor_messages?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          event_reminders?: boolean
          id?: string
          payment_alerts?: boolean
          rsvp_updates?: boolean
          task_deadlines?: boolean
          updated_at?: string
          user_id?: string
          vendor_messages?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          company_id: string
          created_at: string
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          company_id: string
          created_at?: string
          device_type?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          company_id?: string
          created_at?: string
          device_type?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          payment_id: string
          processed_at: string | null
          reason: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_refund_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          currency: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_id: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          email_recipients: string[]
          file_format: string
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          report_type: string
          time_of_day: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          email_recipients: string[]
          file_format?: string
          filters?: Json | null
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          report_type: string
          time_of_day?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          email_recipients?: string[]
          file_format?: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          report_type?: string
          time_of_day?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string | null
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          locale: string
          message_body: string
          metadata: Json | null
          recipient_name: string | null
          recipient_phone: string
          segments: number | null
          sent_at: string | null
          sms_type: string
          status: string
          twilio_sid: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          locale?: string
          message_body: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone: string
          segments?: number | null
          sent_at?: string | null
          sms_type: string
          status?: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          locale?: string
          message_body?: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone?: string
          segments?: number | null
          sent_at?: string | null
          sms_type?: string
          status?: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_preferences: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          receive_event_updates: boolean | null
          receive_payment_reminders: boolean | null
          receive_rsvp_notifications: boolean | null
          receive_vendor_messages: boolean | null
          receive_wedding_reminders: boolean | null
          sms_frequency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          receive_event_updates?: boolean | null
          receive_payment_reminders?: boolean | null
          receive_rsvp_notifications?: boolean | null
          receive_vendor_messages?: boolean | null
          receive_wedding_reminders?: boolean | null
          sms_frequency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          receive_event_updates?: boolean | null
          receive_payment_reminders?: boolean | null
          receive_rsvp_notifications?: boolean | null
          receive_vendor_messages?: boolean | null
          receive_wedding_reminders?: boolean | null
          sms_frequency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          account_type: string | null
          business_name: string | null
          charges_enabled: boolean | null
          company_id: string
          country: string | null
          created_at: string | null
          currency: string | null
          details_submitted: boolean | null
          disabled_reason: string | null
          email: string | null
          id: string
          metadata: Json | null
          onboarding_completed_at: string | null
          payouts_enabled: boolean | null
          requirements_currently_due: Json | null
          requirements_eventually_due: Json | null
          requirements_last_updated_at: string | null
          status: Database["public"]["Enums"]["stripe_account_status"] | null
          stripe_account_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          business_name?: string | null
          charges_enabled?: boolean | null
          company_id: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          details_submitted?: boolean | null
          disabled_reason?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          onboarding_completed_at?: string | null
          payouts_enabled?: boolean | null
          requirements_currently_due?: Json | null
          requirements_eventually_due?: Json | null
          requirements_last_updated_at?: string | null
          status?: Database["public"]["Enums"]["stripe_account_status"] | null
          stripe_account_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          business_name?: string | null
          charges_enabled?: boolean | null
          company_id?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          details_submitted?: boolean | null
          disabled_reason?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          onboarding_completed_at?: string | null
          payouts_enabled?: boolean | null
          requirements_currently_due?: Json | null
          requirements_eventually_due?: Json | null
          requirements_last_updated_at?: string | null
          status?: Database["public"]["Enums"]["stripe_account_status"] | null
          stripe_account_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      thank_you_note_reminders: {
        Row: {
          created_at: string
          gift_id: string
          id: string
          reminder_date: string
          reminder_sent: boolean
          reminder_sent_at: string | null
        }
        Insert: {
          created_at?: string
          gift_id: string
          id?: string
          reminder_date: string
          reminder_sent?: boolean
          reminder_sent_at?: string | null
        }
        Update: {
          created_at?: string
          gift_id?: string
          id?: string
          reminder_date?: string
          reminder_sent?: boolean
          reminder_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thank_you_note_reminders_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts_enhanced"
            referencedColumns: ["id"]
          },
        ]
      }
      thank_you_note_templates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          template_text: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          template_text: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          template_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thank_you_note_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline: {
        Row: {
          client_id: string
          completed: boolean | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          location: string | null
          metadata: Json | null
          participants: string[] | null
          responsible_person: string | null
          sort_order: number | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed?: boolean | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          participants?: string[] | null
          responsible_person?: string | null
          sort_order?: number | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed?: boolean | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          participants?: string[] | null
          responsible_person?: string | null
          sort_order?: number | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auto_detect_locale: boolean | null
          avatar_url: string | null
          clerk_id: string
          company_id: string | null
          created_at: string
          device_type: string | null
          email: string
          first_name: string | null
          ical_include_events: boolean | null
          ical_include_tasks: boolean | null
          ical_include_timeline: boolean | null
          id: string
          is_active: boolean
          last_name: string | null
          preferred_currency: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          auto_detect_locale?: boolean | null
          avatar_url?: string | null
          clerk_id: string
          company_id?: string | null
          created_at?: string
          device_type?: string | null
          email: string
          first_name?: string | null
          ical_include_events?: boolean | null
          ical_include_tasks?: boolean | null
          ical_include_timeline?: boolean | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          auto_detect_locale?: boolean | null
          avatar_url?: string | null
          clerk_id?: string
          company_id?: string | null
          created_at?: string
          device_type?: string | null
          email?: string
          first_name?: string | null
          ical_include_events?: boolean | null
          ical_include_tasks?: boolean | null
          ical_include_timeline?: boolean | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          city: string | null
          company_id: string
          contact_name: string | null
          contract_date: string | null
          contract_signed: boolean | null
          country: string | null
          created_at: string
          deposit_paid: boolean | null
          email: string | null
          id: string
          is_preferred: boolean
          metadata: Json | null
          name: string
          notes: string | null
          payment_status: string | null
          phone: string | null
          rating: number | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          city?: string | null
          company_id: string
          contact_name?: string | null
          contract_date?: string | null
          contract_signed?: boolean | null
          country?: string | null
          created_at?: string
          deposit_paid?: boolean | null
          email?: string | null
          id?: string
          is_preferred?: boolean
          metadata?: Json | null
          name: string
          notes?: string | null
          payment_status?: string | null
          phone?: string | null
          rating?: number | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["vendor_category"]
          city?: string | null
          company_id?: string
          contact_name?: string | null
          contract_date?: string | null
          contract_signed?: boolean | null
          country?: string | null
          created_at?: string
          deposit_paid?: boolean | null
          email?: string | null
          id?: string
          is_preferred?: boolean
          metadata?: Json | null
          name?: string
          notes?: string | null
          payment_status?: string | null
          phone?: string | null
          rating?: number | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          http_headers: Json | null
          id: string
          ip_address: string | null
          payload: Json
          processed_at: string | null
          processing_duration_ms: number | null
          provider: string
          retry_count: number | null
          status: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          http_headers?: Json | null
          id?: string
          ip_address?: string | null
          payload: Json
          processed_at?: string | null
          processing_duration_ms?: number | null
          provider: string
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          http_headers?: Json | null
          id?: string
          ip_address?: string | null
          payload?: Json
          processed_at?: string | null
          processing_duration_ms?: number | null
          provider?: string
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      website_visits: {
        Row: {
          city: string | null
          country_code: string | null
          id: string
          page_path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          visit_duration: number | null
          visited_at: string
          visitor_ip: string | null
          website_id: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          id?: string
          page_path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visit_duration?: number | null
          visited_at?: string
          visitor_ip?: string | null
          website_id: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          id?: string
          page_path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visit_duration?: number | null
          visited_at?: string
          visitor_ip?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_visits_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "wedding_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_websites: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          custom_css: string | null
          custom_domain: string | null
          custom_domain_verified: boolean
          dns_verification_token: string | null
          enable_guest_book: boolean
          enable_photo_upload: boolean
          enable_rsvp: boolean
          event_details_section: Json | null
          fonts: Json | null
          hero_section: Json
          id: string
          is_password_protected: boolean
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          our_story_section: Json | null
          password_hash: string | null
          photo_gallery: Json | null
          published_at: string | null
          registry_section: Json | null
          subdomain: string
          template_id: string
          theme_colors: Json
          travel_section: Json | null
          unique_visitors: number
          updated_at: string
          view_count: number
          wedding_party_section: Json | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean
          dns_verification_token?: string | null
          enable_guest_book?: boolean
          enable_photo_upload?: boolean
          enable_rsvp?: boolean
          event_details_section?: Json | null
          fonts?: Json | null
          hero_section?: Json
          id?: string
          is_password_protected?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          our_story_section?: Json | null
          password_hash?: string | null
          photo_gallery?: Json | null
          published_at?: string | null
          registry_section?: Json | null
          subdomain: string
          template_id?: string
          theme_colors?: Json
          travel_section?: Json | null
          unique_visitors?: number
          updated_at?: string
          view_count?: number
          wedding_party_section?: Json | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean
          dns_verification_token?: string | null
          enable_guest_book?: boolean
          enable_photo_upload?: boolean
          enable_rsvp?: boolean
          event_details_section?: Json | null
          fonts?: Json | null
          hero_section?: Json
          id?: string
          is_password_protected?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          our_story_section?: Json | null
          password_hash?: string | null
          photo_gallery?: Json | null
          published_at?: string | null
          registry_section?: Json | null
          subdomain?: string
          template_id?: string
          theme_colors?: Json
          travel_section?: Json | null
          unique_visitors?: number
          updated_at?: string
          view_count?: number
          wedding_party_section?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wedding_websites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_websites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          from_number: string
          id: string
          media_url: string[] | null
          message: string
          read_at: string | null
          sent_at: string | null
          status: string
          template_name: string | null
          to_number: string
          twilio_sid: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          from_number: string
          id?: string
          media_url?: string[] | null
          message: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          to_number: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          from_number?: string
          id?: string
          media_url?: string[] | null
          message?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          to_number?: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          approved_at: string | null
          button_text: string | null
          button_url: string | null
          category: string
          company_id: string
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          language: string
          media_type: string | null
          name: string
          status: string
          template_body: string
          twilio_content_sid: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          approved_at?: string | null
          button_text?: string | null
          button_url?: string | null
          category: string
          company_id: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          media_type?: string | null
          name: string
          status?: string
          template_body: string
          twilio_content_sid?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          approved_at?: string | null
          button_text?: string | null
          button_url?: string | null
          category?: string
          company_id?: string
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          media_type?: string | null
          name?: string
          status?: string
          template_body?: string
          twilio_content_sid?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_ai_quota: { Args: { p_company_id: string }; Returns: boolean }
      cleanup_expired_reports: { Args: never; Returns: undefined }
      convert_currency: {
        Args: { amount: number; from_currency: string; to_currency: string }
        Returns: number
      }
      current_clerk_user_id: { Args: never; Returns: string }
      generate_dns_token: { Args: never; Returns: string }
      generate_invoice_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_unique_subdomain: {
        Args: {
          p_partner1_first: string
          p_partner1_last: string
          p_partner2_first?: string
        }
        Returns: string
      }
      get_clerk_user_id: { Args: never; Returns: string }
      get_company_analytics: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          active_clients: number
          events_this_month: number
          total_budget: number
          total_clients: number
          total_guests: number
          total_paid: number
        }[]
      }
      get_current_user_id: { Args: never; Returns: string }
      get_email_stats: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          bounced_emails: number
          delivered_emails: number
          failed_emails: number
          sent_emails: number
          success_rate: number
          total_emails: number
        }[]
      }
      get_gift_stats: {
        Args: { p_client_id: string }
        Returns: {
          cash_gifts: number
          cash_total: number
          gifts_received: number
          thank_you_pending: number
          thank_you_sent: number
          total_gifts: number
          total_value: number
        }[]
      }
      get_monthly_revenue_trend: {
        Args: { p_company_id: string }
        Returns: {
          month: string
          revenue: number
          transaction_count: number
        }[]
      }
      get_notification_stats: {
        Args: { p_company_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          clicked: number
          delivered: number
          delivery_rate: number
          failed: number
          notification_type: string
          opened: number
          total_sent: number
        }[]
      }
      get_payment_stats: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          currency: string
          failed_payments: number
          success_rate: number
          successful_payments: number
          total_amount: number
          total_payments: number
          total_refunded: number
        }[]
      }
      get_payment_status_breakdown: {
        Args: { p_company_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          count: number
          status: string
          total_amount: number
        }[]
      }
      get_revenue_analytics: {
        Args: { p_company_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          currency: string
          date: string
          revenue: number
          transaction_count: number
        }[]
      }
      get_sms_stats: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          delivered_sms: number
          failed_sms: number
          sent_sms: number
          success_rate: number
          total_segments: number
          total_sms: number
        }[]
      }
      get_table_guest_count: { Args: { p_table_id: string }; Returns: number }
      get_thank_you_notes_due: {
        Args: { p_company_id: string; p_days_ahead?: number }
        Returns: {
          days_until_due: number
          due_date: string
          gift_id: string
          gift_name: string
          guest_name: string
          received_date: string
        }[]
      }
      get_top_revenue_clients: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          client_id: string
          client_name: string
          total_revenue: number
          transaction_count: number
        }[]
      }
      get_unassigned_guests: {
        Args: { p_floor_plan_id: string }
        Returns: {
          dietary_restrictions: string
          first_name: string
          guest_id: string
          has_plus_one: boolean
          last_name: string
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_webhook_stats: {
        Args: { p_hours?: number; p_provider?: string }
        Returns: {
          avg_processing_time_ms: number
          failed_webhooks: number
          pending_webhooks: number
          processed_webhooks: number
          provider: string
          success_rate: number
          total_webhooks: number
        }[]
      }
      get_whatsapp_stats: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          delivered: number
          delivery_rate: number
          failed: number
          read: number
          total_sent: number
        }[]
      }
      increment_ai_usage: { Args: { p_company_id: string }; Returns: undefined }
      increment_email_clicked: {
        Args: { p_resend_id: string }
        Returns: {
          clicked_at: string
          clicked_count: number
        }[]
      }
      increment_email_opened: {
        Args: { p_resend_id: string }
        Returns: {
          opened_at: string
          opened_count: number
        }[]
      }
      increment_webhook_retry: {
        Args: { p_webhook_id: string }
        Returns: number
      }
      increment_website_views: {
        Args: { p_website_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mark_webhook_processed: {
        Args: {
          p_error_message?: string
          p_processing_duration_ms?: number
          p_status: string
          p_webhook_id: string
        }
        Returns: boolean
      }
      process_refund_webhook: {
        Args: {
          p_refund_amount: number
          p_stripe_charge_id: string
          p_stripe_refund_id: string
        }
        Returns: string
      }
      record_webhook_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_http_headers?: Json
          p_ip_address?: string
          p_payload: Json
          p_provider: string
          p_user_agent?: string
        }
        Returns: {
          existing_status: string
          is_duplicate: boolean
          webhook_id: string
        }[]
      }
      requesting_clerk_id: { Args: never; Returns: string }
      requesting_user_id: { Args: never; Returns: string }
      should_send_email: {
        Args: { p_email_type: string; p_user_id: string }
        Returns: boolean
      }
      should_send_sms: {
        Args: { p_sms_type: string; p_user_id: string }
        Returns: boolean
      }
      update_company_subscription: {
        Args: {
          p_company_id: string
          p_stripe_subscription_id?: string
          p_subscription_status: string
          p_subscription_tier: string
        }
        Returns: boolean
      }
      update_email_status: {
        Args: {
          p_bounced_at?: string
          p_complained_at?: string
          p_delivered_at?: string
          p_error_message?: string
          p_resend_id: string
          p_sent_at?: string
          p_status: string
        }
        Returns: boolean
      }
      update_payment_from_webhook: {
        Args: {
          p_captured_at?: string
          p_failure_reason?: string
          p_last_error_code?: string
          p_status: Database["public"]["Enums"]["payment_status"]
          p_stripe_payment_intent_id: string
        }
        Returns: string
      }
      update_sms_status: {
        Args: {
          p_delivered_at?: string
          p_error_code?: string
          p_error_message?: string
          p_failed_at?: string
          p_sent_at?: string
          p_status: string
          p_twilio_sid: string
        }
        Returns: boolean
      }
      update_stripe_account_from_webhook: {
        Args: {
          p_charges_enabled: boolean
          p_details_submitted: boolean
          p_disabled_reason?: string
          p_payouts_enabled: boolean
          p_requirements_currently_due?: Json
          p_requirements_eventually_due?: Json
          p_stripe_account_id: string
        }
        Returns: string
      }
    }
    Enums: {
      event_status:
        | "draft"
        | "planning"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "canceled"
      invoice_status:
        | "draft"
        | "open"
        | "paid"
        | "void"
        | "uncollectible"
        | "overdue"
      meal_preference:
        | "standard"
        | "vegetarian"
        | "vegan"
        | "kosher"
        | "halal"
        | "gluten_free"
        | "other"
      payment_status: "pending" | "paid" | "overdue" | "canceled" | "refunded"
      rsvp_status:
        | "pending"
        | "accepted"
        | "declined"
        | "tentative"
        | "no_response"
      stripe_account_status: "pending" | "enabled" | "restricted" | "disabled"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
      subscription_tier: "free" | "starter" | "professional" | "enterprise"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "completed" | "canceled"
      user_role: "super_admin" | "company_admin" | "staff" | "client_user"
      vendor_category:
        | "venue"
        | "catering"
        | "photography"
        | "videography"
        | "florals"
        | "music"
        | "dj"
        | "transportation"
        | "accommodation"
        | "beauty"
        | "bakery"
        | "decor"
        | "entertainment"
        | "stationery"
        | "rentals"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_status: [
        "draft",
        "planning",
        "confirmed",
        "in_progress",
        "completed",
        "canceled",
      ],
      invoice_status: [
        "draft",
        "open",
        "paid",
        "void",
        "uncollectible",
        "overdue",
      ],
      meal_preference: [
        "standard",
        "vegetarian",
        "vegan",
        "kosher",
        "halal",
        "gluten_free",
        "other",
      ],
      payment_status: ["pending", "paid", "overdue", "canceled", "refunded"],
      rsvp_status: [
        "pending",
        "accepted",
        "declined",
        "tentative",
        "no_response",
      ],
      stripe_account_status: ["pending", "enabled", "restricted", "disabled"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
      subscription_tier: ["free", "starter", "professional", "enterprise"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "completed", "canceled"],
      user_role: ["super_admin", "company_admin", "staff", "client_user"],
      vendor_category: [
        "venue",
        "catering",
        "photography",
        "videography",
        "florals",
        "music",
        "dj",
        "transportation",
        "accommodation",
        "beauty",
        "bakery",
        "decor",
        "entertainment",
        "stationery",
        "rentals",
        "other",
      ],
    },
  },
} as const
