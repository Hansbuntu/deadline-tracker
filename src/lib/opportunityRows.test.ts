import { describe, expect, it } from 'vitest'
import type { Opportunity } from '../types.ts'
import { fromRow, toRow, type OpportunityRow } from './opportunityRows.ts'

const row: OpportunityRow = {
  id: '6f1c2a8e-0000-4000-8000-000000000001',
  user_id: '4c307715-0000-4000-8000-000000000002',
  name: 'Gasworks residency',
  opens_on: '2026-11-20',
  deadline: '2026-12-31',
  link: 'https://example.org',
  closing_time: null,
  time_zone: null,
  hear_back_by: null,
  status: 'applied',
  notes: 'CV + images',
  created_at: '2026-11-07T19:42:00+00:00',
  updated_at: '2026-11-08T08:00:00.5+00:00',
}

const opportunity: Opportunity = {
  id: '6f1c2a8e-0000-4000-8000-000000000001',
  name: 'Gasworks residency',
  opensOn: '2026-11-20',
  deadline: '2026-12-31',
  link: 'https://example.org',
  closingTime: null,
  timeZone: null,
  hearBackBy: null,
  status: 'applied',
  notes: 'CV + images',
  createdAt: '2026-11-07T19:42:00.000Z',
  updatedAt: '2026-11-08T08:00:00.500Z',
}

describe('fromRow', () => {
  it('renames columns and tidies timestamps', () => {
    expect(fromRow(row)).toEqual(opportunity)
  })

  it('keeps a missing opening date as null', () => {
    expect(fromRow({ ...row, opens_on: null }).opensOn).toBeNull()
  })
})

describe('toRow', () => {
  it('renames fields and never sends user_id', () => {
    const result = toRow(opportunity)
    expect(result).not.toHaveProperty('user_id')
    expect(result).toEqual({ ...row, user_id: undefined, created_at: opportunity.createdAt, updated_at: opportunity.updatedAt })
  })

  it('round-trips', () => {
    expect(fromRow({ ...toRow(opportunity) })).toEqual(opportunity)
  })
})

describe('closing time columns', () => {
  it('turns the database time "17:00:00" into "17:00", and back', () => {
    const timed = fromRow({ ...row, closing_time: '17:00:00', time_zone: 'Europe/Paris', hear_back_by: '2027-01-15' })
    expect(timed).toMatchObject({ closingTime: '17:00', timeZone: 'Europe/Paris', hearBackBy: '2027-01-15' })
    expect(toRow(timed)).toMatchObject({ closing_time: '17:00', time_zone: 'Europe/Paris', hear_back_by: '2027-01-15' })
  })

  it('copes with rows from before migration 0002, which lack the columns', () => {
    const { closing_time: _a, time_zone: _b, hear_back_by: _c, ...oldRow } = row
    expect(fromRow(oldRow as OpportunityRow)).toMatchObject({ closingTime: null, timeZone: null, hearBackBy: null })
  })
})
