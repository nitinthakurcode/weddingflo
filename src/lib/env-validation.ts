/**
 * Environment Validation
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * Validates all required environment variables at startup.
 * This catches configuration issues immediately rather than at runtime.
 *
 * Best Practice: Fail fast on misconfiguration
 */

interface EnvConfig {
  name: string
  required: boolean
  description: string
  validator?: (value: string) => boolean
  mask?: boolean
}

const envConfig: EnvConfig[] = [
  // Core Database (Hetzner PostgreSQL via Drizzle)
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string (Hetzner)',
    validator: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
    mask: true,
  },

  // BetterAuth (Self-hosted authentication)
  {
    name: 'BETTER_AUTH_SECRET',
    required: true,
    description: 'BetterAuth secret key for session encryption',
    validator: (v) => v.length >= 32,
    mask: true,
  },
  {
    name: 'BETTER_AUTH_URL',
    required: true,
    description: 'BetterAuth base URL',
    validator: (v) => v.startsWith('http'),
  },

  // Cloudflare R2 Storage (S3-compatible)
  {
    name: 'R2_ENDPOINT',
    required: false,
    description: 'Cloudflare R2 endpoint URL',
    validator: (v) => v.includes('r2.cloudflarestorage.com') || v.includes('s3'),
  },
  {
    name: 'R2_ACCESS_KEY_ID',
    required: false,
    description: 'R2 access key ID',
  },
  {
    name: 'R2_SECRET_ACCESS_KEY',
    required: false,
    description: 'R2 secret access key',
    mask: true,
  },
  {
    name: 'R2_BUCKET',
    required: false,
    description: 'R2 bucket name',
  },

  // Optional: Payments
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key for payments',
    validator: (v) => v.startsWith('sk_'),
    mask: true,
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook signing secret',
    validator: (v) => v.startsWith('whsec_'),
    mask: true,
  },

  // Optional: Email
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for emails',
    validator: (v) => v.startsWith('re_'),
    mask: true,
  },

  // Optional: AI
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI features',
    validator: (v) => v.startsWith('sk-'),
    mask: true,
  },

  // Optional: SMS
  {
    name: 'TWILIO_ACCOUNT_SID',
    required: false,
    description: 'Twilio account SID for SMS',
    validator: (v) => v.startsWith('AC'),
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    required: false,
    description: 'Twilio auth token',
    mask: true,
  },

  // App URLs
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'Application URL for callbacks',
    validator: (v) => v.startsWith('http'),
  },
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    total: number
    configured: number
    missing: number
    invalid: number
  }
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let configured = 0
  let missing = 0
  let invalid = 0

  for (const config of envConfig) {
    const value = process.env[config.name]

    if (!value) {
      if (config.required) {
        errors.push(`Missing required: ${config.name} - ${config.description}`)
        missing++
      } else {
        warnings.push(`Missing optional: ${config.name} - ${config.description}`)
      }
      continue
    }

    // Validate format if validator provided
    if (config.validator && !config.validator(value)) {
      errors.push(`Invalid format: ${config.name} - Expected format not matched`)
      invalid++
      continue
    }

    configured++
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total: envConfig.length,
      configured,
      missing,
      invalid,
    },
  }
}

export function printEnvironmentStatus(): void {
  const result = validateEnvironment()

  console.log('\n=== Environment Validation ===\n')

  if (result.valid) {
    console.log('✅ All required environment variables are configured\n')
  } else {
    console.log('❌ Environment validation failed\n')
  }

  console.log(`Summary: ${result.summary.configured}/${result.summary.total} configured`)
  console.log(`Missing: ${result.summary.missing}, Invalid: ${result.summary.invalid}\n`)

  if (result.errors.length > 0) {
    console.log('Errors:')
    result.errors.forEach((e) => console.log(`  ❌ ${e}`))
    console.log('')
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:')
    result.warnings.forEach((w) => console.log(`  ⚠️  ${w}`))
    console.log('')
  }

  console.log('==============================\n')
}

/**
 * Get masked environment status for display
 * Safe to show in UI/logs
 */
export function getEnvironmentStatus(): Record<string, { configured: boolean; valid: boolean }> {
  const status: Record<string, { configured: boolean; valid: boolean }> = {}

  for (const config of envConfig) {
    const value = process.env[config.name]
    const configured = !!value
    const valid = configured && (!config.validator || config.validator(value))

    status[config.name] = { configured, valid }
  }

  return status
}
