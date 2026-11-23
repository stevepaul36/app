// Types for Willowvale's drawing code (plain JavaScript in ../public/js).
declare module '*/public/js/character.js' {
  export function randomLook(seed: number): object
  export function drawPortrait(
    canvas: HTMLCanvasElement,
    species: string,
    look: object,
    o?: object,
  ): void
}
