# Convex Validation Guide

This guide demonstrates how to add proper validation and error handling to Convex mutations.

## Core Principles

1. **Always validate inputs** - Never trust client-side data
2. **Check permissions** - Verify the user has access to the resource
3. **Sanitize data** - Remove potentially harmful content
4. **Provide clear error messages** - Help developers and users understand what went wrong

## Example Pattern

```typescript
import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const exampleMutation = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Authentication check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized: You must be signed in')
    }

    // 2. Input validation
    if (!args.name || args.name.trim().length === 0) {
      throw new Error('Validation Error: Name is required')
    }

    if (args.name.length > 100) {
      throw new Error('Validation Error: Name must be less than 100 characters')
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(args.email)) {
      throw new Error('Validation Error: Invalid email format')
    }

    // Optional field validation
    if (args.age !== undefined && (args.age < 0 || args.age > 150)) {
      throw new Error('Validation Error: Age must be between 0 and 150')
    }

    // 3. Permission check (if modifying existing resource)
    // const resource = await ctx.db.get(args.resourceId)
    // if (resource.userId !== identity.subject) {
    //   throw new Error('Forbidden: You do not have permission to modify this resource')
    // }

    // 4. Sanitize inputs
    const sanitizedName = args.name.trim()
    const sanitizedEmail = args.email.trim().toLowerCase()

    // 5. Perform the mutation
    try {
      const result = await ctx.db.insert('tableName', {
        userId: identity.subject,
        name: sanitizedName,
        email: sanitizedEmail,
        age: args.age,
        createdAt: Date.now(),
      })

      return { success: true, id: result }
    } catch (error) {
      console.error('Mutation error:', error)
      throw new Error('Failed to create record. Please try again.')
    }
  },
})
```

## Validation Helpers

Create reusable validation functions in `convex/lib/validation.ts`:

```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().slice(0, maxLength)
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validateDateString(date: string): boolean {
  const timestamp = Date.parse(date)
  return !isNaN(timestamp) && timestamp > 0
}
```

## Common Validation Patterns

### 1. Required String Field
```typescript
if (!args.field || args.field.trim().length === 0) {
  throw new Error('Field is required')
}
```

### 2. String Length
```typescript
if (args.field.length < 3 || args.field.length > 50) {
  throw new Error('Field must be between 3 and 50 characters')
}
```

### 3. Number Range
```typescript
if (args.amount < 0 || args.amount > 1000000) {
  throw new Error('Amount must be between 0 and 1,000,000')
}
```

### 4. Enum Validation
```typescript
const validStatuses = ['pending', 'approved', 'rejected'] as const
if (!validStatuses.includes(args.status)) {
  throw new Error(`Status must be one of: ${validStatuses.join(', ')}`)
}
```

### 5. Array Validation
```typescript
if (!Array.isArray(args.items)) {
  throw new Error('Items must be an array')
}

if (args.items.length === 0) {
  throw new Error('At least one item is required')
}

if (args.items.length > 100) {
  throw new Error('Maximum 100 items allowed')
}
```

### 6. ID Validation
```typescript
const record = await ctx.db.get(args.id)
if (!record) {
  throw new Error('Record not found')
}
```

### 7. Ownership Verification
```typescript
const identity = await ctx.auth.getUserIdentity()
if (!identity) {
  throw new Error('Authentication required')
}

const record = await ctx.db.get(args.id)
if (record.userId !== identity.subject) {
  throw new Error('You do not have permission to modify this record')
}
```

## Error Types

Use consistent error message prefixes:

- `Unauthorized:` - User not authenticated
- `Forbidden:` - User not authorized for this action
- `Validation Error:` - Input validation failed
- `Not Found:` - Resource doesn't exist
- `Conflict:` - Operation conflicts with current state

## Testing Validations

When testing, verify:

1. Valid inputs succeed
2. Missing required fields fail
3. Invalid formats fail
4. Permission checks work
5. Edge cases are handled

Example test cases:

```typescript
// Valid case
await createGuest({ name: 'John Doe', email: 'john@example.com' })

// Should fail - missing name
await expect(createGuest({ name: '', email: 'john@example.com' }))
  .rejects.toThrow('Name is required')

// Should fail - invalid email
await expect(createGuest({ name: 'John', email: 'invalid' }))
  .rejects.toThrow('Invalid email format')

// Should fail - unauthorized
await expect(createGuest({ name: 'John', email: 'john@example.com' }))
  .rejects.toThrow('Unauthorized')
```

## Applying to Existing Mutations

Review all existing mutations in `convex/` and add:

1. Identity/authentication checks
2. Input validation for all args
3. Permission checks for updates/deletes
4. Proper error messages
5. Try-catch blocks for database operations

## Checklist

For each mutation, ensure:

- [ ] Authentication check present
- [ ] All required fields validated
- [ ] String lengths checked
- [ ] Numbers in valid ranges
- [ ] Emails/URLs validated with regex
- [ ] Enums validated against allowed values
- [ ] Arrays checked for length
- [ ] IDs verified to exist
- [ ] Ownership verified for updates/deletes
- [ ] Inputs sanitized
- [ ] Clear error messages
- [ ] Database errors caught
