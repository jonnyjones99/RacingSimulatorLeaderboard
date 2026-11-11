const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MAX_LAP_MS = 60 * MS_PER_MINUTE
/** Anything quicker is a typo, e.g. "1.22" typed for 1:22 would read as 1.22 seconds. */
export const MIN_LAP_MS = 10 * MS_PER_SECOND

// Accepts m:ss.mmm, ss.mmm, m:ss, plus "." or ":" used as either separator (phone keyboards).
const WITH_MINUTES = /^(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,3}))?$/
const SECONDS_ONLY = /^(\d{1,4})\.(\d{1,3})$/

const millis = (fraction: string | undefined): number => Number((fraction ?? '').padEnd(3, '0'))

/** Parses a typed lap time into milliseconds. Returns null when it is not a valid lap time. */
export function parseLapTime(input: string): number | null {
  const text = input.trim()
  const secondsOnly = SECONDS_ONLY.exec(text)
  const withMinutes = secondsOnly ? null : WITH_MINUTES.exec(text)

  let total: number
  if (secondsOnly) {
    total = Number(secondsOnly[1]) * MS_PER_SECOND + millis(secondsOnly[2])
  } else if (withMinutes) {
    const seconds = Number(withMinutes[2])
    if (seconds >= 60) return null
    total = Number(withMinutes[1]) * MS_PER_MINUTE + seconds * MS_PER_SECOND + millis(withMinutes[3])
  } else {
    return null
  }
  return total >= MIN_LAP_MS && total < MAX_LAP_MS ? total : null
}

export function formatLapTime(ms: number): string {
  const minutes = Math.floor(ms / MS_PER_MINUTE)
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND)
  const rest = ms % MS_PER_SECOND
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(rest).padStart(3, '0')}`
}

/** Signed gap in seconds, e.g. +0.523 or -0.312. */
export function formatGap(ms: number): string {
  return `${ms < 0 ? '-' : '+'}${(Math.abs(ms) / MS_PER_SECOND).toFixed(3)}`
}
