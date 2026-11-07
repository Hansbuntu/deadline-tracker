import { useEffect, useId, useState } from 'react'
import { sendSignInEmail, verifyEmailCode } from '../lib/auth.ts'
import { authErrorFromUrl, isPlausibleCode, isPlausibleEmail, normaliseCode } from '../lib/authMessages.ts'

const RESEND_SECONDS = 60 // Supabase refuses a new email within 60 seconds anyway

export function SignIn() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // If a magic link had expired, Supabase sends you back with the reason in the address.
  const [error, setError] = useState<string | null>(() => authErrorFromUrl(window.location.hash, window.location.search))
  const ids = useId()

  // Remove that error from the address bar so a reload doesn't show it again.
  useEffect(() => {
    if (window.location.hash.includes('error') || window.location.search.includes('error')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Count down the "Send again" wait, one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendEmail() {
    if (!isPlausibleEmail(email)) {
      setError('Enter your email address, like name@example.com.')
      document.getElementById(`${ids}-email`)?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendSignInEmail(email)
      setStep('code')
      setCode('')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function checkCode() {
    const digits = normaliseCode(code)
    if (!isPlausibleCode(digits)) {
      setError('Type the code from the email: 6 or more digits.')
      document.getElementById(`${ids}-code`)?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyEmailCode(email, digits)
      // Success: the session changes and the app swaps this screen for your list.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const errorProps = error ? { 'aria-invalid': true, 'aria-describedby': `${ids}-error` } : {}
  const errorMessage = error && (
    <p className="field-error" id={`${ids}-error`} role="alert">
      {error}
    </p>
  )

  return (
    <div className="app signin">
      <header className="signin-header">
        <h1 className="title">Deadlines</h1>
        <p className="tagline">Open calls, residencies and grants</p>
      </header>

      <main className="signin-card">
        {step === 'email' ? (
          <form
            className="form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void sendEmail()
            }}
          >
            <h2 className="sheet-title">Sign in</h2>
            <p className="empty">You’ll get an email with a sign-in link. No password needed.</p>
            <div className="field">
              <label htmlFor={`${ids}-email`}>Email</label>
              <input
                id={`${ids}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                {...errorProps}
              />
              {errorMessage}
            </div>
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
        ) : (
          <form
            className="form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void checkCode()
            }}
          >
            <h2 className="sheet-title">Check your email</h2>
            <p className="empty">
              We sent a sign-in link to <strong className="signin-email">{email}</strong>. Tap the link on this
              device, or type the code from the email here.
            </p>
            <div className="field">
              <label htmlFor={`${ids}-code`}>Code from the email</label>
              <input
                id={`${ids}-code`}
                inputMode="numeric"
                autoComplete="one-time-code" // phones can offer to fill it in from the email
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={14}
                className="code-input"
                {...errorProps}
              />
              {errorMessage}
            </div>
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="signin-links">
              <button type="button" className="button-text" onClick={() => void sendEmail()} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send again'}
              </button>
              <button
                type="button"
                className="button-text"
                onClick={() => {
                  setStep('email')
                  setError(null)
                }}
              >
                Use a different email
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
