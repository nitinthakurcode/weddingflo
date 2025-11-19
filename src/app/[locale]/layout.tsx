import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n/config'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AuthProvider } from '../AuthProvider'
import { SupabaseProvider } from '@/providers/supabase-provider'
import { Toaster } from '@/components/ui/toaster'
import { PWAProvider } from '@/components/pwa/pwa-provider'
import { AnalyticsProvider } from '../providers/analytics-provider'
import { ThemeInjector } from '../providers/theme-injector'
import { TRPCProvider } from '@/lib/trpc/Provider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
// import { PHProvider, PostHogIdentifier } from '@/lib/analytics/posthog-provider' // Temporarily disabled
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { OfflineInit } from '@/components/offline/offline-init'
import '../globals.css'

// TODO: PostHogPageView temporarily disabled due to posthog-js Node module compatibility issue
// See: https://github.com/PostHog/posthog-js/issues - node:fs, node:path errors in webpack
// Dynamic import to prevent Node.js module errors in client bundle
// const PostHogPageView = dynamic(
//   () => import('@/lib/analytics/posthog-pageview'),
//   { loading: () => null }
// )

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://weddingflow-pro.vercel.app'),
  title: {
    default: 'WeddingFlow Pro - AI-Powered Wedding Management Platform',
    template: '%s | WeddingFlow Pro'
  },
  description: 'All-in-one wedding planning solution with AI assistance. Manage guests, vendors, budgets, timelines, and more. Built for wedding planners and couples.',
  keywords: ['wedding planning', 'wedding management', 'event planning', 'guest management', 'wedding budget', 'vendor management', 'AI wedding planner'],
  authors: [{ name: 'WeddingFlow Pro Team' }],
  creator: 'WeddingFlow Pro',
  publisher: 'WeddingFlow Pro',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WeddingFlow Pro',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'WeddingFlow Pro',
    title: 'WeddingFlow Pro - AI-Powered Wedding Management Platform',
    description: 'All-in-one wedding planning solution with AI assistance. Manage guests, vendors, budgets, timelines, and more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WeddingFlow Pro - Wedding Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeddingFlow Pro - AI-Powered Wedding Management',
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
}

export const viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

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

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WeddingFlow" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          <SupabaseProvider>
            <TRPCProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                <ThemeInjector />
                <AnalyticsProvider>
                  {/* <PHProvider> - Temporarily disabled due to posthog-js compatibility issue */}
                    {/* <PostHogPageView /> - Temporarily disabled, see TODO above */}
                    {/* <PostHogIdentifier /> - Temporarily disabled */}
                    <PWAProvider>
                      {children}
                      <Toaster />
                    </PWAProvider>
                  {/* </PHProvider> */}
                </AnalyticsProvider>
              </NextIntlClientProvider>
            </TRPCProvider>
          </SupabaseProvider>
        </AuthProvider>
        <OfflineInit />
        <OfflineIndicator />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

// Export web vitals reporting for performance monitoring
export { reportWebVitals } from '@/lib/performance/metrics';
