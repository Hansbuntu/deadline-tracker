// The rules of this app: how urgent something is, what the form accepts,
// how a new opportunity is built, and what order the list shows.
// No React and no storage in here, so these rules can be tested on their own
// and reused later by the email job (phase 3) and the import API (phase 4).

import type { DateString, Opportunity, OpportunityDraft } from '../types.ts'
import { daysBetween, isValidDate } from './dates.ts'

/** How close a deadline is. Each level gets its own colour on screen. */
export type Urgency = 'closed' | 'urgent' | 'soon' | 'upcoming' | 'later'

/** Days from today until the deadline. 0 = closes today, negative = already closed. */
export function daysLeft(opportunity: Pick<Opportunity, 'deadline'>, today: DateString): number {
  return daysBetween(today, opportunity.deadline)
}

export function urgencyFor(days: number): Urgency {
  if (days < 0) return 'closed'
  if (days <= 7) return 'urgent'
  if (days <= 14) return 'soon'
  if (days <= 30) return 'upcoming'
  return 'later'
}

export function describeDaysLeft(days: number): string {
  if (days < -1) return `Closed ${-days} days ago`
  if (days === -1) return 'Closed yesterday'
  if (days === 0) return 'Closes today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

/** "Opens in 5 days" while applications are not open yet; null once they are. */
export function describeOpens(opensOn: DateString | null, today: DateString): string | null {
  if (!opensOn) return null
  const days = daysBetween(today, opensOn)
  if (days < 0) return null
  if (days === 0) return 'Opens today'
  if (days === 1) return 'Opens tomorrow'
  return `Opens in ${days} days`
}

/** Error messages for the form, one per field that has a problem. Empty = all good. */
export type DraftErrors = Partial<Record<keyof OpportunityDraft, string>>

export function validateDraft(draft: OpportunityDraft): DraftErrors {
  const errors: DraftErrors = {}

  if (!draft.name.trim()) errors.name = 'Give it a name.'

  if (!draft.deadline) errors.deadline = 'Add the deadline date.'
  else if (!isValidDate(draft.deadline)) errors.deadline = 'That isn’t a real date.'

  if (draft.opensOn) {
    if (!isValidDate(draft.opensOn)) errors.opensOn = 'That isn’t a real date.'
    // "YYYY-MM-DD" text sorts in date order, so plain comparison works.
    else if (isValidDate(draft.deadline) && draft.opensOn > draft.deadline)
      errors.opensOn = 'The opening date must be on or before the deadline.'
  }

  const link = draft.link.trim()
  if (link && !isWebLink(link)) errors.link = 'Links must start with https:// or http://'

  return errors
}

/**
 * Only allow normal web links. This also blocks "javascript:" links, which
 * could run code when clicked: an important habit once data comes from outside (phase 4).
 */
function isWebLink(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** Turn what was typed into a complete, tidy Opportunity. */
export function createOpportunity(
  draft: OpportunityDraft,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): Opportunity {
  const timestamp = now.toISOString()
  return {
    id,
    name: draft.name.trim(),
    opensOn: draft.opensOn || null,
    deadline: draft.deadline,
    link: draft.link.trim(),
    status: 'todo',
    notes: draft.notes.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/**
 * List order: still-open opportunities first, soonest deadline at the top;
 * then closed ones, most recently closed first. Returns a new array.
 */
export function sortForDisplay(list: Opportunity[], today: DateString): Opportunity[] {
  return [...list].sort((a, b) => {
    const aClosed = a.deadline < today
    const bClosed = b.deadline < today
    if (aClosed !== bClosed) return aClosed ? 1 : -1
    if (a.deadline !== b.deadline) {
      const soonestFirst = a.deadline < b.deadline ? -1 : 1
      return aClosed ? -soonestFirst : soonestFirst
    }
    return a.name.localeCompare(b.name)
  })
}
