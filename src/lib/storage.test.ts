import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OpportunityDraft } from '../types.ts'
import { COPIED_KEY, OLD_KEY } from './legacyLocal.ts'
import { createOpportunity } from './opportunity.ts'
import type { OpportunityRow } from './opportunityRows.ts'
import { copyLocalListToAccount, deleteOpportunity, listOpportunities, saveOpportunities, saveOpportunity } from './storage.ts'

// A small in-memory stand-in for the Supabase table ("a fake"). It answers the
// exact calls storage.ts makes, so these tests check our code without a network
// or a real database. Row-level security itself is tested by npm run check:db.
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  failWith: null as null | { message: string; code?: string },
}))

vi.mock('./supabase.ts', () => {
  const respond = (data: unknown = null) =>
    Promise.resolve(db.failWith ? { data: null, error: db.failWith } : { data, error: null })
  return {
    supabase: {
      from: () => ({
        select: () => ({ order: () => respond(structuredClone(db.rows)) }),
        upsert: (input: Record<string, unknown>[]) => {
          if (!db.failWith) {
            for (const row of input) {
              const index = db.rows.findIndex((r) => r.id === row.id)
              if (index === -1) db.rows.push({ ...row, user_id: 'me' })
              else db.rows[index] = { ...db.rows[index], ...row }
            }
          }
          return respond()
        },
        delete: () => ({
          eq: (_column: string, id: string) => {
            if (!db.failWith) db.rows = db.rows.filter((r) => r.id !== id)
            return respond()
          },
        }),
      }),
    },
  }
})

function fakeLocalStorage(): Storage {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size
    },
  }
}

const draft: OpportunityDraft = {
  name: 'Gasworks',
  opensOn: null,
  deadline: '2026-12-01',
  closingTime: '',
  timeZone: '',
  link: '',
  notes: '',
  hearBackBy: '',
}

beforeEach(() => {
  db.rows = []
  db.failWith = null
  vi.stubGlobal('localStorage', fakeLocalStorage())
})

describe('storage (Supabase)', () => {
  it('starts empty', async () => {
    expect(await listOpportunities()).toEqual([])
  })

  it('keeps what you save, in database column names, without sending user_id', async () => {
    const opportunity = createOpportunity(draft)
    await saveOpportunity(opportunity)
    expect(db.rows[0]).toMatchObject({ id: opportunity.id, opens_on: null, created_at: opportunity.createdAt })
    expect(await listOpportunities()).toEqual([opportunity])
  })

  it('updates instead of duplicating when the id is the same', async () => {
    const opportunity = createOpportunity(draft)
    await saveOpportunity(opportunity)
    await saveOpportunity({ ...opportunity, status: 'applied' })
    const saved = await listOpportunities()
    expect(saved).toHaveLength(1)
    expect(saved[0].status).toBe('applied')
  })

  it('saves several at once', async () => {
    await saveOpportunities([createOpportunity(draft), createOpportunity({ ...draft, name: 'Second' })])
    expect(await listOpportunities()).toHaveLength(2)
  })

  it('deletes only the one you asked for', async () => {
    const keep = createOpportunity({ ...draft, name: 'Keep' })
    const remove = createOpportunity({ ...draft, name: 'Remove' })
    await saveOpportunities([keep, remove])
    await deleteOpportunity(remove.id)
    expect((await listOpportunities()).map((o) => o.name)).toEqual(['Keep'])
  })

  it('turns database errors into plain sentences', async () => {
    db.failWith = { message: 'TypeError: Failed to fetch' }
    await expect(listOpportunities()).rejects.toThrow(/internet connection/)
    await expect(saveOpportunity(createOpportunity(draft))).rejects.toThrow(/internet connection/)
  })
})

describe('copyLocalListToAccount', () => {
  it('does nothing when this browser has no old list', async () => {
    expect(await copyLocalListToAccount()).toBeNull()
  })

  it('copies the old list up once, and keeps a safety copy under a new name', async () => {
    const old = [createOpportunity(draft), createOpportunity({ ...draft, name: 'Second' })]
    localStorage.setItem(OLD_KEY, JSON.stringify(old))
    expect(await copyLocalListToAccount()).toEqual({ added: 2, updated: 0 })
    expect(await listOpportunities()).toHaveLength(2)
    expect(localStorage.getItem(OLD_KEY)).toBeNull()
    expect(localStorage.getItem(COPIED_KEY)).not.toBeNull()
    expect(await copyLocalListToAccount()).toBeNull() // never twice
  })

  it('keeps the newer edit when the item is already in the account', async () => {
    const older = { ...createOpportunity(draft), updatedAt: '2026-11-01T00:00:00.000Z' }
    const newerInAccount: OpportunityRow = {
      id: older.id,
      name: 'Edited on my phone',
      opens_on: null,
      deadline: older.deadline,
      link: '',
      closing_time: null,
      time_zone: null,
      hear_back_by: null,
      status: 'todo',
      notes: '',
      created_at: older.createdAt,
      updated_at: '2026-11-05T00:00:00.000Z',
    }
    db.rows = [{ ...newerInAccount }]
    localStorage.setItem(OLD_KEY, JSON.stringify([older]))
    expect(await copyLocalListToAccount()).toEqual({ added: 0, updated: 0 })
    expect((await listOpportunities())[0].name).toBe('Edited on my phone')
  })

  it('leaves an unreadable old list alone instead of uploading it', async () => {
    localStorage.setItem(OLD_KEY, '{ not valid json')
    expect(await copyLocalListToAccount()).toBeNull()
    expect(localStorage.getItem(OLD_KEY)).toBe('{ not valid json')
    expect(db.rows).toEqual([])
  })

  it('keeps the old list if uploading fails, so nothing is lost', async () => {
    localStorage.setItem(OLD_KEY, JSON.stringify([createOpportunity(draft)]))
    db.failWith = { message: 'TypeError: Failed to fetch' }
    await expect(copyLocalListToAccount()).rejects.toThrow()
    expect(localStorage.getItem(OLD_KEY)).not.toBeNull()
  })
})
