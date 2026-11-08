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
