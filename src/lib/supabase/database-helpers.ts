/**
 * Database Helper Types and Utilities
 *
 * This file provides extended types and helper functions for working with Supabase queries.
 * It includes computed fields and type-safe query wrappers.
 */

import type { Database, Tables } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Extended User type with computed fields used in the application
 */
export type UserRow = Tables<'users'> & {
  full_name?: string | null
  company?: Tables<'companies'> | null
}

/**
 * Extended Client type with fields used in the application
 */
export type ClientRow = Tables<'clients'> & {
  partner1_name?: string | null
  partner2_name?: string | null
  venue_name?: string | null
  venue_address?: string | null
  wedding_time?: string | null
  email?: string | null
  phone?: string | null
  company?: Tables<'companies'> | null
}

/**
 * Extended Company type with related data
 */
export type CompanyRow = Tables<'companies'> & {
  users?: UserRow[] | null
  clients?: ClientRow[] | null
}

/**
 * Type guard to check if query result has data
 */
export function hasData<T>(result: { data: T | null; error: any }): result is { data: T; error: null } {
  return result.data !== null && result.error === null
}

/**
 * Helper to safely extract data from Supabase query result
 */
export function getData<T>(result: { data: T | null; error: any }): T | null {
  if (result.error) {
    console.error('Supabase query error:', result.error)
    return null
  }
  return result.data
}

/**
 * Helper to get data or throw error
 */
export function getDataOrThrow<T>(result: { data: T | null; error: any }): T {
  if (result.error) {
    throw new Error(`Supabase query error: ${result.error.message}`)
  }
  if (!result.data) {
    throw new Error('No data returned from query')
  }
  return result.data
}
