import { cn } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should merge Tailwind classes correctly', () => {
      // Should use the last conflicting class
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should handle arrays of class names', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
    })

    it('should handle objects with boolean values', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })

    it('should handle duplicate class names', () => {
      // Note: clsx deduplicates, but it's not guaranteed to remove all duplicates
      const result = cn('foo', 'foo', 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('should handle empty input', () => {
      expect(cn()).toBe('')
    })

    it('should handle complex Tailwind merge cases', () => {
      // padding classes should merge
      expect(cn('p-4', 'p-8')).toBe('p-8')
      // different sides should not merge
      expect(cn('px-4', 'py-8')).toBe('px-4 py-8')
    })
  })
})
