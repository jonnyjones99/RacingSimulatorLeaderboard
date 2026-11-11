import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLocalStore } from './localStore'
import { errorMessage, type RaceSnapshot, type RaceStore, type ScreenPatch } from './store'
import { createSupabaseStore } from './supabaseStore'

// ponytail: polling backs up realtime so a dropped socket or a table missing from the
// realtime publication still catches up. Two tiny queries per tick; drop if quota ever matters.
const POLL_MS = 10_000

const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

const store: RaceStore = supabaseUrl && supabaseAnonKey ? createSupabaseStore(supabaseUrl, supabaseAnonKey) : createLocalStore()

export interface Race {
  snapshot: RaceSnapshot | null
  /** last sync problem, cleared on the next successful load */
  error: string | null
  shared: boolean
  verifyPin: (pin: string) => Promise<boolean>
  addLap: (driverName: string, timeMs: number) => Promise<void>
  deleteLap: (id: string) => Promise<void>
  setScreen: (patch: ScreenPatch) => Promise<void>
}

export function useRace(): Race {
  const [snapshot, setSnapshot] = useState<RaceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  // refreshes overlap (realtime, polling, after actions): only the newest request may land
  const latestRequest = useRef(0)

  const refresh = useCallback(async (): Promise<void> => {
    const request = ++latestRequest.current
    try {
      const next = await store.load()
      if (request !== latestRequest.current) return
      // keep the old object when nothing changed so polling does not re-render the board
      setSnapshot((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next))
      setError(null)
    } catch (cause: unknown) {
      if (request !== latestRequest.current) return
      setError(errorMessage(cause))
    }
  }, [])

  useEffect(() => {
    const onChange = (): void => void refresh()
    onChange()
    const unsubscribe = store.subscribe(onChange)
    const timer = setInterval(onChange, POLL_MS)
    window.addEventListener('online', onChange)
    document.addEventListener('visibilitychange', onChange)
    return () => {
      unsubscribe()
      clearInterval(timer)
      window.removeEventListener('online', onChange)
      document.removeEventListener('visibilitychange', onChange)
    }
  }, [refresh])

  return useMemo(
    () => ({
      snapshot,
      error,
      shared: store.shared,
      verifyPin: (pin) => store.verifyPin(pin),
      // actions reject with an operator-friendly message; callers show it
      addLap: async (driverName, timeMs) => {
        await store.addLap(driverName, timeMs)
        await refresh()
      },
      deleteLap: async (id) => {
        await store.deleteLap(id)
        await refresh()
      },
      setScreen: async (patch) => {
        await store.setScreen(patch)
        await refresh()
      },
    }),
    [snapshot, error, refresh],
  )
}
