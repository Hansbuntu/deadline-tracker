// The rules of this app: how urgent something is, what the form accepts,
// how a new opportunity is built, and what order the list shows.
// No React and no storage in here, so these rules can be tested on their own
// and reused later by the email job (phase 3) and the import API (phase 4).

import type { DateString, Opportunity, OpportunityDraft, Status } from '../types.ts'
import {
  daysBetween,
  formatDate,
  formatTimeGMT,
  isValidDate,
  isValidTime,
  isValidTimeZone,
  todayInGMT,
  zonedTimeToUtc,
} from './dates.ts'
import { isGmt, zoneCity } from './timeZones.ts'

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'To do',
  applied: 'Applied',
  skipped: 'Skipped',
}

/** The fields that decide when something closes. */
type DeadlineFields = Pick<Opportunity, 'deadline'> & Partial<Pick<Opportunity, 'closingTime' | 'timeZone'>>

/**
 * The exact moment it closes, when a closing time was given: "17:00 Paris
 * time on 1 Dec" is 16:00 GMT. Without a time, null (it closes "that day").
 */
export function closingMoment(opportunity: DeadlineFields): Date | null {
  if (!opportunity.closingTime) return null
  return zonedTimeToUtc(opportunity.deadline, opportunity.closingTime, opportunity.timeZone ?? 'Etc/GMT')
}

/** The deadline as a GMT date. A late deadline in Los Angeles falls on the next day in Accra. */
export function effectiveDeadline(opportunity: DeadlineFields): DateString {
  const moment = closingMoment(opportunity)
  return moment ? todayInGMT(moment) : opportunity.deadline
}

/**
 * Has it closed? Before the deadline day: no. After: yes. On the day itself
 * it stays open, unless a closing time was given and `now` is past it.
 */
export function isClosed(opportunity: DeadlineFields, today: DateString, now?: Date): boolean {
  const date = effectiveDeadline(opportunity)
  if (date !== today) return date < today
  const moment = closingMoment(opportunity)
  return Boolean(moment && now && now.getTime() > moment.getTime())
}

/** How close a deadline is. Each level gets its own colour on screen. */
export type Urgency = 'closed' | 'urgent' | 'soon' | 'upcoming' | 'later'

/**
 * The colour a card gets. Urgency colours mean "act now", so they are only
 * for things still to do. Applied and skipped items stay calm.
 */
export type Tone = Urgency | 'applied' | 'skipped'

export function toneFor(opportunity: Opportunity, today: DateString, now?: Date): Tone {
  if (opportunity.status !== 'todo') return opportunity.status
  if (isClosed(opportunity, today, now)) return 'closed'
  return urgencyFor(daysLeft(opportunity, today))
}

/** Days from today until the deadline. 0 = closes today, negative = already closed. */
export function daysLeft(opportunity: DeadlineFields, today: DateString): number {
  return daysBetween(today, effectiveDeadline(opportunity))
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
  if (days === 1) return 'Closes tomorrow'
  return `${days} days left`
}

/**
 * The short status for a card's badge, with the closing time on the last two
 * days, when it matters most: "Closes today, 16:00", "Closed today, 16:00".
 */
export function describeDeadline(opportunity: Opportunity, today: DateString, now?: Date): string {
  const days = daysLeft(opportunity, today)
  const moment = closingMoment(opportunity)
  const at = moment ? `, ${formatTimeGMT(moment)}` : ''
  if (days === 0 && isClosed(opportunity, today, now)) return `Closed today${at}`
  if (days === 0) return `Closes today${at}`
  if (days === 1) return `Closes tomorrow${at}`
  return describeDaysLeft(days)
}

/**
 * The closing time in words, or null without one:
 * "16:00 GMT", or "17:00 Paris time (16:00 GMT)", adding the GMT date when it differs.
 */
export function describeClosingTime(opportunity: Opportunity): string | null {
  const moment = closingMoment(opportunity)
  if (!moment || !opportunity.closingTime) return null
  const gmt = formatTimeGMT(moment)
  if (isGmt(opportunity.timeZone)) return `${gmt} GMT`
  const gmtDate = todayInGMT(moment)
  const onAnotherDay = gmtDate !== opportunity.deadline ? `, ${formatDate(gmtDate)}` : ''
  return `${opportunity.closingTime} ${zoneCity(opportunity.timeZone)} time (${gmt} GMT${onAnotherDay})`
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

/** Same limits as the database (supabase/migrations/0001), so the form catches them first. */
export const MAX_NAME_LENGTH = 300
export const MAX_NOTES_LENGTH = 5000

/** A blank form. Empty text means "not given". */
export const EMPTY_DRAFT: OpportunityDraft = {
  name: '',
  opensOn: '',
  deadline: '',
  closingTime: '',
  timeZone: '',
  link: '',
  notes: '',
  hearBackBy: '',
}

/** Error messages for the form, one per field that has a problem. Empty = all good. */
export type DraftErrors = Partial<Record<keyof OpportunityDraft, string>>

export function validateDraft(draft: OpportunityDraft): DraftErrors {
  const errors: DraftErrors = {}

  if (!draft.name.trim()) errors.name = 'Give it a name.'
  else if (draft.name.trim().length > MAX_NAME_LENGTH)
    errors.name = `Keep the name under ${MAX_NAME_LENGTH} characters.`

  if (draft.notes.length > MAX_NOTES_LENGTH) errors.notes = `Notes can be up to ${MAX_NOTES_LENGTH} characters.`

  if (!draft.deadline) errors.deadline = 'Add the deadline date.'
  else if (!isValidDate(draft.deadline)) errors.deadline = 'That isn’t a real date.'

  if (draft.closingTime && !isValidTime(draft.closingTime)) errors.closingTime = 'Use a 24-hour time, like 17:00.'
  if (draft.closingTime && draft.timeZone && !isValidTimeZone(draft.timeZone))
    errors.timeZone = 'Pick a time zone from the list.'

  if (draft.opensOn) {
    if (!isValidDate(draft.opensOn)) errors.opensOn = 'That isn’t a real date.'
    // "YYYY-MM-DD" text sorts in date order, so plain comparison works.
    else if (isValidDate(draft.deadline) && draft.opensOn > draft.deadline)
      errors.opensOn = 'The opening date must be on or before the deadline.'
  }

  if (draft.hearBackBy && !isValidDate(draft.hearBackBy)) errors.hearBackBy = 'That isn’t a real date.'

  const link = draft.link.trim()
  if (link && !isWebLink(link)) errors.link = 'Links must start with https:// or http://'

  return errors
}

/**
 * Notes that don't stop saving but are worth knowing before you do.
 * A deadline in the past is allowed (you may be recording history), but it
 * will be filed under Closed rather than appear in your list.
 */
export function draftWarnings(draft: OpportunityDraft, today: DateString): DraftErrors {
  if (!isValidDate(draft.deadline)) return {}
  const fields = {
    deadline: draft.deadline,
    closingTime: isValidTime(draft.closingTime) ? draft.closingTime : null,
    timeZone: draft.timeZone || null,
  }
  return effectiveDeadline(fields) < today ? { deadline: 'This date has passed, so it will be filed under Closed.' } : {}
}

/**
 * Only allow normal web links. This also blocks "javascript:" links, which
 * could run code when clicked: an important habit once data comes from outside (phase 4).
 * "www.example.org" gets https:// added, since that's what people mean.
 */
function isWebLink(value: string): boolean {
  try {
    const url = new URL(withScheme(value))
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** "www.example.org" → "https://www.example.org"; anything else unchanged. */
export function withScheme(link: string): string {
  return /^www\./i.test(link) ? `https://${link}` : link
}

/** Turn what was typed into a complete, tidy Opportunity. */
export function createOpportunity(
  draft: OpportunityDraft,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): Opportunity {
  const timestamp = now.toISOString()
  const closingTime = draft.closingTime || null
  return {
    id,
    name: draft.name.trim(),
    opensOn: draft.opensOn || null,
    deadline: draft.deadline,
    closingTime,
    // A zone only means something with a time; GMT zones are stored as "no zone".
    timeZone: closingTime && draft.timeZone && !isGmt(draft.timeZone) ? draft.timeZone : null,
    link: withScheme(draft.link.trim()),
    status: 'todo',
    notes: draft.notes.trim(),
    hearBackBy: draft.hearBackBy || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/** Apply edits from the form. Keeps the id, status and creation time. */
export function updateOpportunity(
  existing: Opportunity,
  draft: OpportunityDraft,
  now: Date = new Date(),
): Opportunity {
  const edited = createOpportunity(draft, now, existing.id)
  return { ...edited, status: existing.status, createdAt: existing.createdAt }
}

export function withStatus(existing: Opportunity, status: Status, now: Date = new Date()): Opportunity {
  return { ...existing, status, updatedAt: now.toISOString() }
}

/** The editable fields of an opportunity, to pre-fill the edit form. */
export function toDraft(opportunity: Opportunity): OpportunityDraft {
  const { name, opensOn, deadline, closingTime, timeZone, link, notes, hearBackBy } = opportunity
  return {
    name,
    opensOn: opensOn ?? '',
    deadline,
    closingTime: closingTime ?? '',
    timeZone: timeZone ?? '',
    link,
    notes,
    hearBackBy: hearBackBy ?? '',
  }
}

/** Soonest first, by the exact closing moment where there is one. */
function byClosing(a: Opportunity, b: Opportunity): number {
  const dateA = effectiveDeadline(a)
  const dateB = effectiveDeadline(b)
  if (dateA !== dateB) return dateA < dateB ? -1 : 1
  const timeA = closingMoment(a)?.getTime() ?? Number.POSITIVE_INFINITY // no time = open all day
  const timeB = closingMoment(b)?.getTime() ?? Number.POSITIVE_INFINITY
  if (timeA !== timeB) return timeA < timeB ? -1 : 1
  return a.name.localeCompare(b.name)
}

/** Still-to-do items closing today or within 7 days, soonest first. */
export function closingSoon(list: Opportunity[], today: DateString, now?: Date): Opportunity[] {
  return list
    .filter(
      (o) => o.status === 'todo' && !isClosed(o, today, now) && urgencyFor(daysLeft(o, today)) === 'urgent',
    )
    .sort(byClosing)
}

/** Which tab is showing: one status, or everything. */
export type StatusFilter = Status | 'all'

export function matchesFilter(opportunity: Opportunity, filter: StatusFilter): boolean {
  return filter === 'all' || opportunity.status === filter
}

/**
 * How many in each tab. Given `today`, the To do count leaves out deadlines
 * that have passed (they wait under Closed for "Did you apply?"), so the
 * number matches the cards you actually see.
 */
export function countByStatus(list: Opportunity[], today?: DateString, now?: Date): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { todo: 0, applied: 0, skipped: 0, all: list.length }
  for (const o of list) {
    if (o.status === 'todo' && today && isClosed(o, today, now)) continue
    counts[o.status] += 1
  }
  return counts
}

/** Split into still-open and already-closed, each in display order. */
export function splitOpenAndClosed(
  list: Opportunity[],
  today: DateString,
  now?: Date,
): { open: Opportunity[]; closed: Opportunity[] } {
  const sorted = sortForDisplay(list, today, now)
  return {
    open: sorted.filter((o) => !isClosed(o, today, now)),
    closed: sorted.filter((o) => isClosed(o, today, now)),
  }
}

/**
 * List order: still-open opportunities first, soonest deadline at the top;
 * then closed ones, most recently closed first. Returns a new array.
 */
export function sortForDisplay(list: Opportunity[], today: DateString, now?: Date): Opportunity[] {
  return [...list].sort((a, b) => {
    const aClosed = isClosed(a, today, now)
    const bClosed = isClosed(b, today, now)
    if (aClosed !== bClosed) return aClosed ? 1 : -1
    return aClosed ? byClosing(b, a) : byClosing(a, b)
  })
}
