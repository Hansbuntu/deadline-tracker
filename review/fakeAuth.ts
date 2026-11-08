// Review copy only: a stand-in for src/lib/auth.ts that never sends email.
// On the sign-in screen, the code 123456 "works"; any other code is refused.

const pause = () => new Promise((resolve) => setTimeout(resolve, 400))

export async function sendSignInEmail(_email: string): Promise<void> {
  await pause()
}

export async function verifyEmailCode(_email: string, code: string): Promise<void> {
  await pause()
  if (code !== '123456') throw new Error('That code or link has expired or was already used. Ask for a new email.')
}

export async function signOut(): Promise<void> {
  await pause()
}
