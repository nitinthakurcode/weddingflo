import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n/config'
import type { ReactNode } from 'react'
import dynamicImport from 'next/dynamic'
import { AuthProvider, type ServerSession } from '../AuthProvider'
import { AuthLoadedBoundary } from '../AuthLoadedBoundary'
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
import '../globals.css'

// TODO: PostHogPageView temporarily disabled due to posthog-js Node module compatibility issue
// See: https://github.com/PostHog/posthog-js/issues - node:fs, node:path errors in webpack
// Dynamic import to prevent Node.js module errors in client bundle
// const PostHogPageView = dynamic(
//   () => import('@/lib/analytics/posthog-pageview'),
//   { loading: () => null }
// )

// Primary sans-serif font - elegant and readable
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

// Display font - elegant serif for headings
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
  const messages = await getMessages({ locale: locale as Locale })

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
          role: (user as any).role || null,
          companyId: (user as any).companyId || null,
          firstName: (user as any).firstName || null,
          lastName: (user as any).lastName || null,
          // Don't default to false - let undefined flow through so dashboard can check DB
          onboardingCompleted: (user as any).onboardingCompleted ?? undefined,
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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a3a2f" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WeddingFlow" />
      </head>
      <body className={`${plusJakarta.variable} ${playfair.variable} font-sans antialiased`}>
        <AuthProvider initialSession={initialSession}>
          <AuthLoadedBoundary>
            <TRPCProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                <ThemeInjector />
                <AnalyticsProvider>
                  {/* <PHProvider> - Temporarily disabled due to posthog-js compatibility issue */}
                    {/* <PostHogPageView /> - Temporarily disabled, see TODO above */}
                    {/* <PostHogIdentifier /> - Temporarily disabled */}
                    <PWAProvider>
                      <FeedbackProvider>
                        {children}
                        <Toaster />
                      </FeedbackProvider>
                    </PWAProvider>
                  {/* </PHProvider> */}
                </AnalyticsProvider>
              </NextIntlClientProvider>
            </TRPCProvider>
          </AuthLoadedBoundary>
        </AuthProvider>
        <OfflineInit />
        <OfflineIndicator />
      </body>
    </html>
  )
}
