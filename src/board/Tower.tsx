import type { CSSProperties } from 'react'
import { colourFor } from '../lib/colour'
import { slotOf } from '../lib/paging'
import { driverKey, type Standing } from '../lib/standings'
import { formatGap, formatLapTime } from '../lib/time'
import type { Highlight } from './boardFeed'

interface TowerProps {
  standings: Standing[]
  highlight: Highlight | null
  page: number
}

interface Chip {
  text: string
  down: boolean
}

const PODIUM_CLASSES = ['p1', 'p2', 'p3']
/** Stagger between rows when a page wipes in or out. */
const WIPE_STEP_MS = 45

function chipFor(key: string, highlight: Highlight | null): Chip | null {
  if (!highlight) return null
  const { lap, verdict } = highlight
  if (verdict.dropped.includes(key)) return { text: '▼ 1', down: true }
  if (key !== driverKey(lap.driverName) || verdict.kind === 'slower') return null
  if (verdict.kind === 'first') return { text: 'NEW', down: false }
  return { text: verdict.gained > 0 ? `▲ ${verdict.gained}` : 'PB', down: false }
}

export function Tower({ standings, highlight, page }: TowerProps) {
  const leader = standings[0]
  // Render in a fixed order so React never moves DOM nodes: moving a node cancels its slide.
  const rows = [...standings].sort((a, b) => a.key.localeCompare(b.key))

  return (
    <div className="tower">
      {rows.map((standing) => {
        const { slot, visible } = slotOf(standing.position, page)
        const chip = chipFor(standing.key, highlight)
        const lit = chip !== null && !chip.down
        const classes = ['row', PODIUM_CLASSES[standing.position - 1], !visible && 'hidden', lit && 'lit'].filter(Boolean).join(' ')
        const style = { top: `${slot * 10}%`, '--wipe': `${slot * WIPE_STEP_MS}ms` } as CSSProperties
        return (
          <div key={standing.key} className={classes} style={style} aria-hidden={!visible}>
            <div className="pos">{standing.position}</div>
            <div className="bar" style={{ background: colourFor(standing.key) }} />
            <div className="name">
              {standing.name}
              {chip && (
                <span key={highlight?.lap.id} className={chip.down ? 'chip down' : 'chip'}>
                  {chip.text}
                </span>
              )}
            </div>
            <div className="time">{formatLapTime(standing.bestMs)}</div>
            <div className="gap">{standing === leader || !leader ? 'LEADER' : formatGap(standing.bestMs - leader.bestMs)}</div>
          </div>
        )
      })}
      {standings.length === 0 && <div className="empty">No laps yet. Who is first?</div>}
    </div>
  )
}
