import { headers } from 'next/headers'
import { type Locale, locales, defaultLocale } from '@/i18n/config'

/**
 * Detect user's preferred locale from Accept-Language header
 */
export async function detectLocaleFromHeader(): Promise<Locale> {
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language')

  if (!acceptLanguage) {
    return defaultLocale
  }

  // Parse Accept-Language header
  // Format: "en-US,en;q=0.9,es;q=0.8,zh-CN;q=0.7"
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, q = 'q=1'] = lang.trim().split(';')
      const quality = parseFloat(q.split('=')[1] || '1')
      // Extract base language code (en from en-US, zh from zh-CN)
      const baseLocale = locale.split('-')[0]
      return { locale: baseLocale, quality }
    })
    .sort((a, b) => b.quality - a.quality)

  // Find first supported locale
  for (const { locale } of languages) {
    if (locales.includes(locale as Locale)) {
      return locale as Locale
    }
  }

  return defaultLocale
}

/**
 * Get locale from cookie or header
 */
export async function getPreferredLocale(userPreference?: string): Promise<Locale> {
  // 1. User preference from database (highest priority)
  if (userPreference && locales.includes(userPreference as Locale)) {
    return userPreference as Locale
  }

  // 2. Browser Accept-Language header
  try {
    return await detectLocaleFromHeader()
  } catch {
    return defaultLocale
  }
}
