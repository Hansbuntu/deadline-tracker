import { useId } from 'react'
import { formatDate } from '../lib/dates.ts'
import { daysLeft, describeDaysLeft, describeOpens, STATUS_LABELS, toneFor } from '../lib/opportunity.ts'
import type { DateString, Opportunity, Status } from '../types.ts'

interface Props {
  opportunity: Opportunity
  today: DateString
  onStatusChange: (opportunity: Opportunity, status: Status) => void
  onEdit: (opportunity: Opportunity) => void
  onDelete: (opportunity: Opportunity) => void
}

export function OpportunityCard({ opportunity, today, onStatusChange, onEdit, onDelete }: Props) {
  const statusId = useId()
  const days = daysLeft(opportunity, today)
  const tone = toneFor(opportunity, today)
  const isTodo = opportunity.status === 'todo'
  const opens = isTodo ? describeOpens(opportunity.opensOn, today) : null
  const { name } = opportunity

  return (
    // data-tone lets the CSS pick this card's colours. The words ("3 days left")
    // carry the same meaning, so nobody has to rely on colour alone.
    <li className="card" data-tone={tone}>
      <div className="card-head">
        <h3 className="card-name">
          {opportunity.link ? (
            // noreferrer: the other site isn't told where you came from, and can't control this tab.
            <a href={opportunity.link} target="_blank" rel="noreferrer">
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
        <span className="badge">{isTodo ? describeDaysLeft(days) : STATUS_LABELS[opportunity.status]}</span>
      </div>

      <p className="card-meta">
        Deadline <time dateTime={opportunity.deadline}>{formatDate(opportunity.deadline)}</time>
        {opens && <> · {opens}</>}
        {!isTodo && <> · {describeDaysLeft(days)}</>}
      </p>

      {opportunity.notes && <p className="card-notes">{opportunity.notes}</p>}

      <div className="card-actions">
        <label className="visually-hidden" htmlFor={statusId}>
          Status of {name}
        </label>
        <select
          id={statusId}
          className="status-select"
          value={opportunity.status}
          onChange={(e) => onStatusChange(opportunity, e.target.value as Status)}
        >
          {(Object.keys(STATUS_LABELS) as Status[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <span className="card-actions-spacer" />
        {/* aria-label adds the name so a screen reader hears "Edit Gasworks", not ten "Edit"s */}
        <button type="button" className="button-text" aria-label={`Edit ${name}`} onClick={() => onEdit(opportunity)}>
          Edit
        </button>
        <button
          type="button"
          className="button-text button-danger"
          aria-label={`Delete ${name}`}
          onClick={() => onDelete(opportunity)}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
