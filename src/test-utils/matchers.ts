import { expect } from '@jest/globals'

/**
 * Custom Jest Matchers
 * @see TESTING_INFRASTRUCTURE_COMPLETE - Session 52
 */

expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
      pass,
    }
  },

  toBeValidPhone(received: string) {
    const phoneRegex = /^\+?[\d\s\-()]+$/
    const pass = phoneRegex.test(received) && received.replace(/\D/g, '').length >= 10

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid phone number`
          : `expected ${received} to be a valid phone number`,
      pass,
    }
  },

  toBeValidDate(received: string) {
    const date = new Date(received)
    const pass = !isNaN(date.getTime())

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid date`
          : `expected ${received} to be a valid date`,
      pass,
    }
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    }
  },

  toBeValidURL(received: string) {
    try {
      new URL(received)
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      }
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      }
    }
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling

    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    }
  },

  toHaveValidTimestamp(received: any, field: string = 'created_at') {
    const timestamp = received[field]
    if (!timestamp) {
      return {
        message: () => `expected object to have ${field} field`,
        pass: false,
      }
    }

    const date = new Date(timestamp)
    const pass = !isNaN(date.getTime())

    return {
      message: () =>
        pass
          ? `expected ${field} (${timestamp}) not to be a valid timestamp`
          : `expected ${field} (${timestamp}) to be a valid timestamp`,
      pass,
    }
  },

  toMatchSchema(received: any, schema: Record<string, string>) {
    const missingFields: string[] = []
    const wrongTypes: string[] = []

    for (const [field, expectedType] of Object.entries(schema)) {
      if (!(field in received)) {
        missingFields.push(field)
        continue
      }

      const actualType = typeof received[field]
      if (actualType !== expectedType && received[field] !== null) {
        wrongTypes.push(`${field}: expected ${expectedType}, got ${actualType}`)
      }
    }

    const pass = missingFields.length === 0 && wrongTypes.length === 0

    return {
      message: () => {
        if (!pass) {
          let msg = 'Schema validation failed:\n'
          if (missingFields.length > 0) {
            msg += `  Missing fields: ${missingFields.join(', ')}\n`
          }
          if (wrongTypes.length > 0) {
            msg += `  Wrong types: ${wrongTypes.join(', ')}\n`
          }
          return msg
        }
        return 'Object matches schema'
      },
      pass,
    }
  },
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R
      toBeValidPhone(): R
      toBeValidDate(): R
      toBeValidUUID(): R
      toBeValidURL(): R
      toBeWithinRange(floor: number, ceiling: number): R
      toHaveValidTimestamp(field?: string): R
      toMatchSchema(schema: Record<string, string>): R
    }
  }
}
