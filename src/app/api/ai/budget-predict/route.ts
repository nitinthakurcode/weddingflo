import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { handleAIError } from '@/lib/ai/error-handler';
import { predictBudget, BudgetItem, EventDetails } from '@/lib/ai/budget-predictor';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await getServerSession();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting (Redis-backed)
    await checkRateLimit(userId);

    // Parse request body
    const body = await req.json();
    const { budgetItems, eventDetails } = body;

    // Validate input
    if (!budgetItems || !Array.isArray(budgetItems) || budgetItems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid budget items array' },
        { status: 400 }
      );
    }

    if (!eventDetails || typeof eventDetails !== 'object') {
      return NextResponse.json(
        { error: 'Invalid event details' },
        { status: 400 }
      );
    }

    // Run prediction
    const result = await predictBudget(
      budgetItems as BudgetItem[],
      eventDetails as EventDetails
    );

    return NextResponse.json(result);
  } catch (error) {
    const aiError = handleAIError(error);
    return NextResponse.json(
      { error: aiError.message, type: aiError.type },
      { status: aiError.type === 'rate_limit' ? 429 : 500 }
    );
  }
}
