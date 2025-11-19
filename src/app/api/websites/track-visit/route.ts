import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
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

    const supabase = createServerSupabaseAdminClient();

    // Hash IP for privacy
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ipHash = ip
      ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
      : null;

    const userAgent = request.headers.get('user-agent') || undefined;

    // Insert visit record
    await supabase.from('website_visits').insert({
      website_id: websiteId,
      session_id: sessionId,
      page_path: pagePath || '/',
      referrer: referrer || undefined,
      visitor_ip: ipHash,
      user_agent: userAgent,
    });

    // Increment view count
    const { data: website } = await supabase
      .from('wedding_websites')
      .select('view_count')
      .eq('id', websiteId)
      .single();

    if (website) {
      await supabase
        .from('wedding_websites')
        .update({ view_count: website.view_count + 1 })
        .eq('id', websiteId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track visit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
