// Keeping keyboard focus somewhere sensible when cards appear or disappear.
// If the focused card is deleted or moved to another tab, the browser drops
// focus to the top of the page; keyboard and screen-reader users then lose
// their place. These helpers put focus on the neighbouring card instead.

export const LIST_HEADING_ID = 'list-heading'

/** The id of a card's element on the page. */
export function cardDomId(opportunityId: string): string {
  return `card-${opportunityId}`
}

/** Before removing a card: which card should get focus afterwards (the next one, else the previous one)? */
export function neighbourOf(opportunityId: string): string | null {
  const cards = [...document.querySelectorAll<HTMLElement>('[data-card]')].filter((el) => el.offsetParent !== null)
  const index = cards.findIndex((el) => el.id === cardDomId(opportunityId))
  if (index === -1) return null
  return (cards[index + 1] ?? cards[index - 1])?.id ?? null
}

/**
 * Focus a card's title, or the list heading if that card isn't on screen.
 * Call it after React has drawn the updated list (from an effect), so a card
 * that was just restored already exists.
 */
export function focusCard(domId: string | null): void {
  const title = domId ? document.getElementById(domId)?.querySelector<HTMLElement>('[data-card-title]') : null
  const target = title ?? document.getElementById(LIST_HEADING_ID)
  target?.focus()
}
