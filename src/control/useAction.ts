import { useCallback, useState } from 'react'
import { errorMessage } from '../data/store'

export interface Action {
  busy: boolean
  error: string | null
  /** Runs the task; resolves true on success. Failures land in `error` for display. */
  run: (task: () => Promise<void>) => Promise<boolean>
}

/** Tracks busy/error state for operator actions so every failure is shown, never swallowed. */
export function useAction(): Action {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (task: () => Promise<void>): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      await task()
      return true
    } catch (cause: unknown) {
      setError(errorMessage(cause))
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, error, run }
}
