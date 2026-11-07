import { formatDate } from '../lib/dates.ts'
import { daysLeft, describeDaysLeft, describeOpens, urgencyFor } from '../lib/opportunity.ts'
import type { DateString, Opportunity } from '../types.ts'

interface Props {
  opportunity: Opportunity
  today: DateString
}

export function OpportunityCard({ opportunity, today }: Props) {
  const days = daysLeft(opportunity, today)
  const urgency = urgencyFor(days)
  const opens = describeOpens(opportunity.opensOn, today)

  return (
    // data-urgency lets the CSS pick this card's colours. The words
    // ("3 days left") carry the same meaning, so nobody relies on colour alone.
    <li className="card" data-urgency={urgency}>
      <div className="card-head">
        <h3 className="card-name">
          {opportunity.link ? (
            // noreferrer: the other site isn't told where you came from, and can't control this tab.
            <a href={opportunity.link} target="_blank" rel="noreferrer">
              {opportunity.name}
            </a>
          ) : (
            opportunity.name
          )}
        </h3>
        <span className="badge">{describeDaysLeft(days)}</span>
      </div>

      <p className="card-meta">
        Deadline <time dateTime={opportunity.deadline}>{formatDate(opportunity.deadline)}</time>
        {opens && <> · {opens}</>}
      </p>

      {opportunity.notes && <p className="card-notes">{opportunity.notes}</p>}
    </li>
  )
}
