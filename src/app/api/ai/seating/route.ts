import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { handleAIError } from '@/lib/ai/error-handler';
import { optimizeSeating, Guest, Table } from '@/lib/ai/seating-optimizer';

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
    const { guests, tables } = body;

    // Validate input
    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json(
        { error: 'Invalid guests array' },
        { status: 400 }
      );
    }

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tables array' },
        { status: 400 }
      );
    }

    // Validate total capacity
    const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
    if (totalCapacity < guests.length) {
      return NextResponse.json(
        { error: 'Insufficient table capacity for all guests' },
        { status: 400 }
      );
    }

    // Run optimization
    const result = await optimizeSeating(guests as Guest[], tables as Table[]);

    return NextResponse.json(result);
  } catch (error) {
    const aiError = handleAIError(error);
    return NextResponse.json(
      { error: aiError.message, type: aiError.type },
      { status: aiError.type === 'rate_limit' ? 429 : 500 }
    );
  }
}
