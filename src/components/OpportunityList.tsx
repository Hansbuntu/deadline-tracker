import type { DateString, Opportunity } from '../types.ts'
import { OpportunityCard } from './OpportunityCard.tsx'

interface Props {
  /** Already in display order. */
  opportunities: Opportunity[]
  today: DateString
}

export function OpportunityList({ opportunities, today }: Props) {
  if (opportunities.length === 0) {
    return <p className="empty">Nothing tracked yet. Add your first open call above.</p>
  }

  return (
    <ul className="list">
      {opportunities.map((opportunity) => (
        // `key` tells React which card is which, so it can update just the one that changed.
        <OpportunityCard key={opportunity.id} opportunity={opportunity} today={today} />
      ))}
    </ul>
  )
}
