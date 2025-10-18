/**
 * Query result types for Supabase queries with joins
 * These types help TypeScript understand the shape of data returned from complex queries
 */

import type { Tables } from './types'

// User with company join
export type UserWithCompany = {
  company_id: string | null
  role: string
  company: { name: string } | null
  full_name?: string | null
  email?: string
}

// Client with all fields
export type ClientData = {
  id: string
  company_id: string
  partner1_name: string | null
  partner2_name: string | null
  partner1_first_name: string
  partner1_last_name: string
  partner2_first_name: string | null
  partner2_last_name: string | null
  email: string | null
  phone: string | null
  wedding_date: string | null
  wedding_time: string | null
  venue: string | null
  venue_name: string | null
  venue_address: string | null
  budget: number | null
  notes: string | null
  status: string
}

// Company with counts
export type CompanyWithCounts = Tables<'companies'> & {
  users?: Array<Tables<'users'>> | null
  clients?: Array<Tables<'clients'>> | null
}

// User with company for dashboard
export type UserDashboard = {
  id: string
  full_name: string | null
  email: string
  role: string
  company: { name: string | null } | null
  created_at: string
}

// Helper type for query results
export type QueryResult<T> = {
  data: T | null
  error: any
}
