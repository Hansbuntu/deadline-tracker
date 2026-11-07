// Pure helpers for signing in: checking what was typed, and turning
// Supabase's error codes into sentences. No network here, so it's all tested.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A light check that catches typos like a missing @. The email itself is the real test. */
export function isPlausibleEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

/** Keep only the digits, so "123 456" or a pasted "123-456" still work. */
export function normaliseCode(value: string): string {
  return value.replace(/\D/g, '')
}

/** Supabase sends 6 digits by default; projects can choose up to 10. */
export function isPlausibleCode(code: string): boolean {
  return /^\d{6,10}$/.test(code)
}

interface AuthErrorLike {
  code?: string
  message?: string
  status?: number
}

export function friendlyAuthError(error: AuthErrorLike | null | undefined): string {
  const waitSeconds = error?.message?.match(/after (\d+) seconds?/)?.[1]
  if (waitSeconds) return `For security, wait ${waitSeconds} seconds before asking for another email.`

  switch (error?.code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many sign-in emails were asked for recently. Wait a few minutes, then try again.'
    case 'otp_expired':
      return 'That code or link has expired or was already used. Ask for a new email.'
    case 'signup_disabled':
      return 'New sign-ups are switched off. Use the email address this tracker belongs to.'
    case 'email_address_not_authorized':
      return 'Supabase’s built-in email only sends to the address on your Supabase account. Use that address.'
    case 'email_address_invalid':
      return 'That email address doesn’t look right.'
  }
  if (error?.status === 429) return 'Too many attempts. Wait a few minutes, then try again.'
  return error?.message ? `Couldn’t sign in: ${error.message}` : 'Something went wrong. Check your connection and try again.'
}

/**
 * When a magic link has expired, Supabase sends you back with the problem in
 * the address, e.g. "#error=access_denied&error_code=otp_expired&...".
 * Returns a friendly message, or null if the address has no error.
 */
export function authErrorFromUrl(hash: string, search: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const query = new URLSearchParams(search)
  const code = params.get('error_code') ?? query.get('error_code')
  const description = params.get('error_description') ?? query.get('error_description')
  if (!code && !description) return null
  return friendlyAuthError({ code: code ?? undefined, message: description ?? undefined })
}
