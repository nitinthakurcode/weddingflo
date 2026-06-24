/**
 * Locks the fail-loud Excel cell normalizer. The bug it prevents: ExcelJS returns
 * rich objects (hyperlinks, rich text, formulas) for some cells; the old code ran
 * String(value) on them → "[object Object]" written into the DB. This asserts each
 * rich shape unwraps to its primitive and that an unrecognised shape throws (so the
 * row's try/catch reports an error instead of importing corrupt data).
 */
import { describe, it, expect } from 'vitest'
import { normalizeCellValue } from '../excel-parser-server'

describe('normalizeCellValue', () => {
  it('passes primitives through unchanged', () => {
    expect(normalizeCellValue('Jane Doe')).toBe('Jane Doe')
    expect(normalizeCellValue(42)).toBe(42)
    expect(normalizeCellValue(true)).toBe(true)
    const d = new Date('2026-06-24T00:00:00.000Z')
    expect(normalizeCellValue(d)).toBe(d)
  })

  it('treats null/undefined as null', () => {
    expect(normalizeCellValue(null)).toBeNull()
    expect(normalizeCellValue(undefined)).toBeNull()
  })

  it('unwraps a hyperlink cell to its text', () => {
    expect(normalizeCellValue({ text: 'guest@example.com', hyperlink: 'mailto:guest@example.com' } as never)).toBe(
      'guest@example.com',
    )
  })

  it('joins a rich-text cell into a plain string', () => {
    expect(
      normalizeCellValue({ richText: [{ text: 'John' }, { text: ' ' }, { text: 'Smith' }] } as never),
    ).toBe('John Smith')
  })

  it('unwraps a formula cell to its computed result', () => {
    expect(normalizeCellValue({ formula: 'A1*2', result: 250 } as never)).toBe(250)
  })

  it('treats an error cell as empty', () => {
    expect(normalizeCellValue({ error: '#REF!' } as never)).toBeNull()
  })

  it('throws on an unrecognised cell shape instead of importing "[object Object]"', () => {
    expect(() => normalizeCellValue({ mystery: 'shape' } as never)).toThrow(/refusing to import silently/)
  })
})
