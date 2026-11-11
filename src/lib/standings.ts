export interface Lap {
  id: string
  driverName: string
  timeMs: number
  createdAt: string
}

export interface Standing {
  key: string
  name: string
  bestMs: number
  runs: number
  position: number
}

export type LapKind = 'fastest' | 'first' | 'pb' | 'slower'

export interface LapVerdict {
  kind: LapKind
  /** fastest: vs old leader. pb/slower: vs own previous best. first: null. */
  deltaMs: number | null
  position: number
  gained: number
  /** keys of drivers pushed down by this lap */
  dropped: string[]
}

/** Driver identity is their name, ignoring case and spacing. */
export function driverKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function displayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Orders ISO timestamps by instant; string order breaks when fractional seconds are omitted. */
export function compareIso(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b)
}

interface Best {
  name: string
  bestMs: number
  bestAt: string
  runs: number
}

export function buildStandings(laps: readonly Lap[]): Standing[] {
  const byDriver = new Map<string, Best>()
  const ordered = [...laps].sort((a, b) => compareIso(a.createdAt, b.createdAt))
  for (const lap of ordered) {
    const key = driverKey(lap.driverName)
    const current = byDriver.get(key)
    const improved = !current || lap.timeMs < current.bestMs
    byDriver.set(key, {
      name: current?.name ?? displayName(lap.driverName),
      bestMs: improved ? lap.timeMs : current.bestMs,
      bestAt: improved ? lap.createdAt : current.bestAt,
      runs: (current?.runs ?? 0) + 1,
    })
  }
  return [...byDriver.entries()]
    .sort(([, a], [, b]) => a.bestMs - b.bestMs || compareIso(a.bestAt, b.bestAt))
    .map(([key, best], index) => ({ key, name: best.name, bestMs: best.bestMs, runs: best.runs, position: index + 1 }))
}

/** What a new lap did to the standings that existed before it. */
export function describeLap(prior: readonly Lap[], lap: Lap): LapVerdict {
  const before = buildStandings(prior)
  const after = buildStandings([...prior, lap])
  const key = driverKey(lap.driverName)
  const mineBefore = before.find((s) => s.key === key)
  const mineAfter = after.find((s) => s.key === key)
  const position = mineAfter?.position ?? after.length
  const leader = before[0]

  const beforePositions = new Map(before.map((s) => [s.key, s.position]))
  const dropped = after
    .filter((s) => s.key !== key && s.position > (beforePositions.get(s.key) ?? s.position))
    .map((s) => s.key)
  const gained = Math.max(0, (mineBefore?.position ?? before.length + 1) - position)

  if (leader && lap.timeMs < leader.bestMs) {
    return { kind: 'fastest', deltaMs: lap.timeMs - leader.bestMs, position, gained: mineBefore ? gained : 0, dropped }
  }
  if (!mineBefore) return { kind: 'first', deltaMs: null, position, gained: 0, dropped }
  const deltaMs = lap.timeMs - mineBefore.bestMs
  return { kind: deltaMs < 0 ? 'pb' : 'slower', deltaMs, position, gained, dropped }
}

export function latestLap(laps: readonly Lap[]): Lap | null {
  return laps.reduce<Lap | null>((latest, lap) => (!latest || compareIso(lap.createdAt, latest.createdAt) > 0 ? lap : latest), null)
}
