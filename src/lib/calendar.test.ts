import { describe, expect, it } from 'vitest'
import type { Opportunity } from '../types.ts'
import { buildIcs, escapeText, foldLine, googleCalendarUrl, reminderTrigger } from './calendar.ts'

const TODAY = '2026-11-07'
const NOW = new Date('2026-11-07T10:00:00Z')

function opp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'abc123',
    name: 'Gasworks residency',
    opensOn: null,
    deadline: '2026-12-31', // 54 days away: room for all four reminders
    link: 'https://example.org/call',
    status: 'todo',
    notes: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Undo line folding so tests can read whole lines. */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, '').split('\r\n')
}

function triggers(ics: string): string[] {
  return unfold(ics)
    .filter((line) => line.startsWith('TRIGGER:'))
    .map((line) => line.slice('TRIGGER:'.length))
}

describe('reminderTrigger', () => {
  it('fires at 09:00 the chosen number of days before an all-day event', () => {
    expect(reminderTrigger(30)).toBe('-P29DT15H')
    expect(reminderTrigger(14)).toBe('-P13DT15H')
    expect(reminderTrigger(7)).toBe('-P6DT15H')
    expect(reminderTrigger(1)).toBe('-PT15H') // 09:00 the day before
  })
})

describe('buildIcs', () => {
  it('is a well-formed calendar with Windows line endings', () => {
    const ics = buildIcs([opp()], TODAY, NOW)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/) // no bare line breaks anywhere
  })

  it('makes an all-day deadline event that ends the next day', () => {
    const lines = unfold(buildIcs([opp()], TODAY, NOW))
    expect(lines).toContain('DTSTART;VALUE=DATE:20261231')
    expect(lines).toContain('DTEND;VALUE=DATE:20270101')
    expect(lines).toContain('SUMMARY:Deadline: Gasworks residency')
    expect(lines).toContain('URL:https://example.org/call')
    expect(lines).toContain('DTSTAMP:20261107T100000Z')
  })

  it('uses the same UID every time, so re-importing updates instead of duplicating', () => {
    const first = buildIcs([opp()], TODAY, NOW)
    const later = buildIcs([opp({ name: 'Renamed' })], TODAY, new Date('2026-11-20T00:00:00Z'))
    expect(unfold(first)).toContain('UID:abc123-deadline@deadline-tracker')
    expect(unfold(later)).toContain('UID:abc123-deadline@deadline-tracker')
  })

  it('adds reminders 30, 14, 7 and 1 day before', () => {
    expect(triggers(buildIcs([opp()], TODAY, NOW))).toEqual(['-P29DT15H', '-P13DT15H', '-P6DT15H', '-PT15H'])
  })

  it('leaves out reminders that would already be in the past', () => {
    // 10 days away: the 30- and 14-day reminders have passed.
    expect(triggers(buildIcs([opp({ deadline: '2026-11-17' })], TODAY, NOW))).toEqual(['-P6DT15H', '-PT15H'])
    // Due today: even "1 day before" was yesterday.
    expect(triggers(buildIcs([opp({ deadline: TODAY })], TODAY, NOW))).toEqual([])
  })

  it('adds an "applications open" event when that day is still ahead', () => {
    const lines = unfold(buildIcs([opp({ opensOn: '2026-11-20' })], TODAY, NOW))
    expect(lines).toContain('UID:abc123-opens@deadline-tracker')
    expect(lines).toContain('SUMMARY:Applications open: Gasworks residency')
    expect(lines).toContain('DTSTART;VALUE=DATE:20261120')
    expect(lines).toContain('TRIGGER:PT9H') // 09:00 on the day
  })

  it('skips the opening event once that day has passed', () => {
    const ics = buildIcs([opp({ opensOn: '2026-11-01' })], TODAY, NOW)
    expect(ics).not.toContain('Applications open')
  })

  it('escapes special characters in names and notes', () => {
    const lines = unfold(buildIcs([opp({ name: 'Prize; painting, drawing', notes: 'Line one\nLine two' })], TODAY, NOW))
    expect(lines).toContain('SUMMARY:Deadline: Prize\\; painting\\, drawing')
    expect(lines).toContain('DESCRIPTION:https://example.org/call\\n\\nLine one\\nLine two')
  })

  it('exports several opportunities into one file', () => {
    const ics = buildIcs([opp({ id: 'a' }), opp({ id: 'b' })], TODAY, NOW)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })
})

describe('escapeText', () => {
  it('escapes backslashes first so nothing is escaped twice', () => {
    expect(escapeText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d')
  })
})

describe('foldLine', () => {
  const bytes = (s: string) => new TextEncoder().encode(s).length

  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Short')).toBe('SUMMARY:Short')
  })

  it('keeps every line within 75 bytes, even with accented letters', () => {
    const long = `DESCRIPTION:${'Résidence à Gare — appel à candidatures. '.repeat(6)}`
    const folded = foldLine(long)
    for (const line of folded.split('\r\n')) expect(bytes(line)).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe(long) // unfolding gives back the original
  })
})

describe('googleCalendarUrl', () => {
  it('pre-fills an all-day deadline event', () => {
    const url = new URL(googleCalendarUrl(opp({ notes: 'Bring CV' })))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Deadline: Gasworks residency')
    expect(url.searchParams.get('dates')).toBe('20261231/20270101')
    expect(url.searchParams.get('details')).toBe('https://example.org/call\n\nBring CV')
  })

  it('can make the opening-day event instead', () => {
    const url = new URL(googleCalendarUrl(opp({ opensOn: '2026-11-20' }), 'opens'))
    expect(url.searchParams.get('text')).toBe('Applications open: Gasworks residency')
    expect(url.searchParams.get('dates')).toBe('20261120/20261121')
  })
})
