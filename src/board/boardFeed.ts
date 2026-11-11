import { compareIso, describeLap, type Lap, type LapVerdict } from '../lib/standings'

/** How long the "new fastest lap" band holds the screen before the board moves. */
export const TAKEOVER_MS = 2100
/** Extra time the band needs to leave the screen. TAKEOVER_MS + this = band animation length in board.css. */
export const TAKEOVER_EXIT_MS = 600
/** Time given to one lap's row animation before the next queued lap plays. */
export const SETTLE_MS = 1300
/** How long chips (NEW, arrows) stay on the rows. */
export const HIGHLIGHT_MS = 6000
/** Past this many unseen laps (e.g. after a long time on another scene) only the newest is animated. */
const MAX_ANIMATED_BACKLOG = 3

export interface Highlight {
  lap: Lap
  verdict: LapVerdict
}

export interface FeedState {
  /** laps the board is currently displaying; trails the real list while animations play */
  shown: Lap[] | null
  takeover: Lap | null
  highlight: Highlight | null
}

export interface BoardFeed {
  sync(laps: Lap[], active: boolean): void
  subscribe(listener: () => void): () => void
  getState(): FeedState
  dispose(): void
}

const byCreated = (a: Lap, b: Lap): number => compareIso(a.createdAt, b.createdAt)

/**
 * Turns "the lap list changed" into a paced sequence the board can animate:
 * one lap at a time, fastest laps held behind the takeover band first.
 */
export function createBoardFeed(): BoardFeed {
  let state: FeedState = { shown: null, takeover: null, highlight: null }
  let latest: { laps: Lap[]; active: boolean } | null = null
  let busy = false
  const listeners = new Set<() => void>()
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const update = (patch: Partial<FeedState>): void => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }

  const later = (run: () => void, ms: number): void => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      run()
    }, ms)
    timers.add(timer)
  }

  const play = (lap: Lap, verdict: LapVerdict): void => {
    // deleted while waiting behind the takeover (operator fixing a typo): drop it
    if (!latest?.laps.some((live) => live.id === lap.id)) {
      busy = false
      update({ takeover: null })
      pump()
      return
    }
    update({ shown: [...(state.shown ?? []), lap], highlight: { lap, verdict } })
    // the band keeps sweeping off screen while the row below starts its climb
    later(() => {
      if (state.takeover?.id === lap.id) update({ takeover: null })
    }, TAKEOVER_EXIT_MS)
    later(() => {
      busy = false
      pump()
    }, SETTLE_MS)
    later(() => {
      if (state.highlight?.lap.id === lap.id) update({ highlight: null })
    }, HIGHLIGHT_MS)
  }

  function pump(): void {
    if (!latest) return
    const { laps, active } = latest
    if (state.shown === null) {
      update({ shown: laps })
      return
    }

    const liveIds = new Set(laps.map((lap) => lap.id))
    const kept = state.shown.filter((lap) => liveIds.has(lap.id))
    if (kept.length !== state.shown.length) {
      const highlightGone = state.highlight !== null && !liveIds.has(state.highlight.lap.id)
      update({ shown: kept, ...(highlightGone && { highlight: null }) })
    }
    if (busy || !active) return

    const shownIds = new Set(kept.map((lap) => lap.id))
    const pending = laps.filter((lap) => !shownIds.has(lap.id)).sort(byCreated)
    if (pending.length === 0) return
    if (pending.length > MAX_ANIMATED_BACKLOG) {
      update({ shown: [...kept, ...pending.slice(0, -1)] })
      pump()
      return
    }

    const lap = pending[0]
    const verdict = describeLap(kept, lap)
    busy = true
    if (verdict.kind === 'fastest') {
      update({ takeover: lap })
      later(() => play(lap, verdict), TAKEOVER_MS)
    } else {
      play(lap, verdict)
    }
  }

  return {
    sync(laps, active) {
      latest = { laps, active }
      pump()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getState: () => state,
    dispose() {
      timers.forEach(clearTimeout)
      timers.clear()
      busy = false
      state = { ...state, takeover: null }
    },
  }
}
