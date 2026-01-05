'use client';

import { useEffect } from 'react';
import type { WeddingWebsite } from '@/lib/db/types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { ClassicTemplate } from './templates/classic-template';
import { ModernTemplate } from './templates/modern-template';
import { ElegantTemplate } from './templates/elegant-template';
import { RusticTemplate } from './templates/rustic-template';
import { MinimalistTemplate } from './templates/minimalist-template';
import { GenericTemplate } from './templates/generic-template';

type Website = WeddingWebsite;

interface WebsiteRendererProps {
  website: Website;
  template: WeddingTemplate;
}

// Original 5 templates with custom components
const LEGACY_TEMPLATES = ['classic', 'modern', 'elegant', 'rustic', 'minimalist'];

/**
 * Website Renderer
 * December 2025: Template-based rendering system for 20 templates
 *
 * Dynamically renders the appropriate template
 * Supports both legacy custom templates and new generic templates
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
  // Use legacy custom templates for original 5, generic for new 15
  if (!LEGACY_TEMPLATES.includes(template.id)) {
    return <GenericTemplate website={website} template={template} />;
  }

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
