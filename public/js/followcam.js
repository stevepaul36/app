// Follow camera: a close camera that trails your character and looks ahead the way you're walking,
// with you a little low on screen so more of the town in front of you shows. It gives the game a
// third-person feel while keeping the hand-drawn isometric art. Plain maths, no DOM, so it's testable.

export const FOLLOW = {
  lookAhead: 0.75, // seconds of walking to look ahead
  maxLead: 0.3, // look-ahead is capped at this share of the shorter screen side
  lift: 0.12, // share of screen height the player sits below centre
  liftPhone: 0.04, // less on phones, where the controls fill the bottom of the screen
  rate: 3, // how fast the view swings ahead when you walk
  settle: 1.2, // how fast it drifts back to you when you stop
  zoomPhone: 0.8,
  zoomDesk: 1.05,
}

/**
 * Ease the look-ahead offset (projected pixels) toward where the player is heading.
 * `vx, vy` is the player's velocity in projected pixels per second.
 */
export function stepLead(lead, vx, vy, dt, viewW, viewH, zoom, moving) {
  const limit = (Math.min(viewW, viewH) * FOLLOW.maxLead) / zoom
  let tx = moving ? vx * FOLLOW.lookAhead : 0
  let ty = moving ? vy * FOLLOW.lookAhead : 0
  const m = Math.hypot(tx, ty)
  if (m > limit) {
    tx *= limit / m
    ty *= limit / m
  }
  const k = 1 - Math.exp(-dt * (moving ? FOLLOW.rate : FOLLOW.settle))
  return [lead[0] + (tx - lead[0]) * k, lead[1] + (ty - lead[1]) * k]
}

/** Camera centre: ahead of the player, and raised so the player sits low on screen. */
export function followTarget(px, py, lead, viewH, zoom, phone = false) {
  const lift = phone ? FOLLOW.liftPhone : FOLLOW.lift
  return [px + lead[0], py + lead[1] - (viewH * lift) / zoom]
}

export const followZoom = phone => (phone ? FOLLOW.zoomPhone : FOLLOW.zoomDesk)
