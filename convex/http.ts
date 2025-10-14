import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api, internal } from './_generated/api';

const http = httpRouter();

// Onboarding endpoint that can be called from the frontend
http.route({
  path: '/onboard',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { clerkId, email, name, avatarUrl } = body;

      if (!clerkId || !email || !name) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Use the internal mutation that doesn't require authentication
      const userId = await ctx.runMutation(internal.users.onboardUserInternal, {
        clerkId,
        email,
        name,
        avatarUrl,
      });

      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Failed to onboard user',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }),
});

export default http;
