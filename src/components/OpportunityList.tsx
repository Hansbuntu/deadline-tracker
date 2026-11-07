import { splitOpenAndClosed } from '../lib/opportunity.ts'
import type { DateString, Opportunity, Status } from '../types.ts'
import { OpportunityCard } from './OpportunityCard.tsx'

interface Props {
  /** Already filtered to the chosen tab. */
  opportunities: Opportunity[]
  today: DateString
  emptyMessage: string
  onStatusChange: (opportunity: Opportunity, status: Status) => void
  onEdit: (opportunity: Opportunity) => void
  onDelete: (opportunity: Opportunity) => void
}

export function OpportunityList({ opportunities, today, emptyMessage, ...actions }: Props) {
  const { open, closed } = splitOpenAndClosed(opportunities, today)

  return (
    <>
      {open.length === 0 ? (
        <p className="empty">{emptyMessage}</p>
      ) : (
        <ul className="list">
          {open.map((opportunity) => (
            // `key` tells React which card is which, so it only redraws the one that changed.
            <OpportunityCard key={opportunity.id} opportunity={opportunity} today={today} {...actions} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        // <details> is a built-in show/hide section: no JavaScript needed.
        <details className="closed">
          <summary>
            Closed <span className="count">{closed.length}</span>
          </summary>
          <ul className="list">
            {closed.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} today={today} {...actions} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
