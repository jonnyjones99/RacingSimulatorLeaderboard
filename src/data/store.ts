import { displayName, type Lap } from '../lib/standings'
import { MAX_LAP_MS } from '../lib/time'

export type Scene = 'board' | 'podium' | 'h2h'
export const SCENES: readonly Scene[] = ['board', 'podium', 'h2h']

/** What the big screen is showing. Stored with the laps so a refresh restores it. */
export interface ScreenState {
  scene: Scene
  onTrack: string | null
  h2hA: string | null
  h2hB: string | null
  updatedAt: string
}

export type ScreenPatch = Partial<Omit<ScreenState, 'updatedAt'>>

export interface RaceSnapshot {
  laps: Lap[]
  screen: ScreenState
}

export interface RaceStore {
  /** true when data is shared between devices, false for the on-device demo store */
  readonly shared: boolean
  load(): Promise<RaceSnapshot>
  /** true when the passphrase is accepted for writes */
  verifyPin(pin: string): Promise<boolean>
  subscribe(onChange: () => void): () => void
  addLap(driverName: string, timeMs: number): Promise<void>
  deleteLap(id: string): Promise<void>
  setScreen(patch: ScreenPatch): Promise<void>
}

export const MAX_NAME_LENGTH = 40

export const DEFAULT_SCREEN: ScreenState = {
  scene: 'board',
  onTrack: null,
  h2hA: null,
  h2hB: null,
  updatedAt: new Date(0).toISOString(),
}

export interface LapInput {
  driverName: string
  timeMs: number
}

/** Shared guard for every store: throws a message fit to show the operator. */
export function validateLapInput(driverName: string, timeMs: number): LapInput {
  const name = displayName(driverName)
  if (name.length === 0) throw new Error('Driver name is required')
  if (name.length > MAX_NAME_LENGTH) throw new Error(`Driver name must be ${MAX_NAME_LENGTH} characters or fewer`)
  if (!Number.isInteger(timeMs) || timeMs <= 0 || timeMs >= MAX_LAP_MS) throw new Error('Lap time is not valid')
  return { driverName: name, timeMs }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error'
}
