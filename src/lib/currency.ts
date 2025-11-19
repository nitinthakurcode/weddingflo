import { dinero, toDecimal, add, multiply, type Dinero } from 'dinero.js';
import * as currencies from '@dinero.js/currencies';

// All supported currencies (matching your database)
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'hi-IN' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', locale: 'ar-SA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'zh-HK' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

// Get currency object from code
export function getCurrency(code: CurrencyCode) {
  const currencyMap: Record<string, any> = {
    USD: currencies.USD,
    EUR: currencies.EUR,
    GBP: currencies.GBP,
    CHF: currencies.CHF,
    JPY: currencies.JPY,
    AUD: currencies.AUD,
    CAD: currencies.CAD,
    INR: currencies.INR,
    CNY: currencies.CNY,
    BRL: currencies.BRL,
    MXN: currencies.MXN,
    AED: currencies.AED,
    SAR: currencies.SAR,
    SGD: currencies.SGD,
    HKD: currencies.HKD,
  };
  return currencyMap[code] || currencies.USD;
}

// Format amount in specific currency with proper locale
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  locale?: string
): string {
  // Get currency info
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const currency = getCurrency(currencyCode);

  // Use Intl.NumberFormat for proper localization
  const formatter = new Intl.NumberFormat(locale || currencyInfo?.locale || 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.exponent,
    maximumFractionDigits: currency.exponent,
  });

  return formatter.format(amount);
}

// Convert amount between currencies (uses static rates for now)
// TODO: In Session 38, we'll add live API rate fetching
export async function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Static rates as fallback (you'll update these with API in Session 38)
  // For now, this ensures the app works even without API
  const rates: Record<string, number> = {
    'USD-EUR': 0.92,
    'USD-GBP': 0.79,
    'USD-CHF': 0.88,
    'USD-JPY': 149.5,
    'USD-AUD': 1.52,
    'USD-CAD': 1.36,
    'USD-INR': 83.12,
    'USD-CNY': 7.24,
    'USD-BRL': 4.98,
    'USD-MXN': 17.05,
    'USD-AED': 3.67,
    'USD-SAR': 3.75,
    'USD-SGD': 1.34,
    'USD-HKD': 7.83,
    // Reverse rates
    'EUR-USD': 1.09,
    'GBP-USD': 1.27,
    'CHF-USD': 1.14,
    'JPY-USD': 0.0067,
    'AUD-USD': 0.66,
    'CAD-USD': 0.74,
    'INR-USD': 0.012,
    'CNY-USD': 0.138,
    'BRL-USD': 0.20,
    'MXN-USD': 0.059,
    'AED-USD': 0.27,
    'SAR-USD': 0.27,
    'SGD-USD': 0.75,
    'HKD-USD': 0.13,
  };

  const key = `${fromCurrency}-${toCurrency}`;
  const rate = rates[key];

  if (!rate) {
    // Try reverse conversion
    const reverseKey = `${toCurrency}-${fromCurrency}`;
    const reverseRate = rates[reverseKey];
    if (reverseRate) {
      return amount / reverseRate;
    }

    // If no direct conversion, convert through USD
    if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const toUSD = await convertCurrency(amount, fromCurrency, 'USD');
      return await convertCurrency(toUSD, 'USD', toCurrency);
    }

    console.warn(`No conversion rate for ${fromCurrency} to ${toCurrency}, returning original amount`);
    return amount;
  }

  return amount * rate;
}

// Get currency symbol
export function getCurrencySymbol(code: CurrencyCode): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || code;
}

// Parse currency string to number
export function parseCurrency(value: string): number {
  // Remove currency symbols, spaces, and commas
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Detect user's currency from browser locale
export function detectCurrencyFromLocation(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';

  try {
    // Use Intl API to detect locale
    const locale = navigator.language || 'en-US';

    // Map common locales to currencies
    const localeMap: Record<string, CurrencyCode> = {
      'en-US': 'USD',
      'en-GB': 'GBP',
      'de': 'EUR',
      'de-DE': 'EUR',
      'fr': 'EUR',
      'fr-FR': 'EUR',
      'es': 'EUR',
      'es-ES': 'EUR',
      'it': 'EUR',
      'it-IT': 'EUR',
      'de-CH': 'CHF',
      'fr-CH': 'CHF',
      'ja': 'JPY',
      'ja-JP': 'JPY',
      'en-AU': 'AUD',
      'en-CA': 'CAD',
      'hi': 'INR',
      'hi-IN': 'INR',
      'zh': 'CNY',
      'zh-CN': 'CNY',
      'pt-BR': 'BRL',
      'es-MX': 'MXN',
      'ar-AE': 'AED',
      'ar-SA': 'SAR',
      'en-SG': 'SGD',
      'zh-HK': 'HKD',
    };

    // Check exact match
    if (localeMap[locale]) {
      return localeMap[locale];
    }

    // Check language code only
    const lang = locale.split('-')[0];
    const langMatch = Object.keys(localeMap).find(k => k.startsWith(lang + '-'));
    if (langMatch) {
      return localeMap[langMatch];
    }

    return 'USD';
  } catch (error) {
    console.error('Error detecting currency:', error);
    return 'USD';
  }
}

// Format money input (for forms)
export function formatMoneyInput(value: string, currency: CurrencyCode): string {
  const number = parseCurrency(value);
  if (isNaN(number)) return '';

  return formatCurrency(number, currency);
}

// Check if currency code is valid
export function isValidCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.some(c => c.code === code);
}

// Get all currency codes
export function getAllCurrencyCodes(): CurrencyCode[] {
  return SUPPORTED_CURRENCIES.map(c => c.code);
}

// Get currency name
export function getCurrencyName(code: CurrencyCode): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.name || code;
}
