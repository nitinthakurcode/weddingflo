import { render } from '@react-email/components';
import { ReactElement } from 'react';

/**
 * Render React Email component to HTML string
 */
export async function renderEmailTemplate(
  component: ReactElement
): Promise<{ html: string; text: string }> {
  try {
    // Render HTML version
    const html = await render(component);

    // Render plain text version
    const text = await render(component, { plainText: true });

    return { html, text };
  } catch (error) {
    console.error('Failed to render email template:', error);
    throw new Error('Email template rendering failed');
  }
}

/**
 * Common email template props
 */
export interface BaseEmailProps {
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Get company branding for emails
 */
export function getEmailBranding(companyData?: any): BaseEmailProps {
  return {
    companyName: companyData?.company_name || 'WeddingFlo',
    companyLogo: companyData?.branding?.logo_url || undefined,
    primaryColor: companyData?.branding?.primary_color || '#3b82f6',
    secondaryColor: companyData?.branding?.secondary_color || '#8b5cf6',
  };
}

/**
 * Template types
 */
export type EmailTemplateType =
  | 'invite'
  | 'reminder'
  | 'thank-you'
  | 'rsvp-confirmation'
  | 'vendor-notification'
  | 'budget-alert'
  | 'welcome';

/**
 * Email template metadata
 */
export const EMAIL_TEMPLATES: Record<
  EmailTemplateType,
  {
    name: string;
    description: string;
    defaultSubject: string;
  }
> = {
  invite: {
    name: 'Event Invitation',
    description: 'Invitation to wedding event',
    defaultSubject: "You're Invited! 💒",
  },
  reminder: {
    name: 'Event Reminder',
    description: 'Reminder for upcoming event',
    defaultSubject: 'Event Reminder 📅',
  },
  'thank-you': {
    name: 'Thank You Note',
    description: 'Thank you for the gift',
    defaultSubject: 'Thank You! 💝',
  },
  'rsvp-confirmation': {
    name: 'RSVP Confirmation',
    description: 'Confirmation of RSVP submission',
    defaultSubject: 'RSVP Confirmed ✓',
  },
  'vendor-notification': {
    name: 'Vendor Notification',
    description: 'Notification for vendors',
    defaultSubject: 'Vendor Update 📋',
  },
  'budget-alert': {
    name: 'Budget Alert',
    description: 'Budget overspend warning',
    defaultSubject: 'Budget Alert ⚠️',
  },
  welcome: {
    name: 'Welcome Email',
    description: 'Welcome new users',
    defaultSubject: 'Welcome to WeddingFlo! 🎉',
  },
};
