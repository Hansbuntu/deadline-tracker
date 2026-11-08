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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** True for a 24-hour clock time written "HH:MM", like "09:30" or "23:59". */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value)
}

/** True if the browser knows this IANA time zone name, like "Europe/Paris". */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** How far ahead of GMT a time zone's clocks are at a given moment, in milliseconds. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const wallClock = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return wallClock - instant
}

/**
 * The exact moment a local clock time happens somewhere: "17:00 on 1 Dec in
 * Europe/Paris" → 16:00 GMT. Uses the browser's time-zone database, so summer
 * time is handled (17:00 in Paris in July is 15:00 GMT).
 */
export function zonedTimeToUtc(date: DateString, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const asIfGmt = Date.UTC(year, month - 1, day, hours, minutes)
  // First guess, then correct once more in case the guess crossed a clock change.
  let instant = asIfGmt - zoneOffsetMs(asIfGmt, timeZone)
  instant = asIfGmt - zoneOffsetMs(instant, timeZone)
  return new Date(instant)
}

/** "16:00" for a moment, on the GMT clock. */
export function formatTimeGMT(moment: Date): string {
  return moment.toISOString().slice(11, 16)
}

/** A date for people to read: "15 Dec 2026". */
export function formatDate(value: DateString): string {
  return displayFormat.format(new Date(startOfDayMs(value)))
}
