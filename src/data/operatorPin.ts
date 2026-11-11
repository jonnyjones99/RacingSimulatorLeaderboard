// The operator passphrase is typed once per device and kept in this browser only.
// It is checked by the database on every write; it is never part of the site's code.
const STORAGE_KEY = 'racing-leaderboard-operator'

export function getOperatorPin(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return '' // storage blocked: writes will be refused and the operator is asked again
  }
}

export function setOperatorPin(pin: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, pin)
  } catch {
    // storage blocked: nothing to do, the gate will simply ask again next visit
  }
}

export function clearOperatorPin(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage blocked: nothing was stored
  }
}
