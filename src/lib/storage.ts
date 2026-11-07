// Every save and load in the app goes through this file, and nothing else
// touches storage directly. Today it uses localStorage (this browser only).
// In phase 2 we swap the insides for Supabase (a real database) and the rest
// of the app does not change.
//
// The functions are `async` (they return Promises: "the answer is coming").
// localStorage answers instantly, but a database across the internet does not,
// so we use the database-friendly shape from the start.

import type { Opportunity } from '../types.ts'

// The "v1" lets a future version of the app recognise and upgrade old data.
const STORAGE_KEY = 'deadline-tracker:opportunities:v1'

export async function listOpportunities(): Promise<Opportunity[]> {
  return readAll()
}

/** Add a new opportunity, or replace the saved one with the same id. */
export async function saveOpportunity(opportunity: Opportunity): Promise<void> {
  const all = readAll()
  const index = all.findIndex((saved) => saved.id === opportunity.id)
  if (index === -1) all.push(opportunity)
  else all[index] = opportunity
  writeAll(all)
}

/** Save several at once (used when restoring a backup): add new ones, replace same-id ones. */
export async function saveOpportunities(opportunities: Opportunity[]): Promise<void> {
  const byId = new Map(readAll().map((saved) => [saved.id, saved]))
  for (const opportunity of opportunities) byId.set(opportunity.id, opportunity)
  writeAll([...byId.values()])
}

/** Remove an opportunity. Removing one that doesn't exist does nothing. */
export async function deleteOpportunity(id: string): Promise<void> {
  const all = readAll()
  writeAll(all.filter((saved) => saved.id !== id))
}

function readAll(): Opportunity[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return [] // nothing saved yet

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = undefined
  }
  if (!Array.isArray(parsed)) {
    // Stop instead of carrying on with an empty list: the next save would
    // overwrite (and lose) whatever is stored.
    throw new Error('Your saved opportunities could not be read, so nothing was changed.')
  }
  // Trusting the saved shape is fine for data this app wrote itself.
  // The JSON import in phase 1c will check every field properly.
  return parsed as Opportunity[]
}

function writeAll(all: Opportunity[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
