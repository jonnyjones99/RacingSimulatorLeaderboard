import { useState } from 'react'
import { MAX_NAME_LENGTH, type ScreenState } from '../data/store'
import type { Race } from '../data/useRace'
import { displayName, driverKey } from '../lib/standings'
import { useAction } from './useAction'

interface ScreenControlsProps {
  race: Race
  screen: ScreenState
}

/** Remote control for what the big screen shows. */
export function ScreenControls({ race, screen }: ScreenControlsProps) {
  const [nameA, setNameA] = useState(screen.h2hA ?? '')
  const [nameB, setNameB] = useState(screen.h2hB ?? '')
  const action = useAction()

  const a = displayName(nameA)
  const b = displayName(nameB)
  const canDuel = a !== '' && b !== '' && driverKey(a) !== driverKey(b)

  return (
    <section className="panel">
      <h2>Big screen</h2>
      <div className="row-buttons">
        <button
          type="button"
          className={screen.scene === 'board' ? 'active' : ''}
          disabled={action.busy}
          onClick={() => void action.run(() => race.setScreen({ scene: 'board' }))}
        >
          Leaderboard
        </button>
        <button
          type="button"
          className={screen.scene === 'podium' ? 'active' : ''}
          disabled={action.busy}
          onClick={() => void action.run(() => race.setScreen({ scene: 'podium' }))}
        >
          Podium
        </button>
      </div>

      <label htmlFor="h2h-a">Head to head</label>
      <div className="versus">
        <input id="h2h-a" list="drivers" value={nameA} maxLength={MAX_NAME_LENGTH} placeholder="Driver" autoComplete="off" onChange={(event) => setNameA(event.target.value)} />
        <span>vs</span>
        <input aria-label="Second driver" list="drivers" value={nameB} maxLength={MAX_NAME_LENGTH} placeholder="Driver or newcomer" autoComplete="off" onChange={(event) => setNameB(event.target.value)} />
      </div>
      <button
        type="button"
        className={screen.scene === 'h2h' ? 'active' : ''}
        disabled={!canDuel || action.busy}
        onClick={() => void action.run(() => race.setScreen({ scene: 'h2h', h2hA: a, h2hB: b }))}
      >
        Show head to head
      </button>
      <p className="hint">Type a new name to set up a challenge: screen shows the time to beat until their lap is in.</p>
      {action.error && <p className="error" role="alert">{action.error}</p>}
    </section>
  )
}
