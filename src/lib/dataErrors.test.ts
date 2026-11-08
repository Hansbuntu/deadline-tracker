import { describe, expect, it } from 'vitest'
import { friendlyDataError } from './dataErrors.ts'

describe('friendlyDataError', () => {
  it('explains being offline', () => {
    expect(friendlyDataError({ message: 'TypeError: Failed to fetch' })).toMatch(/internet connection/)
    expect(friendlyDataError({ message: 'Load failed' })).toMatch(/internet connection/) // Safari's wording
  })

  it('explains an expired sign-in', () => {
    expect(friendlyDataError({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/sign-in has expired/)
  })

  it('explains database refusals', () => {
    expect(friendlyDataError({ code: '42501' })).toMatch(/permission/)
    expect(friendlyDataError({ code: '23514' })).toMatch(/rules/)
  })

  it('falls back to the original message, or a general one', () => {
    expect(friendlyDataError({ message: 'odd' })).toBe('Couldn’t save your changes: odd')
    expect(friendlyDataError(null)).toMatch(/Something went wrong/)
  })
})
