import { describe, expect, it } from 'vitest'
import { slugify } from './files.ts'

describe('slugify', () => {
  it('makes safe, readable file names', () => {
    expect(slugify('Gasworks Residency 2027')).toBe('gasworks-residency-2027')
    expect(slugify('Résidence à la Gare: appel!')).toBe('residence-a-la-gare-appel')
    expect(slugify('  --TRACES / open call--  ')).toBe('traces-open-call')
  })

  it('never returns an empty name', () => {
    expect(slugify('!!!')).toBe('opportunity')
  })
})
