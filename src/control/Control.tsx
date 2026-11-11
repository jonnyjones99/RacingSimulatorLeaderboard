import { useState, type FormEvent } from 'react'
import { clearOperatorPin, getOperatorPin, setOperatorPin } from '../data/operatorPin'
import type { Race } from '../data/useRace'
import { buildStandings, compareIso, displayName, type Lap } from '../lib/standings'
import { formatLapTime } from '../lib/time'
import './control.css'
import { LapEntry } from './LapEntry'
import { ScreenControls } from './ScreenControls'
import { useAction } from './useAction'

const RECENT_LAPS = 20

/** Asks for the operator passphrase and has the database confirm it before unlocking. */
function PinGate({ race, onUnlock }: { race: Race; onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const action = useAction()

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setWrong(false)
    let accepted = false
    const checked = await action.run(async () => {
      accepted = await race.verifyPin(pin)
    })
    if (!checked) return
    if (!accepted) {
      setWrong(true)
      return
    }
    setOperatorPin(pin)
    onUnlock()
  }

  return (
    <form className="panel" onSubmit={(event) => void submit(event)}>
      <h2>Operator passphrase</h2>
      <input aria-label="Operator passphrase" type="password" autoFocus autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} />
      <button type="submit" className="primary" disabled={pin === '' || action.busy}>
        {action.busy ? 'Checking' : 'Unlock'}
      </button>
      {wrong && <p className="error" role="alert">Wrong passphrase</p>}
      {action.error && <p className="error" role="alert">{action.error}</p>}
    </form>
  )
}

function RecentLaps({ race, laps }: { race: Race; laps: Lap[] }) {
  const action = useAction()
  const recent = [...laps].sort((a, b) => compareIso(b.createdAt, a.createdAt)).slice(0, RECENT_LAPS)

  const remove = (lap: Lap): void => {
    if (!window.confirm(`Delete ${displayName(lap.driverName)} ${formatLapTime(lap.timeMs)}?`)) return
    void action.run(() => race.deleteLap(lap.id))
  }

  return (
    <section className="panel">
      <h2>Recent laps</h2>
      {recent.length === 0 && <p className="hint">No laps yet.</p>}
      <ul className="laps">
        {recent.map((lap) => (
          <li key={lap.id}>
            <span>{displayName(lap.driverName)}</span>
            <b>{formatLapTime(lap.timeMs)}</b>
            <button type="button" className="danger" disabled={action.busy} onClick={() => remove(lap)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {action.error && <p className="error" role="alert">{action.error}</p>}
    </section>
  )
}

export function Control({ race }: { race: Race }) {
  const { snapshot, error, shared } = race
  // demo mode has nothing to protect; shared mode needs the passphrase the database checks
  const [unlocked, setUnlocked] = useState(() => !shared || getOperatorPin() !== '')

  const lock = (): void => {
    clearOperatorPin()
    setUnlocked(false)
  }

  if (!unlocked) {
    return (
      <div className="control">
        <PinGate race={race} onUnlock={() => setUnlocked(true)} />
      </div>
    )
  }

  return (
    <div className="control">
      <header>
        <h1>Race control</h1>
        <a href="#/">Open big screen</a>
        {shared && (
          <button type="button" className="link" onClick={lock}>
            Lock
          </button>
        )}
      </header>
      {!shared && <p className="banner">Demo mode: Supabase not configured, laps stay on this device only.</p>}
      {error && <p className="banner bad" role="alert">Connection problem: {error}</p>}
      {!snapshot ? (
        <p className="hint">Loading</p>
      ) : (
        <>
          <datalist id="drivers">
            {buildStandings(snapshot.laps).map((standing) => (
              <option key={standing.key} value={standing.name} />
            ))}
          </datalist>
          <LapEntry race={race} onTrack={snapshot.screen.onTrack} />
          <ScreenControls race={race} screen={snapshot.screen} />
          <RecentLaps race={race} laps={snapshot.laps} />
        </>
      )}
    </div>
  )
}
