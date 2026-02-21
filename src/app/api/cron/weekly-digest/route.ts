import { NextRequest, NextResponse } from 'next/server'
import { db, eq } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { sendCompanyWeeklyDigests } from '@/lib/email/digest-service'

// This endpoint should be called by a cron job (e.g., every Monday morning)
// Protected by a secret key to prevent unauthorized access

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active companies
    const activeCompanies = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)

    const results: Array<{
      companyId: string
      companyName: string
      sent: number
      failed: number
      skipped: number
    }> = []

    // Process each company
    for (const company of activeCompanies) {
      const digestResults = await sendCompanyWeeklyDigests(company.id)
      results.push({
        companyId: company.id,
        companyName: company.name,
        ...digestResults,
      })
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

    console.log(`Weekly digest cron completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`)

    return NextResponse.json({
      success: true,
      summary: {
        totalSent,
        totalFailed,
        totalSkipped,
        companiesProcessed: results.length,
      },
      details: results,
    })
  } catch (error) {
    console.error('Weekly digest cron error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process weekly digests',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'weekly-digest',
    description: 'Send weekly digest emails to all active clients',
    usage: 'POST with Authorization: Bearer <CRON_SECRET>',
  })
}
