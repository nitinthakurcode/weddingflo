'use client';

import type { WeddingWebsite } from '@/lib/db/types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { Heart, Calendar, MapPin } from 'lucide-react';

type Website = WeddingWebsite;

interface ClassicTemplateProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Classic Elegance Template
 * Session 49: Timeless serif design
 *
 * Features:
 * - Full-width hero
 * - Timeline layout
 * - Photo gallery
 * - RSVP form
 */
export function ClassicTemplate({ website, template }: ClassicTemplateProps) {
  const content = website.content as Record<string, any> || {};
  const heroSection = content.hero_section as any;
  const ourStorySection = content.our_story_section as any;
  const eventDetailsSection = content.event_details_section as any;

  return (
    <div className="classic-template min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative h-screen flex items-center justify-center text-center"
        style={{
          backgroundImage: heroSection?.image
            ? `url(${heroSection.image})`
            : `linear-gradient(135deg, var(--mocha-800, #3D3027) 0%, var(--gold-400, #FACC15) 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-white px-4">
          <h1
            className="text-6xl md:text-8xl mb-4"
            style={{ fontFamily: template.fonts.heading }}
          >
            {heroSection?.title || 'Welcome'}
          </h1>
          <p
            className="text-2xl md:text-3xl mb-8"
            style={{ fontFamily: template.fonts.body }}
          >
            {heroSection?.subtitle || "We're getting married!"}
          </p>
          {heroSection?.date && (
            <div className="flex items-center justify-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              <time>{new Date(heroSection.date).toLocaleDateString()}</time>
            </div>
          )}
        </div>
      </section>

      {/* Our Story */}
      {ourStorySection?.content && (
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Heart className="h-12 w-12 mx-auto text-rose-500 mb-4" />
              <h2
                className="text-4xl md:text-5xl mb-4"
                style={{
                  fontFamily: template.fonts.heading,
                  color: template.theme_colors.primary,
                }}
              >
                Our Story
              </h2>
            </div>
            <div
              className="prose prose-lg max-w-none text-center"
              style={{ fontFamily: template.fonts.body }}
            >
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {ourStorySection.content}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Event Details */}
      {eventDetailsSection && (
        <section
          className="py-20 px-4"
          style={{ backgroundColor: template.theme_colors.background }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-4xl md:text-5xl text-center mb-12"
              style={{
                fontFamily: template.fonts.heading,
                color: template.theme_colors.primary,
              }}
            >
              Event Details
            </h2>
            {/* Event details would go here */}
            <p className="text-center text-mocha-600 dark:text-mocha-400" style={{ fontFamily: template.fonts.body }}>
              Event details coming soon...
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-mocha-900 dark:bg-mocha-950 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg mb-4" style={{ fontFamily: template.fonts.heading }}>
            {heroSection?.title}
          </p>
          <p className="text-sm opacity-70">
            Created with ❤️ using WeddingFlow
          </p>
        </div>
      </footer>
    </div>
  );
}
