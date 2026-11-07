import { useEffect, useState } from 'react'
import { OpportunityForm } from './components/OpportunityForm.tsx'
import { OpportunityList } from './components/OpportunityList.tsx'
import { todayInGMT } from './lib/dates.ts'
import { createOpportunity, sortForDisplay } from './lib/opportunity.ts'
import { listOpportunities, saveOpportunity } from './lib/storage.ts'
import type { Opportunity, OpportunityDraft } from './types.ts'

type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string }

export default function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const today = todayInGMT()

  // useEffect runs code after the page first appears: here, load saved data once.
  useEffect(() => {
    listOpportunities()
      .then((saved) => {
        setOpportunities(saved)
        setLoad({ kind: 'ready' })
      })
      .catch((error: unknown) => {
        setLoad({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      })
  }, [])

  async function handleAdd(draft: OpportunityDraft) {
    const opportunity = createOpportunity(draft)
    await saveOpportunity(opportunity) // if this fails, the form shows the error
    setOpportunities((current) => [...current, opportunity])
  }

  const sorted = sortForDisplay(opportunities, today)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Deadlines</h1>
        <p className="tagline">Open calls, residencies and grants</p>
      </header>

      <main>
        <section className="panel" aria-labelledby="add-heading">
          <h2 id="add-heading">Add an opportunity</h2>
          <OpportunityForm onAdd={handleAdd} />
        </section>

        <section aria-labelledby="list-heading">
          <h2 id="list-heading">
            Your list {opportunities.length > 0 && <span className="count">{opportunities.length}</span>}
          </h2>
          {load.kind === 'loading' && <p className="empty">Loading…</p>}
          {load.kind === 'error' && (
            <p className="alert" role="alert">
              {load.message}
            </p>
          )}
          {load.kind === 'ready' && <OpportunityList opportunities={sorted} today={today} />}
        </section>
      </main>
    </div>
  )
}
