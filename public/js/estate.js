// Paws & Properties: the town's property market. Every home has a deed owned by the bank, a neighbour
// or you. Homes on the same short street form a set: owning the whole street doubles its rent. You can
// buy, sell, trade, renovate, mortgage and rent out homes; neighbours do the same each morning, so who
// owns what keeps changing. Weekly tax, morning letters (surprises), and getting caught by the Ranger
// when you can't pay keep it lively. Plain logic and data only (no DOM), so it's testable and works the
// same on the web, Android and Reddit.

// ---------- numbers ----------

export const LEVELS = [
  { name: 'Original', value: 1, rent: 1 },
  { name: 'Fresh paint & garden', value: 1.3, rent: 1.6 },
  { name: 'Extension', value: 1.7, rent: 2.4 },
  { name: 'Deluxe', value: 2.2, rent: 3.4 },
]
export const RENOVATE_SHARE = 0.25 // each level costs a quarter of the base price
export const SELL_SHARE = 0.7 // the bank pays 70% of value
export const MORTGAGE_SHARE = 0.5
export const LIFT_SHARE = 0.55 // paying off costs 10% more than you got
export const TAX_RATE = 0.02 // weekly, on the value of homes you own (not mortgaged ones)
export const TAX_EVERY = 7
export const CAUGHT_FINE = 25
export const START_NPC_COINS = [500, 1400]
export const PERSONAS = {
  careful: { label: 'Careful saver', ask: 1.35, reserve: 400, buyChance: 0.25 },
  bold: { label: 'Bold buyer', ask: 1.15, reserve: 120, buyChance: 0.5 },
  trader: { label: 'Keen trader', ask: 1.2, reserve: 250, buyChance: 0.35 },
}
const STREET_WORDS = ['Row', 'Close', 'Mews', 'Walk', 'Court', 'Crescent', 'Rise', 'Gardens']

// ---------- random ----------

export function rng(seed) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, a) => a[Math.floor(r() * a.length)]

// ---------- setting up a town ----------

/**
 * Split each district's homes into short streets of 2-3 neighbouring homes.
 * homes: [{ id, i, j, price, rent }], districtOf(home) -> key, districtInfo[key] = [name, color]
 */
export function makeStreets(homes, districtOf, districtInfo) {
  const byD = {}
  for (const h of homes) (byD[districtOf(h)] = byD[districtOf(h)] || []).push(h)
  const streets = []
  for (const [d, list] of Object.entries(byD)) {
    // walk the district in a snake so a street's homes are near each other
    list.sort((a, b) => a.j + a.i * 0.5 - (b.j + b.i * 0.5))
    // streets of 2-3 homes: 4 -> 2+2, 5 -> 3+2, 7 -> 3+2+2 (a district with one home is its own street)
    const n = list.length
    const groups = n <= 3 ? 1 : Math.ceil(n / 3)
    const sizes = Array.from({ length: groups }, (_, k) => Math.floor(n / groups) + (k < n % groups ? 1 : 0))
    const [dname, color] = districtInfo[d] || [d, '#8899AA']
    const base = dname.split(' ')[0]
    let at = 0
    sizes.forEach((sz, k) => {
      const ids = list.slice(at, at + sz).map(h => h.id)
      at += sz
      streets.push({ id: `${d}-${k}`, name: `${base} ${STREET_WORDS[k % STREET_WORDS.length]}`, color, homes: ids })
    })
  }
  return streets
}

/**
 * A fresh market for one town. Each named neighbour gets the home nearest where they live (they live
 * there and won't sell it), and some get a second one. The rest are for sale from the bank.
 * neighbours: [{ name, traits, home: [i, j] }]
 */
export function newTown(homes, streets, neighbours, seed) {
  const r = rng(seed)
  const deeds = {}
  const streetOf = {}
  for (const s of streets) for (const id of s.homes) streetOf[id] = s.id
  for (const h of homes) deeds[h.id] = { owner: 'bank', p: h.price, r: h.rent, st: streetOf[h.id], level: 0, mort: false, tenant: null, lives: null }
  const npc = {}
  const taken = new Set()
  for (const n of neighbours) {
    const persona = n.traits?.includes('Neat') || n.traits?.includes('Bookworm') ? 'careful' : n.traits?.includes('Social Butterfly') || n.traits?.includes('Music Lover') ? 'trader' : n.traits?.includes('Playful') || n.traits?.includes('Athletic') ? 'bold' : pick(r, ['careful', 'bold', 'trader'])
    npc[n.name] = { coins: Math.round(START_NPC_COINS[0] + r() * (START_NPC_COINS[1] - START_NPC_COINS[0])), persona }
    // keep at least 40% of homes with the bank so there's always something to buy
    const keep = Math.ceil(homes.length * 0.4)
    const free = homes.filter(h => !taken.has(h.id))
    if (free.length <= keep) continue // this neighbour lodges with family and owns nothing yet
    const at = n.home || [free[0].i, free[0].j]
    free.sort((a, b) => Math.hypot(a.i - at[0], a.j - at[1]) - Math.hypot(b.i - at[0], b.j - at[1]))
    const home = free[0]
    taken.add(home.id)
    Object.assign(deeds[home.id], { owner: n.name, lives: n.name })
    if (r() < 0.45 && homes.length - taken.size > keep) {
      const extra = homes.find(h => !taken.has(h.id) && deeds[h.id].st === deeds[home.id].st) || homes.find(h => !taken.has(h.id))
      if (extra) {
        taken.add(extra.id)
        deeds[extra.id].owner = n.name
      }
    }
  }
  return { v: 1, deeds, streets, npc, index: 1, day: null, news: [], seed: seed | 0 }
}

// ---------- values ----------

const deedsOn = (T, st) => T.streets.find(s => s.id === st)?.homes || []
export const streetOf = (T, id) => T.streets.find(s => s.id === T.deeds[id].st)
/** Does `owner` hold every home on this home's street? */
export function fullStreet(T, id, owner = T.deeds[id].owner) {
  const list = deedsOn(T, T.deeds[id].st)
  return list.length > 1 && list.every(h => T.deeds[h].owner === owner)
}
export function value(T, id) {
  const d = T.deeds[id]
  return Math.round(d.p * LEVELS[d.level].value * T.index * (fullStreet(T, id) && d.owner !== 'bank' ? 1.1 : 1))
}
export function rentOf(T, id) {
  const d = T.deeds[id]
  if (d.mort) return 0
  return Math.round(d.r * LEVELS[d.level].rent * (fullStreet(T, id) && d.owner !== 'bank' ? 2 : 1))
}
export const buyPrice = (T, id) => Math.round(value(T, id))
export const sellPrice = (T, id) => Math.max(0, Math.round(value(T, id) * SELL_SHARE) - (T.deeds[id].mort ? liftCost(T, id) : 0))
export const renovateCost = (T, id) => Math.round(T.deeds[id].p * RENOVATE_SHARE * (T.deeds[id].level + 1))
export const mortgageGet = (T, id) => Math.round(value(T, id) * MORTGAGE_SHARE)
export const liftCost = (T, id) => T.deeds[id].mortAmt ? Math.round(T.deeds[id].mortAmt * (LIFT_SHARE / MORTGAGE_SHARE)) : Math.round(value(T, id) * LIFT_SHARE)
export const ownedBy = (T, owner) => Object.keys(T.deeds).filter(id => T.deeds[id].owner === owner)
export function worth(T, owner, coins = 0) {
  return coins + ownedBy(T, owner).reduce((a, id) => a + (T.deeds[id].mort ? value(T, id) - liftCost(T, id) : value(T, id)), 0)
}

// ---------- your actions (each returns { ok, msg } and changes `you.coins`) ----------

const no = msg => ({ ok: false, msg })
const yes = msg => ({ ok: true, msg })
/** Trading is frozen for the rest of the day after you're caught. */
export const frozen = (E, day) => E.caughtUntil !== undefined && day <= E.caughtUntil

export function buyFromBank(E, T, id, you, day) {
  const d = T.deeds[id]
  if (frozen(E, day)) return no('The Ranger has paused your property trading until tomorrow.')
  if (d.owner !== 'bank') return no('That home isn’t for sale by the bank.')
  const cost = buyPrice(T, id)
  if (you.coins < cost) return no(`You need ✦ ${cost}.`)
  you.coins -= cost
  Object.assign(d, { owner: 'you', tenant: null, renter: null }) // buying the home you rent ends the rental
  news(T, day, `You bought a home on ${streetOf(T, id).name}.`)
  return yes(`It’s yours for ✦ ${cost}!${fullStreet(T, id) ? ` You own all of ${streetOf(T, id).name}: rent doubles!` : ''}`)
}

/** What a neighbour wants for their home, or null if they won't sell (they live there). */
export function askPrice(T, id) {
  const d = T.deeds[id]
  if (d.owner === 'bank' || d.owner === 'you') return null
  if (d.lives === d.owner) return null
  const p = PERSONAS[T.npc[d.owner]?.persona] || PERSONAS.careful
  // they want more for a home on a street they nearly own
  const mine = deedsOn(T, d.st).filter(h => T.deeds[h].owner === d.owner).length
  const hold = mine >= 2 ? 1.4 : 1
  return Math.round(value(T, id) * p.ask * hold)
}
export function offerToNeighbour(E, T, id, you, amount, day) {
  const d = T.deeds[id]
  if (frozen(E, day)) return no('The Ranger has paused your property trading until tomorrow.')
  const ask = askPrice(T, id)
  if (ask === null) return no(d.lives === d.owner ? `${d.owner} lives there and won’t sell.` : 'That home isn’t a neighbour’s to sell.')
  if (amount > you.coins) return no(`You only have ✦ ${you.coins}.`)
  if (amount < ask) {
    const close = amount >= ask * 0.9
    return no(close ? `${d.owner} says: “So close! I’d take ✦ ${ask}.”` : `${d.owner} says: “Hmm, no. It’s worth more to me than ✦ ${amount}.”`)
  }
  you.coins -= amount
  T.npc[d.owner].coins += amount
  news(T, day, `You bought ${d.owner}’s home on ${streetOf(T, id).name}.`)
  const was = d.owner
  Object.assign(d, { owner: 'you', tenant: null })
  return yes(`${was} accepts ✦ ${amount}. It’s yours!`)
}

export function sellToBank(E, T, id, you, day) {
  const d = T.deeds[id]
  if (frozen(E, day)) return no('The Ranger has paused your property trading until tomorrow.')
  if (d.owner !== 'you') return no('You don’t own that home.')
  const get = sellPrice(T, id)
  you.coins += get
  Object.assign(d, { owner: 'bank', level: 0, mort: false, mortAmt: 0, tenant: null })
  news(T, day, `You sold a home on ${streetOf(T, id).name} to the bank.`)
  return yes(`Sold to the bank for ✦ ${get}.`)
}

export function renovate(E, T, id, you) {
  const d = T.deeds[id]
  if (d.owner !== 'you') return no('You don’t own that home.')
  if (d.mort) return no('Pay off the mortgage before renovating.')
  if (d.level >= LEVELS.length - 1) return no('It’s already Deluxe.')
  const cost = renovateCost(T, id)
  if (you.coins < cost) return no(`You need ✦ ${cost}.`)
  you.coins -= cost
  d.level++
  return yes(`Renovated: ${LEVELS[d.level].name}! Rent is now ✦ ${rentOf(T, id)} a day.`)
}

export function mortgage(E, T, id, you) {
  const d = T.deeds[id]
  if (d.owner !== 'you') return no('You don’t own that home.')
  if (d.mort) return no('It’s already mortgaged.')
  const get = mortgageGet(T, id)
  you.coins += get
  Object.assign(d, { mort: true, mortAmt: get })
  return yes(`Mortgaged for ✦ ${get}. It earns no rent until you pay ✦ ${liftCost(T, id)} back.`)
}
export function liftMortgage(E, T, id, you) {
  const d = T.deeds[id]
  if (d.owner !== 'you' || !d.mort) return no('Nothing to pay off.')
  const cost = liftCost(T, id)
  if (you.coins < cost) return no(`You need ✦ ${cost}.`)
  you.coins -= cost
  Object.assign(d, { mort: false, mortAmt: 0 })
  return yes('Mortgage paid off.')
}

/** Rent out a home you own. A tenant moves in on a later morning. */
export function setLetting(T, id, on) {
  const d = T.deeds[id]
  if (d.owner !== 'you') return no('You don’t own that home.')
  if (on && d.mort) return no('Pay off the mortgage before renting it out.')
  d.letting = !!on
  if (!on) d.tenant = null
  return yes(on ? 'Listed for rent. A tenant usually moves in within a day or two.' : 'No longer for rent.')
}

/**
 * Swap homes with a neighbour, with coins either way. give/get: home ids. cash > 0 means you pay.
 */
export function proposeSwap(E, T, { give = [], get = [], cash = 0 }, you, day) {
  if (frozen(E, day)) return no('The Ranger has paused your property trading until tomorrow.')
  if (!give.length && !get.length) return no('Pick at least one home.')
  if (give.some(id => T.deeds[id].owner !== 'you')) return no('You can only give homes you own.')
  const owners = [...new Set(get.map(id => T.deeds[id].owner))]
  if (owners.length !== 1 || owners[0] === 'you' || owners[0] === 'bank') return no('Pick homes from one neighbour.')
  const who = owners[0]
  if (get.some(id => T.deeds[id].lives === who)) return no(`${who} won’t trade the home they live in.`)
  if (cash > you.coins) return no(`You only have ✦ ${you.coins}.`)
  if (cash < 0 && -cash > T.npc[who].coins) return no(`${who} doesn’t have ✦ ${-cash}.`)
  const p = PERSONAS[T.npc[who].persona]
  const gets = give.reduce((a, id) => a + value(T, id) * (T.deeds[id].mort ? 0.5 : 1), 0) + cash
  const gives = get.reduce((a, id) => a + (askPrice(T, id) ?? value(T, id) * p.ask), 0)
  // would this hand you a full street? they want more for that
  const completes = get.some(id => deedsOn(T, T.deeds[id].st).every(h => get.includes(h) || T.deeds[h].owner === 'you'))
  const need = gives * (completes ? 1.25 : 1)
  if (gets < need) return no(`${who} says: “Not quite. Add about ✦ ${Math.ceil(need - gets)} and we have a deal.”`)
  you.coins -= cash
  T.npc[who].coins += cash
  for (const id of give) Object.assign(T.deeds[id], { owner: who, tenant: null, letting: false })
  for (const id of get) Object.assign(T.deeds[id], { owner: 'you', tenant: null })
  news(T, day, `You and ${who} swapped homes.`)
  return yes(`${who} shakes your paw. Deal!`)
}

/** Answer a neighbour's offer to buy one of your homes. */
export function answerOffer(E, T, offer, yesNo, you, day) {
  T.offers = (T.offers || []).filter(o => o !== offer && !(o.id === offer.id && o.from === offer.from))
  if (!yesNo) return yes(`You told ${offer.from} no thanks.`)
  const d = T.deeds[offer.id]
  if (!d || d.owner !== 'you') return no('You don’t own that home any more.')
  if (T.npc[offer.from].coins < offer.price) return no(`${offer.from} can’t afford it any more.`)
  T.npc[offer.from].coins -= offer.price
  const owed = d.mort ? liftCost(T, offer.id) : 0
  you.coins += offer.price - owed
  Object.assign(d, { owner: offer.from, tenant: null, letting: false, mort: false, mortAmt: 0 })
  news(T, day, `${offer.from} bought your home on ${streetOf(T, offer.id).name}.`)
  return yes(`Sold to ${offer.from} for ✦ ${offer.price}${owed ? ` (✦ ${owed} paid off the mortgage)` : ''}.`)
}

// ---------- rent you pay to live in someone else's home ----------

/** Can you rent this home to live in? Bank homes, and neighbours' spare homes with no tenant. */
export function rentable(T, id) {
  const d = T.deeds[id]
  if (d.owner === 'you') return false
  if (d.owner === 'bank') return true
  return d.lives !== d.owner && !d.tenant
}
/** Your rent for a neighbour's home goes to them. */
export function payRentTo(T, id, amount) {
  const d = T.deeds[id]
  if (d.owner !== 'bank' && d.owner !== 'you' && T.npc[d.owner]) T.npc[d.owner].coins += amount
}

// ---------- letters: the morning surprises ----------

export const LETTERS = [
  { text: 'A pipe burst! Repairs cost ✦ 15 for each home you own.', do: 'perHome', n: -15 },
  { text: 'Your garden won the Bloom Award. Collect ✦ 60.', do: 'coins', n: 60 },
  { text: 'Busy week in town: home values rise 8%.', do: 'index', n: 1.08 },
  { text: 'A quiet season: home values dip 6%.', do: 'index', n: 0.94 },
  { text: 'Your tenants left a thank-you card and a tip. Collect ✦ 10 for each rented-out home.', do: 'perTenant', n: 10 },
  { text: 'The inspector found weeds at your homes that aren’t renovated: ✦ 10 each.', do: 'perPlain', n: -10 },
  { text: 'Lucky find: an old coin jar in the attic. Collect ✦ 35.', do: 'coins', n: 35 },
  { text: 'Roof tiles blew off in the storm. Pay ✦ 30.', do: 'coins', n: -30 },
  { text: 'The Mayor is giving a homeowner’s grant: ✦ 25 for each Deluxe home.', do: 'perDeluxe', n: 25 },
  { text: 'Street party! Every neighbour gives you ✦ 5.', do: 'party', n: 5 },
]
function applyLetter(T, L, you, costs) {
  const mine = ownedBy(T, 'you')
  switch (L.do) {
    case 'coins':
      if (L.n > 0) you.coins += L.n
      else costs.push({ amount: -L.n, why: 'letter' })
      break
    case 'perHome':
      if (mine.length) costs.push({ amount: -L.n * mine.length, why: 'repairs' })
      break
    case 'perPlain': {
      const n = mine.filter(id => T.deeds[id].level === 0).length
      if (n) costs.push({ amount: -L.n * n, why: 'inspection' })
      break
    }
    case 'perTenant':
      you.coins += L.n * mine.filter(id => T.deeds[id].tenant).length
      break
    case 'perDeluxe':
      you.coins += L.n * mine.filter(id => T.deeds[id].level === LEVELS.length - 1).length
      break
    case 'index':
      T.index = Math.min(1.4, Math.max(0.75, T.index * L.n))
      break
    case 'party':
      for (const n of Object.values(T.npc)) {
        if (n.coins >= L.n) {
          n.coins -= L.n
          you.coins += L.n
        }
      }
      break
  }
}

// ---------- the morning: rent, tenants, neighbours, letters, tax ----------

const news = (T, day, text) => {
  T.news.unshift({ day, text })
  if (T.news.length > 30) T.news.length = 30
}
const TENANTS = ['a young hedgehog couple', 'a retired tortoise', 'a family of mice', 'a travelling owl', 'two beaver builders', 'a quiet squirrel artist', 'a duck who loves baking', 'a frog musician']

/**
 * Run one morning for a town. Returns { income, costs: [{amount, why}], events: [text], letter, offers }.
 * Costs aren't taken here: the caller pays them with payCosts() so debts are handled in one place.
 */
export function morning(E, T, day, you, { letters = true } = {}) {
  const r = rng((T.seed ^ (day * 2654435761)) | 0)
  const out = { income: 0, costs: [], events: [], letter: null, offers: [] }
  T.day = day
  // market drifts a little each day
  T.index = Math.min(1.4, Math.max(0.75, T.index * (1 + (r() - 0.5) * 0.06)))
  // your homes: tenants pay, move in and move out
  for (const id of ownedBy(T, 'you')) {
    const d = T.deeds[id]
    if (d.tenant) {
      out.income += rentOf(T, id)
      if (r() < 0.06) {
        out.events.push(`Your tenant ${d.tenant} moved out of a home on ${streetOf(T, id).name}.`)
        d.tenant = null
      }
    } else if (d.letting && !d.mort && r() < 0.55) {
      d.tenant = pick(r, TENANTS)
      out.events.push(`${d.tenant[0].toUpperCase() + d.tenant.slice(1)} moved into your home on ${streetOf(T, id).name}. Rent: ✦ ${rentOf(T, id)} a day.`)
    }
  }
  you.coins += out.income
  // neighbours: earn, collect rent, then maybe buy, renovate, sell or trade
  const names = Object.keys(T.npc)
  for (const name of names) {
    const n = T.npc[name]
    n.coins += 30 + Math.floor(r() * 40)
    for (const id of ownedBy(T, name)) if (T.deeds[id].lives !== name) n.coins += rentOf(T, id)
  }
  let boughtFromBank = false // one bank sale a morning, so homes stay on the market for you
  for (const name of names) {
    const n = T.npc[name]
    const p = PERSONAS[n.persona]
    if (r() > p.buyChance) continue
    const forSale = boughtFromBank || ownedBy(T, name).length >= 3 || ownedBy(T, 'bank').length <= Object.keys(T.deeds).length * 0.35 ? [] : Object.keys(T.deeds).filter(id => T.deeds[id].owner === 'bank' && T.deeds[id].renter !== 'you' && buyPrice(T, id) <= n.coins - p.reserve)
    if (forSale.length) {
      // prefer a home on a street they already have a foot in
      forSale.sort((a, b) => score(T, name, b) - score(T, name, a))
      const id = forSale[0]
      n.coins -= buyPrice(T, id)
      T.deeds[id].owner = name
      boughtFromBank = true
      news(T, day, `${name} bought a home on ${streetOf(T, id).name}.`)
      out.events.push(`${name} bought a home on ${streetOf(T, id).name}.`)
      continue
    }
    const fix = ownedBy(T, name).find(id => T.deeds[id].level < LEVELS.length - 1 && renovateCost(T, id) <= n.coins - p.reserve)
    if (fix) {
      n.coins -= renovateCost(T, fix)
      T.deeds[fix].level++
      news(T, day, `${name} renovated a home on ${streetOf(T, fix).name}.`)
      continue
    }
    if (n.coins < 60 || r() < 0.12) { // short of coins, or just fancies a change
      const spare = ownedBy(T, name).find(id => T.deeds[id].lives !== name)
      if (spare) {
        n.coins += sellPrice(T, spare)
        Object.assign(T.deeds[spare], { owner: 'bank', level: 0 })
        news(T, day, `${name} sold a home on ${streetOf(T, spare).name}.`)
      }
    }
  }
  // neighbour-to-neighbour trades that complete a street
  if (n2nTrade(T, r, day)) out.events.push(T.news[0].text)
  // offers on your homes
  const mine = ownedBy(T, 'you')
  if (mine.length && r() < 0.3) {
    const id = pick(r, mine)
    const buyers = names.filter(nm => T.npc[nm].coins > value(T, id) * 1.3)
    if (buyers.length) {
      const from = pick(r, buyers)
      const price = Math.round(value(T, id) * (1 + r() * 0.4))
      const offer = { from, id, price, day }
      T.offers = [...(T.offers || []).filter(o => o.day >= day - 2), offer]
      out.offers.push(offer)
    }
  }
  // a letter
  if (letters && mine.length && r() < 0.45) {
    const L = pick(r, LETTERS)
    out.letter = L.text
    applyLetter(T, L, you, out.costs)
  }
  return out
}
function score(T, name, id) {
  const on = deedsOn(T, T.deeds[id].st)
  return on.filter(h => T.deeds[h].owner === name).length * 10 - buyPrice(T, id) / 100
}
function n2nTrade(T, r, day) {
  for (const s of T.streets) {
    if (s.homes.length < 2) continue
    const owners = s.homes.map(h => T.deeds[h].owner)
    for (const name of Object.keys(T.npc)) {
      const have = owners.filter(o => o === name).length
      if (have !== s.homes.length - 1) continue
      const id = s.homes.find(h => T.deeds[h].owner !== name)
      const d = T.deeds[id]
      if (d.owner === 'you' || d.owner === 'bank' || d.lives === d.owner) continue
      const price = Math.round(value(T, id) * 1.5)
      if (T.npc[name].coins < price || r() > 0.5) continue
      T.npc[name].coins -= price
      T.npc[d.owner].coins += price
      news(T, day, `${name} bought ${d.owner}’s home and now owns all of ${s.name}!`)
      d.owner = name
      return true
    }
  }
  return false
}

/** Weekly property tax on your homes in this town (mortgaged ones are skipped). */
export function taxDue(T) {
  return Math.round(ownedBy(T, 'you').filter(id => !T.deeds[id].mort).reduce((a, id) => a + value(T, id), 0) * TAX_RATE)
}

/**
 * Pay what you owe. If coins run short: mortgage your homes (cheapest first); if that's not enough,
 * the bank takes homes back at half value. Any shortfall means you're caught: a fine and no
 * property trading until tomorrow.
 * towns: { cityId: T }. Returns messages.
 */
export function payCosts(E, towns, costs, you, day) {
  const msgs = []
  const total = costs.reduce((a, c) => a + c.amount, 0)
  if (total <= 0) return msgs
  const all = () => Object.entries(towns).flatMap(([cid, T]) => ownedBy(T, 'you').map(id => [cid, T, id]))
  if (you.coins < total) {
    for (const [, T, id] of all().filter(([, T, id]) => !T.deeds[id].mort).sort((a, b) => value(a[1], a[2]) - value(b[1], b[2]))) {
      if (you.coins >= total) break
      mortgage(E, T, id, you)
      msgs.push(`To cover what you owe, a home on ${streetOf(T, id).name} was mortgaged.`)
    }
  }
  if (you.coins < total) {
    for (const [, T, id] of all().sort((a, b) => value(a[1], a[2]) - value(b[1], b[2]))) {
      if (you.coins >= total) break
      const get = Math.max(0, Math.round(value(T, id) * 0.5) - (T.deeds[id].mort ? liftCost(T, id) : 0))
      you.coins += get
      Object.assign(T.deeds[id], { owner: 'bank', level: 0, mort: false, mortAmt: 0, tenant: null, letting: false })
      msgs.push(`The bank took back your home on ${streetOf(T, id).name} (you got ✦ ${get}).`)
    }
  }
  if (you.coins < total) {
    msgs.push(`You couldn’t pay everything. The Ranger caught you: ✦ ${CAUGHT_FINE} fine added and no property trading until tomorrow.`)
    you.coins = 0
    E.caughtUntil = day
    E.fines = (E.fines || 0) + CAUGHT_FINE
    return msgs
  }
  you.coins -= total
  return msgs
}

/** Fines from being caught are paid first thing when you have coins again. */
export function payFines(E, you) {
  if (!E.fines || you.coins <= 0) return 0
  const n = Math.min(E.fines, you.coins)
  E.fines -= n
  you.coins -= n
  return n
}

/** Everyone's net worth in a town, richest first. */
export function richList(T, youCoins) {
  const rows = [{ name: 'You', worth: worth(T, 'you', youCoins), homes: ownedBy(T, 'you').length, you: true }]
  for (const [name, n] of Object.entries(T.npc)) rows.push({ name, worth: worth(T, name, n.coins), homes: ownedBy(T, name).length })
  return rows.sort((a, b) => b.worth - a.worth)
}
