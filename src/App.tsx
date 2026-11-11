import { useSyncExternalStore } from 'react'
import { Board } from './board/Board'
import { Control } from './control/Control'
import { useRace } from './data/useRace'

// Hash routing: GitHub Pages serves one HTML file, so "#/control" works where "/control" would 404.
const CONTROL_HASH = '#/control'

const subscribeToHash = (onChange: () => void): (() => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function App() {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash)
  const race = useRace()
  return hash === CONTROL_HASH ? <Control race={race} /> : <Board race={race} />
}

export default App
