// Backup and restore as JSON. Restoring is where data enters the app from
// outside, so every field of every item is checked before anything is saved.

import type { Opportunity, OpportunityDraft, Status } from '../types.ts'
import { validateDraft } from './opportunity.ts'

const BACKUP_APP = 'deadline-tracker'
const BACKUP_VERSION = 1
const STATUSES: readonly Status[] = ['todo', 'applied', 'skipped']

const FIELD_NAMES: Record<keyof OpportunityDraft, string> = {
  name: 'name',
  deadline: 'deadline',
  closingTime: 'closing time',
  timeZone: 'time zone',
  opensOn: 'opening date',
  link: 'link',
  notes: 'notes',
  hearBackBy: 'hear-back date',
}

/** The whole list as JSON text, with a small label saying what it is. */
export function createBackup(opportunities: Opportunity[], now: Date = new Date()): string {
  const backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION, // lets a future version of the app read old backups
    exportedAt: now.toISOString(),
    opportunities,
  }
  return JSON.stringify(backup, null, 2) // indented, so it's readable in a text editor
}

export type ParseResult = { ok: true; opportunities: Opportunity[] } | { ok: false; error: string }

/** Read a backup file's text. Either every item is valid, or nothing is accepted. */
export function parseBackup(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON, so it can’t be a backup.' }
  }

  // Accept our own backup format, or a plain list of opportunities.
  const items = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.opportunities) ? data.opportunities : null
  if (!items) return { ok: false, error: 'This file doesn’t look like a Deadlines backup.' }
  if (isRecord(data) && typeof data.version === 'number' && data.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app.' }
  }

  const opportunities: Opportunity[] = []
  const seenIds = new Set<string>()
  for (const [index, item] of items.entries()) {
    const result = toOpportunity(item)
    if (typeof result === 'string') return { ok: false, error: `Item ${index + 1}: ${result}` }
    if (seenIds.has(result.id)) return { ok: false, error: `Item ${index + 1}: the same id appears twice.` }
    seenIds.add(result.id)
    opportunities.push(result)
  }
  return { ok: true, opportunities }
}

/** Check one item. Returns a tidy Opportunity, or a sentence saying what's wrong. */
function toOpportunity(item: unknown): Opportunity | string {
  if (!isRecord(item)) return 'this isn’t an opportunity.'
  const { id, name, opensOn, deadline, closingTime, timeZone, link, status, notes, hearBackBy, createdAt, updatedAt } =
    item

  if (typeof id !== 'string' || !id.trim()) return 'it has no id.'
  if (typeof name !== 'string') return 'it has no name.'
  if (typeof deadline !== 'string') return 'it has no deadline.'
  if (opensOn != null && typeof opensOn !== 'string') return 'its opening date isn’t a date.'
  // Closing time, time zone and hear-back date arrived later; older backups simply don't have them.
  if (closingTime != null && typeof closingTime !== 'string') return 'its closing time isn’t a time.'
  if (timeZone != null && typeof timeZone !== 'string') return 'its time zone isn’t text.'
  if (hearBackBy != null && typeof hearBackBy !== 'string') return 'its hear-back date isn’t a date.'
  if (link != null && typeof link !== 'string') return 'its link isn’t text.'
  if (notes != null && typeof notes !== 'string') return 'its notes aren’t text.'
  if (typeof status !== 'string' || !STATUSES.includes(status as Status)) return `unknown status “${String(status)}”.`
  if (!isTimestamp(createdAt) || !isTimestamp(updatedAt)) return 'its timestamps are missing or broken.'

  // Same rules as the form: real dates and times, opening before deadline, only web links.
  const draft: OpportunityDraft = {
    name,
    opensOn: opensOn ?? '',
    deadline,
    closingTime: closingTime ?? '',
    timeZone: timeZone ?? '',
    link: link ?? '',
    notes: notes ?? '',
    hearBackBy: hearBackBy ?? '',
  }
  const errors = validateDraft(draft)
  const field = (Object.keys(errors) as (keyof OpportunityDraft)[])[0]
  if (field) return `${FIELD_NAMES[field]}: ${errors[field]}`

  return {
    id,
    name: name.trim(),
    opensOn: opensOn || null,
    deadline,
    closingTime: closingTime || null,
    timeZone: closingTime && timeZone ? timeZone : null,
    link: (link ?? '').trim(),
    status: status as Status,
    notes: (notes ?? '').trim(),
    hearBackBy: hearBackBy || null,
    createdAt,
    updatedAt,
  }
}

export interface MergeResult {
  /** Only the items that are new or newer than what you have. */
  toSave: Opportunity[]
  added: number
  updated: number
  unchanged: number
}

/**
 * Restore without losing anything: new items are added; for items you already
 * have, whichever was edited most recently wins. Nothing is ever deleted.
 */
export function mergeOpportunities(current: Opportunity[], incoming: Opportunity[]): MergeResult {
  const currentById = new Map(current.map((o) => [o.id, o]))
  const result: MergeResult = { toSave: [], added: 0, updated: 0, unchanged: 0 }
  for (const item of incoming) {
    const existing = currentById.get(item.id)
    if (!existing) {
      result.toSave.push(item)
      result.added += 1
    } else if (Date.parse(item.updatedAt) > Date.parse(existing.updatedAt)) {
      result.toSave.push(item)
      result.updated += 1
    } else {
      result.unchanged += 1
    }
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}
