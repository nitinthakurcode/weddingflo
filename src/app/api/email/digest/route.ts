import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'
import { sendWeeklyDigest, generateDigestForClient } from '@/lib/email/digest-service'

// Manual trigger for sending digest to a specific client
// Only accessible by authenticated company admins/staff

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getServerSession()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const companyId = user.companyId
    const role = user.role

    // Only company admins and staff can send digests
    if (!companyId || !role || !['company_admin', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden - Company admin or staff required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientId, preview } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    // If preview mode, return the digest data without sending
    if (preview) {
      const digestData = await generateDigestForClient(clientId, companyId)

      if (!digestData) {
        return NextResponse.json(
          { error: 'Client not found or no data available' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        preview: true,
        data: digestData,
      })
    }

    // Send the digest
    const result = await sendWeeklyDigest(clientId, companyId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send digest' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Digest email sent successfully',
    })
  } catch (error) {
    console.error('Digest API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process digest request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
