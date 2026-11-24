// Runs before Willowvale's app.js inside the Reddit post. It tells the game who is playing, tracks
// today's errands, and when all three are done reports it so the streak and the shared town grow.
import {canRunAsUser, context, showLoginPrompt} from '@devvit/web/client'
import type {DailyRsp, ShareRsp, StateRsp} from '../shared/api.ts'
import {dayNoOf, ERRAND_ICON, shareLine} from '../shared/daily.ts'

type Quest = {id: string; text: string; n: number; have: number; done: boolean}
type Hook = {quests: () => Quest[]; open: (k: string) => void}
declare global {
  interface Window {
    WV_REDDIT?: {
      user: {username: string} | null
      dayNo: number
      homes: number
      login: () => void
    }
    __willowvale?: Hook
  }
}

const dayNo = dayNoOf()
// context is undefined outside Reddit (local testing), so read it carefully.
const ctx = context as typeof context | undefined
const user = ctx?.userId ? {username: ctx.username ?? 'player'} : null
window.WV_REDDIT = {user, dayNo, homes: 0, login: () => showLoginPrompt()}

/** Tell the game how many players have finished their errands: each one plants something in town. */
function setCommunity(homes: number): void {
  const rd = window.WV_REDDIT
  if (!rd || homes <= rd.homes) return
  rd.homes = homes
  window.dispatchEvent(new Event('wv-community'))
}
void fetch('api/state')
  .then(r => (r.ok ? (r.json() as Promise<StateRsp>) : null))
  .then(s => {
    if (s) setCommunity(s.homes)
  })
  .catch(() => {})

const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string): void {
    try {
      localStorage.setItem(k, v)
    } catch {
      // storage blocked: fine
    }
  },
}

// ---------- errands chip on the game screen ----------

const css = document.createElement('style')
css.textContent = `
.rd-errands{position:fixed;right:max(12px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 100px);z-index:30;display:flex;align-items:center;gap:6px;padding:7px 12px;border:0;border-radius:999px;background:#fffffff0;color:#26395A;font:800 14px/1 "Baloo 2",system-ui,sans-serif;box-shadow:0 4px 14px #1b224033;cursor:pointer}
.rd-errands.all{background:#3FA86A;color:#fff}
.rd-errands .rd-dots{letter-spacing:1px}
.rd-card{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:16px;background:#1b224066}
.rd-card[hidden]{display:none}
.rd-card>div{width:min(380px,100%);max-height:100%;overflow:auto;padding:22px 20px;border-radius:24px;background:#FFF9EF;color:#26395A;text-align:center;box-shadow:0 18px 50px #1b224055;font:600 15px/1.45 Nunito,system-ui,sans-serif}
.rd-card h2{margin:0 0 4px;font:800 24px/1.15 "Baloo 2",system-ui,sans-serif}
.rd-card .rd-list{margin:12px 0;padding:0;list-style:none;text-align:left}
.rd-card .rd-list li{display:flex;gap:10px;align-items:center;padding:7px 10px;margin:4px 0;border-radius:12px;background:#fff}
.rd-card .rd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
.rd-card .rd-stats div{padding:10px 4px;border-radius:14px;background:#fff}
.rd-card .rd-stats b{display:block;font:800 22px/1 "Baloo 2",system-ui,sans-serif}
.rd-card .rd-stats span{font-size:12px;color:#5b6b86}
.rd-card button{display:block;width:100%;margin-top:8px;padding:12px;border:0;border-radius:14px;font:800 16px/1 "Baloo 2",system-ui,sans-serif;cursor:pointer}
.rd-card .rd-go{background:#FFC83D;color:#5A3A00}
.rd-card .rd-soft{background:#E9EEF6;color:#26395A}
.rd-card .rd-note{margin:6px 0 0;font-size:13px;color:#5b6b86}
`
document.head.append(css)

const chip = document.createElement('button')
chip.className = 'rd-errands'
chip.type = 'button'
chip.hidden = true
chip.setAttribute('aria-label', 'Today’s errands')
chip.addEventListener('click', () => showErrands())
document.body.append(chip)

const card = document.createElement('div')
card.className = 'rd-card'
card.hidden = true
card.addEventListener('click', ev => {
  if (ev.target === card) card.hidden = true
})
document.body.append(card)

let quests: Quest[] = []
const doneKey = `wv-rd-done-${dayNo}`
let reported = store.get(doneKey) === '1'

function tick(): void {
  const hook = window.__willowvale
  const onboarding = document.getElementById('onboarding')
  if (!hook || (onboarding && !onboarding.classList.contains('hidden'))) return
  try {
    quests = hook.quests()
  } catch {
    return
  }
  const done = quests.filter(q => q.done).length
  chip.hidden = false
  chip.classList.toggle('all', done === quests.length)
  chip.innerHTML = `📋 <span>Errands</span> <span class="rd-dots">${quests.map(q => (q.done ? '●' : '○')).join('')}</span>`
  if (done === quests.length && quests.length && !reported) void finish()
}
setInterval(tick, 1500)

function el(html: string): HTMLElement {
  const d = document.createElement('div')
  d.innerHTML = html
  return d
}
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

function showErrands(): void {
  const inner =
    el(`<h2>Today’s errands</h2><p class="rd-note">The same three for everyone in Willowvale today. Finish them all to keep your streak and add a home to the town.</p>
    <ul class="rd-list">${quests.map(q => `<li><span>${ERRAND_ICON[q.id] ?? '✅'}</span><span style="flex:1">${esc(q.text)}</span><b>${q.done ? '✓' : `${q.have}/${q.n}`}</b></li>`).join('')}</ul>
    <button class="rd-go" type="button">Got it</button>`)
  inner.querySelector('button')?.addEventListener('click', () => {
    card.hidden = true
  })
  card.replaceChildren(inner)
  card.hidden = false
}

async function finish(): Promise<void> {
  reported = true
  if (!user) {
    showDone(null)
    return
  }
  try {
    const rsp = await fetch('api/daily', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({dayNo, done: quests.map(q => q.id)}),
    })
    if (!rsp.ok) throw Error(`${rsp.status}`)
    const d = (await rsp.json()) as DailyRsp
    store.set(doneKey, '1')
    setCommunity(d.homes)
    showDone(d)
  } catch {
    reported = false // try again on the next tick
  }
}

function showDone(d: DailyRsp | null): void {
  const inner = d
    ? el(`<h2>All of today’s errands done! 🏡</h2>
      <div class="rd-stats"><div><b>🔥${d.streak}</b><span>day streak</span></div><div><b>#${d.rank}</b><span>to finish today</span></div><div><b>${d.homes}</b><span>planted in town</span></div></div>
      <p class="rd-note">You planted something in the town everyone here shares. Look around for it! New errands tomorrow.</p>
      <button class="rd-go rd-share" type="button">💬 Share in the comments</button>
      <button class="rd-soft rd-close" type="button">Keep playing</button>`)
    : el(`<h2>All of today’s errands done! 🏡</h2>
      <p class="rd-note">Log in to Reddit to count your streak and add your home to the town.</p>
      <button class="rd-go rd-login" type="button">Log in</button>
      <button class="rd-soft rd-close" type="button">Keep playing</button>`)
  inner.querySelector('.rd-close')?.addEventListener('click', () => {
    card.hidden = true
  })
  inner
    .querySelector('.rd-login')
    ?.addEventListener('click', () => showLoginPrompt())
  const share = inner.querySelector<HTMLButtonElement>('.rd-share')
  share?.addEventListener('click', ev => void doShare(ev, share, d))
  card.replaceChildren(inner)
  card.hidden = false
}

async function doShare(
  ev: MouseEvent,
  btn: HTMLButtonElement,
  d: DailyRsp | null,
): Promise<void> {
  const text = shareLine(dayNo, d?.rank ?? 0, d?.streak ?? 0)
  const copy = async (msg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      btn.textContent = msg
    } catch {
      btn.textContent = 'Couldn’t share right now'
    }
  }
  let allowed = false
  try {
    allowed = await canRunAsUser(ev)
  } catch {
    allowed = false
  }
  if (!allowed) {
    await copy('📋 Copied! Paste it in a comment')
    return
  }
  btn.disabled = true
  try {
    const rsp = await fetch('api/share', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: '{}',
    })
    if (!rsp.ok) throw Error(`${rsp.status}`)
    ;(await rsp.json()) as ShareRsp
    btn.textContent = '✓ Posted to the comments'
  } catch {
    btn.disabled = false
    await copy('📋 Copied! Paste it in a comment')
  }
}
