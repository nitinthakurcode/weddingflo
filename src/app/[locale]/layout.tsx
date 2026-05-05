import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n/config'
import type { ReactNode } from 'react'
import { AuthProvider, type ServerSession } from '../AuthProvider'
import { SetLocale } from '../SetLocale'
import { getServerSession } from '@/lib/auth/server'
import { Toaster } from '@/components/ui/toaster'
import { PWAProvider } from '@/components/pwa/pwa-provider'
import { AnalyticsProvider } from '../providers/analytics-provider'
import { ThemeInjector } from '../providers/theme-injector'
import { TRPCProvider } from '@/lib/trpc/Provider'
// import { PHProvider, PostHogIdentifier } from '@/lib/analytics/posthog-provider' // Temporarily disabled
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { OfflineInit } from '@/components/offline/offline-init'
import { FeedbackProvider } from '../providers/feedback-provider'
import { TourProvider } from '@/components/onboarding/product-tour'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://weddingflo.vercel.app'),
  title: {
    default: 'WeddingFlo - AI-Powered Wedding Management Platform',
    template: '%s | WeddingFlo'
  },
  description: 'All-in-one wedding planning solution with AI assistance. Manage guests, vendors, budgets, timelines, and more. Built for wedding planners and couples.',
  keywords: ['wedding planning', 'wedding management', 'event planning', 'guest management', 'wedding budget', 'vendor management', 'AI wedding planner'],
  authors: [{ name: 'WeddingFlo Team' }],
  creator: 'WeddingFlo',
  publisher: 'WeddingFlo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WeddingFlo',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'WeddingFlo',
    title: 'WeddingFlo - AI-Powered Wedding Management Platform',
    description: 'All-in-one wedding planning solution with AI assistance. Manage guests, vendors, budgets, timelines, and more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WeddingFlo - Wedding Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeddingFlo - AI-Powered Wedding Management',
    description: 'All-in-one wedding planning solution with AI assistance.',
    images: ['/og-image.png'],
    creator: '@weddingflowpro',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-96x96.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#1a3a2f', // Deep Forest Green - primary color
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

// Disable static generation for locale pages due to client-side auth requirements
// export function generateStaticParams() {
//   return locales.map((locale) => ({ locale }))
// }

// Force dynamic rendering to prevent webpack errors during static generation
export const dynamic = 'force-dynamic'

interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    notFound()
  }

  // Get messages for this locale
  let messages = {};
  try {
    messages = await getMessages({ locale: locale as Locale });
  } catch (error) {
    console.error('[Layout] Failed to load messages for locale:', locale, error);
    // Fall back to empty messages — components will show translation keys
  }

  // Get server session for proper hydration (prevents flash/mismatch)
  // This is safe to call on public pages - returns null if not authenticated
  let initialSession: ServerSession | null = null;
  try {
    const { user } = await getServerSession();
    if (user) {
      initialSession = {
        user: {
          id: user.id,
          email: user.email || '',
          name: user.name || null,
          image: user.image || null,
          role: user.role || null,
          companyId: user.companyId || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          // Don't default to false - let undefined flow through so dashboard can check DB
          onboardingCompleted: user.onboardingCompleted ?? undefined,
        },
        session: null,
      };
    }
  } catch (error) {
    // Session fetch failed - continue without initial session
    // AuthProvider will handle this gracefully
    console.warn('[Layout] Failed to fetch server session:', error);
  }

  return (
    <AuthProvider initialSession={initialSession}>
      <TRPCProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SetLocale locale={locale} />
          <ThemeInjector />
          <AnalyticsProvider>
            <PWAProvider>
              <TourProvider>
                <FeedbackProvider>
                  {children}
                  <Toaster />
                  <OfflineInit />
                  <OfflineIndicator />
                </FeedbackProvider>
              </TourProvider>
            </PWAProvider>
          </AnalyticsProvider>
        </NextIntlClientProvider>
      </TRPCProvider>
    </AuthProvider>
  )
}
