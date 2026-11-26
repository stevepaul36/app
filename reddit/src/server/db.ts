import {redis} from '@devvit/web/server'

// Keys
//   wv:save:{userId}          hash: data (JSON), version, updatedAt. One Willowvale save per Reddit account.
//   wv:homes                  community town: one home per player per day who finishes the errands
//   wv:day:{dayNo}:done       sorted set userId -> finish time (ms), so rank = order of finishing
//   wv:day:{dayNo}:names      hash userId -> username
//   wv:user:{userId}          hash: streak, best, last (dayNo)
//   wv:posts                  hash dayNo -> post id
//   wv:pin:{postId}           id of the app's pinned comment that shared results reply to
//   wv:rich:{week}            sorted set userId -> Paws & Properties net worth this week (weeks start on Monday)
//   wv:rich:{week}:info       hash userId -> JSON {name, homes}
//   wv:fest:{week}            sorted set userId -> lanterns they released this week (Night Festival)
//   wv:fest:{week}:info       hash userId -> JSON {name, color, symbol} of their latest lantern
//   wv:fest:{week}:days       hash "{userId}:{dayNo}" -> 1, so a player releases one lantern a day
//   wv:fest:{week}:total      lanterns released this week by everyone
//   wv:fest:{week}:goal       lanterns needed this week, set from last week's total
//
// Data about a player (save, streak, finish lists with usernames) expires on its own: saves and
// streaks 30 days after the player last played, finish lists after 3 days. Reddit asks apps to drop
// data for deleted accounts, and a deleted account can never play again, so its data goes too.
// Players can also delete their data from the game (DELETE api/save).
export const PLAYER_TTL = 30 * 24 * 60 * 60
export const DAY_TTL = 3 * 24 * 60 * 60
const K = {
  save: (id: string) => `wv:save:${id}`,
  homes: 'wv:homes',
  done: (d: number) => `wv:day:${d}:done`,
  names: (d: number) => `wv:day:${d}:names`,
  user: (id: string) => `wv:user:${id}`,
  posts: 'wv:posts',
  pin: (postId: string) => `wv:pin:${postId}`,
  rich: (w: number) => `wv:rich:${w}`,
  richInfo: (w: number) => `wv:rich:${w}:info`,
  fest: (w: number) => `wv:fest:${w}`,
  festInfo: (w: number) => `wv:fest:${w}:info`,
  festDays: (w: number) => `wv:fest:${w}:days`,
  festTotal: (w: number) => `wv:fest:${w}:total`,
  festGoal: (w: number) => `wv:fest:${w}:goal`,
}
/** Festival data lasts three weeks, so next week's goal can read this week's total. */
export const FEST_TTL = 21 * 24 * 60 * 60
/** Lanterns needed this week: fixed the first time anyone asks, from last week's total. */
export async function festGoal(
  week: number,
  goalAfter: (prev: number) => number,
): Promise<number> {
  const have = await redis.get(K.festGoal(week))
  if (have) return Number(have)
  const prev = Number((await redis.get(K.festTotal(week - 1))) ?? 0)
  const goal = goalAfter(prev)
  await redis.set(K.festGoal(week), `${goal}`)
  await redis.expire(K.festGoal(week), FEST_TTL)
  return goal
}
/** Did this player finish the day's errands? */
export async function doneOn(dayNo: number, id: string): Promise<boolean> {
  return (await redis.hGet(K.names(dayNo), id)) != null
}
/** Release today's lantern. False if this player already released one today. */
export async function releaseLantern(
  week: number,
  dayNo: number,
  id: string,
  name: string,
  color: string,
  symbol: string,
): Promise<boolean> {
  const fresh = await redis.hSetNX(K.festDays(week), `${id}:${dayNo}`, '1')
  if (fresh !== 1) return false
  await redis.zIncrBy(K.fest(week), id, 1)
  await redis.hSet(K.festInfo(week), {
    [id]: JSON.stringify({name, color, symbol}),
  })
  await redis.incrBy(K.festTotal(week), 1)
  await Promise.all(
    [K.fest, K.festInfo, K.festDays, K.festTotal].map(k =>
      redis.expire(k(week), FEST_TTL),
    ),
  )
  return true
}
export async function festState(
  week: number,
  dayNo: number,
  id: string | undefined,
  n: number,
): Promise<{
  total: number
  mine: number
  released: boolean
  lanterns: {name: string; color: string; symbol: string}[]
}> {
  const total = Number((await redis.get(K.festTotal(week))) ?? 0)
  const mine = id ? ((await redis.zScore(K.fest(week), id)) ?? 0) : 0
  const released = id
    ? (await redis.hGet(K.festDays(week), `${id}:${dayNo}`)) != null
    : false
  const count = await redis.zCard(K.fest(week))
  const rows = count
    ? await redis.zRange(K.fest(week), Math.max(0, count - n), count - 1, {
        by: 'rank',
      })
    : []
  const lanterns = []
  for (const {member, score} of rows.reverse()) {
    const info = JSON.parse(
      (await redis.hGet(K.festInfo(week), member)) ?? '{}',
    ) as {name?: string; color?: string; symbol?: string}
    // one lantern in the sky for each one this player released, up to 7 a week
    for (let k = 0; k < Math.min(7, score); k++)
      lanterns.push({
        name: info.name ?? 'someone',
        color: info.color ?? 'gold',
        symbol: info.symbol ?? '🌙',
      })
  }
  return {total, mine, released, lanterns: lanterns.slice(0, n)}
}
export async function removeFest(week: number, id: string): Promise<void> {
  await redis.zRem(K.fest(week), [id])
  await redis.hDel(K.festInfo(week), [id])
}
/** Leaderboards last two weeks, then delete themselves. */
export const RICH_TTL = 14 * 24 * 60 * 60
/** Week number (Monday to Sunday) for a day number counted from 1 Jan 1970, a Thursday. */
export const weekOf = (dayNo: number): number => Math.floor((dayNo + 3) / 7)
export async function putRich(
  week: number,
  id: string,
  name: string,
  worth: number,
  homes: number,
): Promise<void> {
  await redis.zAdd(K.rich(week), {member: id, score: worth})
  await redis.hSet(K.richInfo(week), {[id]: JSON.stringify({name, homes})})
  await Promise.all([
    redis.expire(K.rich(week), RICH_TTL),
    redis.expire(K.richInfo(week), RICH_TTL),
  ])
}
export async function topRich(
  week: number,
  n: number,
): Promise<{id: string; name: string; worth: number; homes: number}[]> {
  const count = await redis.zCard(K.rich(week))
  if (!count) return []
  const rows = await redis.zRange(
    K.rich(week),
    Math.max(0, count - n),
    count - 1,
    {by: 'rank'},
  )
  const out = []
  for (const {member, score} of rows.reverse()) {
    const info = JSON.parse(
      (await redis.hGet(K.richInfo(week), member)) ?? '{}',
    ) as {name?: string; homes?: number}
    out.push({
      id: member,
      name: info.name ?? 'someone',
      worth: score,
      homes: info.homes ?? 0,
    })
  }
  return out
}
/** 1 = richest. */
export async function richRank(
  week: number,
  id: string,
): Promise<{rank: number | null; count: number}> {
  const count = await redis.zCard(K.rich(week))
  const r = await redis.zRank(K.rich(week), id)
  return {rank: r == null ? null : count - r, count}
}
export async function removeRich(week: number, id: string): Promise<void> {
  await redis.zRem(K.rich(week), [id])
  await redis.hDel(K.richInfo(week), [id])
}
/** Keep a player's data for another 30 days because they're still playing. */
async function touch(id: string): Promise<void> {
  await Promise.all([
    redis.expire(K.save(id), PLAYER_TTL),
    redis.expire(K.user(id), PLAYER_TTL),
  ])
}
/** Delete everything kept about a player (their save and streak). */
export async function deletePlayer(id: string): Promise<void> {
  await redis.del(K.save(id), K.user(id))
}

export type Save = {data: unknown; version: number; updatedAt?: string}
export async function getSave(id: string): Promise<Save> {
  const h = await redis.hGetAll(K.save(id))
  if (!h.data) return {data: null, version: 0}
  await touch(id)
  return {
    data: JSON.parse(h.data),
    version: Number(h.version ?? 0),
    updatedAt: h.updatedAt,
  }
}
/** Write a save only if the stored version is still `base` (0 = no save yet). Returns the new version or null on a clash. */
export async function putSave(
  id: string,
  base: number,
  data: unknown,
): Promise<{version: number; updatedAt: string} | null> {
  const key = K.save(id)
  const txn = await redis.watch(key)
  const cur = Number((await redis.hGet(key, 'version')) ?? 0)
  if (cur !== base) {
    await txn.unwatch()
    return null
  }
  const version = cur + 1
  const updatedAt = new Date().toISOString()
  await txn.multi()
  await txn.hSet(key, {
    data: JSON.stringify(data),
    version: `${version}`,
    updatedAt,
  })
  try {
    const ok = await txn.exec()
    if (ok) await touch(id)
    return ok ? {version, updatedAt} : null
  } catch {
    return null // someone else saved in between
  }
}

export type Streak = {streak: number; best: number; last: number}
export async function getStreak(id: string): Promise<Streak> {
  const h = await redis.hGetAll(K.user(id))
  return {
    streak: Number(h.streak ?? 0),
    best: Number(h.best ?? 0),
    last: Number(h.last ?? 0),
  }
}
export async function saveStreak(id: string, s: Streak): Promise<void> {
  await redis.hSet(K.user(id), {
    streak: `${s.streak}`,
    best: `${s.best}`,
    last: `${s.last}`,
  })
  await redis.expire(K.user(id), PLAYER_TTL)
}
export async function getHomes(): Promise<number> {
  return Number((await redis.get(K.homes)) ?? 0)
}
export async function finishedCount(dayNo: number): Promise<number> {
  return redis.zCard(K.done(dayNo))
}
export async function rankOf(
  dayNo: number,
  id: string,
): Promise<number | null> {
  const r = await redis.zRank(K.done(dayNo), id)
  return r == null ? null : r + 1
}
/** Mark today's errands done for a player. False if they were already done. */
export async function markDone(
  dayNo: number,
  id: string,
  name: string,
): Promise<boolean> {
  const fresh = await redis.hSetNX(K.names(dayNo), id, name)
  if (fresh !== 1) return false
  await redis.zAdd(K.done(dayNo), {member: id, score: Date.now()})
  await Promise.all([
    redis.expire(K.names(dayNo), DAY_TTL),
    redis.expire(K.done(dayNo), DAY_TTL),
  ])
  await redis.incrBy(K.homes, 1)
  return true
}
export async function firstFinishers(
  dayNo: number,
  n: number,
): Promise<string[]> {
  const top = await redis.zRange(K.done(dayNo), 0, n - 1, {by: 'rank'})
  const out: string[] = []
  for (const {member} of top)
    out.push((await redis.hGet(K.names(dayNo), member)) ?? 'someone')
  return out
}
export async function claimPost(dayNo: number): Promise<boolean> {
  return (await redis.hSetNX(K.posts, `${dayNo}`, 'pending')) === 1
}
export async function setPost(dayNo: number, postId: string): Promise<void> {
  await redis.hSet(K.posts, {[`${dayNo}`]: postId})
}
export async function releasePost(dayNo: number): Promise<void> {
  await redis.hDel(K.posts, [`${dayNo}`])
}
export async function getPin(postId: string): Promise<string | null> {
  return (await redis.get(K.pin(postId))) ?? null
}
export async function setPin(postId: string, commentId: string): Promise<void> {
  await redis.set(K.pin(postId), commentId)
}
