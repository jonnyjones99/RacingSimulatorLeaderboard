import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react'
import c5Logo from '../assets/logos/c5.png'
import digitalJerseyLogo from '../assets/logos/digital-jersey.png'
import stemLogo from '../assets/logos/stem-racing.png'
import type { Race } from '../data/useRace'
import { pageCount, pageOf, pageRange } from '../lib/paging'
import { buildStandings, type Lap } from '../lib/standings'
import './board.css'
import { createBoardFeed, type FeedState } from './boardFeed'
import { HeadToHead, OnTrack, Podium, Takeover } from './Scenes'
import { SidePanel } from './SidePanel'
import { Tower } from './Tower'

/** How long each page of drivers below the podium stays up. */
const PAGE_MS = 8000
const NO_LAPS: Lap[] = []

// Decorative squares echoing the event banner: blue on the left edge, orange on the right.
// Deterministic so they do not jump between renders.
const PIXELS: CSSProperties[] = Array.from({ length: 46 }, (_, i) => {
  const left = i % 2 === 0
  const column = (i * 7) % 5
  const row = (i * 13 + column * 5) % 44
  return {
    [left ? 'left' : 'right']: `${column * 1.25}cqw`,
    top: `${row * 1.25}cqw`,
    background: left ? '#1d8fdc' : '#f7931e',
    opacity: 0.15 + ((i * 37) % 50) / 100,
  }
})

function useBoardFeed(laps: Lap[] | null, active: boolean): FeedState {
  const [feed] = useState(createBoardFeed)
  useEffect(() => {
    if (laps) feed.sync(laps, active)
  }, [feed, laps, active])
  useEffect(() => () => feed.dispose(), [feed])
  return useSyncExternalStore(feed.subscribe, feed.getState)
}

/** Cycles pages on a timer when there are more drivers than rows. */
function useAutoPage(pages: number): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (pages <= 1) return
    const timer = setInterval(() => setTick((current) => current + 1), PAGE_MS)
    return () => clearInterval(timer)
  }, [pages])
  return tick % pages
}

export function Board({ race }: { race: Race }) {
  const { snapshot, error } = race
  const scene = snapshot?.screen.scene ?? 'board'
  const liveLaps = snapshot?.laps ?? null
  const feed = useBoardFeed(liveLaps, scene === 'board')

  const shownLaps = feed.shown ?? NO_LAPS
  const shownStandings = useMemo(() => buildStandings(shownLaps), [shownLaps])
  // scenes read the real list so a lap landing during head to head shows immediately
  const liveStandings = useMemo(() => buildStandings(liveLaps ?? NO_LAPS), [liveLaps])

  const pages = pageCount(shownStandings.length)
  const autoPage = useAutoPage(pages)
  // jump to the page where the latest lap landed so its animation is seen
  const page = feed.highlight ? Math.min(pageOf(feed.highlight.verdict.position), pages - 1) : autoPage
  const [first, last] = pageRange(page, shownStandings.length)
  const pageLabel = pages > 1 ? `P${first}-${last} of ${shownStandings.length}` : null

  return (
    <div className="stage">
      <div className="tv">
        {PIXELS.map((style, i) => (
          <div key={i} className="px" style={style} />
        ))}
        <header>
          <div className="ttl">
            <small>Simulator challenge · live timing</small>Fastest lap
          </div>
          <div className="logos">
            <img src={c5Logo} alt="C5 Alliance" />
            <div className="sep" />
            <img className="wide" src={stemLogo} alt="STEM Racing" />
            <div className="sep" />
            <img className="wide" src={digitalJerseyLogo} alt="Digital Jersey" />
          </div>
        </header>
        <main>
          <Tower standings={shownStandings} highlight={feed.highlight} page={page} />
          <SidePanel laps={shownLaps} standings={shownStandings} pageLabel={pageLabel} />
        </main>
        <OnTrack name={snapshot?.screen.onTrack ?? null} standings={liveStandings} />
        <HeadToHead
          on={scene === 'h2h'}
          nameA={snapshot?.screen.h2hA ?? null}
          nameB={snapshot?.screen.h2hB ?? null}
          standings={liveStandings}
        />
        <Podium on={scene === 'podium'} standings={liveStandings} />
        <Takeover lap={feed.takeover} />
        {error && <div className="offline">Connection lost, retrying</div>}
      </div>
    </div>
  )
}
