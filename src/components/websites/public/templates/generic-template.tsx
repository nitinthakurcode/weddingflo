'use client';

import type { WeddingWebsite } from '@/lib/db/types';
import type { WeddingTemplate } from '@/lib/templates/wedding-templates';
import { Heart, Calendar, MapPin, Users, Gift, Camera } from 'lucide-react';

type Website = WeddingWebsite;

interface GenericTemplateProps {
  website: Website;
  template: WeddingTemplate;
}

/**
 * Generic Template
 * February 2026: Flexible template for all wedding styles
 *
 * Features:
 * - Dynamic styling based on template config
 * - All standard sections
 * - Responsive design
 * - Customizable colors and fonts
 */
export function GenericTemplate({ website, template }: GenericTemplateProps) {
  const content = (website.settings as Record<string, any>) || {};
  const colors = template.theme_colors || {
    primary: '#3D3027',
    secondary: '#FACC15',
    accent: '#F5F5F4',
    background: '#FFFFFF',
    text: '#1F2937',
  };
  const fonts = template.fonts || {
    heading: 'serif',
    body: 'sans-serif',
  };

  return (
    <div
      className="generic-template min-h-screen"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: fonts.body,
      }}
    >
      {/* Hero Section */}
      <section
        className="relative h-screen flex items-center justify-center text-center"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 text-white px-4">
          <Heart className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h1
            className="text-5xl md:text-7xl mb-4 font-light"
            style={{ fontFamily: fonts.heading }}
          >
            {content.coupleNames || 'We Are Getting Married'}
          </h1>
          {content.weddingDate && (
            <p className="text-xl md:text-2xl opacity-90 flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5" />
              {content.weddingDate}
            </p>
          )}
          {content.venue && (
            <p className="text-lg opacity-80 mt-4 flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5" />
              {content.venue}
            </p>
          )}
        </div>
      </section>

      {/* Our Story Section */}
      {content.ourStory && (
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2
              className="text-3xl md:text-4xl mb-8"
              style={{ fontFamily: fonts.heading, color: colors.primary }}
            >
              Our Story
            </h2>
            <p className="text-lg leading-relaxed opacity-80">
              {content.ourStory}
            </p>
          </div>
        </section>
      )}

      {/* Event Details Section */}
      {content.events && content.events.length > 0 && (
        <section
          className="py-20 px-4"
          style={{ backgroundColor: colors.accent }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl md:text-4xl mb-12 text-center"
              style={{ fontFamily: fonts.heading, color: colors.primary }}
            >
              Event Details
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {content.events.map((event: any, index: number) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm text-center"
                >
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: colors.primary }}
                  >
                    {event.name}
                  </h3>
                  {event.date && (
                    <p className="flex items-center justify-center gap-2 text-sm opacity-70 mb-2">
                      <Calendar className="h-4 w-4" />
                      {event.date}
                    </p>
                  )}
                  {event.venue && (
                    <p className="flex items-center justify-center gap-2 text-sm opacity-70">
                      <MapPin className="h-4 w-4" />
                      {event.venue}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {content.gallery && content.gallery.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2
              className="text-3xl md:text-4xl mb-12 text-center"
              style={{ fontFamily: fonts.heading, color: colors.primary }}
            >
              <Camera className="h-8 w-8 inline mr-3" />
              Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {content.gallery.map((image: string, index: number) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden"
                >
                  <img
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RSVP Section */}
      {content.showRsvp !== false && (
        <section
          className="py-20 px-4"
          style={{ backgroundColor: colors.primary }}
        >
          <div className="max-w-xl mx-auto text-center text-white">
            <Users className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2
              className="text-3xl md:text-4xl mb-4"
              style={{ fontFamily: fonts.heading }}
            >
              RSVP
            </h2>
            <p className="opacity-80 mb-8">
              We would be honored to have you celebrate with us.
            </p>
            <button
              className="px-8 py-3 rounded-full text-lg font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: colors.secondary,
                color: colors.primary,
              }}
            >
              Respond Now
            </button>
          </div>
        </section>
      )}

      {/* Registry Section */}
      {content.showRegistry && (
        <section className="py-20 px-4">
          <div className="max-w-xl mx-auto text-center">
            <Gift className="h-12 w-12 mx-auto mb-6" style={{ color: colors.primary }} />
            <h2
              className="text-3xl md:text-4xl mb-4"
              style={{ fontFamily: fonts.heading, color: colors.primary }}
            >
              Gift Registry
            </h2>
            <p className="opacity-80">
              Your presence is the greatest gift, but if you wish to honor us with a present,
              we have registered at the following stores.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className="py-8 px-4 text-center"
        style={{ backgroundColor: colors.accent }}
      >
        <Heart className="h-6 w-6 mx-auto mb-4" style={{ color: colors.primary }} />
        <p className="text-sm opacity-70">
          Made with love using WeddingFlo
        </p>
      </footer>
    </div>
  );
}
