// Paws & Properties: the daily draw. Instead of rolling dice round a board, you draw a few fate cards a
// day. Each one is truly random (Math.random by default, never seeded by the date): a bargain on a home,
// rent you're forced to pay, a premium tenant, a surprise auction, a storm, a zoning rule or inspection,
// or a golden key. Money you can't pay becomes a bank loan up to your credit limit; past that the usual
// Monopoly liquidation runs (sell upgrades, mortgage, the bank takes homes, then the Ranger).
import * as ES from './estate.js'
import * as D from './dice.js'

export const DRAWS_PER_DAY = 3
export const EXTRA_DRAW_COST = 40
export const MAX_EXTRA = 2
export const INTEREST = 0.05 // on loans, every morning
export const CREDIT_BASE = 200
export const CREDIT_SHARE = 0.3 // of what your homes are worth
export const IOU_LIMIT = 300 // what a neighbour may owe before they go bankrupt instead
export const ZONE_NAMES = ['Quiet residential', 'Heritage street', 'Green belt', 'Family zone']

/** Add what the draw needs to an estate and a town made before it existed. */
export function ensure(E, T) {
  E.creditOn = true
  E.debt ||= 0
  E.permits ||= 0
  E.draws ||= { day: -1, used: 0, extra: 0, bonus: 0 }
  if (T) { D.ensure(T); T.zones ||= {}; T.ious ||= {} }
  return E
}
function today(E, day) {
  if (E.draws.day !== day) E.draws = { day, used: 0, extra: 0, bonus: 0 }
  return E.draws
}
export function drawsLeft(E, day) {
  const d = today(E, day)
  return Math.max(0, DRAWS_PER_DAY + d.extra + d.bonus - d.used)
}
/** Unlock one more draw today for coins (twice a day at most). */
export function buyDraw(E, you, day) {
  const d = today(E, day)
  if (d.extra >= MAX_EXTRA) return { ok: false, msg: 'You’ve unlocked all the extra draws for today. Come back tomorrow.' }
  if (you.coins < EXTRA_DRAW_COST) return { ok: false, msg: `An extra draw costs ✦ ${EXTRA_DRAW_COST}.` }
  you.coins -= EXTRA_DRAW_COST
  d.extra++
  return { ok: true, msg: 'Extra draw unlocked!' }
}

// ---------- loans ----------

export function propertyWorth(towns, owner = 'you') {
  return Object.values(towns).reduce((a, T) => a + ES.worth(T, owner, 0), 0)
}
export const creditLimit = (E, towns) => Math.round(CREDIT_BASE + propertyWorth(towns) * CREDIT_SHARE)
export const creditLeft = (E, towns) => Math.max(0, creditLimit(E, towns) - (E.debt || 0))
/** Borrow from the bank yourself (up to the limit). */
export function borrow(E, towns, you, amount) {
  amount = Math.floor(amount)
  if (amount <= 0) return { ok: false, msg: 'Borrow something.' }
  const left = creditLeft(E, towns)
  if (left <= 0) return { ok: false, msg: 'The bank won’t lend you more until you pay some back.' }
  const n = Math.min(left, amount)
  E.debt = (E.debt || 0) + n
  you.coins += n
  return { ok: true, msg: `The bank lent you ✦ ${n}. You owe ✦ ${E.debt}.` }
}
export function repay(E, you, amount) {
  amount = Math.min(Math.floor(amount), E.debt || 0, you.coins)
  if (amount <= 0) return { ok: false, msg: E.debt ? 'You need coins to pay it back.' : 'You don’t owe the bank anything.' }
  E.debt -= amount
  you.coins -= amount
  return { ok: true, msg: E.debt ? `Paid back ✦ ${amount}. ✦ ${E.debt} to go.` : 'Loan paid off. You’re debt free!' }
}
/**
 * The morning for loans and IOUs: interest is added, the bank takes back up to half your coins, and
 * neighbours who owe pay what they can from their earnings. Returns messages.
 */
export function morningLoans(E, towns, you) {
  const msgs = []
  if (E.debt > 0) {
    const interest = Math.max(1, Math.round(E.debt * INTEREST))
    E.debt += interest
    const take = Math.min(E.debt, Math.floor(you.coins / 2))
    if (take > 0) { E.debt -= take; you.coins -= take }
    msgs.push(`Bank loan: ✦ ${interest} interest added${take ? `, ✦ ${take} taken from your purse` : ''}. ${E.debt ? `You still owe ✦ ${E.debt}.` : 'Paid off!'}`)
  }
  for (const T of Object.values(towns)) {
    for (const [name, owed] of Object.entries(T.ious || {})) {
      const n = T.npc[name]
      if (!n) { delete T.ious[name]; continue }
      for (const [to, amt] of Object.entries(owed)) {
        const pay = Math.min(amt, Math.max(0, n.coins - 20))
        if (pay <= 0) continue
        n.coins -= pay
        if (to === 'you') you.coins += pay
        else if (T.npc[to]) T.npc[to].coins += pay
        owed[to] -= pay
        if (to === 'you') msgs.push(`${name} paid back ✦ ${pay} of what they owe you${owed[to] ? ` (✦ ${owed[to]} left)` : ' (all square)'}.`)
        if (!owed[to]) delete owed[to]
      }
      if (!Object.keys(owed).length) delete T.ious[name]
    }
  }
  E.jail = null // a night at the Ranger's office is enough
  return msgs
}
export const owedToYou = T => Object.entries(T.ious || {}).reduce((a, [, o]) => a + (o.you || 0), 0)

// ---------- zoning ----------

export const zoneOf = (T, id) => (T.zones || {})[T.deeds[id].st] || null
/** Homes over their street's zoning limit, and the fine each would pay. */
export function overZone(T, owner) {
  const out = []
  for (const id of ES.ownedBy(T, owner)) {
    const z = zoneOf(T, id), d = T.deeds[id]
    if (z && d.level > z.max) out.push({ id, over: d.level - z.max, fine: Math.round(ES.renovateCost(T, id) * 0.3 * (d.level - z.max)) })
  }
  return out
}

// ---------- the cards ----------

const WEIGHTS = [['offer', 18], ['rent', 16], ['tenant', 14], ['auction', 9], ['surprise', 25], ['zoning', 11], ['key', 7]]
function pickKind(r) {
  let x = r() * WEIGHTS.reduce((a, w) => a + w[1], 0)
  for (const [k, w] of WEIGHTS) { if ((x -= w) < 0) return k }
  return 'surprise'
}
const pickOf = (r, list) => list[Math.floor(r() * list.length)]
const between = (r, a, b) => Math.round(a + r() * (b - a))
const streetName = (T, id) => ES.streetOf(T, id).name

/**
 * Draw a fate card. Returns { ok, card: { kind, icon, title, text, tone }, costs, events, offer, auction }.
 * Costs aren't taken here: the caller pays them with ES.payCosts (loans and liquidation in one place).
 */
export function draw(E, T, you, day, r = Math.random, town = null, opts = {}) {
  ensure(E, T)
  if (E.jail) return { ok: false, msg: 'You’re at the Ranger’s office. Pay the fine, use a card, or wait until morning.' }
  if (T.auction) return { ok: false, msg: 'Finish the auction first.' }
  if (drawsLeft(E, day) <= 0) return { ok: false, msg: 'No draws left today. Unlock an extra one, or come back tomorrow.' }
  today(E, day).used++
  const out = { ok: true, card: null, costs: [], events: [] }
  const kind = opts.kind || pickKind(r)
  CARDS[kind](E, T, you, day, r, town, out)
  // the neighbours take their turns round town as well
  D.npcTurns(E, T, day, r, out, you, town)
  return out
}
const card = (out, kind, icon, title, text, tone) => { out.card = { kind, icon, title, text, tone } }

const CARDS = {
  offer(E, T, you, day, r, town, out) {
    const pool = Object.keys(T.deeds).filter(id => T.deeds[id].owner !== 'you' && T.deeds[id].lives !== T.deeds[id].owner)
    if (!pool.length) return CARDS.surprise(E, T, you, day, r, town, out)
    const id = pickOf(r, pool), d = T.deeds[id]
    const price = Math.round(ES.value(T, id) * (0.55 + r() * 0.3))
    const from = d.owner === 'bank' ? 'The bank' : d.owner
    T.offer = { id, price, from: d.owner, day }
    out.offer = T.offer
    card(out, 'offer', '🏷️', 'A bargain!', `${from} needs a quick sale: a home on ${streetName(T, id)} worth ✦ ${ES.value(T, id)} is yours for ✦ ${price}, today only.`, 'deal')
  },
  rent(E, T, you, day, r, town, out) {
    const theirs = Object.keys(T.deeds).filter(id => !['you', 'bank'].includes(T.deeds[id].owner) && !T.deeds[id].mort)
    if (!theirs.length) {
      const amt = between(r, 15, 45)
      out.costs.push({ amount: amt, why: 'tax', town })
      return card(out, 'rent', '🛏️', 'A night at the inn', `You stayed at the town inn: ✦ ${amt}. It goes to the Wishing Fountain pot.`, 'bad')
    }
    const id = pickOf(r, theirs), d = T.deeds[id]
    const amt = Math.max(10, Math.round(ES.landRent(T, id) * (1 + r())))
    out.costs.push({ amount: amt, why: 'rent', to: d.owner, town })
    card(out, 'rent', '🧾', 'Rent is due', `You stayed at ${d.owner}’s home on ${streetName(T, id)}. ${d.owner} collects ✦ ${amt}, and it has to be paid.`, 'bad')
  },
  tenant(E, T, you, day, r, town, out) {
    const mine = ES.ownedBy(T, 'you').filter(id => !T.deeds[id].mort)
    if (!mine.length) return CARDS.offer(E, T, you, day, r, town, out)
    const empty = mine.filter(id => !T.deeds[id].tenant)
    if (empty.length && r() < 0.5) {
      const id = pickOf(r, empty)
      Object.assign(T.deeds[id], { tenant: pickOf(r, ['a writer', 'a baker', 'a family of hedgehogs', 'a jazz otter', 'a retired captain']), letting: true })
      const bonus = ES.rentOf(T, id) * 2
      you.coins += bonus
      return card(out, 'tenant', '🔑', 'New tenant!', `${T.deeds[id].tenant[0].toUpperCase() + T.deeds[id].tenant.slice(1)} moved into your home on ${streetName(T, id)} and paid ✦ ${bonus} up front.`, 'good')
    }
    const id = pickOf(r, mine)
    const bonus = Math.max(20, Math.round((ES.rentOf(T, id) || ES.landRent(T, id) || 20) * (2 + r() * 3)))
    you.coins += bonus
    card(out, 'tenant', '💎', 'Premium guest', `A film star booked your home on ${streetName(T, id)} for the week: ✦ ${bonus}!`, 'good')
  },
  auction(E, T, you, day, r, town, out) {
    const bank = ES.ownedBy(T, 'bank')
    if (!bank.length) return CARDS.surprise(E, T, you, day, r, town, out)
    const id = pickOf(r, bank)
    T.auction = D.startAuction(T, id)
    out.auction = T.auction
    card(out, 'auction', '🔨', 'Surprise auction', `The bank is auctioning a home on ${streetName(T, id)}, worth about ✦ ${ES.value(T, id)}. Bid now or let the neighbours have it.`, 'deal')
  },
  surprise(E, T, you, day, r, town, out) {
    const mine = ES.ownedBy(T, 'you')
    const ups = mine.reduce((a, id) => a + T.deeds[id].level, 0)
    const list = [
      () => {
        if (!ups) return card(out, 'surprise', '⛈️', 'Storm!', 'A storm swept through town, but your homes had nothing to blow away.', 'good')
        const amt = ups * 20
        out.costs.push({ amount: amt, why: 'repairs', town })
        card(out, 'surprise', '⛈️', 'Storm damage', `A storm tore through town. Repairs on your upgrades: ✦ ${amt}.`, 'bad')
      },
      () => { const amt = between(r, 30, 120); out.costs.push({ amount: amt, why: 'repairs', town }); card(out, 'surprise', '🚰', 'Burst pipe', `A pipe burst in the night. The plumber’s bill: ✦ ${amt}.`, 'bad') },
      () => { const amt = between(r, 40, 160); you.coins += amt; card(out, 'surprise', '📬', 'Tax refund', `The council overcharged you. Refund: ✦ ${amt}.`, 'good') },
      () => { const amt = between(r, 100, 300); you.coins += amt; card(out, 'surprise', '🎁', 'Inheritance', `A great-aunt you barely remember left you ✦ ${amt}.`, 'good') },
      () => { const amt = Math.round((T.pot || 0) / 2); you.coins += amt; T.pot -= amt; card(out, 'surprise', '⛲', 'Wishing Fountain', amt ? `Your wish came true: half the fountain pot, ✦ ${amt}!` : 'You made a wish, but the fountain pot is empty.', amt ? 'good' : 'deal') },
      () => { T.index = Math.min(1.4, T.index * 1.08); card(out, 'surprise', '📈', 'Property boom', 'Everyone wants to live here! Every home in town is worth 8% more.', 'good') },
      () => { T.index = Math.max(0.75, T.index * 0.93); card(out, 'surprise', '📉', 'Market slump', 'Buyers are nervous. Every home in town is worth 7% less. A good time to buy?', 'bad') },
      () => { const amt = between(r, 15, 40); out.costs.push({ amount: amt, why: 'fine', town }); card(out, 'surprise', '🛴', 'Parking fine', `You left your scooter on the pavement: ✦ ${amt}. It goes to the fountain pot.`, 'bad') },
      () => {
        const rich = Object.entries(T.npc).filter(([, n]) => n.coins > 200)
        if (!rich.length) return card(out, 'surprise', '🍰', 'Cake!', 'A neighbour brought you cake. Not money, but lovely.', 'good')
        const [name, n] = pickOf(r, rich), amt = between(r, 20, 60)
        n.coins -= amt; you.coins += amt
        card(out, 'surprise', '🤝', 'A neighbour’s thanks', `${name} paid you ✦ ${amt} for helping with their garden.`, 'good')
      },
    ]
    pickOf(r, list)()
  },
  zoning(E, T, you, day, r, town, out) {
    const zoned = Object.keys(T.zones)
    if (!zoned.length || r() < 0.45) {
      const s = pickOf(r, T.streets.filter(st => !T.zones[st.id]))
      if (!s) return CARDS.surprise(E, T, you, day, r, town, out)
      const max = r() < 0.5 ? 2 : 3
      T.zones[s.id] = { max, name: pickOf(r, ZONE_NAMES), day }
      ES.addNews(T, day, `The council zoned ${s.name} as ${T.zones[s.id].name}: no building past ${ES.LEVELS[max].name}.`)
      return card(out, 'zoning', '📜', 'New zoning rule', `${s.name} is now a ${T.zones[s.id].name} area. Homes there mustn’t be built past “${ES.LEVELS[max].name}”. Anything higher can be fined at an inspection.`, 'deal')
    }
    // an inspection
    const fines = overZone(T, 'you')
    let total = 0
    for (const f of fines) {
      if (E.permits > 0) { E.permits--; out.events.push(`Your building permit covered a home on ${streetName(T, f.id)}.`); continue }
      total += f.fine
    }
    if (total) out.costs.push({ amount: total, why: 'fine', town })
    for (const [name, n] of Object.entries(T.npc)) {
      const theirs = overZone(T, name).reduce((a, f) => a + f.fine, 0)
      if (theirs) { const paid = Math.min(n.coins, theirs); n.coins -= paid; T.pot += paid; out.events.push(`${name} was fined ✦ ${theirs} for building too high.`) }
    }
    card(out, 'zoning', '🕵️', 'Zoning inspection', total ? `The inspector found homes built past the zoning rules. Fine: ✦ ${total}.` : fines.length ? 'The inspector came, but your permits covered everything.' : 'The inspector checked your homes: all within the rules. Phew!', total ? 'bad' : 'good')
  },
  key(E, T, you, day, r, town, out) {
    const k = r()
    if (k < 0.4) { today(E, day).bonus++; return card(out, 'key', '🗝️', 'Golden key', 'You found a golden key: one more free draw today!', 'good') }
    if (k < 0.7) { E.permits++; return card(out, 'key', '📄', 'Building permit', 'A permit lets one home skip a zoning fine at the next inspection.', 'good') }
    E.freeCards = (E.freeCards || 0) + 1
    card(out, 'key', '🎫', 'Get out free', 'Keep this card: it gets you out of the Ranger’s office once.', 'good')
  },
}

/** Buy today's bargain (the offer from your last draw). */
export function takeOffer(E, T, you, day) {
  const o = T.offer
  if (!o || o.day !== day) return { ok: false, msg: 'That offer has ended.' }
  if (ES.frozen(E, day)) return { ok: false, msg: 'The Ranger has paused your buying until tomorrow.' }
  const d = T.deeds[o.id]
  if (d.owner !== o.from) { T.offer = null; return { ok: false, msg: 'Someone else bought it first.' } }
  if (you.coins < o.price) return { ok: false, msg: `You need ✦ ${o.price}. You could borrow from the bank.` }
  you.coins -= o.price
  if (T.npc[o.from]) T.npc[o.from].coins += o.price
  Object.assign(d, { owner: 'you', tenant: null, renter: null, letting: false })
  T.offer = null
  ES.addNews(T, day, `You snapped up a home on ${ES.streetOf(T, o.id).name} for ✦ ${o.price}.`)
  return { ok: true, msg: `It’s yours for ✦ ${o.price}!` }
}

/** Everyone across every town, richest first (your coins and loan count). */
export function leaderboard(E, towns, youCoins) {
  const rows = { You: { name: 'You', worth: youCoins - (E.debt || 0), homes: 0, you: true } }
  for (const T of Object.values(towns)) {
    rows.You.worth += ES.worth(T, 'you', 0)
    rows.You.homes += ES.ownedBy(T, 'you').length
    for (const [name, n] of Object.entries(T.npc)) {
      const owes = Object.values((T.ious || {})[name] || {}).reduce((a, b) => a + b, 0)
      const row = rows[name] ||= { name, worth: 0, homes: 0 }
      row.worth += ES.worth(T, name, n.coins) - owes
      row.homes += ES.ownedBy(T, name).length
    }
  }
  return Object.values(rows).sort((a, b) => b.worth - a.worth)
}
