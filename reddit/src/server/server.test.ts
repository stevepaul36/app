import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, reddit, redis, runWithContext} from '@devvit/web/server'
import type {DailyRsp, SaveGetRsp, StateRsp} from '../shared/api.ts'
import {dayNoOf, errandsFor} from '../shared/daily.ts'
import {onReq} from './server.ts'

// A small in-memory stand-in for the Redis plugin.
const kv = new Map<string, string>()
const hashes = new Map<string, Map<string, string>>()
const zsets = new Map<string, Map<string, number>>()
const H = (k: string) =>
  hashes.get(k) ?? (hashes.set(k, new Map()).get(k) as Map<string, string>)
const Z = (k: string) =>
  zsets.get(k) ?? (zsets.set(k, new Map()).get(k) as Map<string, number>)
const sorted = (k: string) => [...Z(k).entries()].sort((a, b) => a[1] - b[1])
const ttl = new Map<string, number>()
const original: {[k: string]: unknown} = {}
const fake: {[k: string]: unknown} = {
  get: async (k: string) => kv.get(k),
  set: async (k: string, v: string) => {
    kv.set(k, v)
    return 'OK'
  },
  del: async (...ks: string[]) => {
    for (const k of ks) {
      kv.delete(k)
      hashes.delete(k)
      zsets.delete(k)
      ttl.delete(k)
    }
  },
  expire: async (k: string, s: number) => {
    ttl.set(k, s)
  },
  incrBy: async (k: string, n: number) => {
    const v = Number(kv.get(k) ?? 0) + n
    kv.set(k, `${v}`)
    return v
  },
  hGetAll: async (k: string) => Object.fromEntries(H(k)),
  hGet: async (k: string, f: string) => H(k).get(f),
  hSet: async (k: string, o: {[f: string]: string}) => {
    for (const [f, v] of Object.entries(o)) H(k).set(f, v)
    return 1
  },
  hSetNX: async (k: string, f: string, v: string) => {
    if (H(k).has(f)) return 0
    H(k).set(f, v)
    return 1
  },
  hDel: async (k: string, fs: string[]) => {
    for (const f of fs) H(k).delete(f)
    return fs.length
  },
  zAdd: async (k: string, ...ms: {member: string; score: number}[]) => {
    for (const m of ms) Z(k).set(m.member, m.score)
    return ms.length
  },
  zCard: async (k: string) => Z(k).size,
  zRem: async (k: string, ms: string[]) => {
    for (const m of ms) Z(k).delete(m)
    return ms.length
  },
  zRank: async (k: string, m: string) => {
    const i = sorted(k).findIndex(([x]) => x === m)
    return i < 0 ? undefined : i
  },
  zRange: async (k: string, a: number, b: number) =>
    sorted(k)
      .slice(a, b + 1)
      .map(([member, score]) => ({member, score})),
  watch: async () => {
    const queued: (() => Promise<unknown>)[] = []
    return {
      unwatch: async () => undefined,
      multi: async () => undefined,
      hSet: async (k: string, o: {[f: string]: string}) => {
        queued.push(() =>
          (fake.hSet as (k: string, o: object) => Promise<number>)(k, o),
        )
      },
      exec: async () => Promise.all(queued.map(q => q())),
    }
  },
}

// Comments the app or a player posted, by the fake Reddit API.
type Posted = {
  id: string
  parent: string
  text: string
  runAs?: string
  pinned: boolean
}
let comments: Posted[] = []
const redditOriginal: {[k: string]: unknown} = {}
const fakeReddit: {[k: string]: unknown} = {
  submitComment: async (o: {id: string; text: string; runAs?: string}) => {
    const c: Posted = {
      id: `t1_${comments.length + 1}`,
      parent: o.id,
      text: o.text,
      runAs: o.runAs,
      pinned: false,
    }
    comments.push(c)
    return {
      id: c.id,
      url: `https://reddit.com/c/${c.id}`,
      distinguish: async (sticky?: boolean) => {
        c.pinned = !!sticky
      },
    }
  },
}

let server: Server
let url: string
let user: {userId?: string; username?: string} = {
  userId: 't2_a',
  username: 'alice',
}

before(async () => {
  const r = redis as unknown as {[k: string]: unknown}
  for (const [k, v] of Object.entries(fake)) {
    original[k] = r[k]
    r[k] = v
  }
  const rd = reddit as unknown as {[k: string]: unknown}
  for (const [k, v] of Object.entries(fakeReddit)) {
    redditOriginal[k] = rd[k]
    rd[k] = v
  }
  server = createServer(async (req, rsp) => {
    await runWithContext(
      {
        appName: 'willowvale-town',
        postId: 't3_1',
        subredditName: 'test',
        ...user,
      } as unknown as Context,
      () => onReq(req, rsp),
    )
  })
  await new Promise<void>(resolve =>
    server.listen(0, '127.0.0.1', () => resolve()),
  )
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(async () => {
  const r = redis as unknown as {[k: string]: unknown}
  for (const [k, v] of Object.entries(original)) r[k] = v
  const rd = reddit as unknown as {[k: string]: unknown}
  for (const [k, v] of Object.entries(redditOriginal)) rd[k] = v
  await new Promise<void>(resolve => server.close(() => resolve()))
})
beforeEach(() => {
  kv.clear()
  hashes.clear()
  zsets.clear()
  ttl.clear()
  comments = []
  user = {userId: 't2_a', username: 'alice'}
})

const call = async (path: string, method: string = 'GET', body?: object) => {
  const r = await fetch(`${url}/${path}`, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
  })
  return {status: r.status, json: (await r.json()) as {[k: string]: unknown}}
}
const save = (coins: number) => ({
  data: {progress: {coins, clock: 600}, profile: {species: 'fox'}, schema: 1},
})

test('front card shows today’s three errands', async () => {
  const {status, json} = await call('api/state')
  assert.equal(status, 200)
  const s = json as unknown as StateRsp
  assert.equal(s.errands.length, 3)
  assert.equal(s.me.loggedIn, true)
  assert.equal(s.me.doneToday, false)
})

test('saves: first save, conflict, update, read back', async () => {
  assert.equal((await call('api/save')).json.version, 0)
  assert.equal(
    (await call('api/save', 'PUT', {...save(10), baseVersion: 0})).json.version,
    1,
  )
  const clash = await call('api/save', 'PUT', {...save(20), baseVersion: 0})
  assert.equal(clash.status, 409)
  assert.equal(clash.json.version, 1)
  assert.equal(
    (await call('api/save', 'PUT', {...save(30), baseVersion: 1})).json.version,
    2,
  )
  const back = (await call('api/save')).json as unknown as SaveGetRsp
  assert.equal((back.data as {progress: {coins: number}}).progress.coins, 30)
})

test('saves: bad saves are refused', async () => {
  for (const body of [
    {data: {progress: {coins: -1}}},
    {data: {progress: {coins: 1}, hack: 1}},
    {data: {progress: {coins: 1, $set: 1}}},
    {nope: 1},
  ])
    assert.equal(
      (await call('api/save', 'PUT', {...body, baseVersion: 0})).status,
      400,
    )
})

test('logged-out players can’t save', async () => {
  user = {}
  assert.equal((await call('api/save')).status, 401)
  assert.equal((await call('api/me')).status, 401)
})

test('daily errands: streak, rank, town grows once per player per day', async () => {
  const dayNo = dayNoOf()
  const done = errandsFor(dayNo).map(e => e.id)
  assert.equal(
    (await call('api/daily', 'POST', {dayNo, done: done.slice(0, 2)})).status,
    400,
  )
  const first = (await call('api/daily', 'POST', {dayNo, done}))
    .json as unknown as DailyRsp
  assert.equal(first.rank, 1)
  assert.equal(first.streak, 1)
  assert.equal(first.homes, 1)
  const again = (await call('api/daily', 'POST', {dayNo, done}))
    .json as unknown as DailyRsp
  assert.equal(again.fresh, false)
  assert.equal(again.homes, 1)
  user = {userId: 't2_b', username: 'bob'}
  const bob = (await call('api/daily', 'POST', {dayNo, done}))
    .json as unknown as DailyRsp
  assert.equal(bob.rank, 2)
  assert.equal(bob.homes, 2)
  const board = (await call('api/board')).json
  assert.deepEqual(board.names, ['alice', 'bob'])
})

test('daily errands: yesterday then today makes a 2-day streak', async () => {
  const dayNo = dayNoOf()
  await call('api/daily', 'POST', {
    dayNo: dayNo - 1,
    done: errandsFor(dayNo - 1).map(e => e.id),
  })
  const today = (
    await call('api/daily', 'POST', {
      dayNo,
      done: errandsFor(dayNo).map(e => e.id),
    })
  ).json as unknown as DailyRsp
  assert.equal(today.streak, 2)
  assert.equal(
    (await call('api/daily', 'POST', {dayNo: dayNo - 5, done: []})).status,
    400,
  )
})

test('unknown paths are 404', async () => {
  assert.equal((await call('nope')).status, 404)
})

test('player data expires on its own and can be deleted', async () => {
  const dayNo = dayNoOf()
  await call('api/save', 'PUT', {...save(10), baseVersion: 0})
  await call('api/daily', 'POST', {
    dayNo,
    done: errandsFor(dayNo).map(e => e.id),
  })
  const month = 30 * 24 * 60 * 60
  assert.equal(ttl.get('wv:save:t2_a'), month)
  assert.equal(ttl.get('wv:user:t2_a'), month)
  assert.equal(ttl.get(`wv:day:${dayNo}:names`), 3 * 24 * 60 * 60)
  assert.equal(ttl.get(`wv:day:${dayNo}:done`), 3 * 24 * 60 * 60)
  assert.equal((await call('api/save', 'DELETE')).status, 200)
  assert.equal((await call('api/save')).json.version, 0)
  assert.equal(hashes.has('wv:user:t2_a'), false)
  user = {}
  assert.equal((await call('api/save', 'DELETE')).status, 401)
})

test('the weekly property leaderboard ranks players and forgets deleted ones', async () => {
  await call('api/rich', 'POST', {worth: 900, homes: 2})
  user = {userId: 't2_b', username: 'bob'}
  await call('api/rich', 'POST', {worth: 2500, homes: 5})
  assert.equal(
    (await call('api/rich', 'POST', {worth: -5, homes: 0})).status,
    400,
  )
  const board = (await call('api/rich')).json as {
    top: {name: string; worth: number}[]
    me: number
    count: number
  }
  assert.deepEqual(
    board.top.map(r => [r.name, r.worth]),
    [
      ['bob', 2500],
      ['alice', 900],
    ],
  )
  assert.equal(board.me, 1)
  assert.equal(board.count, 2)
  const week = Math.floor((dayNoOf() + 3) / 7)
  assert.equal(ttl.get(`wv:rich:${week}`), 14 * 24 * 60 * 60)
  user = {userId: 't2_a', username: 'alice'}
  assert.equal(((await call('api/rich')).json as {me: number}).me, 2)
  await call('api/save', 'DELETE')
  assert.equal(((await call('api/rich')).json as {me: number | null}).me, null)
  user = {}
  assert.equal(
    (await call('api/rich', 'POST', {worth: 1, homes: 0})).status,
    401,
  )
})

test('sharing replies to the app’s pinned comment, as the player', async () => {
  const dayNo = dayNoOf()
  assert.equal((await call('api/share', 'POST', {})).status, 400) // not done yet
  await call('api/daily', 'POST', {
    dayNo,
    done: errandsFor(dayNo).map(e => e.id),
  })
  assert.equal((await call('api/share', 'POST', {})).status, 200)
  user = {userId: 't2_b', username: 'bob'}
  await call('api/daily', 'POST', {
    dayNo,
    done: errandsFor(dayNo).map(e => e.id),
  })
  await call('api/share', 'POST', {})
  const [pin, ...shares] = comments
  assert.equal(pin?.parent, 't3_1')
  assert.equal(pin?.runAs, undefined)
  assert.equal(pin?.pinned, true)
  assert.equal(shares.length, 2) // one pinned comment, reused
  for (const c of shares) {
    assert.equal(c.parent, pin?.id)
    assert.equal(c.runAs, 'USER')
  }
})
