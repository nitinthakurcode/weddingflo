export const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  hi: 'हिन्दी',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  ja: '🇯🇵',
  zh: '🇨🇳',
  hi: '🇮🇳',
}

// Map locales to their typical currencies (reference only)
export const localeCurrencyMap: Record<Locale, string> = {
  en: 'USD',
  es: 'EUR',
  fr: 'EUR',
  de: 'EUR',
  ja: 'JPY',
  zh: 'CNY',
  hi: 'INR',
}
