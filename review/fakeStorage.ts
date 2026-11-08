// Review copy only: an in-memory stand-in for src/lib/storage.ts, filled with
// made-up sample data that shows every state of the tracker. Nothing here
// touches Supabase. Add ?data=empty to the address to start with no items.

import { addDays, todayInGMT } from '../src/lib/dates.ts'
import type { Opportunity, Status } from '../src/types.ts'

const today = todayInGMT()
const created = new Date(Date.now() - 7 * 86_400_000).toISOString()

function sample(
  id: string,
  name: string,
  daysAway: number,
  extra: Partial<Pick<Opportunity, 'link' | 'notes' | 'opensOn' | 'closingTime' | 'timeZone' | 'hearBackBy'>> & {
    status?: Status
  } = {},
): Opportunity {
  return {
    id,
    name,
    opensOn: extra.opensOn ?? null,
    deadline: addDays(today, daysAway),
    closingTime: extra.closingTime ?? null,
    timeZone: extra.timeZone ?? null,
    link: extra.link ?? '',
    status: extra.status ?? 'todo',
    notes: extra.notes ?? '',
    hearBackBy: extra.hearBackBy ?? null,
    createdAt: created,
    updatedAt: created,
  }
}

const SAMPLE: Opportunity[] = [
  sample('s1', 'Harbour Studios residency 2027', 0, {
    closingTime: '23:59',
    link: 'https://example.org/harbour',
    notes: 'CV, 10 images, 300-word statement\nFee: none',
  }),
  sample('s2', 'Riverside print biennial: open call', 3, {
    closingTime: '17:00',
    timeZone: 'Europe/Paris',
    link: 'https://example.org/riverside',
  }),
  sample('s3', 'Northern Light painting prize', 6),
  sample('s4', 'Résidence de la Gare: appel à candidatures', 12, { notes: 'In French; ask Ama to check the letter' }),
  sample(
    's5',
    'Coastal arts fellowship for early-career painters working with landscape and memory',
    24,
    { opensOn: addDays(today, 5), closingTime: '23:59', timeZone: 'America/Los_Angeles', link: 'https://example.org/coastal' },
  ),
  sample('s6', 'Atelier exchange programme', 60),
  sample('s7', 'Westbank emerging artist grant', 4, { status: 'applied', notes: 'Submitted 2 Nov', hearBackBy: addDays(today, 40) }),
  sample('s8', 'City murals commission', 20, { status: 'skipped' }),
  sample('s9', 'Spring salon open submission', -5),
  sample('s10', 'Textile & paint residency', -12, { status: 'applied' }),
]

const startEmpty = new URLSearchParams(window.location.search).get('data') === 'empty'
let rows: Opportunity[] = startEmpty ? [] : structuredClone(SAMPLE)

// A short pause, so loading and saving feel like a real network.
const pause = () => new Promise((resolve) => setTimeout(resolve, 250))

export async function listOpportunities(): Promise<Opportunity[]> {
  await pause()
  return structuredClone(rows)
}

export async function saveOpportunity(opportunity: Opportunity): Promise<void> {
  await saveOpportunities([opportunity])
}

export async function saveOpportunities(list: Opportunity[]): Promise<void> {
  await pause()
  for (const item of list) {
    const index = rows.findIndex((r) => r.id === item.id)
    if (index === -1) rows.push(structuredClone(item))
    else rows[index] = structuredClone(item)
  }
}

export async function deleteOpportunity(id: string): Promise<void> {
  await pause()
  rows = rows.filter((r) => r.id !== id)
}

export async function copyLocalListToAccount(): Promise<null> {
  return null
}
