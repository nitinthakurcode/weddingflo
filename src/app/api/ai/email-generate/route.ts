import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { handleAIError } from '@/lib/ai/error-handler';
import { generateEmail, EmailGenerationRequest } from '@/lib/ai/email-generator';

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

    // Validate input
    if (!body.type) {
      return NextResponse.json(
        { error: 'Email type is required' },
        { status: 400 }
      );
    }

    if (!body.recipientType) {
      return NextResponse.json(
        { error: 'Recipient type is required' },
        { status: 400 }
      );
    }

    // Generate email
    const result = await generateEmail(body as EmailGenerationRequest);

    return NextResponse.json(result);
  } catch (error) {
    const aiError = handleAIError(error);
    return NextResponse.json(
      { error: aiError.message, type: aiError.type },
      { status: aiError.type === 'rate_limit' ? 429 : 500 }
    );
  }
}
