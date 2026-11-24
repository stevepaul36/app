/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

export type Errand = {id: string; text: string; n: number}

/** What the post's front card shows. */
export type StateRsp = {
  dayNo: number
  date: string
  errands: Errand[]
  finishedToday: number
  homes: number
  me: {
    loggedIn: boolean
    username: string | null
    streak: number
    best: number
    doneToday: boolean
    rank: number | null
  }
}
export type DailyReq = {dayNo: number; done: string[]}
export type DailyRsp = {
  ok: true
  rank: number
  finishedToday: number
  homes: number
  streak: number
  best: number
  fresh: boolean
}
export type BoardRsp = {dayNo: number; names: string[]; me: number | null}
export type ShareRsp = {ok: true; url: string}

/** Willowvale's own save API, same shape as the web version's server. */
export type MeRsp = {user: {username: string}}
export type SaveGetRsp = {data: unknown; version: number; updatedAt?: string}
export type SavePutRsp = {ok: true; version: number; updatedAt: string}

export const Endpoint = {
  State: 'api/state',
  Daily: 'api/daily',
  Board: 'api/board',
  Share: 'api/share',
  Me: 'api/me',
  Save: 'api/save',
  Properties: 'api/properties',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
  OnDailyPost: 'internal/scheduler/daily-post',
} as const
export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
