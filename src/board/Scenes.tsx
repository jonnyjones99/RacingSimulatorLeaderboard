import { colourFor } from '../lib/colour'
import { displayName, driverKey, type Lap, type Standing } from '../lib/standings'
import { formatLapTime } from '../lib/time'
import { CountUp } from './CountUp'

const NO_TIME = 'NO TIME'
/** Count-ups wait for the panels to slide in. */
const REVEAL_DELAY_MS = 900

const find = (standings: Standing[], name: string | null): Standing | undefined =>
  name ? standings.find((s) => s.key === driverKey(name)) : undefined

// ---------- Head to head ----------

interface HeadToHeadProps {
  on: boolean
  nameA: string | null
  nameB: string | null
  standings: Standing[]
}

interface DuelSideProps {
  side: 'left' | 'right'
  name: string
  standing: Standing | undefined
  rival: Standing | undefined
  on: boolean
}

function DuelSide({ side, name, standing, rival, on }: DuelSideProps) {
  const ahead = standing !== undefined && (rival === undefined || standing.bestMs < rival.bestMs)
  const note = !standing ? 'Challenger' : !rival ? 'Time to beat' : ahead ? 'Ahead' : 'Chasing'
  return (
    <div className={`dr ${side}${ahead && rival ? ' win' : ''}`} style={{ borderColor: colourFor(driverKey(name)) }}>
      <div className="dpos">{standing ? `P${standing.position}` : 'NEW'}</div>
      <div className="dname">{standing?.name ?? displayName(name)}</div>
      <div className="dtime">
        {standing ? <CountUp key={`${on}-${standing.bestMs}`} ms={standing.bestMs} run={on} delayMs={REVEAL_DELAY_MS} /> : NO_TIME}
      </div>
      <div className="druns">{note}</div>
    </div>
  )
}

export function HeadToHead({ on, nameA, nameB, standings }: HeadToHeadProps) {
  const a = find(standings, nameA)
  const b = find(standings, nameB)
  const winner = a && b ? (a.bestMs <= b.bestMs ? a : b) : undefined
  const target = a ?? b

  return (
    <div className={`scene${on ? ' on' : ''}`} aria-hidden={!on}>
      <div className="sc-ttl">
        <small>Rivalry check</small>Head to head
      </div>
      {/* keyed by pairing so a new matchup replays the entrance */}
      <div className="duel" key={`${nameA}|${nameB}`}>
        <DuelSide side="left" name={nameA ?? ''} standing={a} rival={b} on={on} />
        <div className="vs">VS</div>
        <DuelSide side="right" name={nameB ?? ''} standing={b} rival={a} on={on} />
      </div>
      <div className="gapline" key={`${winner?.key}-${a?.bestMs}-${b?.bestMs}`}>
        {winner && a && b ? (
          <>
            <span>{winner.name}</span>
            <b>{(Math.abs(a.bestMs - b.bestMs) / 1000).toFixed(3)}s</b>
            <span>ahead</span>
          </>
        ) : target ? (
          <>
            <span>Time to beat</span>
            <b>{formatLapTime(target.bestMs)}</b>
          </>
        ) : (
          <span>No times set yet</span>
        )}
      </div>
    </div>
  )
}

// ---------- Podium ----------

interface PodiumProps {
  on: boolean
  standings: Standing[]
}

// visual order: P2, P1, P3
const PODIUM_ORDER = [1, 0, 2]

export function Podium({ on, standings }: PodiumProps) {
  return (
    <div className={`scene${on ? ' on' : ''}`} aria-hidden={!on}>
      <div className="sc-ttl">
        <small>Final classification</small>Podium
      </div>
      <div className="pods">
        {PODIUM_ORDER.map((index) => {
          const standing = standings[index]
          return (
            <div key={index} className={`pod p${index + 1}${standing ? '' : ' vacant'}`}>
              <div className="n">{index + 1}</div>
              <div className="pn">{standing?.name ?? ''}</div>
              <div className="pt">{standing ? formatLapTime(standing.bestMs) : ''}</div>
            </div>
          )
        })}
      </div>
      <div />
    </div>
  )
}

// ---------- On track now (lower third over the board) ----------

interface OnTrackProps {
  name: string | null
  standings: Standing[]
}

interface Target {
  label: string
  ms: number
}

function targetFor(standing: Standing | undefined, standings: Standing[]): Target | null {
  if (standing?.position === 1) return null
  if (standing) return { label: `To take P${standing.position - 1}`, ms: standings[standing.position - 2].bestMs }
  const podium = standings[Math.min(2, standings.length - 1)]
  return podium ? { label: `To take P${podium.position}`, ms: podium.bestMs } : null
}

export function OnTrack({ name, standings }: OnTrackProps) {
  const standing = find(standings, name)
  const target = targetFor(standing, standings)
  const leader = standings[0]

  return (
    <div className={`ontrack${name ? ' on' : ''}`} aria-hidden={!name}>
      <div className="ot-tag">On track</div>
      <div className="ot-name">{standing?.name ?? (name ? displayName(name) : '')}</div>
      <div className="ot-cell">
        <span>Personal best</span>
        <b>{standing ? formatLapTime(standing.bestMs) : 'FIRST RUN'}</b>
      </div>
      {target && (
        <div className="ot-cell">
          <span>{target.label}</span>
          <b>{formatLapTime(target.ms)}</b>
        </div>
      )}
      {leader && (
        <div className="ot-cell fl">
          <span>Fastest lap</span>
          <b>{formatLapTime(leader.bestMs)}</b>
        </div>
      )}
    </div>
  )
}

// ---------- New fastest lap takeover ----------

export function Takeover({ lap }: { lap: Lap | null }) {
  return (
    <div className={`takeover${lap ? ' go' : ''}`} aria-hidden={!lap}>
      <div className="band">
        <div className="a">New fastest lap</div>
        <div className="b">{lap ? displayName(lap.driverName) : ''}</div>
        <div className="c">{lap ? formatLapTime(lap.timeMs) : ''}</div>
      </div>
    </div>
  )
}
