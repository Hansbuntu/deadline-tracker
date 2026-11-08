// Unfinished forms, kept on this device. If you switch apps to copy details
// from a call's page and the phone reloads the app, what you'd typed comes back.
// Only this browser sees it; it is cleared when you save or discard.

import type { OpportunityDraft } from '../types.ts'

const PREFIX = 'deadline-tracker:draft:'
const KEEP_FOR_MS = 7 * 24 * 60 * 60 * 1000 // older drafts are forgotten

interface Stored {
  savedAt: number
  draft: OpportunityDraft
}

export function saveDraft(key: string, draft: OpportunityDraft, now: number = Date.now()): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: now, draft } satisfies Stored))
  } catch {
    // Private browsing or full storage: the form still works, it just isn't kept.
  }
}

export function loadDraft(key: string, now: number = Date.now()): OpportunityDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Stored>
    if (typeof stored.savedAt !== 'number' || !stored.draft || now - stored.savedAt > KEEP_FOR_MS) {
      clearDraft(key)
      return null
    }
    return stored.draft
  } catch {
    return null
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Nothing to do.
  }
}
