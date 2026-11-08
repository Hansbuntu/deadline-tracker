// The app's few icons, drawn as SVG in one consistent style: 16px, 1.75 stroke,
// round ends. They're decorative (the words next to them carry the meaning),
// so screen readers skip them.

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function PlusIcon() {
  return (
    <svg {...base}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg {...base}>
      <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
  )
}

/** "Opens in a new tab": an arrow leaving a corner. */
export function ExternalIcon() {
  return (
    <svg {...base}>
      <path d="M9 3h4v4M13 3L7.5 8.5M11.5 10v2.5a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5H6" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg {...base} className="chevron-icon">
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}
