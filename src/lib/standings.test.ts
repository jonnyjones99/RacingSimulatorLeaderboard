import { describe, expect, it } from 'vitest'
import { buildStandings, describeLap, driverKey, latestLap, type Lap } from './standings'

let seq = 0
const lap = (driverName: string, timeMs: number): Lap => {
  seq += 1
  return { id: `lap-${seq}`, driverName, timeMs, createdAt: new Date(2026, 0, 1, 12, 0, seq).toISOString() }
}

describe('driverKey', () => {
  it('ignores case and extra whitespace', () => {
    expect(driverKey('  Priya   Nair ')).toBe(driverKey('priya nair'))
  })
})

describe('buildStandings', () => {
  it('returns empty for no laps', () => {
    expect(buildStandings([])).toEqual([])
  })

  it('keeps one row per driver with best time and run count', () => {
    const standings = buildStandings([lap('Sophie', 82000), lap('Marcus', 81000), lap('sophie ', 80500), lap('Sophie', 83000)])
    expect(standings.map((s) => [s.position, s.name, s.bestMs, s.runs])).toEqual([
      [1, 'Sophie', 80500, 3],
      [2, 'Marcus', 81000, 1],
    ])
  })

  it('breaks ties in favour of whoever set the time first', () => {
    const standings = buildStandings([lap('First', 80000), lap('Second', 80000)])
    expect(standings.map((s) => s.name)).toEqual(['First', 'Second'])
  })

  it('does not mutate its input', () => {
    const laps = [lap('B', 2000), lap('A', 1000)]
    const copy = [...laps]
    buildStandings(laps)
    expect(laps).toEqual(copy)
  })
})

describe('describeLap', () => {
  const prior = [lap('Sophie', 81000), lap('Marcus', 82000), lap('Priya', 83000)]

  it('flags the first lap of the day as first', () => {
    expect(describeLap([], lap('Sophie', 81000))).toMatchObject({ kind: 'first', position: 1, deltaMs: null })
  })

  it('flags a new overall best as fastest, with delta to old leader', () => {
    const verdict = describeLap(prior, lap('Priya', 80600))
    expect(verdict).toMatchObject({ kind: 'fastest', position: 1, gained: 2, deltaMs: -400 })
    expect(verdict.dropped.sort()).toEqual([driverKey('Marcus'), driverKey('Sophie')])
  })

  it('flags a leader beating their own time as fastest', () => {
    expect(describeLap(prior, lap('Sophie', 80900))).toMatchObject({ kind: 'fastest', gained: 0, dropped: [] })
  })

  it('flags a new driver as first, placed by time', () => {
    const verdict = describeLap(prior, lap('Tom', 81500))
    expect(verdict).toMatchObject({ kind: 'first', position: 2, deltaMs: null })
    expect(verdict.dropped.sort()).toEqual([driverKey('Marcus'), driverKey('Priya')])
  })

  it('flags an improvement as pb with places gained', () => {
    expect(describeLap(prior, lap('Priya', 81500))).toMatchObject({ kind: 'pb', position: 2, gained: 1, deltaMs: -1500 })
  })

  it('flags a slower lap as slower with nothing moving', () => {
    expect(describeLap(prior, lap('Marcus', 82700))).toMatchObject({ kind: 'slower', position: 2, gained: 0, deltaMs: 700, dropped: [] })
  })
})

describe('latestLap', () => {
  it('returns the most recently created lap, or null', () => {
    expect(latestLap([])).toBeNull()
    const laps = [lap('A', 1000), lap('B', 2000)]
    expect(latestLap([laps[1], laps[0]])).toBe(laps[1])
  })
})
