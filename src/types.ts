// The shapes of the data this app works with.
// Types are TypeScript's way of saying "an opportunity always has these fields".
// They disappear when the app is built; they exist to catch mistakes while coding.

/** Where you are with an opportunity. */
export type Status = 'todo' | 'applied' | 'skipped'

/**
 * A calendar date as text: "2026-12-15" (year-month-day, no time of day).
 * Using text instead of a JavaScript Date avoids timezone surprises:
 * "15 December" means 15 December, whoever is looking at it.
 */
export type DateString = string

/** One open call, residency or grant you are tracking. */
export interface Opportunity {
  id: string
  name: string
  /** When applications open. Optional: many calls are already open. */
  opensOn: DateString | null
  /** The deadline date, as the call states it (in its own time zone). */
  deadline: DateString
  /** Optional closing time on the deadline day, "HH:MM", like "17:00". */
  closingTime: string | null
  /** The time zone of that closing time, like "Europe/Paris". null = GMT (Accra). */
  timeZone: string | null
  link: string
  status: Status
  notes: string
  /** For applied items: when you expect to hear back. Optional. */
  hearBackBy: DateString | null
  /** Exact moments, e.g. "2026-11-07T19:42:00.000Z", for sorting and sync later. */
  createdAt: string
  updatedAt: string
}

/**
 * What the form gives us: the fields you type, before the app adds id, status
 * and timestamps. Optional fields are empty text ("") when not filled in.
 */
export interface OpportunityDraft {
  name: string
  opensOn: DateString | null
  deadline: DateString
  closingTime: string
  timeZone: string
  link: string
  notes: string
  hearBackBy: string
}
