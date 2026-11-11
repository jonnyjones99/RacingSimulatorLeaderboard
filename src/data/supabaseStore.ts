import { createClient } from '@supabase/supabase-js'
import type { Lap } from '../lib/standings'
import { getOperatorPin } from './operatorPin'
import { DEFAULT_SCREEN, SCENES, validateLapInput, type RaceStore, type Scene, type ScreenPatch, type ScreenState } from './store'

const SCREEN_ROW_ID = 1

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const textOrNull = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

// Reads use the public key directly. Writes go through database functions that check the
// operator passphrase, because the public key is visible to anyone who opens the site.

// Rows come from the network: keep only ones with the shape we expect.
function toLap(row: unknown): Lap | null {
  if (!isRecord(row)) return null
  const { id, driver_name: driverName, time_ms: timeMs, created_at: createdAt } = row
  if (typeof id !== 'string' || typeof driverName !== 'string' || typeof createdAt !== 'string') return null
  if (typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs <= 0) return null
  return { id, driverName, timeMs, createdAt }
}

function toScreen(row: unknown): ScreenState {
  if (!isRecord(row)) return DEFAULT_SCREEN
  const scene = SCENES.includes(row.scene as Scene) ? (row.scene as Scene) : 'board'
  return {
    scene,
    onTrack: textOrNull(row.on_track),
    h2hA: textOrNull(row.h2h_a),
    h2hB: textOrNull(row.h2h_b),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : DEFAULT_SCREEN.updatedAt,
  }
}

function toScreenRow(patch: ScreenPatch): Record<string, unknown> {
  return {
    ...(patch.scene !== undefined && { scene: patch.scene }),
    ...(patch.onTrack !== undefined && { on_track: patch.onTrack }),
    ...(patch.h2hA !== undefined && { h2h_a: patch.h2hA }),
    ...(patch.h2hB !== undefined && { h2h_b: patch.h2hB }),
  }
}

export function createSupabaseStore(url: string, anonKey: string): RaceStore {
  const client = createClient(url, anonKey)

  return {
    shared: true,

    async load() {
      const [laps, screen] = await Promise.all([
        client.from('laps').select('id, driver_name, time_ms, created_at').order('created_at'),
        client.from('screen_state').select('*').eq('id', SCREEN_ROW_ID).maybeSingle(),
      ])
      if (laps.error) throw new Error(`Could not load laps: ${laps.error.message}`)
      if (screen.error) throw new Error(`Could not load screen state: ${screen.error.message}`)
      return {
        laps: (laps.data ?? []).map(toLap).filter((lap): lap is Lap => lap !== null),
        screen: toScreen(screen.data),
      }
    },

    async verifyPin(pin) {
      const { data, error } = await client.rpc('check_operator_pin', { p_pin: pin })
      if (error) throw new Error(`Could not check passphrase: ${error.message}`)
      return data === true
    },

    subscribe(onChange) {
      const channel = client
        .channel('race')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'laps' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'screen_state' }, onChange)
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },

    async addLap(driverName, timeMs) {
      const lap = validateLapInput(driverName, timeMs)
      const { error } = await client.rpc('add_lap', { p_pin: getOperatorPin(), p_driver_name: lap.driverName, p_time_ms: lap.timeMs })
      if (error) throw new Error(`Could not save lap: ${error.message}`)
    },

    async deleteLap(id) {
      const { error } = await client.rpc('delete_lap', { p_pin: getOperatorPin(), p_lap_id: id })
      if (error) throw new Error(`Could not delete lap: ${error.message}`)
    },

    async setScreen(patch) {
      const { error } = await client.rpc('set_screen', { p_pin: getOperatorPin(), p_patch: toScreenRow(patch) })
      if (error) throw new Error(`Could not update screen: ${error.message}`)
    },
  }
}
