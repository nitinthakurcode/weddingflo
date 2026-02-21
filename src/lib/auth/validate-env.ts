/**
 * Auth Environment Validation
 *
 * February 2026 - Validates required environment variables on startup
 *
 * This file validates all auth-related environment variables to catch
 * misconfigurations early and provide clear error messages.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all required auth environment variables
 * Call this early in the application lifecycle (e.g., in auth.ts)
 */
export function validateAuthEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'NEXT_PUBLIC_APP_URL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate BETTER_AUTH_SECRET strength
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) {
    if (secret.length < 32) {
      errors.push('BETTER_AUTH_SECRET must be at least 32 characters');
    }
    if (secret === 'your-super-secret-key-min-32-chars' || secret.includes('changeme')) {
      warnings.push('BETTER_AUTH_SECRET appears to be a placeholder value. Please use a secure random string.');
    }
  }

  // Validate URL formats
  const urlVars = ['BETTER_AUTH_URL', 'NEXT_PUBLIC_APP_URL'];
  for (const key of urlVars) {
    const value = process.env[key];
    if (value) {
      try {
        new URL(value);
      } catch {
        errors.push(`${key} is not a valid URL: ${value}`);
      }
    }
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('postgres')) {
    errors.push('DATABASE_URL must be a PostgreSQL connection string');
  }

  // Check for production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    // In production, ensure HTTPS
    if (process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.startsWith('https://')) {
      warnings.push('BETTER_AUTH_URL should use HTTPS in production');
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      warnings.push('NEXT_PUBLIC_APP_URL should use HTTPS in production');
    }
  }

  // Optional but recommended
  const recommended = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'RESEND_API_KEY',
  ];

  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push(`${key} is not set. Some features may be unavailable.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if invalid
 * Use this at application startup
 */
export function assertValidAuthEnv(): void {
  const result = validateAuthEnv();

  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`[Auth Config Warning] ${warning}`);
  }

  // Throw on errors
  if (!result.valid) {
    const errorMessage = [
      'Auth environment validation failed:',
      ...result.errors.map(e => `  - ${e}`),
    ].join('\n');

    throw new Error(errorMessage);
  }
}
