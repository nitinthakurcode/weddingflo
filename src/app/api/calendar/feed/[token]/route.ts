import { NextRequest, NextResponse } from 'next/server';
import { db, eq, sql, and, gte } from '@/lib/db';
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

    // Get token from database using Drizzle
    const tokenResult = await db.execute(sql`
      SELECT user_id, company_id, is_active, access_count
      FROM ical_feed_tokens
      WHERE feed_token = ${token}
      LIMIT 1
    `);

    const tokenData = tokenResult.rows[0] as {
      user_id: string;
      company_id: string;
      is_active: boolean;
      access_count: number;
    } | undefined;

    if (!tokenData) {
      return new NextResponse('Token not found', { status: 404 });
    }

    if (!tokenData.is_active) {
      return new NextResponse('Feed disabled', { status: 403 });
    }

    // Get user settings using Drizzle
    const settingsResult = await db.execute(sql`
      SELECT * FROM calendar_sync_settings
      WHERE user_id = ${tokenData.user_id}
      LIMIT 1
    `);

    const settings = settingsResult.rows[0] as {
      ical_feed_enabled: boolean;
      ical_include_events: boolean;
      ical_include_timeline: boolean;
      ical_include_tasks: boolean;
    } | undefined;

    if (!settings || !settings.ical_feed_enabled) {
      return new NextResponse('Feed disabled', { status: 403 });
    }

    // Fetch events based on settings
    const events: ICalEvent[] = [];
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // Fetch events if enabled
    if (settings.ical_include_events) {
      const eventsResult = await db.execute(sql`
        SELECT e.* FROM events e
        INNER JOIN clients c ON e.client_id = c.id
        WHERE c.company_id = ${tokenData.company_id}
          AND e.event_date >= ${today}
        ORDER BY e.event_date ASC
        LIMIT 500
      `);

      for (const event of eventsResult.rows as any[]) {
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

    // Fetch timeline items if enabled
    if (settings.ical_include_timeline) {
      const timelineResult = await db.execute(sql`
        SELECT t.* FROM timeline t
        INNER JOIN clients c ON t.client_id = c.id
        WHERE c.company_id = ${tokenData.company_id}
          AND t.start_time >= ${nowIso}
        ORDER BY t.start_time ASC
        LIMIT 500
      `);

      for (const item of timelineResult.rows as any[]) {
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

    // Fetch tasks if enabled
    if (settings.ical_include_tasks) {
      const tasksResult = await db.execute(sql`
        SELECT t.* FROM tasks t
        INNER JOIN clients c ON t.client_id = c.id
        WHERE c.company_id = ${tokenData.company_id}
          AND t.due_date IS NOT NULL
          AND t.due_date >= ${today}
          AND t.status IN ('todo', 'in_progress')
        ORDER BY t.due_date ASC
        LIMIT 200
      `);

      for (const task of tasksResult.rows as any[]) {
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

    // Generate iCal feed
    const icalContent = ICalGenerator.generate(
      events,
      'WeddingFlo Calendar'
    );

    // Update access tracking using Drizzle
    await db.execute(sql`
      UPDATE ical_feed_tokens
      SET last_accessed = NOW(), access_count = ${(tokenData.access_count || 0) + 1}
      WHERE feed_token = ${token}
    `);

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
