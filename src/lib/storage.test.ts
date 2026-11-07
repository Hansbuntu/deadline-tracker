import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OpportunityDraft } from '../types.ts'
import { createOpportunity } from './opportunity.ts'
import { deleteOpportunity, listOpportunities, saveOpportunities, saveOpportunity } from './storage.ts'

// Tests run in Node, not a browser, so there is no real localStorage.
// This small stand-in behaves the same way and starts empty for every test.
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

const draft: OpportunityDraft = { name: 'Gasworks', opensOn: null, deadline: '2026-12-01', link: '', notes: '' }

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeLocalStorage())
})

describe('storage', () => {
  it('starts empty', async () => {
    expect(await listOpportunities()).toEqual([])
  })

  it('keeps what you save', async () => {
    const opportunity = createOpportunity(draft)
    await saveOpportunity(opportunity)
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

  it('saves several at once, adding new and replacing same-id ones', async () => {
    const existing = createOpportunity({ ...draft, name: 'Existing' })
    await saveOpportunity(existing)
    const fresh = createOpportunity({ ...draft, name: 'Fresh' })
    await saveOpportunities([{ ...existing, name: 'Existing (edited)' }, fresh])
    const saved = await listOpportunities()
    expect(saved.map((o) => o.name)).toEqual(['Existing (edited)', 'Fresh'])
  })

  it('deletes only the one you asked for', async () => {
    const keep = createOpportunity({ ...draft, name: 'Keep' })
    const remove = createOpportunity({ ...draft, name: 'Remove' })
    await saveOpportunity(keep)
    await saveOpportunity(remove)
    await deleteOpportunity(remove.id)
    expect(await listOpportunities()).toEqual([keep])
  })

  it('ignores deleting something that is already gone', async () => {
    const keep = createOpportunity(draft)
    await saveOpportunity(keep)
    await deleteOpportunity('no-such-id')
    expect(await listOpportunities()).toEqual([keep])
  })

  it('refuses to overwrite data it cannot read', async () => {
    localStorage.setItem('deadline-tracker:opportunities:v1', '{ not valid json')
    await expect(listOpportunities()).rejects.toThrow()
    await expect(saveOpportunity(createOpportunity(draft))).rejects.toThrow()
    expect(localStorage.getItem('deadline-tracker:opportunities:v1')).toBe('{ not valid json')
  })
})
