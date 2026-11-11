// Board shows 10 rows: top 3 always, then one page of 7 from the rest.
export const PINNED = 3
export const PAGE_SIZE = 7
export const ROWS = PINNED + PAGE_SIZE

export interface Slot {
  slot: number
  visible: boolean
}

export function pageCount(drivers: number): number {
  return Math.max(1, Math.ceil((drivers - PINNED) / PAGE_SIZE))
}

/** Page a position lives on. Podium positions report page 0. */
export function pageOf(position: number): number {
  return position <= PINNED ? 0 : Math.floor((position - PINNED - 1) / PAGE_SIZE)
}

/** Row slot (0-9) for a position, and whether it shows on the given page. */
export function slotOf(position: number, page: number): Slot {
  if (position <= PINNED) return { slot: position - 1, visible: true }
  return { slot: PINNED + ((position - PINNED - 1) % PAGE_SIZE), visible: pageOf(position) === page }
}

/** First and last position shown in the paged part of the board. */
export function pageRange(page: number, drivers: number): [number, number] {
  const first = PINNED + page * PAGE_SIZE + 1
  return [first, Math.min(first + PAGE_SIZE - 1, drivers)]
}
