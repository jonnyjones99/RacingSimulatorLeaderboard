import { describe, expect, it } from 'vitest'
import { pageCount, pageOf, pageRange, slotOf } from './paging'

describe('paging (top 3 pinned, 7 per page)', () => {
  it('has a single page up to 10 drivers', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(10)).toBe(1)
    expect(pageCount(11)).toBe(2)
    expect(pageCount(17)).toBe(2)
    expect(pageCount(18)).toBe(3)
  })

  it('maps positions to pages, podium to page 0', () => {
    expect(pageOf(1)).toBe(0)
    expect(pageOf(10)).toBe(0)
    expect(pageOf(11)).toBe(1)
    expect(pageOf(18)).toBe(2)
  })

  it('pins podium slots on every page and hides other pages', () => {
    expect(slotOf(2, 1)).toEqual({ slot: 1, visible: true })
    expect(slotOf(4, 0)).toEqual({ slot: 3, visible: true })
    expect(slotOf(4, 1)).toEqual({ slot: 3, visible: false })
    expect(slotOf(12, 1)).toEqual({ slot: 4, visible: true })
  })

  it('describes the positions a page shows', () => {
    expect(pageRange(0, 24)).toEqual([4, 10])
    expect(pageRange(2, 20)).toEqual([18, 20])
  })
})
