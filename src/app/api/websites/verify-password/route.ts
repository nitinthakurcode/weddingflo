import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
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

    const supabase = createServerSupabaseAdminClient();

    // Get website password hash
    const { data: website } = await supabase
      .from('wedding_websites')
      .select('password_hash')
      .eq('id', websiteId)
      .single();

    if (!website?.password_hash) {
      return NextResponse.json({ valid: false, error: 'No password set' }, { status: 400 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, website.password_hash);

    return NextResponse.json({ valid });
  } catch (error: any) {
    console.error('Password verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
