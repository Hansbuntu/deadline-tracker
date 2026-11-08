// Calendar export: .ics files (the iCalendar standard, RFC 5545) and
// "add to Google Calendar" links. Pure functions, so every rule is tested.

import type { DateString, Opportunity } from '../types.ts'
import { addDays, formatTimeGMT } from './dates.ts'
import { closingMoment, describeClosingTime, effectiveDeadline } from './opportunity.ts'

/** Reminder days before a deadline, as agreed in the brief. */
export const REMINDER_DAYS = [30, 14, 7, 1] as const

/** Calendar reminders go off at this hour, in the phone or laptop's own time. */
const REMINDER_HOUR = 9

const CRLF = '\r\n' // the standard requires Windows-style line endings
const MAX_LINE_BYTES = 75

/** "2026-12-12" → "20261212", the date format calendars use. */
function compact(date: DateString): string {
  return date.replaceAll('-', '')
}

/** "2026-11-07T19:42:05.123Z" → "20261107T194205Z" */
function compactTimestamp(moment: Date): string {
  return moment.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** In iCalendar text, \ ; , and line breaks have special meanings, so they are escaped. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Lines longer than 75 bytes must be split, each continuation starting with a space.
 * Bytes, not characters: "é" is 2 bytes in UTF-8, so we never cut one in half.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  for (const char of line) {
    const charBytes = encoder.encode(char).length
    // Continuation lines start with a space, which uses one of their 75 bytes.
    const limit = parts.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1
    if (currentBytes + charBytes > limit) {
      parts.push(current)
      current = ''
      currentBytes = 0
    }
    current += char
    currentBytes += charBytes
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

/**
 * How long before the start of an all-day event (midnight) a reminder fires.
 * N days before at 09:00 is (N - 1) days and 15 hours before midnight.
 */
export function reminderTrigger(daysBefore: number): string {
  const hoursBefore = 24 - REMINDER_HOUR // 15
  return daysBefore === 1 ? `-PT${hoursBefore}H` : `-P${daysBefore - 1}DT${hoursBefore}H`
}

function describeReminder(name: string, daysBefore: number): string {
  return daysBefore === 1 ? `${name} closes tomorrow` : `${name} closes in ${daysBefore} days`
}

function eventDescription(opportunity: Opportunity): string {
  const closes = describeClosingTime(opportunity)
  return [closes && `Closes at ${closes}`, opportunity.link, opportunity.notes].filter(Boolean).join('\n\n')
}

/** "Deadline: Gasworks" or, with a closing time, "Deadline: Gasworks (closes 16:00 GMT)". */
function deadlineTitle(opportunity: Opportunity): string {
  const moment = closingMoment(opportunity)
  return moment
    ? `Deadline: ${opportunity.name} (closes ${formatTimeGMT(moment)} GMT)`
    : `Deadline: ${opportunity.name}`
}

function alarm(trigger: string, description: string): string[] {
  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(description)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
  ]
}

function allDayEvent(options: {
  uid: string
  date: DateString
  summary: string
  description: string
  url: string
  stamp: string
  alarms: string[][]
}): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${options.uid}`,
    `DTSTAMP:${options.stamp}`,
    `DTSTART;VALUE=DATE:${compact(options.date)}`,
    // All-day events end at the start of the next day ("up to but not including").
    `DTEND;VALUE=DATE:${compact(addDays(options.date, 1))}`,
    `SUMMARY:${escapeText(options.summary)}`,
    ...(options.description ? [`DESCRIPTION:${escapeText(options.description)}`] : []),
    ...(options.url ? [`URL:${options.url}`] : []),
    'TRANSP:TRANSPARENT', // shows as "free": a deadline doesn't block your day
    ...options.alarms.flat(),
    'END:VEVENT',
  ]
}

/** The calendar events for one opportunity: its deadline, plus its opening day if that's still ahead. */
function eventsFor(opportunity: Opportunity, today: DateString, stamp: string): string[] {
  const { id, name, opensOn, link } = opportunity
  // The GMT date it closes: a late Los Angeles deadline lands on the next day here.
  const deadline = effectiveDeadline(opportunity)
  const description = eventDescription(opportunity)

  // Reminders whose moment has already passed would never fire, so leave them out.
  const deadlineAlarms = REMINDER_DAYS.filter((days) => addDays(deadline, -days) >= today).map((days) =>
    alarm(reminderTrigger(days), describeReminder(name, days)),
  )

  const lines = allDayEvent({
    uid: `${id}-deadline@deadline-tracker`, // the same id every time, so re-exporting updates the event
    date: deadline,
    summary: deadlineTitle(opportunity),
    description,
    url: link,
    stamp,
    alarms: deadlineAlarms,
  })

  if (opensOn && opensOn >= today) {
    lines.push(
      ...allDayEvent({
        uid: `${id}-opens@deadline-tracker`,
        date: opensOn,
        summary: `Applications open: ${name}`,
        description,
        url: link,
        stamp,
        alarms: [alarm(`PT${REMINDER_HOUR}H`, `Applications for ${name} open today`)],
      }),
    )
  }
  return lines
}

/** A complete .ics file for one or more opportunities. */
export function buildIcs(opportunities: Opportunity[], today: DateString, now: Date = new Date()): string {
  const stamp = compactTimestamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tineiya//Deadline Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Deadlines',
    ...opportunities.flatMap((o) => eventsFor(o, today, stamp)),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}

/**
 * A link that opens Google Calendar with the event filled in.
 * Google's link format has no field for reminders, so your Google defaults apply.
 */
export function googleCalendarUrl(opportunity: Opportunity, which: 'deadline' | 'opens' = 'deadline'): string {
  const date = which === 'opens' && opportunity.opensOn ? opportunity.opensOn : effectiveDeadline(opportunity)
  const title = which === 'opens' ? `Applications open: ${opportunity.name}` : deadlineTitle(opportunity)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${compact(date)}/${compact(addDays(date, 1))}`,
    // Very long links can fail, so keep the description short.
    details: eventDescription(opportunity).slice(0, 1000),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
