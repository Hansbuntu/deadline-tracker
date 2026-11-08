import { describe, expect, it } from 'vitest'
import type { Opportunity } from '../types.ts'
import { createBackup, mergeOpportunities, parseBackup } from './backup.ts'

function opp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'a',
    name: 'Gasworks residency',
    opensOn: null,
    deadline: '2026-12-01',
    link: 'https://example.org',
    closingTime: null,
    timeZone: null,
    hearBackBy: null,
    status: 'todo',
    notes: 'CV',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

function errorOf(text: string): string {
  const result = parseBackup(text)
  if (result.ok) throw new Error('expected the backup to be rejected')
  return result.error
}

describe('createBackup / parseBackup', () => {
  it('round-trips exactly', () => {
    const list = [opp(), opp({ id: 'b', status: 'applied', opensOn: '2026-11-10' })]
    const text = createBackup(list, new Date('2026-11-07T10:00:00Z'))
    expect(JSON.parse(text)).toMatchObject({ app: 'deadline-tracker', version: 1, exportedAt: '2026-11-07T10:00:00.000Z' })
    expect(parseBackup(text)).toEqual({ ok: true, opportunities: list })
  })

  it('also accepts a plain list', () => {
    expect(parseBackup(JSON.stringify([opp()]))).toEqual({ ok: true, opportunities: [opp()] })
  })

  it('tidies optional fields', () => {
    const result = parseBackup(JSON.stringify([{ ...opp(), opensOn: '', link: undefined, notes: '  hi  ' }]))
    expect(result).toEqual({ ok: true, opportunities: [opp({ opensOn: null, link: '', notes: 'hi' })] })
  })
})

describe('parseBackup rejects bad files', () => {
  it('that are not JSON or not a backup', () => {
    expect(errorOf('hello')).toMatch(/isn’t valid JSON/)
    expect(errorOf('{"something": "else"}')).toMatch(/doesn’t look like/)
  })

  it('from a newer version of the app', () => {
    expect(errorOf(JSON.stringify({ version: 2, opportunities: [] }))).toMatch(/newer version/)
  })

  it('saying which item is wrong and why', () => {
    const text = JSON.stringify([opp(), opp({ id: 'b', deadline: '2026-02-30' })])
    expect(errorOf(text)).toBe('Item 2: deadline: That isn’t a real date.')
  })

  it('with unknown statuses, missing ids or broken timestamps', () => {
    expect(errorOf(JSON.stringify([{ ...opp(), status: 'won' }]))).toMatch(/unknown status “won”/)
    expect(errorOf(JSON.stringify([{ ...opp(), id: '' }]))).toMatch(/no id/)
    expect(errorOf(JSON.stringify([{ ...opp(), updatedAt: 'yesterday' }]))).toMatch(/timestamps/)
  })

  it('with links that could run code', () => {
    expect(errorOf(JSON.stringify([opp({ link: 'javascript:alert(1)' })]))).toMatch(/^Item 1: link:/)
  })

  it('with the same id twice', () => {
    expect(errorOf(JSON.stringify([opp(), opp()]))).toMatch(/same id/)
  })
})

describe('mergeOpportunities', () => {
  const older = '2026-11-01T00:00:00.000Z'
  const newer = '2026-11-05T00:00:00.000Z'

  it('adds new items, takes newer edits, and keeps your newer edits', () => {
    const current = [opp({ id: 'same', updatedAt: older }), opp({ id: 'mine-newer', updatedAt: newer })]
    const incoming = [
      opp({ id: 'same', updatedAt: older }),
      opp({ id: 'mine-newer', name: 'Old name', updatedAt: older }),
      opp({ id: 'theirs-newer', updatedAt: newer }),
      opp({ id: 'brand-new' }),
    ]
    const withTheirsNewer = [...current, opp({ id: 'theirs-newer', updatedAt: older })]
    const result = mergeOpportunities(withTheirsNewer, incoming)
    expect(result.toSave.map((o) => o.id)).toEqual(['theirs-newer', 'brand-new'])
    expect(result).toMatchObject({ added: 1, updated: 1, unchanged: 2 })
  })
})

describe('closing times in backups', () => {
  it('restores old backups that have no closing-time fields', () => {
    const { closingTime: _a, timeZone: _b, hearBackBy: _c, ...old } = opp()
    expect(parseBackup(JSON.stringify([old]))).toEqual({ ok: true, opportunities: [opp()] })
  })

  it('keeps closing times, zones and hear-back dates, and checks them', () => {
    const timed = opp({ closingTime: '17:00', timeZone: 'Europe/Paris', hearBackBy: '2027-01-15' })
    expect(parseBackup(JSON.stringify([timed]))).toEqual({ ok: true, opportunities: [timed] })
    expect(errorOf(JSON.stringify([opp({ closingTime: '7pm' })]))).toMatch(/^Item 1: closing time:/)
  })
})
