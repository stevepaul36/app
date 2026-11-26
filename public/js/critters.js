// Garden wildlife, drawn and moved like the real animals. Each visitor runs a small routine: frogs sit
// and hop along the pond edge, ducks glide and dabble on the water, robins drink at the bird bath and
// hop on the lawn, squirrels nibble at the feeder and dash about in bursts, rabbits hop and nibble,
// hedgehogs shuffle and snuffle, bees and butterflies visit flowers, snails crawl leaving a trail,
// ladybirds crawl on the crops and the owl watches from the log pile. Positions are in tiles; heights
// are in the same units the game's sprites use.

const TAU = Math.PI * 2;
const lerp = (a, b, p) => a + (b - a) * p;

export function makeCritter(v, rnd = Math.random) {
  const c = { id: v.id, ax: v.ax, ay: v.ay, x: v.ax, y: v.ay, h: 0, face: 1, mode: 'idle', wait: 0.5 + rnd() * 2, el: 0, dur: 0, arc: 0, from: null, to: null, beds: v.beds || [], flowers: v.flowers || [], trail: [], trailT: 0, hops: 0, seed: rnd() * 100, perchH: 0 };
  const at = (dx, dy, h) => { c.x = v.ax + dx; c.y = v.ay + dy; c.h = h; };
  switch (v.id) {
    case 'frog': { const a = rnd() * TAU; at(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); break; }
    case 'duck': at((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, 0); c.mode = 'swim'; break;
    case 'songbird': at(0.18, 0, 38); c.perchH = 38; c.mode = 'perch'; break;
    case 'squirrel': at(0.22, 0.05, 62); c.perchH = 62; c.mode = 'feed'; c.wait = 3 + rnd() * 3; break;
    case 'owl': at(0, 0, 26); c.perchH = 26; c.mode = 'perch'; break;
    case 'bee': at(0.1, 0.25, 70); c.mode = 'hover'; break;
    case 'butterfly': case 'ladybird': case 'snail': case 'rabbit': {
      const b = c.beds[Math.floor(rnd() * c.beds.length)] || [v.ax, v.ay];
      c.x = b[0] + (rnd() - 0.5) * 0.5; c.y = b[1] + (rnd() - 0.5) * 0.5; c.h = v.id === 'butterfly' ? 10 : v.id === 'ladybird' ? 4 : 0;
      break;
    }
    case 'hedgehog': at(0.6, 0.3, 0); break;
    case 'chicken': case 'cow': case 'sheep': { const r = rnd() * TAU; at(Math.cos(r) * 0.8, Math.sin(r) * 0.8, 0); break; }
    case 'dog': case 'cat': at(0.6, 0.6, 0); c.mode = 'sit'; break;
  }
  return c;
}

/** Start a move from where the critter is to (tx, ty, th) over dur seconds, with an arc height. */
function go(c, tx, ty, th, dur, arc, mode) {
  c.from = [c.x, c.y, c.h]; c.to = [tx, ty, th]; c.el = 0; c.dur = Math.max(0.05, dur); c.arc = arc; c.mode = mode;
  const sdx = (tx - c.x) - (ty - c.y); // left/right on screen in the isometric view
  if (Math.abs(sdx) > 0.02) c.face = sdx > 0 ? 1 : -1;
}
function moving(c, dt) {
  c.el += dt;
  const p = Math.min(1, c.el / c.dur), [fx, fy, fh] = c.from, [tx, ty, th] = c.to;
  if (p >= 1) { c.x = tx; c.y = ty; c.h = th; return true; }
  c.x = lerp(fx, tx, p); c.y = lerp(fy, ty, p); c.h = lerp(fh, th, p) + c.arc * Math.sin(Math.PI * p);
  return false;
}
const dist = (c, x, y) => Math.hypot(x - c.x, y - c.y);
/** A random point near (cx, cy) that passes ok(), or null. */
function near(cx, cy, r, ok, rnd, minR = 0) {
  for (let k = 0; k < 8; k++) {
    const a = rnd() * TAU, d = minR + rnd() * (r - minR), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    if (ok(x, y)) return [x, y];
  }
  return null;
}

/** Advance one critter by dt seconds. env: { ok(x, y): may it stand there, rnd }. */
export function stepCritter(c, dt, env) {
  const rnd = env.rnd || Math.random, ok = env.ok || (() => true);
  const idle = (lo, hi, mode = 'idle') => { c.mode = mode; c.wait = lo + rnd() * (hi - lo); };
  if (c.to && c.el < c.dur) { if (!moving(c, dt)) return; c.to = null; c.arrived = true; }
  const arrived = c.arrived; c.arrived = false;
  c.wait -= dt;
  switch (c.id) {
    case 'frog': {
      if (c.mode === 'swimming') { if (c.wait <= 0) { const a = rnd() * TAU; go(c, c.ax + Math.cos(a) * 0.5, c.ay + Math.sin(a) * 0.5, 0, 0.45, 12, 'hop'); } break; }
      if (arrived) { if (c.mode === 'dive') idle(2.5, 5, 'swimming'); else idle(2, 5); break; }
      if (c.wait > 0) break;
      if (rnd() < 0.18) { go(c, c.ax + (rnd() - 0.5) * 0.2, c.ay + (rnd() - 0.5) * 0.1, 0, 0.4, 10, 'dive'); break; }
      const a = Math.atan2(c.y - c.ay, c.x - c.ax) + (rnd() - 0.5) * 1.6, r = 0.45 + rnd() * 0.2;
      go(c, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r, 0, 0.45, 12, 'hop');
      break;
    }
    case 'duck': {
      if (arrived) { if (rnd() < 0.35) idle(1.6, 2.6, 'dabble'); else idle(1, 3, 'swim'); break; }
      if (c.wait > 0) break;
      const a = rnd() * TAU, r = rnd() * 0.3, tx = c.ax + Math.cos(a) * r, ty = c.ay + Math.sin(a) * r * 0.6;
      go(c, tx, ty, 0, Math.max(1.5, dist(c, tx, ty) / 0.12), 0, 'swim');
      break;
    }
    case 'snail': {
      c.trailT -= dt;
      if (c.trailT <= 0 && c.mode === 'crawl') { c.trailT = 0.6; c.trail.push([c.x, c.y]); if (c.trail.length > 14) c.trail.shift(); }
      if (arrived) { idle(2, 5); break; }
      if (c.wait > 0) break;
      const b = c.beds[Math.floor(rnd() * c.beds.length)] || [c.ax, c.ay], p = near(b[0], b[1], 0.6, ok, rnd);
      if (p) go(c, p[0], p[1], 0, Math.max(4, dist(c, p[0], p[1]) / 0.035), 0, 'crawl'); else idle(2, 3);
      break;
    }
    case 'songbird': {
      if (arrived) {
        if (c.mode === 'flyout') idle(3, 5, 'peck');
        else if (c.mode === 'flyback') idle(1.5, 3, 'perch');
        else idle(c.h > 5 ? 1.2 : 0.5, c.h > 5 ? 3 : 1.2, c.h > 5 ? (rnd() < 0.4 ? 'drink' : 'perch') : 'peck');
        break;
      }
      if (c.wait > 0) break;
      if (c.mode === 'peck') {
        if (rnd() < 0.3) { go(c, c.ax + 0.18 * (rnd() < 0.5 ? 1 : -1), c.ay, c.perchH, 1.1, 18, 'flyback'); break; }
        const p = near(c.x, c.y, 0.35, ok, rnd, 0.15); if (p) go(c, p[0], p[1], 0, 0.22, 5, 'hopground'); else idle(0.5, 1, 'peck');
        break;
      }
      if (rnd() < 0.25) { const p = near(c.ax, c.ay, 2, ok, rnd, 0.9); if (p) { go(c, p[0], p[1], 0, 1.2, 28, 'flyout'); break; } }
      go(c, c.ax + (rnd() - 0.5) * 0.4, c.ay + (rnd() - 0.5) * 0.15, c.perchH, 0.22, 4, 'hopperch');
      break;
    }
    case 'bee': {
      if (arrived) { idle(1.2, 2.6, 'hover'); break; }
      if (c.wait > 0) break;
      const toHotel = c.h < 30 && rnd() < 0.4, f = c.flowers[Math.floor(rnd() * c.flowers.length)];
      const [tx, ty, th] = toHotel || !f ? [c.ax + 0.1, c.ay + 0.25, 70] : [f[0] + (rnd() - 0.5) * 0.5, f[1] + (rnd() - 0.5) * 0.5, 10];
      go(c, tx, ty, th, Math.max(0.8, dist(c, tx, ty) / 0.9), 10, 'fly');
      break;
    }
    case 'butterfly': {
      if (arrived) { idle(2, 4.5, 'rest'); break; }
      if (c.wait > 0) break;
      const f = c.flowers[Math.floor(rnd() * c.flowers.length)] || [c.ax, c.ay];
      const tx = f[0] + (rnd() - 0.5) * 0.6, ty = f[1] + (rnd() - 0.5) * 0.6;
      go(c, tx, ty, 9, Math.max(1.4, dist(c, tx, ty) / 0.45), 22, 'flutter');
      break;
    }
    case 'ladybird': {
      if (arrived) { idle(1.5, 4); break; }
      if (c.wait > 0) break;
      if (rnd() < 0.15 && c.beds.length > 1) { const b = c.beds[Math.floor(rnd() * c.beds.length)]; go(c, b[0] + (rnd() - 0.5) * 0.5, b[1] + (rnd() - 0.5) * 0.5, 4, 1.4, 16, 'flyaway'); break; }
      const b = c.beds.reduce((m, q) => (Math.hypot(q[0] - c.x, q[1] - c.y) < Math.hypot(m[0] - c.x, m[1] - c.y) ? q : m), c.beds[0] || [c.ax, c.ay]);
      const tx = b[0] + (rnd() - 0.5) * 0.6, ty = b[1] + (rnd() - 0.5) * 0.6;
      go(c, tx, ty, 4, Math.max(1.5, dist(c, tx, ty) / 0.07), 0, 'crawl');
      break;
    }
    case 'squirrel': {
      if (arrived) {
        if (c.mode === 'climb') idle(3, 6, 'feed');
        else if (c.mode === 'down' || c.mode === 'run') idle(0.8, 2, 'alert');
        break;
      }
      if (c.wait > 0) break;
      if (c.mode === 'feed') { go(c, c.ax + 0.35, c.ay + 0.3, 0, 0.6, 0, 'down'); break; }
      if (c.mode === 'alert' && (c.hops > 2 || rnd() < 0.25)) { c.hops = 0; go(c, c.ax + 0.22, c.ay + 0.05, c.perchH, 0.9, 0, 'climb'); break; }
      const p = near(c.ax, c.ay, 2, ok, rnd, 0.5);
      if (p) { c.hops++; go(c, p[0], p[1], 0, Math.max(0.4, dist(c, p[0], p[1]) / 1.6), 0, 'run'); } else idle(1, 2, 'alert');
      break;
    }
    case 'hedgehog': {
      if (arrived) { idle(1.5, 3.5, 'snuffle'); break; }
      if (c.wait > 0) break;
      const p = near(c.ax, c.ay, 1.6, ok, rnd, 0.3);
      if (p) go(c, p[0], p[1], 0, Math.max(2, dist(c, p[0], p[1]) / 0.13), 0, 'shuffle'); else idle(2, 3, 'snuffle');
      break;
    }
    case 'rabbit': {
      if (arrived && c.mode === 'hop') { if (c.hops > 0) { c.hops--; c.wait = 0.05; } else { idle(2, 4.5, 'nibble'); break; } }
      if (c.wait > 0) break;
      if (c.mode !== 'hop') c.hops = 1 + Math.floor(rnd() * 4);
      const b = c.beds[Math.floor(rnd() * c.beds.length)] || [c.ax, c.ay];
      const dir = Math.atan2(b[1] - c.y, b[0] - c.x) + (rnd() - 0.5) * 1.4, step = 0.3 + rnd() * 0.15;
      const tx = c.x + Math.cos(dir) * step, ty = c.y + Math.sin(dir) * step;
      if (ok(tx, ty)) go(c, tx, ty, 0, 0.3, 8, 'hop'); else { c.hops = 0; idle(1, 2, 'nibble'); }
      break;
    }
    case 'chicken': { // quick little runs, then pecking and scratching at the ground
      if (arrived) { if (c.hops > 0) { c.hops--; c.wait = 0.05; } else { idle(1, 3, rnd() < 0.3 ? 'scratch' : 'peck'); break; } }
      if (c.wait > 0) break;
      if (c.mode !== 'walk') c.hops = 1 + Math.floor(rnd() * 3);
      const p = near(c.x, c.y, 0.45, (x, y) => ok(x, y) && Math.hypot(x - c.ax, y - c.ay) < 1.5, rnd, 0.15);
      if (p) go(c, p[0], p[1], 0, 0.35, 1.5, 'walk'); else { c.hops = 0; idle(1, 2, 'peck'); }
      break;
    }
    case 'cow': case 'sheep': { // graze for a while, then amble a few steps to fresh grass
      if (arrived) { idle(3, 7, 'graze'); break; }
      if (c.wait > 0) break;
      if (rnd() < 0.25) { idle(2, 4, 'look'); break; }
      const p = near(c.x, c.y, 0.8, (x, y) => ok(x, y) && Math.hypot(x - c.ax, y - c.ay) < 1.8, rnd, 0.3);
      if (p) go(c, p[0], p[1], 0, Math.max(1.5, dist(c, p[0], p[1]) / (c.id === 'cow' ? 0.22 : 0.3)), 0, 'walk'); else idle(2, 4, 'graze');
      break;
    }
    case 'dog': case 'cat': { // follows you: trots after you, then sits; the dog wags, the cat grooms or naps
      const tg = env.target; if (!tg) break;
      const d = Math.hypot(tg[0] - c.x, tg[1] - c.y), far = c.id === 'dog' ? 1.3 : 1.9;
      if (d > 8) { c.x = tg[0] - 0.6; c.y = tg[1] + 0.4; c.to = null; break; } // somewhere new: they arrive with you
      if (c.mode === 'run' || d > far) {
        if (d < 0.8) { c.to = null; c.h = 0; idle(1, 3, c.id === 'cat' && rnd() < 0.3 ? 'nap' : 'sit'); break; }
        const sp = (c.id === 'dog' ? 3.2 : 2.6) * Math.min(1.4, d / 2 + 0.5), ux = (tg[0] - c.x) / d, uy = (tg[1] - c.y) / d;
        c.to = null; c.mode = 'run'; c.x += ux * sp * dt; c.y += uy * sp * dt; c.el += dt;
        c.h = c.id === 'dog' ? Math.abs(Math.sin(c.seed + c.el * 14)) * 2 : 0;
        const sdx = ux - uy; if (Math.abs(sdx) > 0.05) c.face = sdx > 0 ? 1 : -1;
        break;
      }
      c.h = 0;
      if (c.wait <= 0) idle(2, 5, c.id === 'dog' ? (rnd() < 0.3 ? 'sniff' : 'sit') : (rnd() < 0.35 ? 'groom' : rnd() < 0.5 ? 'nap' : 'sit'));
      break;
    }
    case 'owl': {
      if (arrived) { if (c.mode === 'swoop') idle(2.5, 4, 'ground'); else idle(3, 7, 'perch'); break; }
      if (c.wait > 0) { if (c.mode === 'perch' && rnd() < dt * 0.5) c.face = -c.face; break; } // the owl turns its head now and then
      if (c.mode === 'ground') { go(c, c.ax, c.ay, c.perchH, 1.4, 16, 'flyback'); break; }
      if (rnd() < 0.2) { const p = near(c.ax, c.ay, 1.8, ok, rnd, 0.8); if (p) { go(c, p[0], p[1], 0, 1.6, 10, 'swoop'); break; } }
      idle(3, 7, 'perch');
      break;
    }
  }
}

// ---------- drawing ----------
const ell = (ctx, x, y, rx, ry, col, rot = 0) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); ctx.fill(); };
const dot = (ctx, x, y, r, col) => ell(ctx, x, y, r, r, col);
const flying = c => ['fly', 'flutter', 'flyout', 'flyback', 'flyaway', 'swoop'].includes(c.mode);

const DRAW = {
  frog(ctx, c, t) {
    if (c.mode === 'swimming') { // just the eyes and the top of the head above the water
      ell(ctx, 0, -1, 6, 2.4, '#5E9E3A'); dot(ctx, -2.6, -2.6, 1.8, '#7DBA4A'); dot(ctx, 2.6, -2.6, 1.8, '#7DBA4A'); dot(ctx, -2.6, -2.8, 0.8, '#1A1A1A'); dot(ctx, 2.6, -2.8, 0.8, '#1A1A1A');
      return;
    }
    const air = c.mode === 'hop' || c.mode === 'dive';
    if (air) { ctx.strokeStyle = '#4E8A2E'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-9, 1); ctx.moveTo(-3, -1); ctx.lineTo(-8, 3); ctx.stroke(); }
    else { ell(ctx, -3.5, -1.6, 3.6, 2.2, '#4E8A2E'); ell(ctx, -1.8, -0.4, 2.6, 0.9, '#6EA840'); }
    ell(ctx, 0, -3.4, 6, 3.6, '#5E9E3A', -0.15);
    ell(ctx, 1.2, -2.2, 4, 1.8, '#C9D98A');
    const throat = c.mode === 'idle' ? 0.6 + 0.4 * Math.sin(t * 9) : 0.5;
    ell(ctx, 4.4, -2, 1.6 * throat + 0.6, 1.2 * throat + 0.4, '#D9E6A2');
    dot(ctx, 3.2, -6.6, 1.9, '#6EA840'); dot(ctx, 3.4, -6.8, 1, '#1A1A1A'); dot(ctx, 3.7, -7.1, 0.35, '#FFFFFF');
    dot(ctx, -2, -5.4, 0.7, '#3F7424'); dot(ctx, 0.5, -4.6, 0.6, '#3F7424');
    if (!air) { ctx.strokeStyle = '#4E8A2E'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(4, 0.4); ctx.stroke(); }
  },
  duck(ctx, c, t) {
    const dab = c.mode === 'dabble' ? Math.min(1, Math.sin(Math.min(1, (2.6 - c.wait) / 0.4) * Math.PI / 2)) : 0;
    ctx.save(); ctx.rotate(-dab * 0.9);
    ell(ctx, 0, -4, 9, 4.6, '#B8B6AE'); // grey body
    ell(ctx, 4.6, -4.6, 4, 3.6, '#7A4A32'); // chestnut breast
    ell(ctx, -1, -5.6, 6, 2.6, '#9A968C'); // folded wing
    ell(ctx, -5.6, -5, 1.6, 1, '#3D5A99'); // blue speculum
    ctx.fillStyle = '#2B2B2B'; ctx.beginPath(); ctx.moveTo(-8.5, -5); ctx.lineTo(-11, -7.6); ctx.lineTo(-7.5, -6.4); ctx.closePath(); ctx.fill(); // curled tail
    if (!dab) {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(5.2, -8.4, 2.6, 1); // white neck ring
      ell(ctx, 6.6, -11, 3.2, 3, '#1E6B3A'); // green head
      ell(ctx, 6.8, -11.6, 2, 1.2, '#2E8B57');
      ctx.fillStyle = '#E8C23A'; ctx.beginPath(); ctx.moveTo(9.2, -11.2); ctx.lineTo(12.4, -10.6); ctx.lineTo(9.2, -9.6); ctx.closePath(); ctx.fill();
      dot(ctx, 7.6, -11.8, 0.6, '#111');
    }
    ctx.restore();
  },
  snail(ctx, c, t) {
    const out = c.mode === 'crawl' ? 1 : 0.55 + 0.1 * Math.sin(t * 2);
    ell(ctx, 1, -1, 6 * out + 1, 1.6, '#B89C7A');
    ctx.strokeStyle = '#9C8466'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(5 * out, -2); ctx.lineTo(6.5 * out, -5 * out); ctx.moveTo(4 * out, -2); ctx.lineTo(5 * out, -4.4 * out); ctx.stroke();
    dot(ctx, 6.5 * out, -5 * out, 0.6, '#5A4630');
    dot(ctx, -1, -4.6, 4.4, '#A0662E'); dot(ctx, -1, -4.6, 3.2, '#C4813E');
    ctx.strokeStyle = '#7A4A22'; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let a = 0; a < 9; a += 0.3) { const r = 3.6 - a * 0.38; const x = -1 + Math.cos(a) * r, y = -4.6 + Math.sin(a) * r; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  },
  songbird(ctx, c, t) {
    const fly = flying(c), drink = c.mode === 'drink' ? Math.max(0, Math.sin(t * 5)) : 0, peck = c.mode === 'peck' ? Math.max(0, Math.sin(t * 7)) : 0;
    if (!fly) { ctx.strokeStyle = '#8A6A4A'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-0.5, -1.5); ctx.lineTo(-0.8, 0); ctx.moveTo(1, -1.5); ctx.lineTo(1.2, 0); ctx.stroke(); }
    ctx.save(); ctx.translate(0, -5); ctx.rotate((drink + peck) * 0.6);
    ctx.fillStyle = '#6B5136'; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(-8, -3); ctx.lineTo(-7.5, 0); ctx.closePath(); ctx.fill(); // tail
    ell(ctx, 0, 0, 4.6, 3.6, '#7A5C3E'); // brown back
    ell(ctx, 1.6, 0.8, 3, 2.6, '#E2622E'); // orange-red breast
    ell(ctx, 0.6, 2.2, 2.4, 1.2, '#EFE6D8');
    ell(ctx, 3.2, -2.6, 2.6, 2.4, '#7A5C3E'); ell(ctx, 3.8, -1.8, 1.6, 1.5, '#E2622E');
    dot(ctx, 4.2, -3.2, 0.55, '#111');
    ctx.fillStyle = '#2B2B2B'; ctx.beginPath(); ctx.moveTo(5.4, -2.6); ctx.lineTo(7, -2.2); ctx.lineTo(5.4, -1.8); ctx.closePath(); ctx.fill();
    if (fly) { const w = Math.sin(t * 28); ctx.fillStyle = '#5E4630'; ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-3, -1 - 6 * w); ctx.lineTo(2, -1 - 4 * w); ctx.closePath(); ctx.fill(); }
    else ell(ctx, -1, -0.4, 3, 1.8, '#6B5136');
    ctx.restore();
  },
  bee(ctx, c, t) {
    const w = Math.sin(t * 60);
    ctx.fillStyle = 'rgba(230,240,255,.75)'; ctx.beginPath(); ctx.ellipse(-0.5, -4.6, 2.6, 1.3 + Math.abs(w) * 0.8, -0.5, 0, TAU); ctx.ellipse(1, -4.6, 2.4, 1.2 + Math.abs(w) * 0.8, 0.4, 0, TAU); ctx.fill();
    ell(ctx, 0, -2, 3.2, 2.2, '#C98A2E'); // a mason bee: rusty-brown and furry
    ctx.fillStyle = '#5A3A1E'; ctx.fillRect(-1.6, -3.8, 0.9, 3.6); ctx.fillRect(0.2, -3.9, 0.9, 3.8);
    dot(ctx, 3, -2.4, 1.5, '#2B2118');
    dot(ctx, 3.6, -2.8, 0.4, '#EEE');
  },
  butterfly(ctx, c, t) {
    const rest = c.mode === 'rest', open = rest ? 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.6)) : Math.abs(Math.sin(t * 14));
    const wing = (sx) => {
      ctx.save(); ctx.scale(sx * (0.15 + open * 0.85), 1);
      ctx.fillStyle = '#E8822A'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(7, -10, 8, -5); ctx.quadraticCurveTo(7, -2, 0, -3); ctx.fill(); // fore wing
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(6, -1, 4.6, 1.6); ctx.quadraticCurveTo(1.6, 1.8, 0, -2); ctx.fill(); // hind wing
      ctx.strokeStyle = '#2B1E14'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(7, -10, 8, -5); ctx.quadraticCurveTo(7, -2, 0, -3); ctx.stroke();
      dot(ctx, 6, -6.4, 0.7, '#FFFFFF'); dot(ctx, 4.8, -7.2, 0.5, '#FFFFFF'); dot(ctx, 3, 0, 0.6, '#2B1E14');
      ctx.restore();
    };
    wing(1); wing(-1);
    ell(ctx, 0, -2.4, 0.8, 3, '#2B1E14');
    ctx.strokeStyle = '#2B1E14'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -5.2); ctx.lineTo(-1.4, -7.6); ctx.moveTo(0, -5.2); ctx.lineTo(1.4, -7.6); ctx.stroke();
  },
  ladybird(ctx, c, t) {
    if (c.mode === 'flyaway') { ctx.fillStyle = 'rgba(230,240,255,.7)'; ell(ctx, -1.8, -3.2, 2.2, 1.2 + Math.abs(Math.sin(t * 50)), 'rgba(230,240,255,.7)'); ell(ctx, 1.8, -3.2, 2.2, 1.2 + Math.abs(Math.sin(t * 50)), 'rgba(230,240,255,.7)'); }
    ell(ctx, 0, -1.6, 2.6, 2, '#D7262B');
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(0, -3.6); ctx.lineTo(0, 0.4); ctx.stroke();
    dot(ctx, -1.2, -2, 0.55, '#1A1A1A'); dot(ctx, 1.2, -1.4, 0.55, '#1A1A1A'); dot(ctx, -0.9, -0.7, 0.45, '#1A1A1A');
    ell(ctx, 2.4, -1.4, 1, 1.1, '#1A1A1A'); dot(ctx, 2.6, -1.9, 0.3, '#FFF');
  },
  squirrel(ctx, c, t) {
    const run = c.mode === 'run' || c.mode === 'down' || c.mode === 'climb', feed = c.mode === 'feed';
    const flick = c.mode === 'alert' ? Math.sin(t * 10) * 0.25 : 0;
    ctx.save(); ctx.translate(-5, -7); ctx.rotate(-0.3 + flick + (run ? 0.6 : 0)); // the bushy tail, curled up over the back
    ctx.fillStyle = '#B4522A'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-8, 2, -6, -8); ctx.quadraticCurveTo(-3, -14, 2, -10); ctx.quadraticCurveTo(-3, -6, 2, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C8683A'; ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-5, 0, -4, -7); ctx.quadraticCurveTo(-2, -10, 0, -8); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (run) { ell(ctx, 0, -3.6, 6, 3, '#B4522A'); ell(ctx, 1, -2.4, 4, 1.4, '#F2E2C8'); ell(ctx, 5.4, -5.4, 2.8, 2.4, '#B4522A'); dot(ctx, 6.2, -6, 0.6, '#111'); ctx.fillStyle = '#B4522A'; ctx.beginPath(); ctx.moveTo(4.6, -7.4); ctx.lineTo(5.2, -10); ctx.lineTo(6, -7.6); ctx.fill(); }
    else {
      ell(ctx, 0, -5, 3.8, 5.2, '#B4522A'); ell(ctx, 1.2, -4.4, 2.2, 3.6, '#F2E2C8');
      ell(ctx, 1.4, -11, 3, 2.8, '#B4522A'); dot(ctx, 2.6, -11.6, 0.65, '#111'); dot(ctx, 4.2, -10.6, 0.6, '#5A2A14');
      ctx.fillStyle = '#B4522A'; ctx.beginPath(); ctx.moveTo(0.2, -13); ctx.lineTo(0.6, -16.4); ctx.lineTo(1.8, -13.4); ctx.fill(); // tufted ear
      if (feed) { const nib = Math.sin(t * 14) * 0.5; dot(ctx, 3.6, -8 + nib, 1.3, '#8C5A2E'); ell(ctx, 3, -7.4 + nib, 1, 0.7, '#B4522A'); }
    }
  },
  hedgehog(ctx, c, t) {
    const sn = c.mode === 'snuffle' ? Math.sin(t * 8) * 0.6 : 0, wob = c.mode === 'shuffle' ? Math.sin(t * 12) * 0.4 : 0;
    ctx.fillStyle = '#5E4A36'; ctx.beginPath(); // a dome of spines
    for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI, r = k % 2 ? 6.4 : 8; ctx.lineTo(Math.cos(a) * r - 1, -1 + Math.sin(a) * r * 0.75 + wob); }
    ctx.closePath(); ctx.fill();
    ell(ctx, -1, -3, 6, 3.6, '#7A6248');
    for (let k = 0; k < 6; k++) dot(ctx, -5 + k * 1.8, -4.4 + (k % 2) * 1.2, 0.5, '#E8DCC8');
    ell(ctx, 5.2, -2 + sn * 0.3, 3, 2.2, '#D9C2A0'); // pale face
    dot(ctx, 8, -1.8 + sn * 0.4, 0.9, '#111'); dot(ctx, 5.6, -2.8, 0.55, '#111');
    ctx.fillStyle = '#4A3828'; ctx.fillRect(1, -0.6, 1.2, 1.2); ctx.fillRect(-4, -0.6, 1.2, 1.2);
  },
  rabbit(ctx, c, t) {
    const hop = c.mode === 'hop', nib = c.mode === 'nibble', tw = nib ? Math.sin(t * 3) * 0.2 : 0;
    if (hop) { ell(ctx, -1, -4.4, 6.4, 3.4, '#9A8064', -0.25); ell(ctx, -6.6, -3, 2.2, 1.2, '#8A7058'); }
    else { ell(ctx, -1, -4, 5.4, 4, '#9A8064'); ell(ctx, -3, -1, 3, 1.4, '#8A7058'); }
    dot(ctx, -6.2, -4.6, 1.8, '#FFFFFF'); // cotton tail
    const hy = nib ? -4 + Math.sin(t * 9) * 0.3 : -7.4;
    ell(ctx, 4.2, hy, 3, 2.6, '#9A8064');
    dot(ctx, 5.2, hy - 0.6, 0.65, '#1A1A1A'); dot(ctx, 7, hy + 0.4, 0.5, '#D99A8A');
    ctx.save(); ctx.translate(3.2, hy - 1.8); ctx.rotate(-0.5 + tw);
    ell(ctx, 0, -4, 1.2, 4.2, '#9A8064'); ell(ctx, 0, -4, 0.6, 3.2, '#D9B8A8'); ctx.rotate(0.35); ell(ctx, 1.2, -4, 1.1, 4, '#8A7058');
    ctx.restore();
  },
  chicken(ctx, c, t) {
    const walk = c.mode === 'walk', peck = c.mode === 'peck' ? Math.max(0, Math.sin(t * 6)) : 0, scr = c.mode === 'scratch' ? Math.sin(t * 10) : 0;
    const st = walk ? Math.sin(t * 18) * 1.5 : 0;
    ctx.strokeStyle = '#E8A23A'; ctx.lineWidth = 1.1; ctx.beginPath(); // legs
    ctx.moveTo(-0.5, -3); ctx.lineTo(-1 + st, 0); ctx.moveTo(1.5, -3); ctx.lineTo(1.6 - st + scr * 1.5, 0); ctx.stroke();
    ctx.fillStyle = '#F2EDE2'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(-8, -12, -6, -13); ctx.quadraticCurveTo(-4.5, -9, -3, -8); ctx.fill(); // tail
    ell(ctx, 0, -6.5, 5.4, 4, '#F7F3EA'); ell(ctx, -1, -7, 3.4, 2.2, '#E6DFD0'); // body and wing
    ctx.save(); ctx.translate(3, -9); ctx.rotate(peck * 1.1);
    ell(ctx, 0.6, -1.6, 2.4, 2.6, '#F7F3EA');
    dot(ctx, 0, -4.2, 1, '#D8322E'); dot(ctx, 1.2, -4.4, 1, '#D8322E'); dot(ctx, -1, -3.8, 0.9, '#D8322E'); // comb
    ell(ctx, 2.6, -0.4, 0.8, 1.2, '#D8322E'); // wattle
    ctx.fillStyle = '#E8A23A'; ctx.beginPath(); ctx.moveTo(2.6, -2.2); ctx.lineTo(4.6, -1.6); ctx.lineTo(2.6, -1); ctx.fill();
    dot(ctx, 1.4, -2.2, 0.5, '#111');
    ctx.restore();
  },
  cow(ctx, c, t) {
    const graze = c.mode === 'graze', swish = Math.sin(t * 2.2) * 0.35, st = c.mode === 'walk' ? Math.sin(t * 6) : 0;
    ctx.save(); ctx.scale(1.7, 1.7);
    ctx.fillStyle = '#2A2A2A'; for (const [x, k] of [[-4.6, 1], [-2.6, -1], [3, 1], [5, -1]]) ctx.fillRect(x + st * k * 0.4, -3.6, 1.3, 3.6); // legs
    ctx.save(); ctx.translate(-6.6, -7); ctx.rotate(0.3 + swish); ctx.strokeStyle = '#2A2A2A'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 5); ctx.stroke(); ell(ctx, 0, 5.4, 0.8, 1.2, '#2A2A2A'); ctx.restore(); // swishing tail
    ell(ctx, 0, -6.5, 7.4, 3.8, '#F7F4EE'); // body
    ell(ctx, -3, -7.4, 2.6, 2, '#2A2A2A'); ell(ctx, 2.4, -5.6, 2.2, 1.6, '#2A2A2A'); ell(ctx, 4.4, -8, 1.4, 1.1, '#2A2A2A'); // patches
    ell(ctx, 1.4, -2.8, 1.6, 0.9, '#F2B8B8'); // udder
    const hy = graze ? -2.6 : -8.6, hx = graze ? 8.4 : 8;
    ell(ctx, hx - 1, hy, 2.6, 2.2, '#F7F4EE'); ell(ctx, hx - 1.8, hy - 0.6, 1.2, 1.2, '#2A2A2A');
    ell(ctx, hx + 1, hy + 0.8, 1.6, 1.3, '#F2C2B8'); dot(ctx, hx + 1.6, hy + 0.6, 0.3, '#5A3A30');
    dot(ctx, hx - 0.4, hy - 0.8, 0.45, '#111');
    ctx.fillStyle = '#E8DCC0'; ctx.beginPath(); ctx.moveTo(hx - 2.2, hy - 1.8); ctx.lineTo(hx - 2.8, hy - 3.6); ctx.lineTo(hx - 1.4, hy - 2.1); ctx.fill(); // horn
    ell(ctx, hx - 3.4, hy - 1, 1.3, 0.6, '#2A2A2A', -0.4); // ear
    if (graze) { ctx.strokeStyle = '#5FA84A'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx + 1.6, hy + 2); ctx.lineTo(hx + 2.4, hy + 0.6 + Math.sin(t * 5) * 0.3); ctx.stroke(); } // a mouthful of grass
    ctx.restore();
  },
  sheep(ctx, c, t) {
    const graze = c.mode === 'graze', st = c.mode === 'walk' ? Math.sin(t * 7) * 0.8 : 0;
    ctx.save(); ctx.scale(1.35, 1.35);
    ctx.fillStyle = '#2B2622'; for (const [x, k] of [[-3.6, 1], [-1.8, -1], [2.2, 1], [3.8, -1]]) ctx.fillRect(x + st * k * 0.4, -3.4, 1.1, 3.4);
    for (const [x, y, r] of [[-4, -6, 3], [-1.5, -7.6, 3.4], [1.6, -7.6, 3.4], [4, -6.2, 3], [0, -5, 3.6], [-2.6, -4.8, 2.6], [2.8, -4.8, 2.6]]) dot(ctx, x, y, r, '#F4F0E6'); // fleece
    for (const [x, y] of [[-2, -8.4], [1.4, -9], [3.6, -7]]) dot(ctx, x, y, 1.1, '#FFFFFF');
    const hy = graze ? -2.8 : -8, hx = graze ? 7 : 6.4;
    ell(ctx, hx, hy, 1.8, 2.4, '#2B2622', graze ? 0.9 : 0.3); dot(ctx, hx + 0.4, hy - 0.8, 0.35, '#EEE');
    ell(ctx, hx - 1.8, hy - 1.2, 1.4, 0.6, '#2B2622', -0.3); // ear
    dot(ctx, hx - 1.2, hy - 1.9, 1.2, '#F4F0E6'); // woolly top-knot
    ctx.restore();
  },
  dog(ctx, c, t) {
    const run = c.mode === 'run', sit = c.mode === 'sit', sniff = c.mode === 'sniff', wag = Math.sin(t * (sit ? 16 : 10)) * 0.6;
    ctx.save(); ctx.scale(1.3, 1.3);
    ctx.save(); ctx.translate(-5, sit ? -3 : -6); ctx.rotate(-0.8 + wag); ctx.fillStyle = '#C98A4B'; ctx.beginPath(); ctx.ellipse(0, -2.4, 0.9, 2.6, 0, 0, TAU); ctx.fill(); ctx.restore(); // wagging tail
    if (sit) { ell(ctx, -1.6, -3.8, 3.6, 3.4, '#D9A060'); ell(ctx, -3, -1, 2.2, 1.2, '#C98A4B'); ctx.fillStyle = '#C98A4B'; ctx.fillRect(0.6, -3.6, 1.2, 3.6); ctx.fillRect(2, -3.6, 1.2, 3.6); }
    else {
      const st = run ? Math.sin(t * 20) * 1.6 : 0;
      ctx.fillStyle = '#C98A4B'; for (const [x, k] of [[-3.6, 1], [-2.2, -1], [2, 1], [3.4, -1]]) { ctx.save(); ctx.translate(x, -3.6); ctx.rotate(st * k * 0.2); ctx.fillRect(-0.6, 0, 1.2, 3.6); ctx.restore(); }
      ell(ctx, 0, -5.2, 5, 2.8, '#D9A060'); ell(ctx, 0.6, -4, 3, 1.3, '#F2D9B0');
    }
    const hx = sit ? 2.6 : sniff ? 5.6 : 4.8, hy = sit ? -8.4 : sniff ? -3.2 : -8;
    ell(ctx, hx, hy, 2.8, 2.5, '#D9A060'); ell(ctx, hx + 2.2, hy + 0.8, 1.6, 1.1, '#F2D9B0'); dot(ctx, hx + 3.6, hy + 0.4, 0.6, '#2A1E16');
    dot(ctx, hx + 0.8, hy - 0.6, 0.55, '#1A1A1A'); dot(ctx, hx + 1, hy - 0.8, 0.2, '#FFF');
    ell(ctx, hx - 1.4, hy + 0.6, 1.1, 2.4, '#8C5A3C', 0.25); // floppy ear
    if (sit && Math.sin(t * 1.3) > 0.4) ell(ctx, hx + 2.4, hy + 2, 0.7, 1, '#F07090'); // panting
    ctx.fillStyle = '#E8333B'; ctx.fillRect(hx - 2, hy + 1.8, 2.6, 0.8); // collar
    ctx.restore();
  },
  cat(ctx, c, t) {
    const run = c.mode === 'run', nap = c.mode === 'nap', groom = c.mode === 'groom', flick = Math.sin(t * 1.8) * 0.4;
    ctx.save(); ctx.scale(1.2, 1.2);
    if (nap) { // curled up asleep
      ell(ctx, 0, -2.6, 5, 2.8, '#8E8A86'); ell(ctx, 3.4, -3, 2.2, 2, '#9C9894');
      ctx.strokeStyle = '#6A6662'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(4, -3); ctx.stroke();
      ctx.fillStyle = '#9C9894'; ctx.beginPath(); ctx.moveTo(2.4, -4.6); ctx.lineTo(2.8, -6.2); ctx.lineTo(3.6, -4.8); ctx.fill();
      ctx.strokeStyle = '#8E8A86'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -1.6, 4.6, 0.2, 2.4); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.save(); ctx.translate(-4.4, run ? -5 : -2); ctx.strokeStyle = '#8E8A86'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-3, -3 + flick * 3, -1.6, -7 - flick * 2); ctx.stroke(); ctx.restore(); // tail
    if (run) { const st = Math.sin(t * 18) * 1.4; ctx.fillStyle = '#8E8A86'; for (const [x, k] of [[-3, 1], [-1.8, -1], [2, 1], [3, -1]]) ctx.fillRect(x + st * k * 0.3, -3.4, 1, 3.4); ell(ctx, 0, -4.8, 4.6, 2.2, '#9C9894'); }
    else { ell(ctx, -1, -3.6, 3.2, 3.4, '#9C9894'); ctx.fillStyle = '#8E8A86'; ctx.fillRect(0.8, -3.4, 1, 3.4); ctx.fillRect(1.9, -3.4, 1, 3.4); }
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = '#6A6662'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-2.6 + k * 1.3, run ? -6.6 : -6.4); ctx.lineTo(-2.2 + k * 1.3, run ? -5 : -4.6); ctx.stroke(); } // tabby stripes
    const hx = run ? 4.6 : 2.4, hy = run ? -6.6 : groom ? -6 : -8;
    ell(ctx, hx, hy, 2.4, 2.1, '#9C9894');
    ctx.fillStyle = '#9C9894'; ctx.beginPath(); ctx.moveTo(hx - 1.8, hy - 1); ctx.lineTo(hx - 1.4, hy - 3.6); ctx.lineTo(hx - 0.2, hy - 1.8); ctx.moveTo(hx + 0.4, hy - 1.8); ctx.lineTo(hx + 1.4, hy - 3.6); ctx.lineTo(hx + 1.8, hy - 1); ctx.fill(); // pointy ears
    ell(ctx, hx - 1.1, hy - 2.2, 0.35, 0.7, '#E8A8A8'); ell(ctx, hx + 1.1, hy - 2.2, 0.35, 0.7, '#E8A8A8');
    if (groom) { ell(ctx, hx + 1.6, hy + 1.4, 0.9, 1.6, '#8E8A86', -0.5); ell(ctx, hx + 1.9, hy + 0.6, 0.5, 0.6, '#F07090'); } // licking a paw
    else { ell(ctx, hx + 0.6, hy - 0.2, 0.45, 0.6, '#9ACD32'); ell(ctx, hx + 1.7, hy - 0.2, 0.4, 0.55, '#9ACD32'); dot(ctx, hx + 0.6, hy - 0.2, 0.18, '#111'); dot(ctx, hx + 1.7, hy - 0.2, 0.16, '#111'); }
    dot(ctx, hx + 2.2, hy + 0.6, 0.35, '#E88A9A');
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(hx + 2, hy + 0.8); ctx.lineTo(hx + 4, hy + 0.4); ctx.moveTo(hx + 2, hy + 1); ctx.lineTo(hx + 4, hy + 1.2); ctx.stroke(); // whiskers
    ctx.restore();
  },
  owl(ctx, c, t) {
    const fly = flying(c), blink = Math.sin(t * 0.9 + c.seed) > 0.97;
    if (fly) { const w = Math.sin(t * 7); ctx.fillStyle = '#8A5A32'; ctx.beginPath(); ctx.moveTo(-2, -8); ctx.quadraticCurveTo(-11, -10 - w * 6, -12, -6 - w * 4); ctx.lineTo(-2, -5); ctx.moveTo(2, -8); ctx.quadraticCurveTo(11, -10 - w * 6, 12, -6 - w * 4); ctx.lineTo(2, -5); ctx.fill(); }
    ell(ctx, 0, -7, 5.4, 7.4, '#9A6A3E'); // tawny body
    ell(ctx, 0.6, -5.4, 3.6, 5, '#C9A27A');
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = '#7A4E2A'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-1 + k, -8 + k * 1.6); ctx.lineTo(0 + k, -7 + k * 1.6); ctx.stroke(); }
    ell(ctx, 0.4, -14.6, 5, 4.4, '#9A6A3E'); // head
    ell(ctx, 1.6, -14.4, 3.8, 3.4, '#D9BC94'); // facial disc
    if (blink) { ctx.strokeStyle = '#3A2614'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-0.6, -14.8); ctx.lineTo(1.2, -14.8); ctx.moveTo(2.2, -14.8); ctx.lineTo(4, -14.8); ctx.stroke(); }
    else { dot(ctx, 0.4, -14.8, 1.3, '#1A1208'); dot(ctx, 3, -14.8, 1.3, '#1A1208'); dot(ctx, 0.7, -15.2, 0.35, '#FFF'); dot(ctx, 3.3, -15.2, 0.35, '#FFF'); }
    ctx.fillStyle = '#E8C23A'; ctx.beginPath(); ctx.moveTo(1.4, -13.6); ctx.lineTo(2.1, -12); ctx.lineTo(2.6, -13.6); ctx.fill();
    if (!fly) { ctx.fillStyle = '#C9A23A'; ctx.fillRect(-1.6, -0.6, 1.2, 0.8); ctx.fillRect(1.2, -0.6, 1.2, 0.8); }
  },
};

/** Draw one critter: a shadow (or ripple on water), then the animal facing the way it's going. */
export function drawCritter(ctx, c, toScreen, z, t) {
  const s = Math.max(0.9, z) * 1.5;
  const onWater = c.id === 'duck' || (c.id === 'frog' && c.mode === 'swimming');
  const [gx, gy] = toScreen(c.x, c.y, onWater ? 0 : 0), [sx, sy] = toScreen(c.x, c.y, c.h + (c.id === 'duck' ? Math.sin(t * 2 + c.seed) * 0.8 : 0));
  if (onWater) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    const r = 6 + ((t * 3 + c.seed) % 4);
    ctx.beginPath(); ctx.ellipse(gx, gy, r * s, r * 0.4 * s, 0, 0, TAU); ctx.stroke();
  } else {
    const k = Math.max(0.35, 1 - c.h / 120);
    ctx.fillStyle = `rgba(0,0,0,${0.18 * k})`; ctx.beginPath(); ctx.ellipse(gx, gy, 5 * s * k, 2 * s * k, 0, 0, TAU); ctx.fill();
  }
  if (c.id === 'snail' && c.trail.length > 1) { // a faint silvery trail
    ctx.strokeStyle = 'rgba(235,240,250,.45)'; ctx.lineWidth = 1.4 * s; ctx.beginPath();
    c.trail.forEach(([x, y], k) => { const [px, py] = toScreen(x, y, 0); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.lineTo(gx, gy); ctx.stroke();
  }
  ctx.save(); ctx.translate(sx, sy); ctx.scale(s * c.face, s);
  const jitter = c.id === 'bee' && c.mode === 'hover' ? [Math.sin(t * 13) * 0.8, Math.cos(t * 11) * 0.8] : [0, 0];
  ctx.translate(...jitter);
  DRAW[c.id]?.(ctx, c, t + c.seed);
  ctx.restore();
}
