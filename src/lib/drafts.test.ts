import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, loadDraft, saveDraft } from './drafts.ts'
import { EMPTY_DRAFT } from './opportunity.ts'

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

beforeEach(() => vi.stubGlobal('localStorage', fakeLocalStorage()))

describe('unfinished form drafts', () => {
  const typed = { ...EMPTY_DRAFT, name: 'Half-typed residency' }

  it('keeps what you typed until you save or discard', () => {
    saveDraft('add', typed, 1000)
    expect(loadDraft('add', 2000)).toEqual(typed)
    clearDraft('add')
    expect(loadDraft('add', 3000)).toBeNull()
  })

  it('keeps add and edit drafts apart', () => {
    saveDraft('add', typed)
    expect(loadDraft('edit:abc')).toBeNull()
  })

  it('forgets drafts older than a week', () => {
    saveDraft('add', typed, 0)
    expect(loadDraft('add', 8 * 24 * 60 * 60 * 1000)).toBeNull()
  })

  it('ignores broken saved data', () => {
    localStorage.setItem('deadline-tracker:draft:add', '{ nope')
    expect(loadDraft('add')).toBeNull()
  })
})
