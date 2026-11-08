import { cardDomId } from '../lib/focus.ts'
import { daysLeft, describeDeadline } from '../lib/opportunity.ts'
import type { DateString, Opportunity } from '../types.ts'

interface Props {
  /** To-do items closing today or within 7 days, soonest first. */
  items: Opportunity[]
  today: DateString
  now: Date
  /** Show that opportunity's card (switching to the To do tab if needed). */
  onJump: (opportunity: Opportunity) => void
}

/**
 * One calm line about the next 7 days, instead of a red box that repeats the
 * list. It only turns strong when something closes today or tomorrow.
 */
export function ClosingSoonBanner({ items, today, now, onJump }: Props) {
  if (items.length === 0) {
    return <p className="summary summary-clear">Nothing closes in the next 7 days.</p>
  }

  const [first] = items
  const imminent = daysLeft(first, today) <= 1
  const when = describeDeadline(first, today, now)
  const others = items.length - 1

  return (
    <section className={imminent ? 'summary summary-imminent' : 'summary'} aria-labelledby="summary-title">
      <h2 className="visually-hidden" id="summary-title">
        Next 7 days
      </h2>
      <p className="summary-line">
        {imminent && <span className="summary-dot" aria-hidden="true" />}
        <span>
          {imminent ? '' : 'Next: '}
          <a
            href={`#${cardDomId(first.id)}`}
            onClick={(event) => {
              event.preventDefault() // move focus to the card, not just scroll the page
              onJump(first)
            }}
          >
            {first.name}
          </a>
          {imminent ? ` ${when.charAt(0).toLowerCase()}${when.slice(1)}` : `, ${when.toLowerCase()}`}
          {others > 0 && (
            <span className="summary-more">
              {' · '}
              {others === 1 ? '1 more in the next 7 days' : `${others} more in the next 7 days`}
            </span>
          )}
        </span>
      </p>
    </section>
  )
}
