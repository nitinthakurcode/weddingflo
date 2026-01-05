// Root layout passes through to locale layout which has html/body tags
// This pattern is required for next-intl internationalization
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
