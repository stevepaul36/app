// A town that lives on its own, with no AI service: neighbours notice what you do, remember it,
// pass it on to each other, and bring it up when you walk by; and the land slowly grows by itself.
// Everything here is plain game logic (no network), so it works the same on the web, Android and Reddit.

// ---------- news: things you did that neighbours can notice ----------

/**
 * One kind of news per thing you can do. `weight` is how likely it is to be passed on (0–1).
 * `saw` is what someone who was there says; `heard` is how it sounds second-hand.
 * {item} is the thing, {who} the neighbour involved, {teller} who passed it on.
 */
export const NEWS = {
  gift: { icon: '🎁', did: 'gave {who} a {item}', weight: 0.9, saw: ['Thank you for the {item}! It made my whole day.', 'I still can’t believe you gave me a {item}!', 'That {item} was the nicest surprise!'], heard: ['{teller} told me you gave {who} a {item}. So kind!', 'I heard you surprised {who} with a {item}!'] },
  delivered: { icon: '💛', did: 'helped {who} out', weight: 0.9, saw: ['You brought exactly what I wanted. You’re the best!', 'Thank you for helping me out!'], heard: ['{teller} says you helped {who} out. Nice!', 'Everyone’s saying you helped {who}!'] },
  fish: { icon: '🎣', did: 'caught a {item}', weight: 0.6, saw: ['I saw you catch a {item}! So cool!', 'Wow, a {item}! You’re a real angler.'], heard: ['{teller} told me you caught a {item}!', 'Is it true you caught a {item}?'] },
  harvest: { icon: '🥕', did: 'grew some {item}', weight: 0.5, saw: ['Your {item} looked so tasty!', 'You grew that {item} yourself? Amazing!'], heard: ['{teller} says your garden grows the best {item}.', 'I heard about your {item} harvest!'] },
  craft: { icon: '🔨', did: 'made a {item}', weight: 0.6, saw: ['Did you really make a {item} yourself?', 'That {item} you made is lovely!'], heard: ['{teller} told me you made a {item}!', 'Word is you’re handy. A {item}, wow!'] },
  bug: { icon: '🐞', did: 'caught a {item}', weight: 0.4, saw: ['Nice catch! That {item} was speedy.', 'You caught a {item}! I always miss them.'], heard: ['{teller} saw you catch a {item}.'] },
  garden: { icon: '🌷', did: 'helped the Old Garden grow', weight: 1, saw: ['The Old Garden is coming back to life. Thank you!', 'I walked past the Old Garden. You did that!'], heard: ['{teller} told me you’re fixing up the Old Garden!', 'The whole town is talking about the Old Garden!'] },
  game: { icon: '🕹️', did: 'played {item}', weight: 0.4, saw: ['You were great at {item}!', 'I watched you play {item}. Teach me!'], heard: ['{teller} says you’re a star at {item}.'] },
  tree: { icon: '🌳', did: 'shook a tree', weight: 0.15, saw: ['Did anything fall out of that tree?', 'Shaking trees? Fun! I tried once.'], heard: ['{teller} saw you shaking the trees!'] },
  wave: { icon: '👋', did: 'said hi to everyone', weight: 0.3, saw: ['Hi again! Nice to see you.'], heard: ['{teller} says you’re really friendly.', '{teller} told me all about you!'] },
}

export const NEWS_KEEP_DAYS = 6
export const NEWS_MAX = 24

/** Add a piece of news that the given neighbours saw. Repeats on the same day just add witnesses. */
export function addNews(news, ev, day, witnesses) {
  const list = Array.isArray(news) ? news.filter(n => n && day - n.day <= NEWS_KEEP_DAYS) : []
  const same = list.find(n => n.t === ev.t && n.day === day && n.item === (ev.item || '') && n.who === (ev.who || ''))
  const saw = [...new Set(witnesses.filter(Boolean))]
  if (same) {
    for (const w of saw) if (!same.knows.includes(w)) same.knows.push(w)
    return list
  }
  list.unshift({ id: `${day}-${ev.t}-${Math.floor(Math.random() * 1e6)}`, t: ev.t, item: ev.item || '', who: ev.who || '', day, knows: saw, from: {}, told: [] })
  return list.slice(0, NEWS_MAX)
}

/**
 * Two neighbours finished chatting: each may pass on one piece of news the other hasn't heard.
 * Juicier news spreads more often. `r` is a random function. Returns what was passed on.
 */
export function gossip(news, a, b, r = Math.random) {
  const passed = []
  for (const [teller, listener] of [[a, b], [b, a]]) {
    const options = (news || []).filter(n => n.knows.includes(teller) && !n.knows.includes(listener) && n.who !== listener)
    options.sort((x, y) => (NEWS[y.t]?.weight || 0) - (NEWS[x.t]?.weight || 0))
    const n = options.find(x => r() < (NEWS[x.t]?.weight || 0))
    if (!n) continue
    n.knows.push(listener)
    n.from[listener] = teller
    passed.push({ teller, listener, id: n.id })
  }
  return passed
}

// ---------- what a neighbour says when you walk up ----------

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '')
const pickOf = (a, r) => a[Math.floor(r() * a.length)]

const SMALL_TALK = {
  morning: ['Good morning! Lovely day for it.', 'Morning! Did you sleep well?'],
  evening: ['What a pretty sunset.', 'Evening! The lamps look cozy tonight.'],
  night: ['It’s late! I should get some sleep.', 'The stars are out. Look up!'],
  rain: ['Don’t forget your umbrella!', 'The garden loves this rain.'],
  snow: ['Snow! Want to build a snowman?', 'Brr, it’s chilly. Stay warm!'],
  hungry: ['My tummy’s rumbling. Lunch soon!', 'I could really go for a honey bun.'],
  sleepy: ['Yawn… I need a nap.', 'I’m so sleepy today.'],
  happy: ['I’m having the best day!', 'Everything feels just right today.'],
}
const TRAIT_TALK = {
  Outdoorsy: ['The pond is extra sparkly today.', 'I found a four-leaf clover this morning!'],
  Foodie: ['Have you tried the café’s cocoa?', 'I’m baking something special later.'],
  Bookworm: ['I just finished a great book.', 'The library got new books today!'],
  Artist: ['I’m painting the clock tower next.', 'The light is perfect for drawing.'],
  'Music Lover': ['I can’t stop humming this song.', 'There’s music at the bandstand later!'],
  Athletic: ['Race you to the fountain!', 'I jogged the whole ring lane today.'],
  Playful: ['Wanna play tag? You’re it!', 'I hid a coin somewhere in town. Hehe!'],
  'Social Butterfly': ['Have you met everyone in town yet?', 'I love a good chat!'],
  Shy: ['Oh! Um… hi.', '…Hello. Nice day, isn’t it?'],
  Neat: ['I tidied my whole house today.', 'Someone left litter by the bench. Not me!'],
  'Early Bird': ['I was up before the sun!', 'Mornings are the best part of the day.'],
  'Night Owl': ['I’m never up this early…', 'The town is so quiet at night.'],
}

/** A friendly tweak in the neighbour's own style. */
function flavour(text, traits, r, news = false) {
  if (traits.includes('Shy') && r() < 0.6) return `Um… ${text.charAt(0).toLowerCase()}${text.slice(1)}`
  if (traits.includes('Playful') && r() < 0.4) return `${text} Hehe!`
  if (news && traits.includes('Social Butterfly') && r() < 0.4) return `${text} Everyone’s talking about it!`
  return text
}

/**
 * Choose what neighbour `name` says to you. First something they saw you do and haven't
 * mentioned yet, then something they heard from another neighbour, then small talk.
 * Marks the news as told so it isn't repeated. Returns { text, icon, newsId? }.
 */
export function greetingFor(name, traits, news, ctx, r = Math.random) {
  const mine = (news || []).filter(n => n.knows.includes(name) && !n.told.includes(name))
  // what they saw happen themselves comes first, then the juiciest thing they heard
  mine.sort((a, b) => Number(!!a.from[name]) - Number(!!b.from[name]) || (NEWS[b.t]?.weight || 0) - (NEWS[a.t]?.weight || 0) || b.day - a.day)
  const n = mine[0]
  if (n && NEWS[n.t]) {
    n.told.push(name)
    const def = NEWS[n.t]
    const teller = n.from[name]
    const aboutThem = n.who === name
    const text = teller && !aboutThem
      ? fill(pickOf(def.heard, r), { item: n.item, who: n.who || 'someone', teller })
      : aboutThem || !n.who
        ? fill(pickOf(def.saw, r), { item: n.item })
        : fill(pickOf(def.heard, r), { item: n.item, who: n.who, teller: 'Someone' })
    return { text: flavour(text, traits, r, true), icon: def.icon, newsId: n.id }
  }
  const pool = []
  const h = ctx.hour ?? 12
  if (ctx.weather === 'rain') pool.push(...SMALL_TALK.rain)
  else if (ctx.weather === 'snow') pool.push(...SMALL_TALK.snow)
  if (h >= 6 && h < 10) pool.push(...SMALL_TALK.morning)
  else if (h >= 18 && h < 21) pool.push(...SMALL_TALK.evening)
  else if (h >= 21 || h < 5) pool.push(...SMALL_TALK.night)
  if ((ctx.hunger ?? 100) < 35) pool.push(...SMALL_TALK.hungry)
  if ((ctx.energy ?? 100) < 30) pool.push(...SMALL_TALK.sleepy)
  if ((ctx.mood ?? 50) > 80) pool.push(...SMALL_TALK.happy)
  for (const t of traits) pool.push(...(TRAIT_TALK[t] || []))
  if (ctx.ownLine) pool.push(ctx.ownLine)
  return { text: flavour(pickOf(pool.length ? pool : SMALL_TALK.happy, r), traits, r), icon: '💬' }
}

/** What a neighbour knows about you, for their friendship screen: [{ icon, text, from }]. */
export function knownBy(news, name) {
  return (news || [])
    .filter(n => n.knows.includes(name) && NEWS[n.t])
    .slice(0, 6)
    .map(n => ({ icon: NEWS[n.t].icon, text: `You ${fill(NEWS[n.t].did, { item: n.item, who: n.who === name ? 'me' : n.who || 'someone' })}`, from: n.from[name] || null, day: n.day }))
}

/** How a neighbour standing nearby reacts the moment you do something. */
export function cheerFor(t, r = Math.random) {
  const by = { fish: ['😮', '👏', '🐟'], harvest: ['😋', '👏'], craft: ['✨', '👏'], bug: ['😮', '👏'], gift: ['🥰', '💛'], delivered: ['🥰', '💛'], garden: ['🌷', '😍'], game: ['🏆', '👏'], tree: ['😆', '🍃'] }[t] || ['😊']
  return pickOf(by, r)
}

// ---------- the land grows by itself ----------

export const GROW_MAX = 40 // sprouts per town
export const GROW_PER_DAY = 2
export const WORN_AT = 8 // footsteps before grass wears into a path

/** A fresh growth record for one town. */
export const freshGrowth = day => ({ day, sprouts: [], worn: {} })

/** Can something sprout on this tile? Open grass beside no road, with no plant on it or right next to it. */
export function canSprout(wd, i, j, taken) {
  if (!wd.inb(i, j) || !wd.walkable(i, j) || wd.isRoad(i, j) || wd.blocked[wd.idx(i, j)]) return false
  const t = wd.get(i, j)
  if (t !== 2 && t !== 5 && t !== 8) return false // grass, park, meadow
  for (const [x, y] of [[i, j], [i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
    if (!wd.inb(x, y) || wd.isRoad(x, y) || taken.has(`${x},${y}`)) return false
  }
  return true
}

/**
 * Let the town grow from `g.day` up to `day` (at most a week at once): new flowers and saplings
 * spread from the plants already there, saplings grow into trees, and worn paths fade a little.
 * `rngFor(day)` gives a seeded random function so every player's town grows the same way.
 * Returns the sprouts added (for drawing straight away).
 */
export function growTown(g, wd, day, rngFor) {
  const added = []
  if (!g || day <= g.day) return added
  const from = Math.max(g.day + 1, day - 6)
  const taken = new Set([...wd.decor.map(d => `${d.i},${d.j}`), ...g.sprouts.map(s => `${s[0]},${s[1]}`)])
  for (let d = from; d <= day; d++) {
    const r = rngFor(d)
    for (let k = 0; k < GROW_PER_DAY && g.sprouts.length < GROW_MAX; k++) {
      // spread from a tree or flower already in town
      const parents = [...wd.decor.filter(x => x.kind === 'tree' || x.kind === 'flowers'), ...g.sprouts.map(s => ({ i: s[0], j: s[1] }))]
      if (!parents.length) break
      let spot = null
      for (let tries = 0; tries < 80 && !spot; tries++) {
        const p = parents[Math.floor(r() * parents.length)]
        const i = p.i + Math.round((r() - 0.5) * 6)
        const j = p.j + Math.round((r() - 0.5) * 6)
        if (canSprout(wd, i, j, taken)) spot = [i, j]
      }
      if (!spot) continue
      const kind = r() < 0.35 ? 'tree' : 'flowers'
      const s = [spot[0], spot[1], kind, d, Math.floor(r() * 1000)]
      g.sprouts.push(s)
      taken.add(`${spot[0]},${spot[1]}`)
      added.push(s)
    }
    // footpaths grow back slowly when nobody walks them
    for (const [key, n] of Object.entries(g.worn)) {
      const left = Math.floor(n * 0.85)
      if (left < 2) delete g.worn[key]
      else g.worn[key] = left
    }
  }
  g.day = day
  return added
}

/** How big a sapling planted on `born` is on `day` (0.4 → full size over three days). */
export const sproutSize = (born, day) => Math.min(1, 0.4 + Math.max(0, day - born) * 0.2)

/** A footstep on a tile: grass wears into a path where people walk a lot. */
export function stepOn(g, wd, i, j) {
  if (!g || !wd.inb(i, j) || wd.isRoad(i, j)) return
  const t = wd.get(i, j)
  if (t !== 2 && t !== 5 && t !== 8) return
  const key = `${i},${j}`
  if (!(key in g.worn) && Object.keys(g.worn).length >= 400) return
  g.worn[key] = Math.min(30, (g.worn[key] || 0) + 1)
}

/**
 * Community plantings (Reddit): every player who finishes the daily errands plants something,
 * so the whole subreddit sees the same town fill up. Positions come from the town seed and the
 * count alone, so everyone sees them in the same places.
 */
export function communityPlants(wd, count, rngFor) {
  const out = []
  const taken = new Set(wd.decor.map(d => `${d.i},${d.j}`))
  const r = rngFor(7919)
  const size = Math.round(Math.sqrt(wd.tiles.length))
  for (let k = 0, tries = 0; k < Math.min(count, 60) && tries < 3000; tries++) {
    const i = 2 + Math.floor(r() * (size - 4))
    const j = 2 + Math.floor(r() * (size - 4))
    if (!canSprout(wd, i, j, taken)) continue
    taken.add(`${i},${j}`)
    out.push([i, j, k % 3 === 0 ? 'tree' : 'flowers', 0, Math.floor(r() * 1000)])
    k++
  }
  return out
}
