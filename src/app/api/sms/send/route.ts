import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { sendSMS, isTwilioEnabled, formatPhoneNumber } from '@/lib/sms/twilio-client';
import { checkUserRateLimit } from '@/lib/email/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SendSMSRequest {
  to: string;
  message: string;
  from?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is enabled
    if (!isTwilioEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'SMS service is not configured. Please contact support.',
        },
        { status: 503 }
      );
    }

    // Authenticate user
    const { userId } = await getServerSession();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SendSMSRequest = await request.json();
    const { to, message, from } = body;

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    // Validate message length (Twilio limit is 1600 characters)
    if (message.length > 1600) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message too long. Maximum 1600 characters allowed.',
        },
        { status: 400 }
      );
    }

    // Check rate limits (Redis-backed)
    const userLimit = await checkUserRateLimit(userId);
    if (!userLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: new Date(userLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(to);

    // Send SMS
    const result = await sendSMS({
      to: formattedPhone,
      message,
      from,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send SMS',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'SMS sent successfully',
    });
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Get SMS service status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getServerSession();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const enabled = isTwilioEnabled();

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled ? 'SMS service is available' : 'SMS service is not configured',
    });
  } catch (error) {
    console.error('SMS status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
