/**
 * Supabase Database TypeScript Definitions
 *
 * This file contains TypeScript types for the WeddingFlow Pro database schema.
 *
 * 🔄 Auto-generate types from your Supabase schema:
 * ---------------------------------------------------
 * Run this command to generate types from your actual database:
 *
 * ```bash
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 * ```
 *
 * Or use the Supabase CLI:
 * ```bash
 * npx supabase login
 * npx supabase gen types typescript --linked > lib/supabase/types.ts
 * ```
 *
 * 📚 Documentation:
 * https://supabase.com/docs/guides/api/generating-types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  STAFF = 'staff',
  CLIENT_USER = 'client_user',
}

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
}

export enum EventStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export enum RSVPStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NO_RESPONSE = 'no_response',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

export enum VendorCategory {
  VENUE = 'venue',
  CATERING = 'catering',
  PHOTOGRAPHY = 'photography',
  VIDEOGRAPHY = 'videography',
  FLORALS = 'florals',
  MUSIC = 'music',
  DJ = 'dj',
  TRANSPORTATION = 'transportation',
  ACCOMMODATION = 'accommodation',
  BEAUTY = 'beauty',
  BAKERY = 'bakery',
  DECOR = 'decor',
  ENTERTAINMENT = 'entertainment',
  STATIONERY = 'stationery',
  RENTALS = 'rentals',
  OTHER = 'other',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Company {
  id: string
  name: string
  subdomain: string | null
  logo_url: string | null
  branding: Json | null
  settings: Json | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  subscription_ends_at: string | null
  users: User[] | null // Related users (when joined)
  clients: Client[] | null // Related clients (when joined)
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  clerk_id: string
  email: string
  first_name: string | null
  last_name: string | null
  full_name: string | null // Computed field: first_name + last_name
  avatar_url: string | null
  role: UserRole
  company_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_id: string
  partner1_first_name: string
  partner1_last_name: string
  partner1_name: string | null // Computed: partner1_first_name + partner1_last_name
  partner1_email: string
  email: string | null // Alias for partner1_email
  partner1_phone: string | null
  phone: string | null // Alias for partner1_phone
  partner2_first_name: string | null
  partner2_last_name: string | null
  partner2_name: string | null // Computed: partner2_first_name + partner2_last_name
  partner2_email: string | null
  partner2_phone: string | null
  wedding_date: string | null
  wedding_time: string | null // Wedding time field
  venue: string | null
  venue_name: string | null // Venue name field
  venue_address: string | null // Venue address field
  budget: number | null
  guest_count: number | null
  status: EventStatus
  notes: string | null
  metadata: Json | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClientUser {
  id: string
  client_id: string
  user_id: string
  relationship: string
  is_primary: boolean
  permissions: Json | null
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  client_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  group: string | null
  table_number: number | null
  dietary_restrictions: string | null
  rsvp_status: RSVPStatus
  plus_one_allowed: boolean
  plus_one_name: string | null
  plus_one_rsvp: RSVPStatus | null
  notes: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  company_id: string
  name: string
  category: VendorCategory
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  notes: string | null
  rating: number | null
  is_preferred: boolean
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface ClientVendor {
  id: string
  client_id: string
  vendor_id: string
  contract_amount: number | null
  deposit_amount: number | null
  payment_status: PaymentStatus
  contract_signed_at: string | null
  notes: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  client_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  metadata: Json | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Timeline {
  id: string
  client_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  location: string | null
  participants: string[] | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  client_id: string
  category: string
  item: string
  estimated_cost: number | null
  actual_cost: number | null
  paid_amount: number | null
  vendor_id: string | null
  notes: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  client_id: string
  name: string
  description: string | null
  file_url: string
  file_type: string
  file_size: number
  folder: string | null
  uploaded_by: string
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  company_id: string | null
  user_id: string | null
  client_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface CreativeJob {
  id: string
  wedding_id: string
  type: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  vendor_id: string | null
  due_date: string | null
  completed_date: string | null
  progress: number
  budget: number | null
  actual_cost: number | null
  files: Json | null
  feedback: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at' | 'users' | 'clients'>
        Update: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at' | 'users' | 'clients'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at' | 'full_name'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at' | 'full_name'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'partner1_name' | 'partner2_name' | 'email' | 'phone' | 'venue_name' | 'venue_address' | 'wedding_time'>
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'partner1_name' | 'partner2_name' | 'email' | 'phone' | 'venue_name' | 'venue_address' | 'wedding_time'>>
      }
      client_users: {
        Row: ClientUser
        Insert: Omit<ClientUser, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ClientUser, 'id' | 'created_at' | 'updated_at'>>
      }
      guests: {
        Row: Guest
        Insert: Omit<Guest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Guest, 'id' | 'created_at' | 'updated_at'>>
      }
      vendors: {
        Row: Vendor
        Insert: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>
      }
      client_vendors: {
        Row: ClientVendor
        Insert: Omit<ClientVendor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ClientVendor, 'id' | 'created_at' | 'updated_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
      }
      timeline: {
        Row: Timeline
        Insert: Omit<Timeline, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Timeline, 'id' | 'created_at' | 'updated_at'>>
      }
      budget: {
        Row: Budget
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>
      }
      activity_logs: {
        Row: ActivityLog
        Insert: Omit<ActivityLog, 'id' | 'created_at'>
        Update: Partial<Omit<ActivityLog, 'id' | 'created_at'>>
      }
      creative_jobs: {
        Row: CreativeJob
        Insert: Omit<CreativeJob, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CreativeJob, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      // Add your view definitions here
    }
    Functions: {
      // Add your function definitions here
    }
    Enums: {
      user_role: UserRole
      subscription_tier: SubscriptionTier
      subscription_status: SubscriptionStatus
      event_status: EventStatus
      rsvp_status: RSVPStatus
      task_status: TaskStatus
      task_priority: TaskPriority
      payment_status: PaymentStatus
      vendor_category: VendorCategory
    }
    CompositeTypes: {
      // Add your composite type definitions here
    }
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Get the Row type for a table
 * @example
 * type User = Tables<'users'>
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Get an enum type
 * @example
 * type UserRole = Enums<'user_role'>
 */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

/**
 * Get the Insert type for a table
 * @example
 * type UserInsert = TablesInsert<'users'>
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Get the Update type for a table
 * @example
 * type UserUpdate = TablesUpdate<'users'>
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
