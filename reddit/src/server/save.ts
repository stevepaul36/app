// Willowvale's save checks, the same rules as the web server (server.js), so a save moves freely between them.
const SAVE_SCHEMA = 1
const isPlain = (v: unknown): v is {[k: string]: unknown} =>
  !!v && typeof v === 'object' && !Array.isArray(v)
function saneJson(
  v: unknown,
  depth: number = 0,
  budget: {n: number} = {n: 0},
): boolean {
  if (++budget.n > 20000 || depth > 8) return false
  if (v === null || typeof v === 'boolean') return true
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'string') return v.length <= 500
  if (Array.isArray(v))
    return v.length <= 2000 && v.every(x => saneJson(x, depth + 1, budget))
  if (isPlain(v))
    return Object.keys(v).every(
      k =>
        k.length <= 80 &&
        !k.startsWith('$') &&
        !k.includes('.') &&
        saneJson(v[k], depth + 1, budget),
    )
  return false
}
export const MAX_SAVE_BYTES = 600_000
export function cleanSave(body: unknown): {[k: string]: unknown} | null {
  const data = isPlain(body) ? body.data : null
  if (!isPlain(data) || !isPlain(data.progress)) return null
  if (
    Object.keys(data).some(k => !['progress', 'profile', 'schema'].includes(k))
  )
    return null
  if (data.profile != null && !isPlain(data.profile)) return null
  if (
    data.schema != null &&
    (!Number.isInteger(data.schema) ||
      (data.schema as number) < 1 ||
      (data.schema as number) > SAVE_SCHEMA)
  )
    return null
  if (!saneJson(data)) return null
  const p = data.progress
  const coins = Number(p.coins)
  if (!Number.isFinite(coins) || coins < 0 || coins > 10_000_000) return null
  if (p.clock != null && (typeof p.clock !== 'number' || p.clock < 0))
    return null
  return {...data, schema: SAVE_SCHEMA}
}
