"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const server_2 = require("./_generated/server");
const api_1 = require("./_generated/api");
const http = (0, server_1.httpRouter)();
// Onboarding endpoint that can be called from the frontend
http.route({
    path: '/onboard',
    method: 'POST',
    handler: (0, server_2.httpAction)(async (ctx, request) => {
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
            const userId = await ctx.runMutation(api_1.internal.users.onboardUserInternal, {
                clerkId,
                email,
                name,
                avatarUrl,
            });
            return new Response(JSON.stringify({ success: true, userId }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            console.error('Onboarding error:', error);
            return new Response(JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to onboard user',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }),
});
exports.default = http;
