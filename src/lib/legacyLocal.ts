// Phase 1 kept your list in this browser's localStorage. These helpers find
// that old list once, so it can be copied into your account, and then put it
// aside (renamed, not deleted) so it's never copied twice.

import type { Opportunity } from '../types.ts'
import { parseBackup } from './backup.ts'

export const OLD_KEY = 'deadline-tracker:opportunities:v1'
export const COPIED_KEY = 'deadline-tracker:opportunities:v1:copied-to-account'

/** The old browser-only list, or null if there isn't one (or it can't be read safely). */
export function readLocalOpportunities(): Opportunity[] | null {
  const raw = localStorage.getItem(OLD_KEY)
  if (raw === null) return null
  // Same strict checks as restoring a backup: nothing unchecked gets into the database.
  const parsed = parseBackup(raw)
  return parsed.ok ? parsed.opportunities : null
}

/** Keep the old list under a new name as a safety copy, so it isn't offered again. */
export function markLocalCopied(): void {
  const raw = localStorage.getItem(OLD_KEY)
  if (raw === null) return
  localStorage.setItem(COPIED_KEY, raw)
  localStorage.removeItem(OLD_KEY)
}
