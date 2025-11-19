import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n/config'

export default function RootPage() {
  // Redirect to default locale
  // In the future, we can add browser locale detection here
  redirect(`/${defaultLocale}`)
}
