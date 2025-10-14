import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { handleAIError } from '@/lib/ai/error-handler';
import { optimizeTimeline, TimelineEvent } from '@/lib/ai/timeline-optimizer';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    checkRateLimit(userId);

    // Parse request body
    const body = await req.json();
    const { events } = body;

    // Validate input
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid events array' },
        { status: 400 }
      );
    }

    // Run optimization
    const result = await optimizeTimeline(events as TimelineEvent[]);

    return NextResponse.json(result);
  } catch (error) {
    const aiError = handleAIError(error);
    return NextResponse.json(
      { error: aiError.message, type: aiError.type },
      { status: aiError.type === 'rate_limit' ? 429 : 500 }
    );
  }
}
