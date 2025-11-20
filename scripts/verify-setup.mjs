#!/usr/bin/env node

/**
 * Setup Verification Script
 *
 * Run this script to verify your development environment is properly configured.
 * Usage: node scripts/verify-setup.mjs
 *
 * This script checks:
 * 1. Environment variables
 * 2. Database connection
 * 3. Clerk configuration
 * 4. RLS policies
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

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
  console.log('\n🔍 WeddingFlow Pro - Setup Verification\n')
  console.log('This script verifies your development environment configuration.\n')

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
  header('Environment Variables')

  const required = {
    NEXT_PUBLIC_SUPABASE_URL: {
      validator: (v) => v?.includes('supabase.co'),
      help: 'Get from Supabase Dashboard > Settings > API',
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      validator: (v) => v?.startsWith('eyJ'),
      help: 'Get from Supabase Dashboard > Settings > API',
    },
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {
      validator: (v) => v?.startsWith('pk_'),
      help: 'Get from Clerk Dashboard > API Keys',
    },
    CLERK_SECRET_KEY: {
      validator: (v) => v?.startsWith('sk_'),
      help: 'Get from Clerk Dashboard > API Keys',
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
  }

  for (const [name, feature] of Object.entries(optional)) {
    if (process.env[name]) {
      success(`${name} configured (${feature})`)
    } else {
      warn(`${name} not configured (${feature} disabled)`)
    }
  }

  // 4. Test Supabase connection
  header('Database Connection')

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      // Test basic connection
      const { data, error: connError } = await supabase
        .from('companies')
        .select('count')
        .limit(1)

      if (connError) {
        if (connError.message.includes('RLS') || connError.code === '42501') {
          success('Database connected (RLS active)')
        } else if (connError.message.includes('does not exist')) {
          error('Database connected but tables missing')
          info('  Run: npx supabase db push')
          allPassed = false
        } else {
          error(`Database error: ${connError.message}`)
          allPassed = false
        }
      } else {
        success('Database connected successfully')
      }
    } catch (err) {
      error(`Database connection failed: ${err.message}`)
      allPassed = false
    }
  } else {
    error('Cannot test database - missing credentials')
    allPassed = false
  }

  // 5. Check RLS helper functions
  header('RLS Configuration')

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      // Check if helper functions exist
      const { data, error: funcError } = await supabase.rpc('get_user_role')

      if (funcError) {
        if (funcError.message.includes('does not exist')) {
          error('RLS helper function get_user_role() not found')
          info('  Apply the RLS migration from supabase/migrations/')
          allPassed = false
        } else {
          // Function exists but returned error (expected without JWT)
          success('RLS helper functions exist')
        }
      } else {
        success('RLS helper functions configured')
      }
    } catch (err) {
      warn(`Could not verify RLS functions: ${err.message}`)
    }
  } else {
    warn('Cannot verify RLS - missing service role key')
    info('  Add SUPABASE_SERVICE_ROLE_KEY for full verification')
  }

  // 6. Check Clerk domain configuration
  header('Clerk Configuration')

  info('Manual verification required:')
  info('  1. In Clerk Dashboard > Sessions > Customize session token')
  info('  2. Ensure claims include: {"metadata":{"role":"{{user.public_metadata.role}}","company_id":"{{user.public_metadata.company_id}}"}}')
  info('  3. In Supabase Dashboard > Authentication > Add Clerk as third-party provider')

  // Summary
  header('Summary')

  if (allPassed) {
    console.log(`${colors.green}✓ All automated checks passed!${colors.reset}\n`)
    info('Complete the manual Clerk configuration steps above.')
    info('Then run: npm run dev')
  } else {
    console.log(`${colors.red}✗ Some checks failed${colors.reset}\n`)
    info('Fix the errors above and run this script again.')
    info('For help: https://github.com/your-repo/weddingflow-pro#setup')
    process.exit(1)
  }

  console.log('')
}

main().catch(console.error)
