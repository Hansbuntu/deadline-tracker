import { splitOpenAndClosed } from '../lib/opportunity.ts'
import type { DateString, Opportunity, Status } from '../types.ts'
import { OpportunityCard } from './OpportunityCard.tsx'

interface Props {
  /** Already filtered to the chosen tab. */
  opportunities: Opportunity[]
  today: DateString
  now: Date
  emptyMessage: string
  onStatusChange: (opportunity: Opportunity, status: Status) => void
  onEdit: (opportunity: Opportunity) => void
  onDelete: (opportunity: Opportunity) => void
  onDownloadIcs: (opportunity: Opportunity) => void
}

export function OpportunityList({ opportunities, today, now, emptyMessage, ...actions }: Props) {
  const { open, closed } = splitOpenAndClosed(opportunities, today, now)
  const waitingForAnswer = closed.filter((o) => o.status === 'todo').length

  return (
    <>
      {open.length === 0 ? (
        <p className="empty list-empty">{emptyMessage}</p>
      ) : (
        <ul className="list">
          {open.map((opportunity) => (
            // `key` tells React which card is which, so it only redraws the one that changed.
            <OpportunityCard key={opportunity.id} opportunity={opportunity} today={today} now={now} {...actions} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        // <details> is a built-in show/hide section: no JavaScript needed.
        <details className="closed">
          <summary>
            Deadline passed <span className="count">{closed.length}</span>
            {waitingForAnswer > 0 && (
              <span className="closed-note">
                {waitingForAnswer === 1 ? '1 needs an answer' : `${waitingForAnswer} need an answer`}
              </span>
            )}
          </summary>
          <ul className="list">
            {closed.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} today={today} now={now} {...actions} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
