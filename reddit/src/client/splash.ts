// The card people see in their Reddit feed: today's errands, the shared town, your streak, and Play.
import {requestExpandedMode} from '@devvit/web/client'
import {drawPortrait, randomLook} from '../../../public/js/character.js'
import type {StateRsp} from '../shared/api.ts'
import {ERRAND_ICON, LAUNCH_DAY_NO} from '../shared/daily.ts'

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id)
  if (!el) throw Error(`missing #${id}`)
  return el
}

$('play').addEventListener('click', ev => requestExpandedMode(ev, 'game'))

// A few neighbours waving hello.
const FOLKS = ['fox', 'bunny', 'bear', 'cat', 'raccoon']
const row = $('folks')
let t = 0
const canvases = FOLKS.map((species, k) => {
  const c = document.createElement('canvas')
  c.className = 'folk'
  row.append(c)
  return {c, species, look: randomLook(k * 977 + 13), seed: k}
})
function wave(): void {
  t += 0.05
  for (const f of canvases)
    drawPortrait(f.c, f.species, f.look, {
      size: 64,
      full: true,
      wave: true,
      t: t + f.seed,
      seed: f.seed,
    })
}
setInterval(wave, 50)

async function load(): Promise<void> {
  let s: StateRsp | null = null
  try {
    const r = await fetch('api/state')
    if (r.ok) s = (await r.json()) as StateRsp
  } catch {
    // offline: the card still works, the game loads its own data
  }
  if (!s) return
  $('day').textContent = `Day ${s.dayNo - LAUNCH_DAY_NO + 1}`
  const list = $('errands')
  list.textContent = ''
  for (const e of s.errands) {
    const li = document.createElement('li')
    const icon = document.createElement('b')
    icon.textContent = ERRAND_ICON[e.id] ?? '✅'
    const text = document.createElement('span')
    text.textContent = e.text
    li.append(icon, text)
    list.append(li)
  }
  $('town').textContent =
    `🏡 ${s.homes} home${s.homes === 1 ? '' : 's'} in town · ${s.finishedToday} finished today`
  const me = $('me')
  if (s.me.doneToday)
    me.textContent = `✓ You finished today’s errands${s.me.rank ? ` (#${s.me.rank})` : ''} · 🔥 ${s.me.streak}`
  else if (s.me.streak)
    me.textContent = `🔥 ${s.me.streak}-day streak: keep it going!`
  else
    me.textContent = s.me.loggedIn
      ? 'Finish all three to start a streak'
      : 'Log in to keep a streak'
  $('play').textContent = s.me.doneToday ? 'Back to town' : 'Play'
}
void load()
