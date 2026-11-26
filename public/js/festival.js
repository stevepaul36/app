// The Community Night Festival. Each day, once you've done the day's three errands, you can release
// one lantern into the sky that every player shares. When the week's lanterns reach the goal, the
// festival is lit: fireworks every night until Monday, when a new festival starts.
// On Reddit the lanterns are counted on the app server for the whole subreddit; on the web your
// neighbours release theirs alongside yours.

export const LANTERN_COLORS = [
  ['gold', 'Gold', '#FFC83D'], ['coral', 'Coral', '#FF7A59'], ['rose', 'Rose', '#FF8FB8'], ['lilac', 'Lilac', '#B79CFF'],
  ['sky', 'Sky', '#6CC4FF'], ['mint', 'Mint', '#5FD6A4'], ['lime', 'Lime', '#C6E85A'], ['pearl', 'Pearl', '#FFF3D6'],
];
export const LANTERN_SYMBOLS = ['🌙', '⭐', '🌸', '🍀', '💛', '🐾', '🔥', '🌈', '🎵', '🏡'];
export const colorHex = id => (LANTERN_COLORS.find(c => c[0] === id) || LANTERN_COLORS[0])[2];
export const okColor = id => LANTERN_COLORS.some(c => c[0] === id);
export const okSymbol = s => LANTERN_SYMBOLS.includes(s);

/** Week number (Monday to Sunday) for a day number counted from 1 Jan 1970, a Thursday. */
export const weekOf = day => Math.floor((day + 3) / 7);
/** Days left after today in this festival week (0 on Sunday). */
export const daysLeft = day => 6 - (((day + 3) % 7) + 7) % 7;
/** Next week's goal grows with how many lanterns went up this week, so a busy subreddit gets a bigger sky. */
export const MIN_GOAL = 20;
export const goalAfter = prevTotal => Math.max(MIN_GOAL, Math.ceil((prevTotal * 1.2) / 5) * 5);

const rnd = (n, c) => { const x = Math.sin(n * 91.7 + c * 47.3) * 24634.6345; return x - Math.floor(x); };

// ---------- the web version: your neighbours release lanterns with you ----------
export const LOCAL_GOAL = 30;
/** Lanterns your neighbours have released so far this week (3 to 5 a day, the same on every device). */
export function neighbourLanterns(day, names) {
  const w = weekOf(day), start = w * 7 - 3, out = [];
  for (let d = start; d <= day; d++) {
    const n = 3 + Math.floor(rnd(d, 1) * 3);
    for (let k = 0; k < n && names.length; k++) {
      const who = names[Math.floor(rnd(d * 10 + k, 2) * names.length)];
      out.push({ name: who, color: LANTERN_COLORS[Math.floor(rnd(d * 10 + k, 3) * LANTERN_COLORS.length)][0], symbol: LANTERN_SYMBOLS[Math.floor(rnd(d * 10 + k, 4) * LANTERN_SYMBOLS.length)] });
    }
  }
  return out;
}
/** Your own festival record, kept in the save: which days this week you released a lantern. */
export function ensureLocal(P, day) {
  const w = weekOf(day);
  if (!P.festival || P.festival.week !== w) P.festival = { week: w, days: [], color: P.festival?.color || 'gold', symbol: P.festival?.symbol || '🌙' };
  return P.festival;
}
export function localState(P, day, names, errandsDone, you = 'You') {
  const f = ensureLocal(P, day);
  const theirs = neighbourLanterns(day, names), mine = f.days.map(() => ({ name: you, color: f.color, symbol: f.symbol, you: true }));
  const lanterns = [...mine, ...theirs], total = lanterns.length;
  return { week: f.week, total, goal: LOCAL_GOAL, lit: total >= LOCAL_GOAL, mine: f.days.length, released: f.days.includes(day), canRelease: errandsDone && !f.days.includes(day), daysLeft: daysLeft(day), lanterns, color: f.color, symbol: f.symbol };
}
export function releaseLocal(P, day, color, symbol, errandsDone) {
  const f = ensureLocal(P, day);
  if (!errandsDone) return { ok: false, msg: 'Finish today’s three errands first, then release your lantern.' };
  if (f.days.includes(day)) return { ok: false, msg: 'You’ve released today’s lantern. Come back tomorrow for another.' };
  if (okColor(color)) f.color = color;
  if (okSymbol(symbol)) f.symbol = symbol;
  f.days.push(day);
  return { ok: true, msg: 'Your lantern floats up to join the festival sky! 🏮' };
}

// ---------- drawing ----------
const SPAN = 26;
const wrap = (v, c) => { const x0 = c - SPAN / 2; return x0 + (((v - x0) % SPAN) + SPAN) % SPAN; };
/** Where community lantern n floats, near the point `around`, rising slowly and drifting. */
export function lanternPos(n, t, around, still = false) {
  const tt = still ? 0 : t, ph = rnd(n, 5) * 6.28;
  const x = wrap(rnd(n, 6) * SPAN, around[0]) + Math.sin(tt * 0.2 + ph) * 1.2, y = wrap(rnd(n, 7) * SPAN, around[1]) + Math.cos(tt * 0.17 + ph) * 1.2;
  const h = 120 + rnd(n, 8) * 90 + Math.sin(tt * 0.9 + ph) * 10;
  return [x, y, h];
}
function glow(ctx, x, y, r, hex, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hex + Math.round(a * 255).toString(16).padStart(2, '0')); g.addColorStop(1, hex + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
/** The community lanterns, up to `max` of them. Glow first (with 'lighter'), then the lanterns. */
export function drawLanterns(ctx, toScreen, lanterns, t, z, k, around, W, H, still, max = 60) {
  const list = lanterns.slice(0, max), pts = [];
  for (let n = 0; n < list.length; n++) {
    const [x, y, h] = lanternPos(n, t, around, still), [sx, sy] = toScreen(x, y, h);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    pts.push([sx, sy, list[n], n]);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy, l] of pts) glow(ctx, sx, sy, 42 * z, colorHex(l.color), 0.45 * k);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.3); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [sx, sy, l, n] of pts) {
    const s = z * (l.you ? 1.25 : 1) * (0.9 + rnd(n, 9) * 0.25), hex = colorHex(l.color);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(s, s); ctx.rotate(Math.sin(t * 0.8 + n) * 0.06);
    ctx.fillStyle = hex; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(6, -9); ctx.quadraticCurveTo(10, 0, 7, 9); ctx.lineTo(-7, 9); ctx.quadraticCurveTo(-10, 0, -6, -9); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,225,.75)'; ctx.fillRect(-5, -9, 10, 2); ctx.fillRect(-6, 7, 12, 2);
    ctx.font = '9px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; ctx.fillText(l.symbol || '🌙', 0, 0.5);
    if (l.you) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
/** Fireworks over the town once the festival is lit. Bursts loop every few seconds, in screen space. */
export function drawFireworks(ctx, t, W, H, k, z) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 4; b++) {
    const cycle = 3.2, local = (t + b * 0.8) % cycle, round = Math.floor((t + b * 0.8) / cycle);
    const seed = round * 4 + b, cx = W * (0.15 + rnd(seed, 1) * 0.7), cy = H * (0.12 + rnd(seed, 2) * 0.3);
    const hex = LANTERN_COLORS[Math.floor(rnd(seed, 3) * LANTERN_COLORS.length)][2];
    if (local < 0.6) { // the rocket climbing
      const y = H + (cy - H) * (local / 0.6);
      ctx.fillStyle = `rgba(255,240,200,${0.9 * k})`; ctx.beginPath(); ctx.arc(cx, y, 2 * z, 0, 7); ctx.fill();
      continue;
    }
    const p = (local - 0.6) / (cycle - 0.6), r = (20 + 70 * Math.sqrt(p)) * z, a = Math.max(0, 1 - p) * k;
    for (let s = 0; s < 24; s++) {
      const ang = (s / 24) * 6.283 + seed, x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r + p * p * 30 * z;
      ctx.fillStyle = hex + Math.round(a * 255).toString(16).padStart(2, '0'); ctx.beginPath(); ctx.arc(x, y, 3.2 * z, 0, 7); ctx.fill();
    }
    glow(ctx, cx, cy, r * 0.9, hex, 0.3 * a);
  }
  ctx.restore();
}
