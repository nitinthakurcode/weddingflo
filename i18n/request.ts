import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

/**
 * NOVEMBER 2025 i18n REQUEST CONFIGURATION
 *
 * Next.js 15 compatible pattern using requestLocale (async)
 * This is called for each request to provide messages for the current locale
 */

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` is async in Next.js 15 - must await it
  // Can be undefined if middleware couldn't determine locale
  let locale = await requestLocale

  // Validate against supported locales
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
