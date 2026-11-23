import {once} from 'node:events'
import type {IncomingMessage, ServerResponse} from 'node:http'
import {context, reddit} from '@devvit/web/server'
import type {PartialJsonValue, UiResponse} from '@devvit/web/shared'
import type {
  BoardRsp,
  DailyReq,
  DailyRsp,
  MeRsp,
  SaveGetRsp,
  SavePutRsp,
  ShareRsp,
  StateRsp,
} from '../shared/api.ts'
import {
  dateOf,
  dayNoOf,
  ERRAND_ICON,
  errandsFor,
  LAUNCH_DAY_NO,
  shareLine,
} from '../shared/daily.ts'
import {
  claimPost,
  finishedCount,
  firstFinishers,
  getHomes,
  getSave,
  getStreak,
  markDone,
  putSave,
  rankOf,
  releasePost,
  saveStreak,
  setPost,
} from './db.ts'
import {cleanSave, MAX_SAVE_BYTES} from './save.ts'

class HttpError extends Error {
  status: number
  extra: {[k: string]: PartialJsonValue}
  constructor(
    status: number,
    msg: string,
    extra: {[k: string]: PartialJsonValue} = {},
  ) {
    super(msg)
    this.status = status
    this.extra = extra
  }
}

export async function onReq(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  try {
    const out = await route(reqMsg)
    writeJson(200, out, rspMsg)
  } catch (err) {
    if (err instanceof HttpError) {
      writeJson(
        err.status,
        {error: err.message, status: err.status, ...err.extra},
        rspMsg,
      )
      return
    }
    console.error(`server error; ${err instanceof Error ? err.stack : err}`)
    writeJson(
      500,
      {error: 'Something went wrong. Please try again.', status: 500},
      rspMsg,
    )
  }
}

async function route(req: IncomingMessage): Promise<PartialJsonValue> {
  const path = (req.url ?? '').split('?')[0]?.replace(/^\//, '') ?? ''
  const m = req.method ?? 'GET'
  if (path === 'api/state' && m === 'GET') return routeState()
  if (path === 'api/daily' && m === 'POST')
    return routeDaily(await readJson<DailyReq>(req))
  if (path === 'api/board' && m === 'GET') return routeBoard()
  if (path === 'api/share' && m === 'POST') return routeShare()
  // Willowvale's own endpoints
  if (path === 'api/me' && m === 'GET') return routeMe()
  if (path === 'api/save' && m === 'GET') return routeSaveGet()
  if (path === 'api/save' && m === 'PUT') return routeSavePut(req)
  if (path === 'api/properties' && m === 'GET')
    throw new HttpError(404, 'Homes are kept in your own save.')
  // Reddit hooks
  if (path === 'internal/on/menu/new-post' && m === 'POST')
    return routeMenuNewPost()
  if (
    (path === 'internal/on/app/install' ||
      path === 'internal/scheduler/daily-post') &&
    m === 'POST'
  ) {
    await createDailyPost(dayNoOf())
    return {}
  }
  throw new HttpError(404, 'not found')
}

function needUser(): string {
  const id = context.userId
  if (!id)
    throw new HttpError(401, 'Please log in to Reddit to save your game.')
  return id
}
/** A streak survives while yesterday or today is done. */
const liveStreak = (
  s: {streak: number; last: number},
  today: number,
): number => (s.last === today || s.last === today - 1 ? s.streak : 0)

// ---------- the front card and the daily errands ----------

async function routeState(): Promise<StateRsp> {
  const dayNo = dayNoOf()
  const id = context.userId
  const [finishedToday, homes, streak, rank] = await Promise.all([
    finishedCount(dayNo),
    getHomes(),
    id ? getStreak(id) : null,
    id ? rankOf(dayNo, id) : null,
  ])
  return {
    dayNo,
    date: dateOf(dayNo),
    errands: errandsFor(dayNo),
    finishedToday,
    homes,
    me: {
      loggedIn: !!id,
      username: context.username ?? null,
      streak: streak ? liveStreak(streak, dayNo) : 0,
      best: streak?.best ?? 0,
      doneToday: rank != null,
      rank,
    },
  }
}

async function routeDaily(req: DailyReq): Promise<DailyRsp> {
  const id = needUser()
  const dayNo = dayNoOf()
  // Allow the day that just ended too, for someone finishing right at midnight.
  if (req?.dayNo !== dayNo && req?.dayNo !== dayNo - 1)
    throw new HttpError(400, 'Those errands are from another day.')
  const want = errandsFor(req.dayNo).map(e => e.id)
  if (!Array.isArray(req.done) || !want.every(e => req.done.includes(e)))
    throw new HttpError(400, 'Not all errands are done yet.')
  const fresh = await markDone(req.dayNo, id, context.username ?? 'someone')
  const s = await getStreak(id)
  if (fresh) {
    s.streak =
      s.last === req.dayNo - 1
        ? s.streak + 1
        : s.last === req.dayNo
          ? s.streak
          : 1
    s.best = Math.max(s.best, s.streak)
    s.last = Math.max(s.last, req.dayNo)
    await saveStreak(id, s)
    if (s.streak >= 2) await setStreakFlair(s.streak)
  }
  const [rank, finishedToday, homes] = await Promise.all([
    rankOf(req.dayNo, id),
    finishedCount(req.dayNo),
    getHomes(),
  ])
  return {
    ok: true,
    rank: rank ?? finishedToday,
    finishedToday,
    homes,
    streak: s.streak,
    best: s.best,
    fresh,
  }
}

/** Show the streak as user flair. Only works when the app moderates the subreddit, so failure is fine. */
async function setStreakFlair(streak: number): Promise<void> {
  const username = context.username
  if (!username) return
  try {
    await reddit.setUserFlair({
      subredditName: context.subredditName,
      username,
      text: `🏡 ${streak}-day streak`,
      backgroundColor: '#FFE3A3',
      textColor: 'dark',
    })
  } catch (err) {
    console.log(`flair skipped; ${err instanceof Error ? err.message : err}`)
  }
}

async function routeBoard(): Promise<BoardRsp> {
  const dayNo = dayNoOf()
  const id = context.userId
  return {
    dayNo,
    names: await firstFinishers(dayNo, 10),
    me: id ? await rankOf(dayNo, id) : null,
  }
}

async function routeShare(): Promise<ShareRsp> {
  const id = needUser()
  const postId = context.postId
  if (!postId) throw new HttpError(400, 'Open a Willowvale post to share.')
  const dayNo = dayNoOf()
  const rank = await rankOf(dayNo, id)
  if (rank == null) throw new HttpError(400, 'Finish today’s errands first.')
  const s = await getStreak(id)
  try {
    const c = await reddit.submitComment({
      id: postId,
      text: shareLine(dayNo, rank, liveStreak(s, dayNo)),
      runAs: 'USER',
    })
    return {ok: true, url: c.url}
  } catch (err) {
    console.log(`share failed; ${err instanceof Error ? err.message : err}`)
    throw new HttpError(
      403,
      'Reddit didn’t let the game post for you. Your result is copied, so you can paste it in a comment.',
    )
  }
}

// ---------- Willowvale saves, tied to the Reddit account ----------

async function routeMe(): Promise<MeRsp> {
  needUser()
  return {user: {username: context.username ?? 'player'}}
}
async function routeSaveGet(): Promise<PartialJsonValue> {
  const s = await getSave(needUser())
  const out: SaveGetRsp = s.updatedAt
    ? {data: s.data, version: s.version, updatedAt: s.updatedAt}
    : {data: s.data, version: s.version}
  return out as PartialJsonValue
}
async function routeSavePut(req: IncomingMessage): Promise<SavePutRsp> {
  const id = needUser()
  const body = await readJson<{data?: unknown; baseVersion?: unknown}>(
    req,
    MAX_SAVE_BYTES,
  )
  const clean = cleanSave(body)
  if (!clean) throw new HttpError(400, 'That save doesn’t look right.')
  const base = Math.max(0, Math.floor(Number(body.baseVersion) || 0))
  const r = await putSave(id, base, clean)
  if (!r) {
    const cur = await getSave(id)
    throw new HttpError(409, 'A newer save exists.', {
      data: cur.data as PartialJsonValue,
      version: cur.version,
      updatedAt: cur.updatedAt ?? null,
    })
  }
  return {ok: true, version: r.version, updatedAt: r.updatedAt}
}

// ---------- one post a day ----------

async function createDailyPost(dayNo: number): Promise<string | null> {
  if (!(await claimPost(dayNo))) return null
  try {
    const errands = errandsFor(dayNo)
    const icons = errands.map(e => ERRAND_ICON[e.id] ?? '✅').join('')
    const post = await reddit.submitCustomPost({
      title: `🏡 Willowvale Day ${dayNo - LAUNCH_DAY_NO + 1}: today’s errands ${icons}`,
      textFallback: {
        text: `Today in Willowvale: ${errands.map(e => e.text).join(', ')}. Open this post in the Reddit app or on new Reddit to play.`,
      },
    })
    await setPost(dayNo, post.id)
    return post.url
  } catch (err) {
    await releasePost(dayNo)
    throw err
  }
}
async function routeMenuNewPost(): Promise<UiResponse> {
  const url = await createDailyPost(dayNoOf())
  if (!url)
    return {
      showToast: {
        text: 'Today’s Willowvale post already exists.',
        appearance: 'neutral',
      },
    }
  return {
    showToast: {text: 'Today’s Willowvale post is up!', appearance: 'success'},
    navigateTo: url,
  }
}

// ---------- plumbing ----------

async function readJson<T>(
  req: IncomingMessage,
  limit: number = 50_000,
): Promise<T> {
  const chunks: Uint8Array[] = []
  let size = 0
  req.on('data', (chunk: Uint8Array) => {
    size += chunk.length
    if (size <= limit) chunks.push(chunk)
  })
  await once(req, 'end')
  if (size > limit) throw new HttpError(413, 'That save is too big.')
  try {
    return JSON.parse(`${Buffer.concat(chunks)}`) as T
  } catch {
    throw new HttpError(400, 'bad request')
  }
}

function writeJson(
  status: number,
  json: PartialJsonValue,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json)
  rsp.writeHead(status, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json',
  })
  rsp.end(body)
}
