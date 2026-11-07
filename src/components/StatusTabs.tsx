import { STATUS_LABELS, type StatusFilter } from '../lib/opportunity.ts'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'todo', label: STATUS_LABELS.todo },
  { value: 'applied', label: STATUS_LABELS.applied },
  { value: 'skipped', label: STATUS_LABELS.skipped },
  { value: 'all', label: 'All' },
]

interface Props {
  value: StatusFilter
  counts: Record<StatusFilter, number>
  onChange: (filter: StatusFilter) => void
}

/** A row of toggle buttons. aria-pressed tells screen readers which one is on. */
export function StatusTabs({ value, counts, onChange }: Props) {
  return (
    <div className="tabs" role="group" aria-label="Show">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className="tab"
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label} <span className="tab-count">{counts[filter.value]}</span>
        </button>
      ))}
    </div>
  )
}
