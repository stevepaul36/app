// Types for Willowvale's own game modules that the Reddit app reuses.
declare module '*/public/js/life.js' {
  export const QUESTS: {id: string; text: string; stat: string; n: number}[]
  export function questsFor(
    day: number,
  ): {id: string; text: string; stat: string; n: number}[]
}
