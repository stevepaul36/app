// The daily errands: Willowvale's own quests, picked by calendar day (UTC) so every player shares them.
import {questsFor} from '../../../public/js/life.js'
import type {Errand} from './api.ts'

export const DAY_MS = 86_400_000
export const dayNoOf = (ms: number = Date.now()): number =>
  Math.floor(ms / DAY_MS)
export const dateOf = (dayNo: number): string =>
  new Date(dayNo * DAY_MS).toISOString().slice(0, 10)
/** Days since the Reddit launch, for post titles ("Day 3"). */
export const LAUNCH_DAY_NO = dayNoOf(Date.parse('2026-11-23T00:00:00Z'))
export const errandsFor = (dayNo: number): Errand[] =>
  questsFor(dayNo).map(q => ({id: q.id, text: q.text, n: q.n}))
export const ERRAND_ICON: {[id: string]: string} = {
  harvest: '🥕',
  water: '💧',
  bug: '🐞',
  gather: '🧺',
  craft: '🔨',
  deliver: '📦',
  fish: '🎣',
  meal: '🍳',
  hello: '👋',
  game: '🕹️',
  sell: '🪙',
  place: '🗺️',
}
export function shareLine(dayNo: number, rank: number, streak: number): string {
  const e = errandsFor(dayNo)
    .map(x => `${ERRAND_ICON[x.id] ?? '✅'} ${x.text}`)
    .join('\n')
  const bits = [
    `🏡 Willowvale Day ${dayNo - LAUNCH_DAY_NO + 1}: all errands done!`,
    e,
  ]
  if (rank) bits.push(`#${rank} to finish today`)
  if (streak > 1) bits.push(`🔥 ${streak}-day streak`)
  return bits.join('\n')
}
