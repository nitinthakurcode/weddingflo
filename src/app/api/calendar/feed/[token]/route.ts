import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ICalGenerator, type ICalEvent } from '@/lib/calendar/ical-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token format
    if (!token || token.length !== 64) {
      return new NextResponse('Invalid token', { status: 400 });
    }

    // Create Supabase client inside handler (not at module level)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Get token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('ical_feed_tokens')
      .select('user_id, company_id, is_active, access_count')
      .eq('feed_token', token)
      .single();

    if (tokenError || !tokenData) {
      return new NextResponse('Token not found', { status: 404 });
    }

    if (!tokenData.is_active) {
      return new NextResponse('Feed disabled', { status: 403 });
    }

    // Get user settings
    const { data: settings } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', tokenData.user_id)
      .single();

    if (!settings || !settings.ical_feed_enabled) {
      return new NextResponse('Feed disabled', { status: 403 });
    }

    // Fetch events based on settings
    const events: ICalEvent[] = [];

    // Fetch events if enabled
    if (settings.ical_include_events) {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, clients!inner(company_id)')
        .eq('clients.company_id', tokenData.company_id)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(500);

      if (eventsData) {
        for (const event of eventsData) {
          const startDate = new Date(`${event.event_date}T${event.start_time || '09:00:00'}`);
          const endDate = new Date(`${event.event_date}T${event.end_time || '17:00:00'}`);

          events.push({
            uid: `event-${event.id}@weddingflow.pro`,
            summary: event.title,
            description: event.description || event.notes || undefined,
            location: event.location || event.venue_name || undefined,
            startDate,
            endDate,
            created: new Date(event.created_at),
            lastModified: new Date(event.updated_at),
            sequence: 0,
            status: event.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
          });
        }
      }
    }

    // Fetch timeline items if enabled
    if (settings.ical_include_timeline) {
      const { data: timelineData } = await supabase
        .from('timeline')
        .select('*, clients!inner(company_id)')
        .eq('clients.company_id', tokenData.company_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(500);

      if (timelineData) {
        for (const item of timelineData) {
          const startDate = new Date(item.start_time);
          const endDate = item.end_time ? new Date(item.end_time) : new Date(startDate.getTime() + item.duration_minutes * 60000);

          events.push({
            uid: `timeline-${item.id}@weddingflow.pro`,
            summary: item.title,
            description: item.description || undefined,
            location: item.location || undefined,
            startDate,
            endDate,
            created: new Date(item.created_at),
            lastModified: new Date(item.updated_at),
            sequence: 0,
            status: item.completed ? 'CONFIRMED' : 'TENTATIVE',
          });
        }
      }
    }

    // Fetch tasks if enabled
    if (settings.ical_include_tasks) {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, clients!inner(company_id)')
        .eq('clients.company_id', tokenData.company_id)
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .in('status', ['todo', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(200);

      if (tasksData) {
        for (const task of tasksData) {
          const dueDate = new Date(`${task.due_date}T09:00:00`);
          const endDate = new Date(`${task.due_date}T17:00:00`);

          events.push({
            uid: `task-${task.id}@weddingflow.pro`,
            summary: `[Task] ${task.title}`,
            description: task.description || undefined,
            location: undefined,
            startDate: dueDate,
            endDate,
            created: new Date(task.created_at),
            lastModified: new Date(task.updated_at),
            sequence: 0,
            status: 'TENTATIVE',
          });
        }
      }
    }

    // Generate iCal feed
    const icalContent = ICalGenerator.generate(
      events,
      'WeddingFlow Pro Calendar'
    );

    // Update access tracking
    await supabase
      .from('ical_feed_tokens')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: (tokenData.access_count || 0) + 1,
      })
      .eq('feed_token', token);

    // Return iCal feed
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="weddingflow-calendar.ics"',
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('iCal feed error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
