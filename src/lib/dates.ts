// Calendar maths. Everything here works in GMT (also called UTC).
// Ghana is on GMT all year with no daylight saving, so "GMT today" is "Accra today".
// Doing all maths in one fixed timezone means the laptop, the phone and the
// daily email job (phase 3) always agree on how many days are left.

import type { DateString } from '../types.ts'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const displayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Today's date in GMT as "YYYY-MM-DD".
 * `now` can be passed in so tests can pretend it is any moment in time.
 */
export function todayInGMT(now: Date = new Date()): DateString {
  // toISOString() always writes the time in GMT, e.g. "2026-11-07T19:42:00.000Z".
  // The first 10 characters are the date.
  return now.toISOString().slice(0, 10)
}

/** True only for real calendar dates written as "YYYY-MM-DD". "2026-02-30" is false. */
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  // JavaScript quietly turns 30 February into 2 March, so check nothing moved.
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** Midnight GMT at the start of that date, in milliseconds since 1970. */
function startOfDayMs(value: DateString): number {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day) // months count from 0 in JavaScript
}

/**
 * Whole days from `from` to `to`: positive if `to` is later, negative if earlier.
 * No rounding needed: in GMT every day is exactly 24 hours long.
 */
export function daysBetween(from: DateString, to: DateString): number {
  return (startOfDayMs(to) - startOfDayMs(from)) / MS_PER_DAY
}

/** The date `days` later (or earlier, if negative): addDays("2026-12-31", 1) is "2027-01-01". */
export function addDays(value: DateString, days: number): DateString {
  return new Date(startOfDayMs(value) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

/** A date for people to read: "15 Dec 2026". */
export function formatDate(value: DateString): string {
  return displayFormat.format(new Date(startOfDayMs(value)))
}
