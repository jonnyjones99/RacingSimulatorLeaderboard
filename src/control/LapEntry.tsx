import { useState, type FormEvent } from 'react'
import { MAX_NAME_LENGTH } from '../data/store'
import type { Race } from '../data/useRace'
import { displayName, driverKey } from '../lib/standings'
import { formatLapTime, parseLapTime } from '../lib/time'
import { useAction } from './useAction'

interface LapEntryProps {
  race: Race
  onTrack: string | null
}

/** One card for a run: name the driver (optionally announce them), then enter their time. */
export function LapEntry({ race, onTrack }: LapEntryProps) {
  // null = operator has not typed, so follow whoever is on track
  const [typedName, setTypedName] = useState<string | null>(null)
  const [time, setTime] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const action = useAction()

  const name = typedName ?? onTrack ?? ''
  const cleanName = displayName(name)
  const timeMs = parseLapTime(time)
  const isOnTrack = onTrack !== null && driverKey(onTrack) === driverKey(name)

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!cleanName || timeMs === null) return
    const ok = await action.run(() => race.addLap(cleanName, timeMs))
    if (!ok) return
    // separate step: if hiding the banner fails the lap is still saved, so no retry can duplicate it
    if (isOnTrack) void action.run(() => race.setScreen({ onTrack: null }))
    setSaved(`Saved: ${cleanName} ${formatLapTime(timeMs)}`)
    setTypedName(null)
    setTime('')
  }

  const toggleOnTrack = (): void => {
    void action.run(() => race.setScreen({ onTrack: isOnTrack ? null : cleanName }))
  }

  return (
    <form className="panel" onSubmit={(event) => void submit(event)}>
      <h2>Run</h2>
      <label htmlFor="driver">Driver name</label>
      <input
        id="driver"
        list="drivers"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="off"
        autoCapitalize="words"
        placeholder="e.g. Priya Nair"
        onChange={(event) => {
          setTypedName(event.target.value)
          setSaved(null)
        }}
      />
      <button type="button" className={isOnTrack ? 'active' : ''} disabled={!cleanName || action.busy} onClick={toggleOnTrack}>
        {isOnTrack ? 'On track now: tap to hide banner' : 'Show "On track" banner'}
      </button>

      <label htmlFor="time">Lap time</label>
      <input
        id="time"
        className="time-input"
        value={time}
        inputMode="decimal"
        autoComplete="off"
        placeholder="1.22.115"
        onChange={(event) => {
          setTime(event.target.value)
          setSaved(null)
        }}
      />
      <p className="hint">
        {time === '' ? 'Minutes, seconds, thousandths. Dots or colon both work.' : timeMs === null ? 'Not a lap time yet (minimum 10 seconds)' : `= ${formatLapTime(timeMs)}`}
      </p>
      <button type="submit" className="primary" disabled={!cleanName || timeMs === null || action.busy}>
        {action.busy ? 'Saving' : 'Submit lap'}
      </button>
      {action.error && <p className="error" role="alert">{action.error}</p>}
      {saved && <p className="ok" role="status">{saved}</p>}
    </form>
  )
}
