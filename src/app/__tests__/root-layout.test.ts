import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guard test: prevents the #1 recurring regression — root layout missing html/body tags.
 * Next.js 16+ requires <html> and <body> in the ROOT layout, not nested layouts.
 * This file has been broken 12+ times in git history.
 */
describe('Root Layout Structure Guard', () => {
  const rootLayout = readFileSync(
    join(process.cwd(), 'src/app/layout.tsx'),
    'utf-8'
  )

  const localeLayout = readFileSync(
    join(process.cwd(), 'src/app/[locale]/layout.tsx'),
    'utf-8'
  )

  it('root layout must contain <html> tag', () => {
    expect(rootLayout).toMatch(/<html[\s>]/)
  })

  it('root layout must contain <body> tag', () => {
    expect(rootLayout).toMatch(/<body[\s>]/)
  })

  it('locale layout must NOT contain <html> tag (would duplicate root)', () => {
    expect(localeLayout).not.toMatch(/<html[\s>]/)
  })

  it('locale layout must NOT contain <body> tag (would duplicate root)', () => {
    expect(localeLayout).not.toMatch(/<body[\s>]/)
  })
})
