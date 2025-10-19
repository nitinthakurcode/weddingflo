import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './AuthProvider';
import { SupabaseProvider } from '@/providers/supabase-provider';
import { Toaster } from '@/components/ui/toaster';
import { PWAProvider } from '@/components/pwa/pwa-provider';
import { AnalyticsProvider } from './providers/analytics-provider';
import { ThemeInjector } from './providers/theme-injector';
import { TRPCProvider } from '@/lib/trpc/Provider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

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
};

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WeddingFlow Pro" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          <SupabaseProvider>
            <TRPCProvider>
              <ThemeInjector />
              <AnalyticsProvider>
                <PWAProvider>
                  {children}
                  <Toaster />
                </PWAProvider>
              </AnalyticsProvider>
            </TRPCProvider>
          </SupabaseProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
