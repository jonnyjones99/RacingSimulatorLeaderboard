import { DEFAULT_SCREEN, validateLapInput, type RaceSnapshot, type RaceStore } from './store'

// Demo store used when Supabase is not configured. Data lives in this browser only;
// other tabs on the same machine stay in sync through the storage event.
const STORAGE_KEY = 'racing-leaderboard-demo'
const EMPTY: RaceSnapshot = { laps: [], screen: DEFAULT_SCREEN }

function read(): RaceSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<RaceSnapshot>
    return { laps: Array.isArray(parsed.laps) ? parsed.laps : [], screen: { ...DEFAULT_SCREEN, ...parsed.screen } }
  } catch {
    // Corrupt or blocked storage: demo data is disposable, start clean.
    return EMPTY
  }
}

export function createLocalStore(): RaceStore {
  const listeners = new Set<() => void>()

  const write = (next: RaceSnapshot): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    listeners.forEach((listener) => listener())
  }

  return {
    shared: false,

    async load() {
      return read()
    },

    // demo data is local and disposable: nothing to protect
    async verifyPin() {
      return true
    },

    subscribe(onChange) {
      const onStorage = (event: StorageEvent): void => {
        if (event.key === STORAGE_KEY) onChange()
      }
      listeners.add(onChange)
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(onChange)
        window.removeEventListener('storage', onStorage)
      }
    },

    async addLap(driverName, timeMs) {
      const lap = validateLapInput(driverName, timeMs)
      const current = read()
      write({ ...current, laps: [...current.laps, { id: crypto.randomUUID(), ...lap, createdAt: new Date().toISOString() }] })
    },

    async deleteLap(id) {
      const current = read()
      write({ ...current, laps: current.laps.filter((lap) => lap.id !== id) })
    },

    async setScreen(patch) {
      const current = read()
      write({ ...current, screen: { ...current.screen, ...patch, updatedAt: new Date().toISOString() } })
    },
  }
}
