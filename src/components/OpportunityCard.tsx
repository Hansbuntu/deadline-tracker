import { useId, useState } from 'react'
import { googleCalendarUrl } from '../lib/calendar.ts'
import { formatDate } from '../lib/dates.ts'
import { cardDomId } from '../lib/focus.ts'
import {
  daysLeft,
  describeClosingTime,
  describeDeadline,
  describeOpens,
  isClosed,
  toneFor,
} from '../lib/opportunity.ts'
import type { DateString, Opportunity, Status } from '../types.ts'
import { CheckIcon, ChevronIcon, ExternalIcon } from './icons.tsx'

interface Props {
  opportunity: Opportunity
  today: DateString
  now: Date
  onStatusChange: (opportunity: Opportunity, status: Status) => void
  onEdit: (opportunity: Opportunity) => void
  onDelete: (opportunity: Opportunity) => void
  onDownloadIcs: (opportunity: Opportunity) => void
}

/**
 * One opportunity, laid out like a gallery wall label: the name in the serif,
 * a caption line with the dates, and a single next action. Everything else
 * waits behind "More".
 */
export function OpportunityCard({ opportunity, today, now, onStatusChange, onEdit, onDelete, onDownloadIcs }: Props) {
  const moreId = useId()
  const [showMore, setShowMore] = useState(false)
  const { name, status, link } = opportunity

  const closed = isClosed(opportunity, today, now)
  const days = daysLeft(opportunity, today)
  const tone = toneFor(opportunity, today, now)
  // The last two days get the one strong treatment on the screen.
  const imminent = status === 'todo' && !closed && days <= 1
  const stillOpen = status === 'todo' && !closed
  const opensAhead = opportunity.opensOn !== null && opportunity.opensOn >= today

  const closingTime = describeClosingTime(opportunity)
  const caption = [
    `${closed ? 'Closed' : 'Deadline'} ${formatDate(opportunity.deadline)}${closingTime ? `, ${closingTime}` : ''}`,
    stillOpen ? describeOpens(opportunity.opensOn, today) : null,
    status === 'applied' && opportunity.hearBackBy ? `Results by ${formatDate(opportunity.hearBackBy)}` : null,
  ].filter(Boolean)

  const runAndClose = (action: () => void) => () => {
    setShowMore(false)
    action()
  }

  return (
    <li className="card" data-tone={tone} id={cardDomId(opportunity.id)} data-card>
      <div className="card-head">
        {/* tabIndex -1: focus can be moved here after a neighbouring card is removed */}
        <h3 className="card-name" tabIndex={-1} data-card-title>
          {link ? (
            // noreferrer: the other site isn't told where you came from, and can't control this tab.
            <a href={link} target="_blank" rel="noreferrer">
              {name}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            name
          )}
        </h3>
        <StatusLabel opportunity={opportunity} today={today} now={now} imminent={imminent} />
      </div>

      <p className="card-meta">{caption.join(' · ')}</p>

      {opportunity.notes && <p className="card-notes">{opportunity.notes}</p>}

      <div className="card-actions">
        {status === 'todo' && closed ? (
          // The deadline went by: close the loop instead of leaving it hanging.
          <>
            <span className="card-question" id={`${moreId}-question`}>
              Did you apply?
            </span>
            <button
              type="button"
              className="button button-quiet button-small"
              aria-describedby={`${moreId}-question`}
              onClick={() => onStatusChange(opportunity, 'applied')}
            >
              Yes
            </button>
            <button
              type="button"
              className="button button-quiet button-small"
              aria-describedby={`${moreId}-question`}
              onClick={() => onStatusChange(opportunity, 'skipped')}
            >
              No
            </button>
          </>
        ) : null}

        {imminent && link && (
          <a className="button button-primary button-small" href={link} target="_blank" rel="noreferrer">
            Open the call <ExternalIcon />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        )}

        {stillOpen && (
          <button
            type="button"
            className="button button-quiet button-small"
            aria-label={`Mark ${name} as applied`}
            onClick={() => onStatusChange(opportunity, 'applied')}
          >
            <CheckIcon /> Mark applied
          </button>
        )}

        <button
          type="button"
          className="button-text card-more-toggle"
          aria-expanded={showMore}
          aria-controls={`${moreId}-panel`}
          aria-label={`More for ${name}`}
          onClick={() => setShowMore((open) => !open)}
        >
          More <ChevronIcon />
        </button>
      </div>

      {showMore && (
        <div className="card-more" id={`${moreId}-panel`}>
          <button type="button" className="menu-item" onClick={runAndClose(() => onEdit(opportunity))}>
            Edit details
          </button>

          {stillOpen && (
            <>
              <button type="button" className="menu-item" onClick={runAndClose(() => onDownloadIcs(opportunity))}>
                Add to Apple or Outlook calendar
              </button>
              <a className="menu-item" href={googleCalendarUrl(opportunity)} target="_blank" rel="noreferrer">
                Add to Google Calendar
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              {opensAhead && (
                <a
                  className="menu-item"
                  href={googleCalendarUrl(opportunity, 'opens')}
                  target="_blank"
                  rel="noreferrer"
                >
                  Add opening day to Google Calendar
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              )}
              <p className="menu-hint">
                The Apple/Outlook file reminds you 30, 14, 7 and 1 day before, at 9:00. Google uses your usual
                reminders.
              </p>
            </>
          )}

          {status === 'todo' && (
            <button
              type="button"
              className="menu-item"
              onClick={runAndClose(() => onStatusChange(opportunity, 'skipped'))}
            >
              Skip it <span className="menu-item-note">keeps it in your history</span>
            </button>
          )}
          {status === 'skipped' && (
            <button
              type="button"
              className="menu-item"
              onClick={runAndClose(() => onStatusChange(opportunity, 'applied'))}
            >
              Mark applied
            </button>
          )}
          {status !== 'todo' && (
            <button type="button" className="menu-item" onClick={runAndClose(() => onStatusChange(opportunity, 'todo'))}>
              Move back to To do
            </button>
          )}

          <button
            type="button"
            className="menu-item menu-item-danger"
            onClick={runAndClose(() => onDelete(opportunity))}
          >
            Delete <span className="menu-item-note">removes it; you can undo for a few seconds</span>
          </button>
        </div>
      )}
    </li>
  )
}

/** The small status on the right: a coloured dot and words, or a solid label for today and tomorrow. */
function StatusLabel({
  opportunity,
  today,
  now,
  imminent,
}: {
  opportunity: Opportunity
  today: DateString
  now: Date
  imminent: boolean
}) {
  if (opportunity.status === 'applied') {
    return (
      <span className="status status-applied">
        <CheckIcon /> Applied
      </span>
    )
  }
  if (opportunity.status === 'skipped') return <span className="status status-skipped">Skipped</span>
  return (
    <span className={imminent ? 'status status-imminent' : 'status'}>
      {!imminent && <span className="status-dot" aria-hidden="true" />}
      {describeDeadline(opportunity, today, now)}
    </span>
  )
}
