#!/usr/bin/env node

/**
 * Setup Verification Script
 * December 2025 Stack: BetterAuth + Drizzle + PostgreSQL
 *
 * Run this script to verify your development environment is properly configured.
 * Usage: node scripts/verify-setup.mjs
 *
 * This script checks:
 * 1. Environment variables
 * 2. Database connection (PostgreSQL via Drizzle)
 * 3. BetterAuth configuration
 */

import * as dotenv from 'dotenv'
import { existsSync } from 'fs'
import pg from 'pg'

// Load environment variables
dotenv.config({ path: '.env.local' })

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
}

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}

function error(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`)
}

function warn(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
}

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
}

function header(msg) {
  console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
}

async function main() {
  console.log('\n🔍 WeddingFlo - Setup Verification\n')
  console.log('December 2025 Stack: BetterAuth + Drizzle + PostgreSQL\n')

  let allPassed = true

  // 1. Check .env.local exists
  header('Environment File')

  if (existsSync('.env.local')) {
    success('.env.local file found')
  } else {
    error('.env.local file not found')
    info('Create .env.local from .env.example and fill in your values')
    allPassed = false
  }

  // 2. Check required environment variables
  header('Required Environment Variables')

  const required = {
    DATABASE_URL: {
      validator: (v) => v?.includes('postgresql://') || v?.includes('postgres://'),
      help: 'PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)',
    },
    BETTER_AUTH_SECRET: {
      validator: (v) => v?.length >= 32,
      help: 'Generate with: openssl rand -base64 32',
    },
    BETTER_AUTH_URL: {
      validator: (v) => v?.startsWith('http'),
      help: 'Your app URL (e.g., http://localhost:3000 or https://yourdomain.com)',
    },
  }

  for (const [name, config] of Object.entries(required)) {
    const value = process.env[name]
    if (!value) {
      error(`${name} is missing`)
      info(`  ${config.help}`)
      allPassed = false
    } else if (!config.validator(value)) {
      error(`${name} has invalid format`)
      info(`  ${config.help}`)
      allPassed = false
    } else {
      success(`${name} is configured`)
    }
  }

  // 3. Check optional but recommended
  header('Optional Services')

  const optional = {
    STRIPE_SECRET_KEY: 'Payments',
    RESEND_API_KEY: 'Email',
    OPENAI_API_KEY: 'AI Features',
    TWILIO_ACCOUNT_SID: 'SMS',
    R2_ACCESS_KEY_ID: 'File Storage (Cloudflare R2)',
  }

  for (const [name, feature] of Object.entries(optional)) {
    if (process.env[name]) {
      success(`${name} configured (${feature})`)
    } else {
      warn(`${name} not configured (${feature} disabled)`)
    }
  }

  // 4. Test PostgreSQL connection
  header('Database Connection')

  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = pg
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      })

      // Test basic connection
      const result = await pool.query('SELECT NOW() as now')
      if (result.rows[0]) {
        success(`Database connected at ${result.rows[0].now}`)
      }

      // Check if tables exist
      const tablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        LIMIT 10
      `)

      if (tablesResult.rows.length > 0) {
        success(`Found ${tablesResult.rows.length}+ tables in database`)
        info(`  Tables: ${tablesResult.rows.map(r => r.table_name).join(', ')}`)
      } else {
        warn('No tables found - run migrations')
        info('  Run: npx drizzle-kit push')
      }

      await pool.end()
    } catch (err) {
      error(`Database connection failed: ${err.message}`)
      allPassed = false
    }
  } else {
    error('Cannot test database - missing DATABASE_URL')
    allPassed = false
  }

  // 5. BetterAuth configuration info
  header('BetterAuth Configuration')

  info('December 2025 Native Integration:')
  info('  1. BetterAuth uses cookie-based sessions (fast, no DB query)')
  info('  2. Session data accessed via getServerSession() in server components')
  info('  3. Client hooks: useSession(), useAuth() from @/lib/auth-client')
  info('  4. No middleware auth checks - auth handled at page/layout level')

  // 6. Check for legacy packages
  header('Legacy Package Check')

  const legacyPackages = ['@clerk/nextjs', '@supabase/supabase-js', '@supabase/ssr']

  for (const pkg of legacyPackages) {
    try {
      // Try to resolve the package
      await import(pkg)
      error(`Legacy package found: ${pkg} (should be removed)`)
      allPassed = false
    } catch {
      success(`${pkg} not installed (correct)`)
    }
  }

  // Summary
  header('Summary')

  if (allPassed) {
    console.log(`${colors.green}✓ All automated checks passed!${colors.reset}\n`)
    info('Run: npm run dev')
  } else {
    console.log(`${colors.red}✗ Some checks failed${colors.reset}\n`)
    info('Fix the errors above and run this script again.')
    process.exit(1)
  }

  console.log('')
}

main().catch(console.error)
