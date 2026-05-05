/**
 * ROOT LAYOUT — CRITICAL STRUCTURE
 *
 * WARNING: This file MUST contain <html> and <body> tags.
 * Next.js 16+ requires these in the ROOT layout (not nested layouts).
 * DO NOT remove html/body from this file.
 * DO NOT add html/body to [locale]/layout.tsx.
 *
 * Guard test: src/app/__tests__/root-layout.test.ts
 */
import type { ReactNode } from 'react'
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a3a2f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WeddingFlow" />
      </head>
      <body className={`${plusJakarta.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
