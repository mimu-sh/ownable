import { describe, it, expect } from 'vitest'
import { slugify } from '../src/index'

describe('slugify', () => {
  it('lowercases and hyphenates', () => expect(slugify('Topsy Turvying')).toBe('topsy-turvying'))
  it('strips diacritics', () => expect(slugify('Créme Brûlée')).toBe('creme-brulee'))
  it('drops apostrophes rather than hyphenating them', () => {
    expect(slugify("Widow's Kiss")).toBe('widows-kiss')
    expect(slugify('Widow’s Kiss')).toBe('widows-kiss')
  })
  it('collapses runs of separators', () => expect(slugify('a  --  b')).toBe('a-b'))
  it('trims leading and trailing hyphens', () => expect(slugify('  !hi!  ')).toBe('hi'))
  it('preserves existing hyphens', () => expect(slugify('Topsy-Turvying')).toBe('topsy-turvying'))
})
