// Every save and load in the app goes through this file, and nothing else
// touches the database directly. Phase 1 used localStorage; since phase 2c
// the same functions talk to Supabase, so the screens didn't have to change.
//
// Each request carries your sign-in token. Row-level security in the database
// then makes sure you only ever read or change your own rows.

import type { Opportunity } from '../types.ts'
import { mergeOpportunities } from './backup.ts'
import { friendlyDataError } from './dataErrors.ts'
import { markLocalCopied, readLocalOpportunities } from './legacyLocal.ts'
import { fromRow, toRow, type OpportunityRow } from './opportunityRows.ts'
import { supabase } from './supabase.ts'

function table() {
  if (!supabase) throw new Error('The app isn’t connected to Supabase yet (see .env.example).')
  return supabase.from('opportunities')
}

export async function listOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await table().select('*').order('deadline')
  if (error) throw new Error(friendlyDataError(error))
  return (data as OpportunityRow[]).map(fromRow)
}

/** Add a new opportunity, or replace the saved one with the same id. */
export async function saveOpportunity(opportunity: Opportunity): Promise<void> {
  await saveOpportunities([opportunity])
}

/**
 * Save several at once (restoring a backup, copying the old local list).
 * "Upsert" = update if the id exists, insert if it doesn't, in one request.
 */
export async function saveOpportunities(opportunities: Opportunity[]): Promise<void> {
  if (opportunities.length === 0) return
  const { error } = await table().upsert(opportunities.map(toRow))
  if (error) throw new Error(friendlyDataError(error))
}

/** Remove an opportunity. Removing one that doesn't exist does nothing. */
export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await table().delete().eq('id', id)
  if (error) throw new Error(friendlyDataError(error))
}

/**
 * One-time move from phase 1: if this browser still has a list saved locally,
 * merge it into your account (nothing is deleted; the newest edit of each
 * item wins), then set the local copy aside. Returns what happened, or null.
 */
export async function copyLocalListToAccount(): Promise<{ added: number; updated: number } | null> {
  const local = readLocalOpportunities()
  if (!local) return null
  if (local.length > 0) {
    const merge = mergeOpportunities(await listOpportunities(), local)
    await saveOpportunities(merge.toSave)
    markLocalCopied()
    return { added: merge.added, updated: merge.updated }
  }
  markLocalCopied()
  return null
}
