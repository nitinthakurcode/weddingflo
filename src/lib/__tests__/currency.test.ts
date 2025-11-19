import { formatCurrency, getCurrency, SUPPORTED_CURRENCIES } from '../currency'

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD correctly', () => {
      const result = formatCurrency(1234.56, 'USD')
      expect(result).toContain('1,234.56')
      expect(result).toContain('$')
    })

    it('formats EUR correctly', () => {
      const result = formatCurrency(1234.56, 'EUR')
      expect(result).toContain('1')
      expect(result).toContain('234')
      expect(result).toContain('56')
    })

    it('formats INR correctly', () => {
      const result = formatCurrency(1234.56, 'INR')
      expect(result).toContain('1,234.56')
    })

    it('handles zero', () => {
      const result = formatCurrency(0, 'USD')
      expect(result).toContain('0')
    })

    it('handles negative values', () => {
      const result = formatCurrency(-50, 'USD')
      expect(result).toContain('50')
    })

    it('handles large numbers', () => {
      const result = formatCurrency(1000000, 'USD')
      expect(result).toContain('1,000,000')
    })
  })

  describe('getCurrency', () => {
    it('returns USD currency object', () => {
      const usd = getCurrency('USD')
      expect(usd).toBeDefined()
      expect(usd.code).toBe('USD')
    })

    it('returns EUR currency object', () => {
      const eur = getCurrency('EUR')
      expect(eur).toBeDefined()
      expect(eur.code).toBe('EUR')
    })

    it('returns INR currency object', () => {
      const inr = getCurrency('INR')
      expect(inr).toBeDefined()
      expect(inr.code).toBe('INR')
    })

    it('defaults to USD for unknown currency', () => {
      const result = getCurrency('UNKNOWN' as any)
      expect(result.code).toBe('USD')
    })
  })

  describe('SUPPORTED_CURRENCIES', () => {
    it('includes USD', () => {
      const usd = SUPPORTED_CURRENCIES.find(c => c.code === 'USD')
      expect(usd).toBeDefined()
      expect(usd?.symbol).toBe('$')
      expect(usd?.name).toBe('US Dollar')
    })

    it('includes EUR', () => {
      const eur = SUPPORTED_CURRENCIES.find(c => c.code === 'EUR')
      expect(eur).toBeDefined()
      expect(eur?.symbol).toBe('€')
    })

    it('includes INR', () => {
      const inr = SUPPORTED_CURRENCIES.find(c => c.code === 'INR')
      expect(inr).toBeDefined()
      expect(inr?.symbol).toBe('₹')
    })

    it('has correct number of currencies', () => {
      expect(SUPPORTED_CURRENCIES).toHaveLength(15)
    })

    it('all currencies have required fields', () => {
      SUPPORTED_CURRENCIES.forEach(currency => {
        expect(currency.code).toBeTruthy()
        expect(currency.symbol).toBeTruthy()
        expect(currency.name).toBeTruthy()
        expect(currency.locale).toBeTruthy()
      })
    })
  })
})
