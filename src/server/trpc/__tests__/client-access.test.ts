import { describe, it, expect } from 'vitest'
import { clientIdFromInput } from '../client-access'

/**
 * Unit coverage for the staff-access helper's input parsing. The full
 * assertClientAccess + staffProcedure behavior (super_admin/company_admin/staff
 * scoping, derived-id denial) is verified end-to-end via the live tRPC tests;
 * this locks the pure clientId extraction that staffProcedure relies on.
 */
describe('clientIdFromInput', () => {
  it('extracts a top-level clientId string', () => {
    expect(clientIdFromInput({ clientId: 'abc' })).toBe('abc')
    expect(clientIdFromInput({ clientId: 'abc', other: 1 })).toBe('abc')
  })

  it('returns null when there is no usable clientId', () => {
    expect(clientIdFromInput({ id: 'guest-1' })).toBeNull() // derived-id case → resolver must assert
    expect(clientIdFromInput({ clientId: '' })).toBeNull()
    expect(clientIdFromInput({ clientId: 123 })).toBeNull()
    expect(clientIdFromInput(null)).toBeNull()
    expect(clientIdFromInput(undefined)).toBeNull()
    expect(clientIdFromInput('string-input')).toBeNull()
  })
})
