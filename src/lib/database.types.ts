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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      budget: {
        Row: {
          actual_cost: number | null
          category: string
          client_id: string
          created_at: string
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
          branding: Json | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdomain: string | null
          subscription_ends_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string | null
          subscription_ends_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string | null
          subscription_ends_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
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
      gifts: {
        Row: {
          client_id: string
          created_at: string | null
          delivery_date: string | null
          delivery_status: string | null
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
          delivery_date?: string | null
          delivery_status?: string | null
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
          delivery_date?: string | null
          delivery_status?: string | null
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
          avatar_url: string | null
          clerk_id: string
          company_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clerk_id: string
          company_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clerk_id?: string
          company_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clerk_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_company_admin_or_higher: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      requesting_clerk_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      requesting_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      requesting_user_id: {
        Args: Record<PropertyKey, never>
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
