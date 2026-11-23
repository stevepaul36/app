import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, redis, runWithContext} from '@devvit/web/server'
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
const original: {[k: string]: unknown} = {}
const fake: {[k: string]: unknown} = {
  get: async (k: string) => kv.get(k),
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
  await new Promise<void>(resolve => server.close(() => resolve()))
})
beforeEach(() => {
  kv.clear()
  hashes.clear()
  zsets.clear()
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
