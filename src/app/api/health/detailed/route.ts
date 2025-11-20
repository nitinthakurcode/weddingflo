import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
 * - Supabase database connection
 * - Clerk authentication
 * - RLS policies
 * - JWT claims structure
 *
 * Protected endpoint - requires authentication
 */
export async function GET() {
  const startTime = Date.now()
  const checks: HealthCheck[] = []

  // 1. Check Clerk Authentication
  const clerkCheck = await checkClerkAuth()
  checks.push(clerkCheck)

  // 2. Check Supabase Connection
  const supabaseCheck = await checkSupabaseConnection()
  checks.push(supabaseCheck)

  // 3. Check JWT Claims (if authenticated)
  if (clerkCheck.status === 'healthy') {
    const jwtCheck = await checkJWTClaims()
    checks.push(jwtCheck)
  }

  // 4. Check RLS Policies (if authenticated)
  if (clerkCheck.status === 'healthy') {
    const rlsCheck = await checkRLSPolicies()
    checks.push(rlsCheck)
  }

  // 5. Check Environment Variables
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

async function checkClerkAuth(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return {
        name: 'Clerk Authentication',
        status: 'warning',
        message: 'No authenticated user - some checks skipped',
        latency: Date.now() - start,
      }
    }

    return {
      name: 'Clerk Authentication',
      status: 'healthy',
      message: 'User authenticated successfully',
      latency: Date.now() - start,
      details: {
        userId: userId.substring(0, 10) + '...',
        hasSessionClaims: !!sessionClaims,
      }
    }
  } catch (error) {
    return {
      name: 'Clerk Authentication',
      status: 'unhealthy',
      message: `Clerk auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latency: Date.now() - start,
    }
  }
}

async function checkSupabaseConnection(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = await createServerSupabaseClient()

    // Simple query to verify connection
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1)

    if (error) {
      // Check if it's an RLS error (which means connection works)
      if (error.message.includes('RLS') || error.code === '42501') {
        return {
          name: 'Supabase Connection',
          status: 'healthy',
          message: 'Connected (RLS active)',
          latency: Date.now() - start,
        }
      }

      return {
        name: 'Supabase Connection',
        status: 'unhealthy',
        message: `Database error: ${error.message}`,
        latency: Date.now() - start,
        details: { code: error.code }
      }
    }

    return {
      name: 'Supabase Connection',
      status: 'healthy',
      message: 'Database connected successfully',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'Supabase Connection',
      status: 'unhealthy',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latency: Date.now() - start,
    }
  }
}

async function checkJWTClaims(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const { sessionClaims } = await auth()

    if (!sessionClaims) {
      return {
        name: 'JWT Claims',
        status: 'warning',
        message: 'No session claims available',
        latency: Date.now() - start,
      }
    }

    // Check for metadata (native integration) or publicMetadata (JWT template)
    const metadata = (sessionClaims as any)?.metadata
    const publicMetadata = (sessionClaims as any)?.publicMetadata

    const role = metadata?.role || publicMetadata?.role
    const companyId = metadata?.company_id || publicMetadata?.company_id

    const issues: string[] = []
    if (!role) issues.push('missing role')
    if (!companyId) issues.push('missing company_id')

    if (issues.length > 0) {
      return {
        name: 'JWT Claims',
        status: 'warning',
        message: `Claims incomplete: ${issues.join(', ')}`,
        latency: Date.now() - start,
        details: {
          hasMetadata: !!metadata,
          hasPublicMetadata: !!publicMetadata,
          role: role || 'not set',
          companyId: companyId ? 'present' : 'not set',
        }
      }
    }

    return {
      name: 'JWT Claims',
      status: 'healthy',
      message: 'All required claims present',
      latency: Date.now() - start,
      details: {
        claimPath: metadata ? 'metadata' : 'publicMetadata',
        role,
        companyId: 'present',
      }
    }
  } catch (error) {
    return {
      name: 'JWT Claims',
      status: 'unhealthy',
      message: `Failed to read claims: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latency: Date.now() - start,
    }
  }
}

async function checkRLSPolicies(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = await createServerSupabaseClient()

    // Try to query a table that should have RLS
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1)

    if (error) {
      // If it's a permission error, RLS is working but user doesn't have access
      if (error.code === '42501' || error.message.includes('permission')) {
        return {
          name: 'RLS Policies',
          status: 'warning',
          message: 'RLS active but no data access - check JWT claims',
          latency: Date.now() - start,
          details: { error: error.message }
        }
      }

      return {
        name: 'RLS Policies',
        status: 'unhealthy',
        message: `RLS check failed: ${error.message}`,
        latency: Date.now() - start,
      }
    }

    return {
      name: 'RLS Policies',
      status: 'healthy',
      message: data ? `RLS working - ${data.length} client(s) accessible` : 'RLS working - no clients yet',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'RLS Policies',
      status: 'unhealthy',
      message: `RLS verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latency: Date.now() - start,
    }
  }
}

function checkEnvironmentVariables(): HealthCheck {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ]

  const optional = [
    'SUPABASE_SERVICE_ROLE_KEY',
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
