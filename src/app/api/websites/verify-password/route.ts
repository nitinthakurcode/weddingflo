import { NextRequest, NextResponse } from 'next/server';
import { db, eq } from '@/lib/db';
import { weddingWebsites } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

/**
 * Verify Website Password API
 * Session 49: Password protection for wedding websites
 *
 * POST /api/websites/verify-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { websiteId, password } = body;

    if (!websiteId || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get website password hash using Drizzle
    const websiteResult = await db
      .select({ password: weddingWebsites.password })
      .from(weddingWebsites)
      .where(eq(weddingWebsites.id, websiteId))
      .limit(1);

    const website = websiteResult[0];

    if (!website?.password) {
      return NextResponse.json({ valid: false, error: 'No password set' }, { status: 400 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, website.password);

    return NextResponse.json({ valid });
  } catch (error: any) {
    console.error('Password verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
