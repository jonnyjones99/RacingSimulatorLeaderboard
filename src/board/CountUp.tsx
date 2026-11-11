import { useEffect, useState } from 'react'
import { formatLapTime } from '../lib/time'

const DURATION_MS = 1100
/** How far below the final time the count starts. */
const RUN_UP_MS = 5000
const PLACEHOLDER = '-:--.---'

interface CountUpProps {
  ms: number
  /** false shows the final time with no animation */
  run: boolean
  delayMs?: number
}

/** Lap time that ticks up to its value, for reveals. Remount (change key) to replay. */
export function CountUp({ ms, run, delayMs = 0 }: CountUpProps) {
  const [value, setValue] = useState<number | null>(null)

  useEffect(() => {
    if (!run) return
    let frame = 0
    const start = performance.now() + delayMs
    const tick = (now: number): void => {
      const progress = Math.min(1, Math.max(0, (now - start) / DURATION_MS))
      if (now >= start) setValue(Math.max(0, Math.round(ms - (1 - progress) ** 2 * RUN_UP_MS)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ms, run, delayMs])

  if (!run) return formatLapTime(ms)
  return value === null ? PLACEHOLDER : formatLapTime(value)
}
