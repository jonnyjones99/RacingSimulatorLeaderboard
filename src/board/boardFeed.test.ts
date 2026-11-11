import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lap } from '../lib/standings'
import { createBoardFeed, SETTLE_MS, TAKEOVER_EXIT_MS, TAKEOVER_MS } from './boardFeed'

let seq = 0
const lap = (driverName: string, timeMs: number): Lap => {
  seq += 1
  return { id: `lap-${seq}`, driverName, timeMs, createdAt: new Date(2026, 0, 1, 12, 0, seq).toISOString() }
}

describe('board feed', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows existing laps at once on first load, without animation', () => {
    const feed = createBoardFeed()
    const laps = [lap('A', 1000), lap('B', 900)]
    feed.sync(laps, true)
    expect(feed.getState()).toMatchObject({ shown: laps, takeover: null, highlight: null })
  })

  it('holds a new fastest lap behind the takeover, then applies it', () => {
    const feed = createBoardFeed()
    const first = lap('A', 1000)
    const faster = lap('B', 900)
    feed.sync([first], true)
    feed.sync([first, faster], true)
    expect(feed.getState().takeover).toBe(faster)
    expect(feed.getState().shown).toEqual([first])

    vi.advanceTimersByTime(TAKEOVER_MS)
    expect(feed.getState().shown).toEqual([first, faster])
    expect(feed.getState().highlight?.verdict.kind).toBe('fastest')

    vi.advanceTimersByTime(TAKEOVER_EXIT_MS)
    expect(feed.getState().takeover).toBeNull()
  })

  it('plays queued laps one after another', () => {
    const feed = createBoardFeed()
    const base = lap('A', 1000)
    const second = lap('B', 1100)
    const third = lap('C', 1200)
    feed.sync([base], true)
    feed.sync([base, second, third], true)
    expect(feed.getState().shown).toEqual([base, second])
    vi.advanceTimersByTime(SETTLE_MS)
    expect(feed.getState().shown).toEqual([base, second, third])
  })

  it('waits while another scene is showing, then catches up', () => {
    const feed = createBoardFeed()
    const base = lap('A', 1000)
    const next = lap('B', 1100)
    feed.sync([base], true)
    feed.sync([base, next], false)
    expect(feed.getState().shown).toEqual([base])
    feed.sync([base, next], true)
    expect(feed.getState().shown).toEqual([base, next])
  })

  it('removes deleted laps straight away', () => {
    const feed = createBoardFeed()
    const keep = lap('A', 1000)
    const gone = lap('B', 900)
    feed.sync([keep, gone], true)
    feed.sync([keep], true)
    expect(feed.getState().shown).toEqual([keep])
  })

  it('drops a fastest lap deleted during its takeover', () => {
    const feed = createBoardFeed()
    const base = lap('A', 1000)
    const typo = lap('B', 100)
    feed.sync([base], true)
    feed.sync([base, typo], true)
    feed.sync([base], true)
    vi.advanceTimersByTime(TAKEOVER_MS)
    expect(feed.getState()).toMatchObject({ shown: [base], takeover: null, highlight: null })
  })

  it('notifies subscribers', () => {
    const feed = createBoardFeed()
    const listener = vi.fn()
    feed.subscribe(listener)
    feed.sync([lap('A', 1000)], true)
    expect(listener).toHaveBeenCalled()
  })
})
