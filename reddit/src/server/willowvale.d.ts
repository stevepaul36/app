// Types for Willowvale's festival rules (plain JavaScript in ../public/js), reused by the server.
declare module '*/public/js/festival.js' {
  export function okColor(id: string): boolean
  export function okSymbol(s: string): boolean
  export function goalAfter(prevTotal: number): number
  export function daysLeft(day: number): number
}
