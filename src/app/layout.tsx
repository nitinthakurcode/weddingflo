// Root layout - pass through to locale layout which has html/body
// This pattern is required for next-intl internationalization with dynamic locale
// Next.js 16 note: The locale layout at [locale]/layout.tsx provides html/body tags

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
