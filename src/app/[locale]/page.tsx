import { Link } from '@/lib/i18n/navigation';
import Script from 'next/script';

export default function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weddingflow-pro.vercel.app';

  // JSON-LD Structured Data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      // Organization
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'WeddingFlow Pro',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`,
        },
        description:
          'AI-powered wedding management platform for wedding planners and couples. Manage guests, vendors, budgets, timelines, and more.',
        sameAs: [
          'https://twitter.com/weddingflowpro',
          'https://facebook.com/weddingflowpro',
        ],
      },
      // SoftwareApplication
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#softwareapplication`,
        name: 'WeddingFlow Pro',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Event Management Software',
        operatingSystem: 'Web Browser, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free trial available',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '250',
          bestRating: '5',
        },
        featureList: [
          'Guest Management & RSVP Tracking',
          'Budget Management & Tracking',
          'Vendor Management',
          'Timeline Planning',
          'QR Code Check-in',
          'AI-Powered Insights',
          'Multi-tenant Support',
        ],
        screenshot: `${baseUrl}/og-image.png`,
        description:
          'Comprehensive wedding planning solution with AI assistance. Manage guests, vendors, budgets, timelines, and more. Built for wedding planners and couples.',
      },
      // WebPage
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/#webpage`,
        url: baseUrl,
        name: 'WeddingFlow Pro - AI-Powered Wedding Management Platform',
        description:
          'All-in-one wedding planning solution with AI assistance. Manage guests, vendors, budgets, timelines, and more.',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        about: {
          '@id': `${baseUrl}/#organization`,
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: `${baseUrl}/og-image.png`,
        },
      },
      // WebSite
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'WeddingFlow Pro',
        description: 'AI-Powered Wedding Management Platform',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data using Next.js Script component */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        strategy="afterInteractive"
      />

      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold">WeddingFlow Pro</h1>
        <p className="mt-4 text-lg text-gray-600">
          AI-Powered Wedding Management Platform
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/sign-in"
            className="rounded-md bg-primary px-6 py-3 text-white font-medium hover:bg-primary transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-primary px-6 py-3 text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </>
  );
}
