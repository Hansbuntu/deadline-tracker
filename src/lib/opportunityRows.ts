// Translating between database rows and the app's Opportunity shape.
// The database uses snake_case column names (opens_on); JavaScript uses
// camelCase (opensOn). Only this file knows about both.

import type { Opportunity, Status } from '../types.ts'

/** One row of the opportunities table, as Supabase sends and receives it. */
export interface OpportunityRow {
  id: string
  user_id?: string // filled in by the database from your login; the app never sends it
  name: string
  opens_on: string | null
  deadline: string
  link: string
  status: Status
  notes: string
  created_at: string
  updated_at: string
}

/** Postgres writes "2026-11-07T19:42:00+00:00"; the app uses "2026-11-07T19:42:00.000Z". Same moment, one style. */
function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString()
}

export function fromRow(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    name: row.name,
    opensOn: row.opens_on,
    deadline: row.deadline,
    link: row.link,
    status: row.status,
    notes: row.notes,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  }
}

/** user_id is left out on purpose: the database sets it from the login, so nobody can save rows as someone else. */
export function toRow(opportunity: Opportunity): Omit<OpportunityRow, 'user_id'> {
  return {
    id: opportunity.id,
    name: opportunity.name,
    opens_on: opportunity.opensOn,
    deadline: opportunity.deadline,
    link: opportunity.link,
    status: opportunity.status,
    notes: opportunity.notes,
    created_at: opportunity.createdAt,
    updated_at: opportunity.updatedAt,
  }
}
