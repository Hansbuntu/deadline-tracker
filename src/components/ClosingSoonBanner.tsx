import { daysLeft, describeDaysLeft } from '../lib/opportunity.ts'
import type { DateString, Opportunity } from '../types.ts'

interface Props {
  /** To-do items closing today or within 7 days, soonest first. */
  items: Opportunity[]
  today: DateString
}

export function ClosingSoonBanner({ items, today }: Props) {
  if (items.length === 0) return null

  return (
    <section className="banner" aria-labelledby="banner-title">
      <h2 id="banner-title" className="banner-title">
        {items.length === 1 ? '1 deadline this week' : `${items.length} deadlines this week`}
      </h2>
      <ul className="banner-list">
        {items.map((o) => (
          <li key={o.id}>
            <span className="banner-name">{o.name}</span>
            <span className="banner-days">{describeDaysLeft(daysLeft(o, today))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
