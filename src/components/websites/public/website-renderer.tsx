'use client';

import { useEffect } from 'react';
import type { Database } from '@/lib/database.types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { ClassicTemplate } from './templates/classic-template';
import { ModernTemplate } from './templates/modern-template';
import { ElegantTemplate } from './templates/elegant-template';
import { RusticTemplate } from './templates/rustic-template';
import { MinimalistTemplate } from './templates/minimalist-template';

type Website = Database['public']['Tables']['wedding_websites']['Row'];

interface WebsiteRendererProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Website Renderer
 * Session 49: Template-based rendering system
 *
 * Dynamically renders the appropriate template
 * Tracks analytics
 */
export function WebsiteRenderer({ website, template }: WebsiteRendererProps) {
  // Track visit on mount
  useEffect(() => {
    const sessionId = getOrCreateSessionId();

    // Track visit (fire and forget)
    fetch('/api/websites/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: website.id,
        sessionId,
        pagePath: window.location.pathname,
        referrer: document.referrer,
      }),
    }).catch(() => {
      // Silent fail - don't break the page if tracking fails
    });
  }, [website.id]);

  // Render appropriate template
  switch (template.id) {
    case 'modern':
      return <ModernTemplate website={website} template={template} />;
    case 'elegant':
      return <ElegantTemplate website={website} template={template} />;
    case 'rustic':
      return <RusticTemplate website={website} template={template} />;
    case 'minimalist':
      return <MinimalistTemplate website={website} template={template} />;
    case 'classic':
    default:
      return <ClassicTemplate website={website} template={template} />;
  }
}

function getOrCreateSessionId(): string {
  const key = 'wf-session-id';
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
}
