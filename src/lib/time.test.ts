import { describe, expect, it } from 'vitest'
import { formatGap, formatLapTime, parseLapTime } from './time'

describe('parseLapTime', () => {
  it.each([
    ['1:22.115', 82115],
    ['0:59.900', 59900],
    ['82.115', 82115],
    ['1:22', 82000],
    ['1:22.5', 82500],
    ['1:22.05', 82050],
    ['1.22.115', 82115],
    ['1:22:115', 82115],
    ['  1:22.115  ', 82115],
    ['12:03.004', 723004],
  ])('parses %s', (input, expected) => {
    expect(parseLapTime(input)).toBe(expected)
  })

  it.each(['', 'abc', '1:72.000', '1:2:3:4', '-1:22.115', '1:22.1155', '0', '0:00.000', '61:00.000', ':22.1', '1.22', '9.999'])(
    'rejects %s',
    (input) => {
      expect(parseLapTime(input)).toBeNull()
    },
  )
})

describe('formatLapTime', () => {
  it('formats minutes, padded seconds and millis', () => {
    expect(formatLapTime(82115)).toBe('1:22.115')
    expect(formatLapTime(59900)).toBe('0:59.900')
    expect(formatLapTime(61004)).toBe('1:01.004')
  })

  it('round-trips with parseLapTime', () => {
    expect(parseLapTime(formatLapTime(723004))).toBe(723004)
  })
})

describe('formatGap', () => {
  it('formats as signed seconds', () => {
    expect(formatGap(523)).toBe('+0.523')
    expect(formatGap(61004)).toBe('+61.004')
    expect(formatGap(-312)).toBe('-0.312')
  })
})
