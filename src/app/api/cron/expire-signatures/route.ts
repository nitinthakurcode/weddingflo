/**
 * Expire Stale Signature Requests Cron Endpoint
 *
 * April 2026 - Daily cron to expire signature requests past their expiresAt date.
 *
 * Called by Dokploy cron daily: `curl -X POST http://web:3000/api/cron/expire-signatures`
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  documentSignatureRequests, documentSigners, documentAuditTrail,
} from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get('Authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();

    // Find stale requests
    const staleRequests = await db
      .select({ id: documentSignatureRequests.id })
      .from(documentSignatureRequests)
      .where(and(
        inArray(documentSignatureRequests.status, ['pending', 'partially_signed']),
        sql`${documentSignatureRequests.expiresAt} < ${now}`,
      ));

    let expiredCount = 0;
    for (const req of staleRequests) {
      await db
        .update(documentSignatureRequests)
        .set({ status: 'expired', updatedAt: now })
        .where(eq(documentSignatureRequests.id, req.id));

      await db
        .update(documentSigners)
        .set({ status: 'expired', updatedAt: now })
        .where(and(
          eq(documentSigners.requestId, req.id),
          inArray(documentSigners.status, ['pending', 'sent', 'viewed']),
        ));

      await db.insert(documentAuditTrail).values({
        requestId: req.id,
        action: 'expired',
        metadata: { reason: 'Automatically expired by cron' },
      });

      expiredCount++;
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Cron] expire-signatures error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
