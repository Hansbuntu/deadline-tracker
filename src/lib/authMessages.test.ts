import { describe, expect, it } from 'vitest'
import { authErrorFromUrl, friendlyAuthError, isPlausibleCode, isPlausibleEmail, normaliseCode } from './authMessages.ts'

describe('isPlausibleEmail', () => {
  it('accepts normal addresses, with stray spaces', () => {
    expect(isPlausibleEmail('name@example.com')).toBe(true)
    expect(isPlausibleEmail('  name.surname+art@gmail.com ')).toBe(true)
  })

  it('catches common typos', () => {
    expect(isPlausibleEmail('')).toBe(false)
    expect(isPlausibleEmail('name.example.com')).toBe(false)
    expect(isPlausibleEmail('name@example')).toBe(false)
    expect(isPlausibleEmail('na me@example.com')).toBe(false)
  })
})

describe('codes', () => {
  it('keeps only the digits of what was typed or pasted', () => {
    expect(normaliseCode(' 123 456 ')).toBe('123456')
    expect(normaliseCode('123-456')).toBe('123456')
  })

  it('accepts 6 to 10 digits', () => {
    expect(isPlausibleCode('123456')).toBe(true)
    expect(isPlausibleCode('1234567890')).toBe(true)
    expect(isPlausibleCode('12345')).toBe(false)
    expect(isPlausibleCode('12345678901')).toBe(false)
  })
})

describe('friendlyAuthError', () => {
  it('explains the "wait before asking again" rule with the seconds', () => {
    expect(
      friendlyAuthError({
        code: 'over_email_send_rate_limit',
        message: 'For security purposes, you can only request this after 47 seconds.',
      }),
    ).toBe('For security, wait 47 seconds before asking for another email.')
  })

  it('turns known codes into plain sentences', () => {
    expect(friendlyAuthError({ code: 'otp_expired' })).toMatch(/expired/)
    expect(friendlyAuthError({ code: 'signup_disabled' })).toMatch(/sign-ups are switched off/)
    expect(friendlyAuthError({ code: 'email_address_not_authorized' })).toMatch(/your Supabase account/)
    expect(friendlyAuthError({ status: 429 })).toMatch(/Too many/)
  })

  it('falls back to the original message, or a general one', () => {
    expect(friendlyAuthError({ message: 'Something odd' })).toBe('Couldn’t sign in: Something odd')
    expect(friendlyAuthError(null)).toMatch(/connection/)
  })
})

describe('authErrorFromUrl', () => {
  it('reads an expired-link error from the address', () => {
    const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    expect(authErrorFromUrl(hash, '')).toMatch(/expired/)
  })

  it('returns null for a normal address', () => {
    expect(authErrorFromUrl('', '')).toBeNull()
    expect(authErrorFromUrl('#access_token=abc', '?x=1')).toBeNull()
  })
})
