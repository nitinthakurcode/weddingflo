import { NextRequest, NextResponse } from 'next/server';
import { renderEmailTemplate } from '@/lib/email/template-renderer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  try {
    const { template } = await params;
    const { searchParams } = new URL(request.url);

    // Parse template props from query params
    const templateProps: any = {};
    for (const [key, value] of searchParams.entries()) {
      try {
        // Try to parse JSON values
        templateProps[key] = JSON.parse(value);
      } catch {
        // If not JSON, use as string
        templateProps[key] = value;
      }
    }

    // Set default props for preview
    const defaultProps = {
      guestName: templateProps.guestName || 'John Doe',
      eventName: templateProps.eventName || 'Sarah & Michael\'s Wedding',
      eventDate: templateProps.eventDate || 'Saturday, June 15, 2025',
      eventTime: templateProps.eventTime || '4:00 PM',
      venue: templateProps.venue || 'The Grand Ballroom',
      venueAddress: templateProps.venueAddress || '123 Main St, New York, NY 10001',
      companyName: templateProps.companyName || 'WeddingFlow Pro',
      primaryColor: templateProps.primaryColor || '#3b82f6',
      ...templateProps,
    };

    // Import template
    const templateModule = await import(`@/emails/${template}-email`);
    const TemplateComponent =
      templateModule.default ||
      templateModule[
        template.charAt(0).toUpperCase() +
          template.slice(1).replace(/-(.)/g, (_, c) => c.toUpperCase()) +
          'Email'
      ];

    if (!TemplateComponent) {
      return NextResponse.json(
        { success: false, error: `Template ${template} not found` },
        { status: 404 }
      );
    }

    // Render template
    const { html } = await renderEmailTemplate(
      TemplateComponent(defaultProps)
    );

    // Return HTML for preview
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Email preview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to preview email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// List available templates
export async function POST(request: NextRequest) {
  const templates = [
    {
      name: 'invite',
      title: 'Event Invitation',
      description: 'Invitation to wedding event',
      requiredProps: ['guestName', 'eventName', 'eventDate', 'eventTime', 'venue'],
    },
    {
      name: 'reminder',
      title: 'Event Reminder',
      description: 'Reminder for upcoming event',
      requiredProps: ['guestName', 'eventName', 'eventDate', 'eventTime', 'venue', 'daysUntilEvent'],
    },
    {
      name: 'thank-you',
      title: 'Thank You Note',
      description: 'Thank you for the gift',
      requiredProps: ['guestName'],
    },
    {
      name: 'rsvp-confirmation',
      title: 'RSVP Confirmation',
      description: 'Confirmation of RSVP submission',
      requiredProps: ['guestName', 'eventName', 'eventDate', 'eventTime', 'venue', 'attendingStatus'],
    },
    {
      name: 'vendor-notification',
      title: 'Vendor Notification',
      description: 'Notification for vendors',
      requiredProps: ['vendorName', 'notificationType', 'eventName', 'eventDate', 'message'],
    },
    {
      name: 'budget-alert',
      title: 'Budget Alert',
      description: 'Budget overspend warning',
      requiredProps: ['userName', 'eventName', 'totalBudget', 'spentAmount', 'remainingAmount'],
    },
  ];

  return NextResponse.json({
    success: true,
    templates,
  });
}
