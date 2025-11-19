import { getRequestConfig } from 'next-intl/server'
import { locales, type Locale, defaultLocale } from './config'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale parameter is valid
  // Use default locale if invalid instead of throwing 404
  const validLocale = (locale && locales.includes(locale as Locale))
    ? (locale as Locale)
    : defaultLocale

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  }
})
