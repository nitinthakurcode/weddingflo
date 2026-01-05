import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { handleAIError } from '@/lib/ai/error-handler';
import { chatWithAssistant, Message, AssistantContext } from '@/lib/ai/assistant';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await getServerSession();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting (Redis-backed)
    await checkRateLimit(userId);

    // Parse request body
    const body = await req.json();
    const { messages, context } = body;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatWithAssistant(
            messages as Message[],
            (context as AssistantContext) || {}
          )) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          const aiError = handleAIError(error);
          controller.enqueue(
            encoder.encode(`\n\nError: ${aiError.message}`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const aiError = handleAIError(error);
    return new Response(
      JSON.stringify({ error: aiError.message, type: aiError.type }),
      {
        status: aiError.type === 'rate_limit' ? 429 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
