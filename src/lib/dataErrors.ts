// Turning database and network errors into sentences people can act on.

interface DataErrorLike {
  code?: string
  message?: string
}

export function friendlyDataError(error: DataErrorLike | null | undefined): string {
  const message = error?.message ?? ''

  // The browser couldn't reach Supabase at all: usually no signal or Wi-Fi.
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'Couldn’t reach the server. Check your internet connection and try again.'
  }
  if (error?.code === 'PGRST301' || /jwt expired/i.test(message)) {
    return 'Your sign-in has expired. Sign out and sign in again.'
  }
  switch (error?.code) {
    case '42501': // row-level security said no
      return 'You don’t have permission to change that. Try signing out and in again.'
    case '23514': // a check rule in the table (dates, lengths, status) said no
      return 'The database refused this because a field breaks one of its rules (dates, length or status).'
    case '23505': // the same id already exists
      return 'That item already exists.'
  }
  return message ? `Couldn’t save your changes: ${message}` : 'Something went wrong while saving. Try again.'
}
