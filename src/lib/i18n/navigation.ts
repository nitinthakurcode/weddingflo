import { createNavigation } from 'next-intl/navigation'
import { locales } from '@/i18n/config'

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  localePrefix: 'always'
})

// Re-export useParams for locale access
export { useParams } from 'next/navigation'
