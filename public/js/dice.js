// Paws & Properties, the Monopoly rules played out in town (no board). Every few hours you roll two dice
// and your stroll moves round the town's ring of places: homes, bus lines, utilities, Lucky Leaf and Town
// Chest cards, taxes, the Wishing Fountain, the Ranger's office. Land on a home and you walk there to buy
// it, bid for it at auction, or pay the owner's rent. Doubles roll again; three doubles and the Ranger
// catches you. Neighbours stroll too, so they land on your homes and pay you. Pure logic, no DOM.
import * as ES from './estate.js'

export const GO_PAY = 100
export const NPC_GO_PAY = 50
export const JAIL_FINE = 50
export const BUS_PRICE = 200
export const BUS_RENT = [0, 25, 50, 100, 200]
export const UTIL_PRICE = 150
export const UTIL_MULT = [0, 4, 10]
export const TAXES = { council: 100, luxury: 75 }
export const BIZ = {
  'bus-n': { kind: 'bus', name: 'North bus line', icon: '🚌' },
  'bus-e': { kind: 'bus', name: 'East bus line', icon: '🚌' },
  'bus-s': { kind: 'bus', name: 'South bus line', icon: '🚌' },
  'bus-w': { kind: 'bus', name: 'West bus line', icon: '🚌' },
  water: { kind: 'util', name: 'Water tower', icon: '🚰' },
  power: { kind: 'util', name: 'Sunny Power Co.', icon: '⚡' },
}
const SPECIAL = {
  G: { kind: 'go', name: 'Town Square (GO)', icon: '🏁' },
  J: { kind: 'jail', name: 'Ranger’s office', icon: '🚓' },
  F: { kind: 'fountain', name: 'Wishing Fountain', icon: '⛲' },
  X: { kind: 'gotojail', name: 'Go to the Ranger', icon: '👮' },
  L: { kind: 'leaf', name: 'Lucky Leaf', icon: '🍀' },
  C: { kind: 'chest', name: 'Town Chest', icon: '🎁' },
  T: { kind: 'tax', name: 'Council tax', icon: '🧾', tax: 'council' },
  U: { kind: 'tax', name: 'Luxury tax', icon: '💎', tax: 'luxury' },
}
// Monopoly's 40 spaces: H is a home, B a bus line, W/P the utilities.
const LAYOUT = 'G H C H T B H L H H J H W H H B H C H H F H L H H B H H P H X H H C H B L H U H'.split(' ')
const BUS_ORDER = ['bus-n', 'bus-e', 'bus-s', 'bus-w']

// ---------- the ring ----------

/** The town's ring of 40-ish places, cheapest streets first like the board. Rebuilt on demand (not saved). */
export function ring(T) {
  const streets = T.streets.slice().sort((a, b) => avg(T, a) - avg(T, b))
  const homes = streets.flatMap(s => s.homes)
  const slots = LAYOUT.slice()
  const hCount = slots.filter(x => x === 'H').length
  if (homes.length > hCount) slots.splice(slots.length - 1, 0, ...Array(homes.length - hCount).fill('H'))
  else for (let k = hCount - homes.length; k > 0; k--) slots.splice(slots.lastIndexOf('H'), 1)
  let h = 0, b = 0
  return slots.map(x => {
    if (x === 'H') return { kind: 'home', id: homes[h++] }
    if (x === 'B') { const id = BUS_ORDER[b++]; return { ...BIZ[id], kind: 'biz', biz: BIZ[id].kind, id } }
    if (x === 'W') return { ...BIZ.water, kind: 'biz', biz: 'util', id: 'water' }
    if (x === 'P') return { ...BIZ.power, kind: 'biz', biz: 'util', id: 'power' }
    return { ...SPECIAL[x] }
  })
}
const avg = (T, s) => s.homes.reduce((a, id) => a + T.deeds[id].p, 0) / s.homes.length
export const jailIndex = R => R.findIndex(s => s.kind === 'jail')

/** Add what the dice game needs to a town made before it existed. */
export function ensure(T) {
  T.biz ||= {}
  for (const k of Object.keys(BIZ)) T.biz[k] ||= { owner: 'bank', mort: false }
  T.pot ||= 0
  T.you ||= { pos: 0, dbl: 0 }
  T.pos ||= {}
  T.decks ||= { leaf: [], chest: [] }
  return T
}

// ---------- bus lines and utilities ----------

export const bizPrice = id => (BIZ[id].kind === 'bus' ? BUS_PRICE : UTIL_PRICE)
const bizOwned = (T, owner, kind) => Object.keys(BIZ).filter(k => BIZ[k].kind === kind && T.biz[k].owner === owner).length
export function bizRent(T, id, diceSum) {
  const b = T.biz[id]
  if (b.owner === 'bank' || b.mort) return 0
  const n = bizOwned(T, b.owner, BIZ[id].kind)
  return BIZ[id].kind === 'bus' ? BUS_RENT[n] : UTIL_MULT[n] * diceSum
}
export function buyBiz(E, T, id, you, day) {
  ensure(T)
  if (ES.frozen(E, day)) return { ok: false, msg: 'The Ranger has paused your buying until tomorrow.' }
  if (T.biz[id].owner !== 'bank') return { ok: false, msg: 'That isn’t for sale.' }
  const cost = bizPrice(id)
  if (you.coins < cost) return { ok: false, msg: `You need ✦ ${cost}.` }
  you.coins -= cost
  T.biz[id].owner = 'you'
  ES.addNews(T, day, `You bought the ${BIZ[id].name}.`)
  return { ok: true, msg: `The ${BIZ[id].name} is yours! Visitors who land there pay you.` }
}
export function bizMortgage(T, id, you) {
  const b = T.biz[id]
  if (b.owner !== 'you') return { ok: false, msg: 'You don’t own that.' }
  if (b.mort) {
    const cost = Math.round(bizPrice(id) * ES.LIFT_SHARE)
    if (you.coins < cost) return { ok: false, msg: `You need ✦ ${cost}.` }
    you.coins -= cost
    b.mort = false
    return { ok: true, msg: 'Mortgage paid off.' }
  }
  const get = Math.round(bizPrice(id) * ES.MORTGAGE_SHARE)
  you.coins += get
  b.mort = true
  return { ok: true, msg: `Mortgaged for ✦ ${get}.` }
}

// ---------- cards ----------

export const LEAF = [
  { text: 'Advance to the Town Square (GO). Collect ✦ 100.', do: 'goto', to: 'go' },
  { text: 'Hop on the next bus: advance to the nearest bus line.', do: 'nearest', to: 'bus' },
  { text: 'Advance to the nearest utility.', do: 'nearest', to: 'util' },
  { text: 'Go back 3 spaces.', do: 'back', n: 3 },
  { text: 'The Ranger caught you jaywalking! Go straight to the Ranger’s office.', do: 'jail' },
  { text: 'Get out of the Ranger’s office free. Keep this card until you need it.', do: 'free' },
  { text: 'The bank pays you a dividend of ✦ 50.', do: 'coins', n: 50 },
  { text: 'Speeding scooter fine: ✦ 15.', do: 'coins', n: -15 },
  { text: 'Your building loan matures. Collect ✦ 150.', do: 'coins', n: 150 },
  { text: 'General repairs: ✦ 25 for each upgrade, ✦ 100 for each manor.', do: 'repairs', n: 25, m: 100 },
  { text: 'You were elected Town Chair. Pay each neighbour ✦ 5.', do: 'payEach', n: 5 },
  { text: 'Take a trip to the priciest street in town.', do: 'goto', to: 'last' },
  { text: 'Advance to the first street. Collect ✦ 100 if you pass GO.', do: 'goto', to: 'first' },
  { text: 'A lucky breeze blows you to the Wishing Fountain.', do: 'goto', to: 'fountain' },
  { text: 'You won the crossword competition. Collect ✦ 100.', do: 'coins', n: 100 },
  { text: 'Take a ride on the North bus line. Collect ✦ 100 if you pass GO.', do: 'goto', to: 'bus-n' },
]
export const CHEST = [
  { text: 'Advance to the Town Square (GO). Collect ✦ 100.', do: 'goto', to: 'go' },
  { text: 'Bank error in your favour. Collect ✦ 200.', do: 'coins', n: 200 },
  { text: 'Vet’s bill for your goldfish: ✦ 50.', do: 'coins', n: -50 },
  { text: 'You sold cookies at the market. Collect ✦ 50.', do: 'coins', n: 50 },
  { text: 'Get out of the Ranger’s office free. Keep this card until you need it.', do: 'free' },
  { text: 'Go straight to the Ranger’s office. Do not pass GO.', do: 'jail' },
  { text: 'Your holiday fund matures. Collect ✦ 100.', do: 'coins', n: 100 },
  { text: 'Tax refund. Collect ✦ 20.', do: 'coins', n: 20 },
  { text: 'It’s your birthday! Each neighbour gives you ✦ 10.', do: 'collectEach', n: 10 },
  { text: 'Life insurance pays out. Collect ✦ 100.', do: 'coins', n: 100 },
  { text: 'Clinic fees: ✦ 50.', do: 'coins', n: -50 },
  { text: 'School fees: ✦ 50.', do: 'coins', n: -50 },
  { text: 'Consulting fee. Collect ✦ 25.', do: 'coins', n: 25 },
  { text: 'Street repairs: ✦ 40 for each upgrade, ✦ 115 for each manor.', do: 'repairs', n: 40, m: 115 },
  { text: 'Second prize in the beauty contest. Collect ✦ 10.', do: 'coins', n: 10 },
  { text: 'You inherit ✦ 100.', do: 'coins', n: 100 },
]
function draw(T, deck, r) {
  const cards = deck === 'leaf' ? LEAF : CHEST
  if (!T.decks[deck].length) {
    const order = cards.map((_, k) => k)
    for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [order[k], order[j]] = [order[j], order[k]] }
    T.decks[deck] = order
  }
  return cards[T.decks[deck].shift()]
}

// ---------- your roll ----------

/** Can you roll now? (One roll per slot; the caller decides how often slots come round.) */
export function rollBlocked(T) {
  ensure(T)
  if (T.pending) return 'Finish your last move first: go to the place you landed on.'
  if (T.auction) return 'Finish the auction first.'
  return null
}
/**
 * Roll two dice and move. Returns { ok, dice, doubles, again, landed, events, costs, card, jailed, pending }.
 * Costs aren't taken here: the caller pays them with ES.payCosts (so debts are handled in one place).
 */
export function roll(E, T, you, day, r = Math.random, town = null) {
  ensure(T)
  const blocked = rollBlocked(T)
  if (blocked) return { ok: false, msg: blocked }
  const R = ring(T)
  const a = 1 + Math.floor(r() * 6), b = 1 + Math.floor(r() * 6), doubles = a === b
  const out = { ok: true, dice: [a, b], doubles, again: false, events: [], costs: [], card: null, jailed: false, landed: null }
  if (E.jail) {
    E.jail.tries = (E.jail.tries || 0) + 1
    if (doubles) { out.events.push('Doubles! The Ranger lets you go.'); E.jail = null }
    else if (E.jail.tries >= 3) { out.events.push(`Third try. You pay the ✦ ${JAIL_FINE} fine and walk out.`); out.costs.push({ amount: JAIL_FINE, why: 'fine', town }); E.jail = null }
    else { out.events.push(`No doubles. You’re still at the Ranger’s office (try ${E.jail.tries} of 3).`); npcTurns(E, T, day, r, out, you, town); return out }
    T.you.dbl = 0
  } else if (doubles) {
    T.you.dbl++
    if (T.you.dbl >= 3) {
      T.you.dbl = 0
      toJail(E, T, out, 'Three doubles in a row! The Ranger caught you speeding.')
      npcTurns(E, T, day, r, out, you, town)
      return out
    }
  } else T.you.dbl = 0
  move(E, T, R, you, a + b, out, r, day, town)
  out.again = doubles && !out.jailed && !E.jail
  npcTurns(E, T, day, r, out, you, town)
  return out
}
function toJail(E, T, out, why) {
  E.jail = { tries: 0 }
  T.you.pos = jailIndex(ring(T))
  T.you.dbl = 0
  out.jailed = true
  out.events.push(why)
}
function move(E, T, R, you, steps, out, r, day, town) {
  const from = T.you.pos
  T.you.pos = (from + steps + R.length) % R.length
  if (steps > 0 && T.you.pos < from) { you.coins += GO_PAY; out.events.push(`You passed the Town Square. Collect ✦ ${GO_PAY}!`) }
  land(E, T, R, you, out, r, day, town)
}
function moveTo(E, T, R, you, idx, out, r, day, town) {
  const steps = (idx - T.you.pos + R.length) % R.length
  move(E, T, R, you, steps, out, r, day, town)
}
function land(E, T, R, you, out, r, day, town) {
  const sp = R[T.you.pos]
  out.landed = sp
  const sum = out.dice ? out.dice[0] + out.dice[1] : 7
  if (sp.kind === 'home') {
    const d = T.deeds[sp.id]
    if (d.owner === 'bank') T.pending = { id: sp.id, kind: 'buy' }
    else if (d.owner === 'you') out.events.push('You landed on your own home. Time for a cup of tea.')
    else if (d.mort) out.events.push(`You landed on ${d.owner}’s home, but it’s mortgaged: no rent.`)
    else T.pending = { id: sp.id, kind: 'rent', to: d.owner, amount: ES.landRent(T, sp.id) }
    if (T.pending) out.pending = T.pending
  } else if (sp.kind === 'biz') {
    const b = T.biz[sp.id]
    if (b.owner === 'bank') out.offerBiz = sp.id
    else if (b.owner !== 'you' && !b.mort) {
      const amt = bizRent(T, sp.id, sum)
      out.costs.push({ amount: amt, why: 'rent', to: b.owner, town })
      out.events.push(`${b.owner} owns the ${BIZ[sp.id].name}. You pay ✦ ${amt}.`)
    }
  } else if (sp.kind === 'tax') {
    const amt = TAXES[sp.tax]
    out.costs.push({ amount: amt, why: 'tax', town })
    out.events.push(`${sp.name}: ✦ ${amt} goes into the Wishing Fountain pot.`)
  } else if (sp.kind === 'fountain') {
    if (T.pot) { you.coins += T.pot; out.events.push(`The Wishing Fountain pot is yours: ✦ ${T.pot}!`); T.pot = 0 }
    else out.events.push('You make a wish at the fountain. The pot is empty today.')
  } else if (sp.kind === 'gotojail') toJail(E, T, out, 'The Ranger spotted you! Straight to the Ranger’s office.')
  else if (sp.kind === 'leaf' || sp.kind === 'chest') {
    const c = draw(T, sp.kind, r)
    out.card = { deck: sp.kind, text: c.text }
    applyCard(E, T, R, c, you, out, r, day, town)
  } else if (sp.kind === 'go') out.events.push('You stopped right on the Town Square.')
  else if (sp.kind === 'jail') out.events.push('Just visiting the Ranger’s office. Say hello!')
}
function applyCard(E, T, R, c, you, out, r, day, town) {
  const mine = ES.ownedBy(T, 'you')
  const find = to => to === 'go' ? 0 : to === 'first' ? R.findIndex(s => s.kind === 'home') : to === 'last' ? R.map(s => s.kind).lastIndexOf('home') : to === 'fountain' ? R.findIndex(s => s.kind === 'fountain') : R.findIndex(s => s.id === to)
  switch (c.do) {
    case 'goto': moveTo(E, T, R, you, find(c.to), out, r, day, town); break
    case 'nearest': {
      let k = T.you.pos
      do k = (k + 1) % R.length; while (!(R[k].kind === 'biz' && BIZ[R[k].id].kind === c.to))
      moveTo(E, T, R, you, k, out, r, day, town)
      break
    }
    case 'back': T.you.pos = (T.you.pos - c.n + R.length) % R.length; land(E, T, R, you, out, r, day, town); break
    case 'jail': toJail(E, T, out, 'Off to the Ranger’s office.'); break
    case 'free': E.freeCards = (E.freeCards || 0) + 1; break
    case 'coins':
      if (c.n > 0) you.coins += c.n
      else out.costs.push({ amount: -c.n, why: 'fine', town })
      break
    case 'repairs': {
      const up = mine.reduce((a, id) => a + (T.deeds[id].level < ES.MANOR ? T.deeds[id].level : 0), 0)
      const manors = mine.filter(id => T.deeds[id].level === ES.MANOR).length
      const amt = up * c.n + manors * c.m
      if (amt) out.costs.push({ amount: amt, why: 'repairs', town })
      break
    }
    case 'payEach': for (const name of Object.keys(T.npc)) out.costs.push({ amount: c.n, why: 'gift', to: name, town }); break
    case 'collectEach': for (const n of Object.values(T.npc)) { const g = Math.min(c.n, n.coins); n.coins -= g; you.coins += g } break
  }
}

// ---------- the Ranger's office ----------

export function payJail(E, you, town = null) {
  if (!E.jail) return { ok: false, msg: 'You’re not at the Ranger’s office.', costs: [] }
  if (you.coins < JAIL_FINE) return { ok: false, msg: `You need ✦ ${JAIL_FINE}.`, costs: [] }
  E.jail = null
  return { ok: true, msg: 'You paid the fine. You’re free to go!', costs: [{ amount: JAIL_FINE, why: 'fine', town }] }
}
export function useFreeCard(E) {
  if (!E.jail) return { ok: false, msg: 'You’re not at the Ranger’s office.' }
  if (!E.freeCards) return { ok: false, msg: 'You don’t have a get-out-free card.' }
  E.freeCards--
  E.jail = null
  return { ok: true, msg: 'You show the card. The Ranger waves you through!' }
}

// ---------- landing on a home: buy, auction or pay ----------

export function resolvePending(E, T, you, day, choice, town = null) {
  const p = T.pending
  if (!p) return { ok: false, msg: 'Nothing to do here.', costs: [] }
  if (p.kind === 'rent') {
    T.pending = null
    const d = T.deeds[p.id]
    if (d.owner !== p.to || d.mort) return { ok: true, msg: 'The owner changed, so there’s nothing to pay.', costs: [] }
    return { ok: true, msg: `You paid ${p.to} ✦ ${p.amount} rent.`, costs: [{ amount: p.amount, why: 'rent', to: p.to, town }] }
  }
  if (choice === 'buy') {
    const r = ES.buyFromBank(E, T, p.id, you, day)
    if (r.ok) T.pending = null
    return { ...r, costs: [] }
  }
  // turning it down sends it to auction
  T.pending = null
  T.auction = startAuction(T, p.id)
  return { ok: true, msg: 'Up for auction! Place a bid or pass.', costs: [], auction: T.auction }
}

// ---------- auctions ----------

const STEP = 10
const BID_SHARE = { careful: 0.8, bold: 1.05, trader: 0.95 }
export function startAuction(T, id) {
  const maxes = {}
  for (const [name, n] of Object.entries(T.npc)) {
    const p = ES.PERSONAS[n.persona]
    const keen = ES.streetHomes(T, id).some(h => T.deeds[h].owner === name) ? 1.2 : 1
    const max = Math.min(n.coins - p.reserve, Math.round(ES.value(T, id) * (BID_SHARE[n.persona] || 0.9) * keen))
    if (max >= STEP) maxes[name] = Math.floor(max / STEP) * STEP
  }
  return { id, bid: 0, leader: null, maxes }
}
const topRival = (A, above) => Object.entries(A.maxes).filter(([, m]) => m > above).sort((a, b) => b[1] - a[1])[0]
/** You bid. If no neighbour will go higher you win at once; otherwise the keenest one outbids you. */
export function bid(E, T, you, amount, day) {
  const A = T.auction
  if (!A) return { ok: false, msg: 'There’s no auction.' }
  if (ES.frozen(E, day)) return { ok: false, msg: 'The Ranger has paused your buying until tomorrow.' }
  amount = Math.floor(amount)
  if (amount <= A.bid) return { ok: false, msg: `Bid more than ✦ ${A.bid}.` }
  if (amount > you.coins) return { ok: false, msg: `You only have ✦ ${you.coins}.` }
  const rival = topRival(A, amount)
  if (!rival) return finish(T, A, 'you', amount, you, day)
  A.bid = Math.min(rival[1], amount + STEP)
  A.leader = rival[0]
  return { ok: true, msg: `${rival[0]} bids ✦ ${A.bid}!`, auction: A }
}
/** You stop bidding: the leader (or the keenest neighbour) wins; if nobody wants it, the bank keeps it. */
export function pass(E, T, you, day) {
  const A = T.auction
  if (!A) return { ok: false, msg: 'There’s no auction.' }
  if (A.leader && A.leader !== 'you') return finish(T, A, A.leader, A.bid, you, day)
  const bids = Object.entries(A.maxes).sort((a, b) => b[1] - a[1])
  if (!bids.length) { T.auction = null; return { ok: true, msg: 'Nobody bid, so the bank keeps it.' } }
  const price = Math.min(bids[0][1], (bids[1] ? bids[1][1] : 0) + STEP)
  return finish(T, A, bids[0][0], price, you, day)
}
function finish(T, A, who, price, you, day) {
  T.auction = null
  const d = T.deeds[A.id]
  if (who === 'you') { you.coins -= price; Object.assign(d, { owner: 'you', tenant: null, renter: null }) }
  else { T.npc[who].coins -= price; d.owner = who }
  ES.addNews(T, day, `${who === 'you' ? 'You' : who} won the auction for a home on ${ES.streetOf(T, A.id).name} at ✦ ${price}.`)
  return { ok: true, won: who, price, msg: who === 'you' ? `Sold to you for ✦ ${price}!` : `${who} wins it for ✦ ${price}.` }
}

// ---------- neighbours stroll too ----------

function npcTurns(E, T, day, r, out, you, town) {
  const R = ring(T)
  for (const [name, n] of Object.entries(T.npc)) {
    if (n.jail) { n.jail--; continue }
    const steps = 2 + Math.floor(r() * 6) + Math.floor(r() * 6)
    const from = T.pos[name] ?? Math.floor(r() * R.length)
    const at = (from + steps) % R.length
    T.pos[name] = at
    if (at < from) n.coins += NPC_GO_PAY
    const sp = R[at]
    if (sp.kind === 'home') {
      const d = T.deeds[sp.id]
      if (d.owner === 'bank') {
        const p = ES.PERSONAS[n.persona]
        const floor = ES.ownedBy(T, 'bank').length > Object.keys(T.deeds).length * 0.35
        if (floor && r() < p.buyChance && ES.buyPrice(T, sp.id) <= n.coins - p.reserve) {
          n.coins -= ES.buyPrice(T, sp.id)
          d.owner = name
          ES.addNews(T, day, `${name} landed on a home on ${ES.streetOf(T, sp.id).name} and bought it.`)
        }
      } else if (d.owner !== name && !d.mort) {
        const amt = ES.landRent(T, sp.id), yours = d.owner === 'you'
        const paid = npcPay(T, name, amt, d.owner, you, day, out)
        if (yours) out.events.push(`${name} landed on your home on ${ES.streetOf(T, sp.id).name} and paid you ✦ ${paid}.`)
      }
    } else if (sp.kind === 'biz') {
      const b = T.biz[sp.id]
      if (b.owner !== 'bank' && b.owner !== name && !b.mort) {
        const amt = bizRent(T, sp.id, steps)
        const paid = npcPay(T, name, amt, b.owner, you, day, out)
        if (b.owner === 'you') out.events.push(`${name} rode your ${BIZ[sp.id].name} and paid you ✦ ${paid}.`)
      } else if (b.owner === 'bank' && n.coins - ES.PERSONAS[n.persona].reserve > bizPrice(sp.id) && r() < 0.4) {
        n.coins -= bizPrice(sp.id)
        b.owner = name
        ES.addNews(T, day, `${name} bought the ${BIZ[sp.id].name}.`)
      }
    } else if (sp.kind === 'tax') { const amt = Math.min(n.coins, TAXES[sp.tax]); n.coins -= amt; T.pot += amt }
    else if (sp.kind === 'fountain') { n.coins += T.pot; if (T.pot >= 50) ES.addNews(T, day, `${name} won the Wishing Fountain pot: ✦ ${T.pot}.`); T.pot = 0 }
    else if (sp.kind === 'gotojail') { n.jail = 2; T.pos[name] = jailIndex(R) }
    else if (sp.kind === 'leaf' || sp.kind === 'chest') { const g = Math.round((r() - 0.4) * 60); n.coins = Math.max(0, n.coins + g) }
  }
}
/**
 * A neighbour pays `amount` to `to` ('you' or another neighbour). Short of coins they sell upgrades, then
 * mortgage spare homes; still short and they're bankrupt: everything they own goes to whoever they owe.
 * Returns what was paid.
 */
export function npcPay(T, name, amount, to, you, day, out = { events: [] }) {
  const n = T.npc[name]
  const raise = () => {
    for (const id of ES.ownedBy(T, name).sort((a, b) => T.deeds[b].level - T.deeds[a].level)) {
      while (n.coins < amount && T.deeds[id].level > 0) { T.deeds[id].level--; n.coins += Math.round(ES.renovateCost(T, id) / 2) }
    }
    for (const id of ES.ownedBy(T, name)) {
      if (n.coins >= amount) break
      const d = T.deeds[id]
      if (d.mort || d.lives === name || ES.streetHomes(T, id).some(h => T.deeds[h].level > 0)) continue
      d.mort = true
      d.mortAmt = ES.mortgageGet(T, id)
      n.coins += d.mortAmt
    }
  }
  if (n.coins < amount) raise()
  const paid = Math.min(n.coins, amount)
  n.coins -= paid
  if (to === 'you') you.coins += paid
  else if (T.npc[to]) T.npc[to].coins += paid
  if (paid < amount) {
    // bankrupt: their homes and lines go to the creditor (or back to the bank)
    for (const id of ES.ownedBy(T, name)) {
      const d = T.deeds[id]
      if (to === 'you' || T.npc[to]) {
        d.owner = to
        if (d.lives === name) Object.assign(d, { lives: null, tenant: to === 'you' ? name : null, letting: to === 'you' })
      } else Object.assign(d, { owner: 'bank', level: 0, mort: false, mortAmt: 0, lives: null })
    }
    for (const b of Object.values(T.biz || {})) if (b.owner === name) b.owner = to === 'you' || T.npc[to] ? to : 'bank'
    n.coins = 200
    const msg = `${name} couldn’t pay and went bankrupt! Everything they owned now belongs to ${to === 'you' ? 'you' : to}.`
    ES.addNews(T, day, msg)
    out.events.push(msg)
  }
  return paid
}
