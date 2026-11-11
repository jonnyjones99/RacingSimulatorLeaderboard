// One colour per driver, stable all day. Skips purple/green/yellow/red (they mean
// fastest / personal best / slower / dropped) and white (position boxes).
const PALETTE = ['#028fd6', '#e6007e', '#f7931e', '#00d2be', '#ff6a3d', '#7bdcff', '#ff8fd0', '#5b6cff', '#00a37a', '#ffb38a', '#9fb4ff']

export function colourFor(driverKey: string): string {
  let hash = 0
  for (const char of driverKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}
