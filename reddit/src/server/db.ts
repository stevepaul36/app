import {redis} from '@devvit/web/server'

// Keys
//   wv:save:{userId}          hash: data (JSON), version, updatedAt. One Willowvale save per Reddit account.
//   wv:homes                  community town: one home per player per day who finishes the errands
//   wv:day:{dayNo}:done       sorted set userId -> finish time (ms), so rank = order of finishing
//   wv:day:{dayNo}:names      hash userId -> username
//   wv:user:{userId}          hash: streak, best, last (dayNo)
//   wv:posts                  hash dayNo -> post id
//   wv:pin:{postId}           id of the app's pinned comment that shared results reply to
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
