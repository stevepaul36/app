// Night lights: every town has its own kind of floating light that drifts over the streets after dark.
// Positions come from a fixed seed per light, so they're cheap to draw and the same on every device.

export const FLOATERS = {
  willowvale: { name: 'fireflies', icon: '✨', line: 'Fireflies drift over Willowvale tonight.', count: 70, kind: 'firefly', color: [214, 255, 120] },
  maple: { name: 'leaf lanterns', icon: '🍁', line: 'Glowing leaf lanterns float down Maple Row.', count: 46, kind: 'leaf', color: [255, 150, 60] },
  skyhaven: { name: 'neon drones', icon: '🛸', line: 'Little neon drones light up the Skyhaven sky.', count: 34, kind: 'drone', color: [90, 200, 255] },
  lumen: { name: 'star orbs', icon: '🔭', line: 'Star orbs from the observatory hover over Lumen Labs.', count: 40, kind: 'orb', color: [90, 240, 220] },
  lantern: { name: 'sky lanterns', icon: '🏮', line: 'Sky lanterns rise over the Lantern Quarter.', count: 42, kind: 'skylantern', color: [255, 120, 70] },
  sakura: { name: 'petal wisps', icon: '🌸', line: 'Glowing petal wisps swirl around Sakura Hill.', count: 56, kind: 'petal', color: [255, 160, 210] },
  marigold: { name: 'floating diyas', icon: '🪔', line: 'Floating diyas glow across Marigold Bazaar.', count: 44, kind: 'diya', color: [255, 190, 70] },
};
export const floaterFor = id => FLOATERS[id] || FLOATERS.willowvale;

// A small repeatable random number per light and channel.
const rnd = (n, c) => { const x = Math.sin(n * 127.1 + c * 311.7) * 43758.5453; return x - Math.floor(x); };

// Lights repeat every SPAN tiles, so there are always some around you, and each stays put in the world.
export const SPAN = 24;
const wrap = (v, c) => { const x0 = c - SPAN / 2; return x0 + (((v - x0) % SPAN) + SPAN) % SPAN; };
/** Where light n is at time t, in tile coordinates plus a height, near the point `around`. */
export function floaterPos(n, t, around, kind, still = false) {
  const tt = still ? 0 : t;
  const bx = wrap(rnd(n, 1) * SPAN, around[0]), by = wrap(rnd(n, 2) * SPAN, around[1]);
  const sp = 0.15 + rnd(n, 3) * 0.25, ph = rnd(n, 4) * 6.28;
  let x = bx + Math.sin(tt * sp + ph) * 1.6, y = by + Math.cos(tt * sp * 0.8 + ph) * 1.6;
  let h = 55 + rnd(n, 5) * 50 + Math.sin(tt * 1.3 + ph) * 8;
  if (kind === 'skylantern') { const rise = ((tt * (6 + rnd(n, 6) * 6) + rnd(n, 7) * 200) % 200); h = 30 + rise; }
  if (kind === 'leaf' || kind === 'petal') { const fall = ((tt * (8 + rnd(n, 6) * 8) + rnd(n, 7) * 160) % 160); h = 170 - fall; x += Math.sin(tt * 2 + ph) * 0.4; }
  if (kind === 'diya') h = 18 + Math.sin(tt * 1.1 + ph) * 4;
  return [x, y, h];
}

function glow(ctx, x, y, r, [cr, cg, cb], a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

/** Glow pass, drawn with 'lighter' blending over the night tint. */
export function drawFloaterGlow(ctx, toScreen, cityId, t, z, k, around, W, H, still) {
  const f = floaterFor(cityId);
  for (let n = 0; n < f.count; n++) {
    const [x, y, h] = floaterPos(n, t, around, f.kind, still);
    const [sx, sy] = toScreen(x, y, h);
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
    const blink = f.kind === 'firefly' ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + n * 1.7)) : 0.85 + 0.15 * Math.sin(t * 3 + n);
    glow(ctx, sx, sy, (f.kind === 'firefly' ? 22 : 34) * z, f.color, 0.5 * k * blink);
  }
}

/** The lights themselves, drawn normally so they read as objects, not just glows. */
export function drawFloaters(ctx, toScreen, cityId, t, z, k, around, W, H, still) {
  const f = floaterFor(cityId), [cr, cg, cb] = f.color;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.2);
  for (let n = 0; n < f.count; n++) {
    const [x, y, h] = floaterPos(n, t, around, f.kind, still);
    const [sx, sy] = toScreen(x, y, h);
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
    const s = z * (0.8 + rnd(n, 8) * 0.5);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(s, s);
    switch (f.kind) {
      case 'firefly': {
        const b = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + n * 1.7));
        ctx.fillStyle = `rgba(240,255,170,${b})`; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
        break;
      }
      case 'leaf': {
        ctx.rotate(Math.sin(t * 1.5 + n) * 0.8);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.4, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,170,.9)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        break;
      }
      case 'drone': {
        ctx.fillStyle = '#26314F'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = n % 2 ? '#FF5FD2' : '#5AC8FF'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 3.6, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = Math.sin(t * 6 + n) > 0 ? '#FFFFFF' : '#5AC8FF'; ctx.beginPath(); ctx.arc(0, -2.4, 1.4, 0, 7); ctx.fill();
        break;
      }
      case 'orb': {
        ctx.fillStyle = 'rgba(200,255,248,.95)'; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, 7); ctx.fill();
        const a = t * 2 + n; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 2.6, 1.2, 0, 7); ctx.fill();
        break;
      }
      case 'skylantern': {
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,170,.95)'; ctx.fillRect(-2, 1, 4, 3);
        break;
      }
      case 'petal': {
        ctx.rotate(t * 1.2 + n);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.4, 0, 0, 7); ctx.fill();
        break;
      }
      case 'diya': {
        ctx.fillStyle = '#B8642E'; ctx.beginPath(); ctx.ellipse(0, 2, 6, 2.6, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#E8823A'; ctx.beginPath(); ctx.ellipse(0, 2, 6, 1.6, 0, 0, 7); ctx.fill();
        const fl = 1 + Math.sin(t * 9 + n) * 0.15; ctx.fillStyle = '#FFD24A'; ctx.beginPath(); ctx.ellipse(0, -2 * fl, 1.8, 3.6 * fl, 0, 0, 7); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
