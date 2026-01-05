import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'warning'
  message: string
  latency?: number
  details?: Record<string, any>
}

interface HealthReport {
  overall: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  checks: HealthCheck[]
  summary: {
    total: number
    healthy: number
    unhealthy: number
    warnings: number
  }
}

/**
 * Detailed Health Check Endpoint
 *
 * Verifies all critical integrations:
 * - BetterAuth authentication
 * - PostgreSQL database connection (Drizzle ORM)
 * - Environment variables
 */
export async function GET() {
  const checks: HealthCheck[] = []

  // 1. Check BetterAuth Authentication
  const authCheck = await checkBetterAuth()
  checks.push(authCheck)

  // 2. Check Database Connection (Drizzle/PostgreSQL)
  const databaseCheck = await checkDatabaseConnection()
  checks.push(databaseCheck)

  // 3. Check Environment Variables
  const envCheck = checkEnvironmentVariables()
  checks.push(envCheck)

  // Calculate summary
  const summary = {
    total: checks.length,
    healthy: checks.filter(c => c.status === 'healthy').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    warnings: checks.filter(c => c.status === 'warning').length,
  }

  // Determine overall status
  let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
  if (summary.unhealthy > 0) {
    overall = 'unhealthy'
  } else if (summary.warnings > 0) {
    overall = 'degraded'
  }

  const report: HealthReport = {
    overall,
    timestamp: new Date().toISOString(),
    checks,
    summary,
  }

  const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503

  return NextResponse.json(report, { status: statusCode })
}

async function checkBetterAuth(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const { userId, user } = await getServerSession()

    if (!userId) {
      return {
        name: 'BetterAuth Authentication',
        status: 'warning',
        message: 'No authenticated user - some checks skipped',
        latency: Date.now() - start,
      }
    }

    return {
      name: 'BetterAuth Authentication',
      status: 'healthy',
      message: 'User authenticated successfully',
      latency: Date.now() - start,
      details: {
        userId: userId.substring(0, 10) + '...',
        hasUserData: !!user,
        role: user?.role || 'not set',
        hasCompanyId: !!user?.companyId,
      }
    }
  } catch (error) {
    return {
      name: 'BetterAuth Authentication',
      status: 'unhealthy',
      message: `Auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latency: Date.now() - start,
    }
  }
}

async function checkDatabaseConnection(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    // Simple query to verify Drizzle/PostgreSQL connection
    const result = await db
      .select({ id: companies.id })
      .from(companies)
      .limit(1)

    return {
      name: 'Database Connection (Drizzle/PostgreSQL)',
      status: 'healthy',
      message: 'Database connected successfully',
      latency: Date.now() - start,
      details: {
        orm: 'Drizzle',
        database: 'Hetzner PostgreSQL',
        recordsFound: result.length,
      }
    }
  } catch (error) {
    return {
      name: 'Database Connection (Drizzle/PostgreSQL)',
      status: 'unhealthy',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latency: Date.now() - start,
    }
  }
}

function checkEnvironmentVariables(): HealthCheck {
  const required = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
  ]

  const optional = [
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
    'OPENAI_API_KEY',
  ]

  const missing: string[] = []
  const optionalMissing: string[] = []

  for (const env of required) {
    if (!process.env[env]) {
      missing.push(env)
    }
  }

  for (const env of optional) {
    if (!process.env[env]) {
      optionalMissing.push(env)
    }
  }

  if (missing.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'unhealthy',
      message: `Missing required: ${missing.join(', ')}`,
      details: { missing, optionalMissing }
    }
  }

  if (optionalMissing.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'warning',
      message: `All required present, ${optionalMissing.length} optional missing`,
      details: { optionalMissing }
    }
  }

  return {
    name: 'Environment Variables',
    status: 'healthy',
    message: 'All environment variables configured',
  }
}
