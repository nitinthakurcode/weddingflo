/**
 * Redis Keep-Alive Cron Endpoint
 *
 * June 2026 - Pings Upstash Redis so a low-traffic/idle deployment doesn't get
 * its free database auto-deleted for inactivity (which previously killed prod
 * realtime). During normal use the realtime SSE poll already keeps Redis warm;
 * this is the safety net for idle stretches (e.g. pre-launch).
 *
 * Called by Dokploy cron daily:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://web:3000/api/cron/redis-keepalive
 */

import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/realtime/redis-pubsub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

async function handle(request: Request) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get('Authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'Redis not configured' },
        { status: 503 }
      );
    }

    const redis = getRedisClient();
    const start = Date.now();

    // PING to keep the database active, plus a tiny self-expiring write so the
    // activity is unmistakable to the provider's inactivity tracker.
    const pong = await redis.ping();
    await redis.set('wf:keepalive', new Date().toISOString(), { ex: 172800 }); // 48h TTL

    const ms = Date.now() - start;
    console.log(`[Cron] Redis keep-alive ok (${pong}) in ${ms}ms`);
    return NextResponse.json({ ok: true, pong, ms });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Redis keep-alive failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handle(request);
}

// Allow GET too, for cron schedulers / manual checks that use GET.
export async function GET(request: Request) {
  return handle(request);
}
