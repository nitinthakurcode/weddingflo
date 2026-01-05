import { NextRequest, NextResponse } from 'next/server';
import { db, sql } from '@/lib/db';
import crypto from 'crypto';

/**
 * Track Website Visit API
 * Session 49: Analytics tracking for wedding websites
 *
 * POST /api/websites/track-visit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { websiteId, sessionId, pagePath, referrer } = body;

    if (!websiteId || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash IP for privacy
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ipHash = ip
      ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
      : null;

    const userAgent = request.headers.get('user-agent') || null;

    // Insert visit record using raw SQL
    await db.execute(sql`
      INSERT INTO website_visits (website_id, session_id, page_path, referrer, visitor_ip, user_agent)
      VALUES (${websiteId}, ${sessionId}, ${pagePath || '/'}, ${referrer || null}, ${ipHash}, ${userAgent})
    `);

    // Increment view count using raw SQL
    await db.execute(sql`
      UPDATE wedding_websites
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = ${websiteId}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track visit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
