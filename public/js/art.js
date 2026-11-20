// Procedural illustrated art for Willowvale. Everything is drawn in code so the game
// needs no image downloads and works offline inside the Android app.
import { rng } from './world.js';

export const TW = 128, TH = 64;
export const P = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z];
export const CACHE_SCALE = 1.5;

// ---------- colour helpers ----------
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, k) => v + (B[k] - v) * t)); };
export const darken = (h, t) => mix(h, '#1B2240', t);
export const lighten = (h, t) => mix(h, '#FFFFFF', t);
const L = (() => { const v = [0.3, 0.55, 0.78]; const m = Math.hypot(...v); return v.map(x => x / m); })();
export function lit(hex, n) {
  const k = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  let c = mix(hex, '#FFE9BE', 0.1 * k);
  c = mix(c, '#4A5B92', (1 - k) * 0.16);
  const f = 0.74 + 0.36 * k;
  return rgbHex(hexRgb(c).map(v => v * f));
}
export const NI = [1, 0, 0], NJ = [0, 1, 0], NUP = [0, 0, 1];

// ---------- low-level drawing ----------
export function poly(ctx, pts, fill, stroke = null, lw = 1.4) {
  ctx.beginPath();
  pts.forEach(([x, y, z], k) => { const [sx, sy] = P(x, y, z); k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}
export const edge = c => darken(c, 0.45) + 'aa';

// A wall face: origin, horizontal span vector U (tiles) and height in px.
export function faceJ(x0, y0, z0, w, d, h) { return { o: [x0, y0 + d, z0], U: [w, 0, 0], h, n: NJ, out: [0, 1, 0] }; }
export function faceI(x0, y0, z0, w, d, h) { return { o: [x0 + w, y0 + d, z0], U: [0, -d, 0], h, n: NI, out: [1, 0, 0] }; }
export function fp(f, u, v, push = 0) {
  return [f.o[0] + f.U[0] * u + f.out[0] * push, f.o[1] + f.U[1] * u + f.out[1] * push, f.o[2] + f.h * v];
}
export function rectOn(ctx, f, u0, v0, u1, v1, color, stroke, push = 0.004) {
  poly(ctx, [fp(f, u0, v0, push), fp(f, u1, v0, push), fp(f, u1, v1, push), fp(f, u0, v1, push)], color, stroke, 1);
}

export function box(ctx, x0, y0, z0, w, d, h, color, opts = {}) {
  const st = opts.stroke === false ? null : edge(color);
  poly(ctx, [[x0, y0 + d, z0], [x0 + w, y0 + d, z0], [x0 + w, y0 + d, z0 + h], [x0, y0 + d, z0 + h]], lit(color, NJ), st);
  poly(ctx, [[x0 + w, y0, z0], [x0 + w, y0 + d, z0], [x0 + w, y0 + d, z0 + h], [x0 + w, y0, z0 + h]], lit(color, NI), st);
  if (opts.top !== false) poly(ctx, [[x0, y0, z0 + h], [x0 + w, y0, z0 + h], [x0 + w, y0 + d, z0 + h], [x0, y0 + d, z0 + h]], lit(opts.topColor || color, NUP), st);
  return { j: faceJ(x0, y0, z0, w, d, h), i: faceI(x0, y0, z0, w, d, h) };
}

export function gableRoof(ctx, x0, y0, z, w, d, rh, color, axis = 'i', o = 0.14, wall = '#F6EBD9') {
  const st = edge(color);
  const stripe = (a, b, c2, d2, n) => {
    ctx.save(); ctx.globalAlpha = 0.18;
    for (let k = 1; k < 4; k++) {
      const t = k / 4, p1 = a.map((v, q) => v + (c2[q] - v) * t), p2 = b.map((v, q) => v + (d2[q] - v) * t);
      poly(ctx, [p1, p2], null, darken(color, 0.5), 1.2);
    }
    ctx.restore();
  };
  if (axis === 'i') { // ridge runs along i, gable end faces +i
    const ry = y0 + d / 2, r1 = [x0 - o, ry, z + rh], r2 = [x0 + w + o, ry, z + rh];
    const b1 = [x0 - o, y0 - o, z - 6], b2 = [x0 + w + o, y0 - o, z - 6], f1 = [x0 - o, y0 + d + o, z - 6], f2 = [x0 + w + o, y0 + d + o, z - 6];
    poly(ctx, [b1, b2, r2, r1], lit(color, [0, -0.6, 0.8]), st);
    poly(ctx, [[x0 + w, y0, z], [x0 + w, y0 + d, z], [x0 + w, ry, z + rh - 4]], lit(wall, NI), edge(wall));
    poly(ctx, [f1, f2, r2, r1], lit(color, [0, 0.6, 0.8]), st);
    stripe(f1, f2, r1, r2);
    poly(ctx, [r1, r2], null, darken(color, 0.3), 2.2);
  } else { // ridge runs along j, gable end faces +j
    const rx = x0 + w / 2, r1 = [rx, y0 - o, z + rh], r2 = [rx, y0 + d + o, z + rh];
    const b1 = [x0 - o, y0 - o, z - 6], b2 = [x0 - o, y0 + d + o, z - 6], f1 = [x0 + w + o, y0 - o, z - 6], f2 = [x0 + w + o, y0 + d + o, z - 6];
    poly(ctx, [b1, b2, r2, r1], lit(color, [-0.6, 0, 0.8]), st);
    poly(ctx, [[x0, y0 + d, z], [x0 + w, y0 + d, z], [rx, y0 + d, z + rh - 4]], lit(wall, NJ), edge(wall));
    poly(ctx, [f1, f2, r2, r1], lit(color, [0.6, 0, 0.8]), st);
    stripe(f1, f2, r1, r2);
    poly(ctx, [r1, r2], null, darken(color, 0.3), 2.2);
  }
}

export function hipRoof(ctx, x0, y0, z, w, d, rh, color, o = 0.14) {
  const st = edge(color);
  const a = [x0 - o, y0 - o, z - 5], b = [x0 + w + o, y0 - o, z - 5], c = [x0 + w + o, y0 + d + o, z - 5], dd = [x0 - o, y0 + d + o, z - 5];
  const inset = Math.min(w, d) * 0.5;
  const r1 = [x0 + inset, y0 + d / 2, z + rh], r2 = [x0 + w - inset, y0 + d / 2, z + rh];
  if (w < d) { r1[0] = x0 + w / 2; r2[0] = x0 + w / 2; r1[1] = y0 + inset; r2[1] = y0 + d - inset; }
  const back1 = w >= d ? [a, b, r2, r1] : [a, dd, r2, r1];
  const back2 = w >= d ? [a, dd, r1] : [a, b, r1];
  poly(ctx, back1, lit(color, [0, -0.5, 0.8]), st);
  poly(ctx, back2, lit(color, [-0.5, 0, 0.8]), st);
  if (w >= d) { poly(ctx, [b, c, r2], lit(color, [0.6, 0, 0.8]), st); poly(ctx, [dd, c, r2, r1], lit(color, [0, 0.6, 0.8]), st); }
  else { poly(ctx, [dd, c, r2], lit(color, [0, 0.6, 0.8]), st); poly(ctx, [b, c, r2, r1], lit(color, [0.6, 0, 0.8]), st); }
}

export function windowOn(ctx, f, u, v, ww, wh, opt = {}) {
  const fu = ww / 2, fv = wh / 2;
  rectOn(ctx, f, u - fu - 0.02, v - fv - 0.03, u + fu + 0.02, v + fv + 0.03, opt.frame || '#FFFFFF', '#00000022');
  const g0 = fp(f, u, v + fv), g1 = fp(f, u, v - fv);
  const [ax, ay] = P(...g0), [bx, by] = P(...g1);
  const grad = ctx.createLinearGradient(ax, ay, bx, by);
  const shade = f.n === NI ? 0.12 : 0;
  grad.addColorStop(0, darken('#BFEAFF', shade)); grad.addColorStop(1, darken('#5FA9D6', shade));
  poly(ctx, [fp(f, u - fu, v - fv, .006), fp(f, u + fu, v - fv, .006), fp(f, u + fu, v + fv, .006), fp(f, u - fu, v + fv, .006)], grad);
  ctx.save(); ctx.globalAlpha = 0.55;
  poly(ctx, [fp(f, u - fu * 0.7, v + fv * 0.6, .008), fp(f, u - fu * 0.2, v + fv * 0.6, .008), fp(f, u - fu * 0.55, v - fv * 0.5, .008), fp(f, u - fu * 0.95, v - fv * 0.5, .008)], '#FFFFFF');
  ctx.restore();
  if (opt.cross !== false) { rectOn(ctx, f, u - 0.008, v - fv, u + 0.008, v + fv, opt.frame || '#FFFFFF', null, .01); rectOn(ctx, f, u - fu, v - 0.012, u + fu, v + 0.012, opt.frame || '#FFFFFF', null, .01); }
  if (opt.shutter) { rectOn(ctx, f, u - fu - 0.07, v - fv, u - fu - 0.025, v + fv, opt.shutter, edge(opt.shutter)); rectOn(ctx, f, u + fu + 0.025, v - fv, u + fu + 0.07, v + fv, opt.shutter, edge(opt.shutter)); }
  if (opt.flowers) {
    const sill = v - fv - 0.05;
    poly(ctx, [fp(f, u - fu - 0.03, sill, .02), fp(f, u + fu + 0.03, sill, .02), fp(f, u + fu + 0.03, sill + 0.06, .05), fp(f, u - fu - 0.03, sill + 0.06, .05)], '#9B6A47', '#00000033', 1);
    const cols = ['#F0587A', '#FFC83D', '#FFFFFF', '#F0587A', '#8E7CE0'];
    for (let k = 0; k < 5; k++) {
      const [sx, sy] = P(...fp(f, u - fu + (k + 0.5) * (ww / 5), sill + 0.09, .06));
      ctx.fillStyle = '#3F9A5C'; ctx.beginPath(); ctx.arc(sx, sy + 1.5, 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.arc(sx, sy - 1, 2.4, 0, 7); ctx.fill();
    }
  }
}

export function doorOn(ctx, f, u, dw = 0.16, dh = 0.62, color = '#9B6A47') {
  rectOn(ctx, f, u - dw / 2 - 0.025, 0, u + dw / 2 + 0.025, dh + 0.05, '#FFFFFF', '#00000022');
  rectOn(ctx, f, u - dw / 2, 0, u + dw / 2, dh, color, edge(color));
  rectOn(ctx, f, u - dw / 2 + 0.03, dh * 0.55, u + dw / 2 - 0.03, dh * 0.88, '#9FD8F2', null, .01);
  const [kx, ky] = P(...fp(f, u + dw * 0.3, dh * 0.42, .02));
  ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(kx, ky, 1.8, 0, 7); ctx.fill();
  // step
  const s0 = fp(f, u - dw / 2 - 0.05, 0), s1 = fp(f, u + dw / 2 + 0.05, 0);
  const out = [f.out[0] * 0.14, f.out[1] * 0.14];
  poly(ctx, [s0, s1, [s1[0] + out[0], s1[1] + out[1], 0], [s0[0] + out[0], s0[1] + out[1], 0]], '#E9DCC6', '#00000022', 1);
}

export function awningOn(ctx, f, u0, u1, v, colors) {
  const n = 7, depth = 0.22, drop = 16;
  for (let k = 0; k < n; k++) {
    const a = u0 + (u1 - u0) * k / n, b = u0 + (u1 - u0) * (k + 1) / n;
    const p1 = fp(f, a, v), p2 = fp(f, b, v);
    const q2 = [p2[0] + f.out[0] * depth, p2[1] + f.out[1] * depth, p2[2] - drop], q1 = [p1[0] + f.out[0] * depth, p1[1] + f.out[1] * depth, p1[2] - drop];
    poly(ctx, [p1, p2, q2, q1], lit(colors[k % 2], [f.out[0] * 0.6, f.out[1] * 0.6, 0.7]), null);
    // scalloped edge
    const [sx, sy] = P(...q1.map((vv, q) => (vv + q2[q]) / 2));
    ctx.fillStyle = lit(colors[k % 2], f.n); ctx.beginPath(); ctx.arc(sx, sy, 5.6, 0, Math.PI); ctx.fill();
  }
  poly(ctx, [fp(f, u0, v), fp(f, u1, v)], null, '#00000030', 1.2);
}

export function signOn(ctx, f, u, v, icon, color, label) {
  const [cx, cy] = P(...fp(f, u, v, 0.03));
  ctx.save();
  if (label) {
    ctx.font = '700 15px "Baloo 2", "Trebuchet MS", sans-serif';
    const tw = ctx.measureText(label).width + (icon ? 30 : 16);
    roundRect(ctx, cx - tw / 2, cy - 12, tw, 24, 12); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = color; ctx.stroke();
    ctx.fillStyle = darken(color, 0.25); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + (icon ? 8 : 0), cy + 1);
    if (icon) { ctx.font = '14px sans-serif'; ctx.fillText(icon, cx - tw / 2 + 14, cy + 1); }
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
    ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, cx, cy + 1);
  }
  ctx.restore();
}
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- sprite cache ----------
export class Sprite {
  constructor(minX, minY, maxX, maxY, draw, scale = CACHE_SCALE) {
    const pad = 6;
    this.minX = minX - pad; this.minY = minY - pad;
    this.w = maxX - minX + pad * 2; this.h = maxY - minY + pad * 2; this.s = scale;
    const c = document.createElement('canvas');
    c.width = Math.ceil(this.w * scale); c.height = Math.ceil(this.h * scale);
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale); ctx.translate(-this.minX, -this.minY);
    draw(ctx);
    this.canvas = c; this._ctx = ctx;
  }
  // Draw with world point (0,0,0) of the sprite at screen (sx, sy).
  draw(ctx, sx, sy, zoom) { ctx.drawImage(this.canvas, sx + this.minX * zoom, sy + this.minY * zoom, this.w * zoom, this.h * zoom); }
  opaqueBox() { // [x, y, w, h] in canvas pixels around the visible art
    if (this._box) return this._box;
    const { width: w, height: h } = this.canvas;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    try {
      const d = this.canvas.getContext('2d').getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    } catch { x0 = 0; y0 = 0; x1 = w; y1 = h; }
    this._box = x1 > x0 ? [x0, y0, x1 - x0 + 2, y1 - y0 + 2] : [0, 0, w, h];
    return this._box;
  }
  hit(px, py) { // px, py in sprite-local world px; uses a one-off alpha mask so no per-frame pixel reads
    const x = Math.floor((px - this.minX) * this.s), y = Math.floor((py - this.minY) * this.s);
    const { width: w, height: h } = this.canvas;
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    if (!this._mask) {
      const mw = Math.ceil(w / 4), mh = Math.ceil(h / 4), m = new Uint8Array(mw * mh);
      try {
        const d = this.canvas.getContext('2d').getImageData(0, 0, w, h).data;
        for (let yy = 0; yy < mh; yy++) for (let xx = 0; xx < mw; xx++) { const sx = Math.min(w - 1, xx * 4 + 2), sy = Math.min(h - 1, yy * 4 + 2); m[yy * mw + xx] = d[(sy * w + sx) * 4 + 3] > 40 ? 1 : 0; }
      } catch { m.fill(1); }
      this._mask = { m, mw };
    }
    return this._mask.m[(y >> 2) * this._mask.mw + (x >> 2)] === 1;
  }
}
export function bounds(w, d, top) {
  const pts = [P(0, 0, 0), P(w, 0, 0), P(0, d, 0), P(w, d, 0), P(0, 0, top), P(w, 0, top), P(0, d, top), P(w, d, top)];
  return [Math.min(...pts.map(p => p[0])) - 40, Math.min(...pts.map(p => p[1])) - 30, Math.max(...pts.map(p => p[0])) + 40, Math.max(...pts.map(p => p[1])) + 30];
}

// ---------- buildings ----------
const HOUSE_LOOKS = [
  { wall: '#FBF1DD', roof: '#E8665A', trim: '#5BA0C8', shutter: '#5BA0C8' },
  { wall: '#FFE3A3', roof: '#3F8FB8', trim: '#FFFFFF', shutter: '#3FA86A' },
  { wall: '#E2F2DA', roof: '#C9672E', trim: '#FFFFFF', shutter: '#C9672E' },
  { wall: '#FBE0E2', roof: '#5A6FB0', trim: '#FFFFFF', shutter: '#8E7CE0' },
  { wall: '#E3EEF8', roof: '#3FA86A', trim: '#FFFFFF', shutter: '#F0587A' },
];
const APT_LOOKS = [
  { wall: '#7FC8DD', trim: '#FFFFFF', accent: '#F2A93B' },
  { wall: '#F4A3A0', trim: '#FFFFFF', accent: '#3F8FB8' },
  { wall: '#B9A8EC', trim: '#FFFFFF', accent: '#FFC83D' },
  { wall: '#FFD27A', trim: '#FFFFFF', accent: '#E8665A' },
  { wall: '#93D6A9', trim: '#FFFFFF', accent: '#8E7CE0' },
];

function doorFace(o, faces) { return o.door === 'i' ? faces.i : faces.j; }
function otherFace(o, faces) { return o.door === 'i' ? faces.j : faces.i; }

export function drawHouse(ctx, o) {
  const look = HOUSE_LOOKS[(o.look || 0) % HOUSE_LOOKS.length];
  const w = o.w, d = o.d, x0 = 0.2, y0 = 0.2, ww = w - 0.4, dd = d - 0.4, h = 70;
  // little garden plot with a picket fence
  poly(ctx, [[0.05, 0.05, 0], [w - 0.05, 0.05, 0], [w - 0.05, d - 0.05, 0], [0.05, d - 0.05, 0]], '#8FD06F', '#5FA34A66');
  const faces = box(ctx, x0, y0, 0, ww, dd, h, look.wall, { top: false });
  const df = doorFace(o, faces), of = otherFace(o, faces);
  doorOn(ctx, df, 0.5, 0.17, 0.66, look.shutter);
  windowOn(ctx, df, 0.2, 0.55, 0.14, 0.32, { shutter: look.shutter, flowers: true });
  windowOn(ctx, df, 0.8, 0.55, 0.14, 0.32, { shutter: look.shutter, flowers: true });
  windowOn(ctx, of, 0.33, 0.55, 0.15, 0.32, { flowers: true });
  windowOn(ctx, of, 0.72, 0.55, 0.15, 0.32, {});
  box(ctx, x0 + ww * 0.68, y0 + dd * 0.2, h + 10, 0.24, 0.24, 46, '#C97B5B');
  box(ctx, x0 + ww * 0.68 - 0.03, y0 + dd * 0.2 - 0.03, h + 54, 0.3, 0.3, 6, '#8C5A44');
  gableRoof(ctx, x0, y0, h, ww, dd, 44, look.roof, o.door === 'i' ? 'j' : 'i', 0.16, look.wall);
  // round window in the gable
  const g = o.door === 'i' ? faceJ(x0, y0, h - 4, ww, dd, 40) : faceI(x0, y0, h - 4, ww, dd, 40);
  const [cx, cy] = P(...fp(g, 0.5, 0.42, .01));
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(cx, cy, 8, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#7FC3E8'; ctx.beginPath(); ctx.ellipse(cx, cy, 5.5, 5.5, 0, 0, 7); ctx.fill();
  fence(ctx, o);
}
function fence(ctx, o) {
  const run = (a, b) => {
    const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.16);
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const [sx, sy] = P(x, y, 0);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#B7A88E'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - 2, sy); ctx.lineTo(sx - 2, sy - 11); ctx.lineTo(sx, sy - 14); ctx.lineTo(sx + 2, sy - 11); ctx.lineTo(sx + 2, sy); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    poly(ctx, [[a[0], a[1], 8], [b[0], b[1], 8]], null, '#FFFFFF', 2);
  };
  const w = o.w, d = o.d;
  if (o.door === 'i') { run([w - 0.05, 0.05], [w - 0.05, d / 2 - 0.25]); run([w - 0.05, d / 2 + 0.25], [w - 0.05, d - 0.05]); }
  else { run([0.05, d - 0.05], [w / 2 - 0.25, d - 0.05]); run([w / 2 + 0.25, d - 0.05], [w - 0.05, d - 0.05]); }
}

export function drawApartment(ctx, o) {
  const look = APT_LOOKS[(o.look || 0) % APT_LOOKS.length];
  const floors = 4 + (o.look % 2), FH = 40, x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = floors * FH;
  const faces = box(ctx, x0, y0, 0, w, d, h, look.wall);
  // ground floor lobby band
  box(ctx, x0 - 0.02, y0 - 0.02, 0, w + 0.04, d + 0.04, FH * 0.95, '#FFF6E6', { top: false });
  const df = doorFace(o, faces), of = otherFace(o, faces);
  for (const f of [df, of]) {
    const span = f === df ? w : d, cols = Math.max(2, Math.round((f.U[0] ? o.w : o.d) * 1.6));
    for (let fl = 1; fl < floors; fl++) {
      for (let c2 = 0; c2 < cols; c2++) {
        const u = (c2 + 0.5) / cols, v = (fl * FH + FH * 0.52) / h;
        windowOn(ctx, f, u, v, 0.55 / cols, 0.5 * FH / h, { cross: false });
        if ((c2 + fl) % 2 === 0) { // balcony
          const b0 = fp(f, u - 0.32 / cols, (fl * FH + 4) / h), b1 = fp(f, u + 0.32 / cols, (fl * FH + 4) / h);
          const o2 = [f.out[0] * 0.16, f.out[1] * 0.16];
          poly(ctx, [b0, b1, [b1[0] + o2[0], b1[1] + o2[1], b1[2]], [b0[0] + o2[0], b0[1] + o2[1], b0[2]]], '#FFFFFF', '#00000025', 1);
          poly(ctx, [[b0[0] + o2[0], b0[1] + o2[1], b0[2]], [b1[0] + o2[0], b1[1] + o2[1], b1[2]], [b1[0] + o2[0], b1[1] + o2[1], b1[2] + 11], [b0[0] + o2[0], b0[1] + o2[1], b0[2] + 11]], 'rgba(255,255,255,.72)', '#00000030', 1);
          const [px, py] = P(b0[0] + o2[0] * 0.5, b0[1] + o2[1] * 0.5, b0[2] + 14);
          ctx.fillStyle = '#4FAE6E'; ctx.beginPath(); ctx.arc(px + 4, py, 4.5, 0, 7); ctx.fill();
        }
      }
    }
    for (let c2 = 0; c2 < Math.max(2, cols - 1); c2++) if (f !== df) windowOn(ctx, f, (c2 + 0.5) / Math.max(2, cols - 1), (FH * 0.5) / h, 0.5 / cols, 0.5 * FH / h, {});
  }
  doorOn(ctx, df, 0.5, 0.2, (FH * 0.8) / h * 1.0, '#3F6E8F');
  awningOn(ctx, df, 0.3, 0.7, (FH * 0.92) / h, [look.accent, '#FFFFFF']);
  // roof: parapet, plants and a water tank
  box(ctx, x0 - 0.04, y0 - 0.04, h, w + 0.08, d + 0.08, 7, '#FFFFFF');
  box(ctx, x0 + 0.15, y0 + 0.15, h + 7, 0.5, 0.4, 16, '#8FA6B8');
  for (let k = 0; k < 3; k++) { const [px, py] = P(x0 + w * 0.55 + k * 0.18, y0 + d * 0.7, h + 9); ctx.fillStyle = k % 2 ? '#3FA86A' : '#5FC07E'; ctx.beginPath(); ctx.arc(px, py - 6, 8, 0, 7); ctx.fill(); }
}

function drawVilla(ctx, o) {
  const look = HOUSE_LOOKS[(o.look + 2) % HOUSE_LOOKS.length];
  const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3, h = 96;
  poly(ctx, [[0, 0, 0], [o.w, 0, 0], [o.w, o.d, 0], [0, o.d, 0]], '#9AD77D', '#5FA34A66');
  // pool
  poly(ctx, [[o.w - 0.85, 0.15, 1], [o.w - 0.1, 0.15, 1], [o.w - 0.1, 0.95, 1], [o.w - 0.85, 0.95, 1]], '#6ED0EA', '#FFFFFF', 3);
  const faces = box(ctx, x0, y0, 0, w * 0.72, d * 0.8, h, look.wall, { top: false });
  const df = doorFace(o, faces), of = otherFace(o, faces);
  doorOn(ctx, df, 0.5, 0.12, 0.38, '#9B6A47');
  for (const u of [0.2, 0.8]) { windowOn(ctx, df, u, 0.28, 0.13, 0.22, { shutter: look.shutter, flowers: true }); windowOn(ctx, df, u, 0.74, 0.13, 0.22, { shutter: look.shutter }); }
  windowOn(ctx, df, 0.5, 0.74, 0.12, 0.22, { flowers: true });
  for (const u of [0.25, 0.75]) { windowOn(ctx, of, u, 0.3, 0.14, 0.22, {}); windowOn(ctx, of, u, 0.74, 0.14, 0.22, { flowers: true }); }
  hipRoof(ctx, x0, y0, h, w * 0.72, d * 0.8, 46, look.roof, 0.18);
}

const VENUE_STYLE = {
  cafe: { wall: '#FFE7EC', roof: '#F0587A', floors: 2, roofType: 'gable', awning: ['#F0587A', '#FFFFFF'] },
  market: { wall: '#FFF1D6', roof: '#E8823A', floors: 2, roofType: 'gable', awning: ['#F2A93B', '#FFFFFF'], arches: true },
  community: { wall: '#E9E3FF', roof: '#8E7CE0', floors: 2, roofType: 'flat', awning: ['#8E7CE0', '#FFFFFF'], round: true },
  theatre: { wall: '#FFDCDC', roof: '#B83A52', floors: 3, roofType: 'flat', marquee: true },
  library: { wall: '#EAF2F6', roof: '#2F6F8F', floors: 2, roofType: 'hip', columns: true },
  station: { wall: '#E3F4FF', roof: '#2E9BD6', floors: 1, roofType: 'canopy', glass: true },
  marina: { wall: '#D9EEF5', roof: '#1F8FB8', floors: 1, roofType: 'gable', planks: true },
  clinic: { wall: '#F4FFF7', roof: '#3FA86A', floors: 2, roofType: 'flat', cross: true },
};

export function drawVenue(ctx, o) {
  const s = o.vstyle || VENUE_STYLE[o.id] || VENUE_STYLE.cafe;
  const FH = 44, x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = s.floors * FH;
  poly(ctx, [[0, 0, 0], [o.w, 0, 0], [o.w, o.d, 0], [0, o.d, 0]], '#EFE3CC', '#C9B79566');
  if (s.roofType === 'canopy') return drawStation(ctx, o, s);
  const faces = box(ctx, x0, y0, 0, w, d, h, s.wall, { top: s.roofType === 'flat' });
  const df = doorFace(o, faces), of = otherFace(o, faces);
  const cols = Math.max(2, Math.round((o.door === 'i' ? o.d : o.w) * 1.3));
  // ground floor: big shop windows
  for (let c2 = 0; c2 < cols; c2++) {
    const u = (c2 + 0.5) / cols;
    if (Math.abs(u - 0.5) < 0.12) continue;
    if (s.arches) {
      rectOn(ctx, df, u - 0.36 / cols, 0, u + 0.36 / cols, 0.42, darken(s.wall, 0.45), null);
      const [cx, cy] = P(...fp(df, u, 0.42, .01));
      ctx.fillStyle = darken(s.wall, 0.45); ctx.beginPath(); ctx.ellipse(cx, cy, 10, 6, 0, Math.PI, 0); ctx.fill();
      for (let k = 0; k < 3; k++) { const [px, py] = P(...fp(df, u - 0.2 / cols + k * 0.2 / cols, 0.12, .03)); ctx.fillStyle = ['#F0587A', '#FFC83D', '#3FA86A'][k]; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 7); ctx.fill(); }
    } else windowOn(ctx, df, u, 0.24, 0.62 / cols, 0.3, { cross: false });
  }
  doorOn(ctx, df, 0.5, 0.18, 0.4, darken(s.roof, 0.1));
  for (let fl = 1; fl < s.floors; fl++) for (let c2 = 0; c2 < cols; c2++) windowOn(ctx, df, (c2 + 0.5) / cols, (fl * FH + FH * 0.5) / h, 0.42 / cols, 0.42 * FH / h, { flowers: o.id === 'cafe', shutter: o.id === 'cafe' ? s.roof : null });
  const ocols = Math.max(2, Math.round((o.door === 'i' ? o.w : o.d) * 1.2));
  for (let fl = 0; fl < s.floors; fl++) for (let c2 = 0; c2 < ocols; c2++) windowOn(ctx, of, (c2 + 0.5) / ocols, (fl * FH + FH * 0.5) / h, 0.42 / ocols, 0.42 * FH / h, {});
  if (s.columns) for (const u of [0.08, 0.3, 0.7, 0.92]) rectOn(ctx, df, u - 0.025, 0, u + 0.025, 0.95, '#FFFFFF', '#00000022', 0.06);
  if (s.awning) awningOn(ctx, df, 0.04, 0.96, (FH * 0.93) / h, s.awning);
  if (s.round) { const [cx, cy] = P(...fp(of, 0.5, 0.72, .01)); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill(); }
  if (s.cross) { const [cx, cy] = P(...fp(of, 0.5, 0.72, .02)); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#3FA86A'; ctx.fillRect(cx - 3.5, cy - 10, 7, 20); ctx.fillRect(cx - 10, cy - 3.5, 20, 7); }
  if (s.planks) for (let k = 1; k < 8; k++) rectOn(ctx, of, 0, k / 8 - 0.006, 1, k / 8 + 0.006, '#00000014', null);
  if (s.marquee) {
    const v = (FH * 1.05) / h;
    poly(ctx, [fp(df, 0.15, v), fp(df, 0.85, v), fp(df, 0.85, v, 0.3), fp(df, 0.15, v, 0.3)], lit('#FFC83D', NUP), '#B98A1A', 1.2);
    rectOn(ctx, df, 0.15, v - 0.12, 0.85, v, '#B83A52', null, 0.3);
    for (let k = 0; k < 10; k++) { const [px, py] = P(...fp(df, 0.17 + k * 0.073, v - 0.06, 0.31)); ctx.fillStyle = '#FFF4B8'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill(); }
  }
  // roof
  if (s.roofType === 'gable') gableRoof(ctx, x0, y0, h, w, d, o.id === 'market' ? 62 : 46, s.roof, o.door === 'i' ? 'j' : 'i', 0.16, s.wall);
  else if (s.roofType === 'hip') { hipRoof(ctx, x0, y0, h, w, d, 40, s.roof, 0.12); const [cx, cy] = P(x0 + w / 2, y0 + d / 2, h + 40); ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(cx, cy - 4, 6, 0, 7); ctx.fill(); }
  else { box(ctx, x0 - 0.04, y0 - 0.04, h, w + 0.08, d + 0.08, 8, s.roof); box(ctx, x0 + 0.3, y0 + 0.3, h + 8, 0.6, 0.5, 14, '#C7D3DE'); }
  const signV = s.roofType === 'flat' ? (h - 14) / h : (h - 10) / h;
  signOn(ctx, df, 0.5, o.id === 'theatre' ? 0.86 : signV, o.icon, s.roof === '#FFFFFF' ? '#3FA86A' : s.roof, o.sign || o.type);
}

function drawStation(ctx, o, s) {
  const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3;
  // platform + rails
  box(ctx, x0, y0, 0, w, d, 8, '#E3DACB');
  for (const t of [0.35, 0.65]) poly(ctx, [[x0 + 0.05, y0 + d * t, 9], [x0 + w - 0.05, y0 + d * t, 9]], null, '#7A8798', 3);
  // tram
  box(ctx, x0 + 0.25, y0 + d * 0.32, 10, w * 0.6, d * 0.36, 34, '#FFC83D');
  const tf = faceJ(x0 + 0.25, y0 + d * 0.32, 10, w * 0.6, d * 0.36, 34);
  for (let k = 0; k < 4; k++) windowOn(ctx, tf, 0.14 + k * 0.24, 0.62, 0.13, 0.4, { cross: false });
  rectOn(ctx, tf, 0, 0.08, 1, 0.2, '#F0587A', null);
  // canopy on posts
  for (const [px, py] of [[x0 + 0.1, y0 + 0.1], [x0 + w - 0.1, y0 + 0.1], [x0 + 0.1, y0 + d - 0.1], [x0 + w - 0.1, y0 + d - 0.1]]) box(ctx, px - 0.04, py - 0.04, 8, 0.08, 0.08, 60, '#FFFFFF');
  ctx.save(); ctx.globalAlpha = 0.85;
  poly(ctx, [[x0 - 0.15, y0 - 0.15, 72], [x0 + w + 0.15, y0 - 0.15, 72], [x0 + w + 0.15, y0 + d + 0.15, 66], [x0 - 0.15, y0 + d + 0.15, 66]], lit(s.roof, NUP), edge(s.roof));
  ctx.restore();
  poly(ctx, [[x0 - 0.15, y0 + d + 0.15, 66], [x0 + w + 0.15, y0 + d + 0.15, 66], [x0 + w + 0.15, y0 + d + 0.15, 60], [x0 - 0.15, y0 + d + 0.15, 60]], lit('#FFFFFF', NJ), '#00000022');
  poly(ctx, [[x0 + w + 0.15, y0 - 0.15, 72], [x0 + w + 0.15, y0 + d + 0.15, 66], [x0 + w + 0.15, y0 + d + 0.15, 60], [x0 + w + 0.15, y0 - 0.15, 66]], lit('#FFFFFF', NI), '#00000022');
  signOn(ctx, faceJ(x0, y0, 60, w, d, 40), 0.5, 0.75, o.icon, s.roof, 'Tram');
}

export function drawShop(ctx, o) {
  const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3, h = 82;
  const wall = o.label === 'Cottage' ? '#FFF1D6' : lighten(o.color, 0.78);
  const faces = box(ctx, x0, y0, 0, w, d, h, wall, { top: false });
  const df = doorFace(o, faces), of = otherFace(o, faces);
  if (o.label === 'Cottage') { doorOn(ctx, df, 0.5, 0.17, 0.5); windowOn(ctx, df, 0.2, 0.45, 0.14, 0.26, { flowers: true, shutter: '#3FA86A' }); windowOn(ctx, df, 0.8, 0.45, 0.14, 0.26, { flowers: true, shutter: '#3FA86A' }); }
  else {
    windowOn(ctx, df, 0.27, 0.24, 0.32, 0.3, { cross: false }); doorOn(ctx, df, 0.72, 0.18, 0.46, darken(o.color, 0.1));
    awningOn(ctx, df, 0.04, 0.96, 0.53, [o.color, '#FFFFFF']);
    windowOn(ctx, df, 0.3, 0.78, 0.16, 0.22, { flowers: true }); windowOn(ctx, df, 0.72, 0.78, 0.16, 0.22, { flowers: true });
  }
  windowOn(ctx, of, 0.5, 0.6, 0.2, 0.26, {});
  gableRoof(ctx, x0, y0, h, w, d, 40, o.label === 'Cottage' ? '#C9672E' : darken(o.color, 0.12), o.door === 'i' ? 'j' : 'i', 0.14, wall);
  if (o.icon) signOn(ctx, df, 0.5, 0.64, o.icon, o.color, o.label);
}

export function buildingSprite(o) {
  const tall = { myhome: 140, apartment: 260, villa: 170, venue: 210, shop: 150, house: 140 }[o.kind] || 200;
  const [a, b, c, d] = bounds(o.w, o.d, tall);
  return new Sprite(a, b, c, d, ctx => {
    if (o.kind === 'house' || o.kind === 'myhome') drawHouse(ctx, o);
    else if (o.kind === 'apartment') drawApartment(ctx, o);
    else if (o.kind === 'villa') drawVilla(ctx, o);
    else if (o.kind === 'venue') drawVenue(ctx, o);
    else if (o.kind === 'shop') drawShop(ctx, o);
  });
}

// Ground shadow cast toward the lower right.
export function shadowSprite(w, d, h) {
  const k = h / 150, sx = 0.75 * k, sy = -0.25 * k;
  const [a, b, c, dd] = bounds(w + sx, d + 0.5, 0);
  return new Sprite(a - 60, b - 60, c + 80, dd + 40, ctx => {
    ctx.fillStyle = '#21384F';
    const pts = [[0, 0], [w, 0], [w, d], [0, d]];
    const sh = pts.map(([x, y]) => [x + sx, y + sy]);
    poly(ctx, pts.map(p => [...p, 0]), '#21384F');
    poly(ctx, sh.map(p => [...p, 0]), '#21384F');
    for (let n = 0; n < 4; n++) { const m = (n + 1) % 4; poly(ctx, [[...pts[n], 0], [...pts[m], 0], [...sh[m], 0], [...sh[n], 0]], '#21384F'); }
  }, 1);
}

// ---------- landmarks ----------
export function fountainSprite() {
  return new Sprite(-150, -80, 150, 150, ctx => {
    const c = [1, 1];
    const ring = (r, z, fill, stroke) => { ctx.beginPath(); const [cx, cy] = P(c[0], c[1], z); ctx.ellipse(cx, cy, r * TW / 2 * 1.41, r * TH / 2 * 1.41, 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
    ring(0.95, 0, '#D9CBB3');
    for (let z = 0; z < 16; z += 2) ring(0.9, z, '#EFE6D6', z === 14 ? '#C9B795' : null);
    ring(0.8, 16, '#6FC6E2');
    ring(0.55, 16, '#8FD8EE');
    // pedestal and bowl
    const [px, py] = P(1, 1, 16);
    ctx.fillStyle = '#EFE6D6'; ctx.strokeStyle = '#C9B795'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.lineTo(px - 5, py - 34); ctx.lineTo(px + 5, py - 34); ctx.lineTo(px + 8, py); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(px, py - 36, 26, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8FD8EE'; ctx.beginPath(); ctx.ellipse(px, py - 37, 20, 6, 0, 0, 7); ctx.fill();
  });
}
export function drawFountainWater(ctx, sx, sy, zoom, t) {
  const [px, py] = P(1, 1, 16);
  const x = sx + px * zoom, y = sy + py * zoom;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2 * zoom; ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + t * 0.4, ex = Math.cos(a) * 30, ey = Math.sin(a) * 10;
    ctx.beginPath(); ctx.moveTo(x, y - 52 * zoom); ctx.quadraticCurveTo(x + ex * 0.5 * zoom, y - 70 * zoom, x + ex * zoom, y + (ey - 36) * zoom); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let k = 0; k < 10; k++) {
    const ph = (t * 1.6 + k / 10) % 1, a = k * 2.4;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 14 * ph * zoom, y - (52 + 30 * Math.sin(ph * Math.PI)) * zoom, 2 * zoom, 0, 7); ctx.fill();
  }
  ctx.restore();
}

export function clockSprite() {
  return new Sprite(-70, -260, 70, 60, ctx => {
    const x0 = 0.18, y0 = 0.18, w = 0.64;
    box(ctx, x0 - 0.06, y0 - 0.06, 0, w + 0.12, w + 0.12, 16, '#D9CBB3');
    const f = box(ctx, x0, y0, 16, w, w, 150, '#F6E2C0');
    for (const fc of [f.i, f.j]) rectOn(ctx, fc, 0.1, 0.05, 0.9, 0.5, '#E9C995', null);
    box(ctx, x0 - 0.05, y0 - 0.05, 166, w + 0.1, w + 0.1, 8, '#FFFFFF');
    const tip = [x0 + w / 2, y0 + w / 2, 230];
    const A = [x0 - 0.08, y0 - 0.08, 172], B = [x0 + w + 0.08, y0 - 0.08, 172], C = [x0 + w + 0.08, y0 + w + 0.08, 172], D = [x0 - 0.08, y0 + w + 0.08, 172];
    poly(ctx, [B, C, tip], lit('#2E9BD6', [0.7, 0, 0.6]), edge('#2E9BD6'));
    poly(ctx, [D, C, tip], lit('#2E9BD6', [0, 0.7, 0.6]), edge('#2E9BD6'));
    const [tx, ty] = P(...tip); ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(tx, ty - 3, 4, 0, 7); ctx.fill();
  });
}
export function drawClockHands(ctx, sx, sy, zoom, now) {
  const faces = [faceJ(0.18, 0.18, 16, 0.64, 0.64, 150), faceI(0.18, 0.18, 16, 0.64, 0.64, 150)];
  const h = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2, m = now.getMinutes() / 60 * Math.PI * 2;
  for (const f of faces) {
    const [cx, cy] = P(...fp(f, 0.5, 0.78, 0.01));
    const X = sx + cx * zoom, Y = sy + cy * zoom, sk = f.n === NI ? -0.5 : 0.5;
    ctx.save(); ctx.translate(X, Y); ctx.transform(1, sk, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#B98A1A'; ctx.lineWidth = 2 * zoom;
    ctx.beginPath(); ctx.arc(0, 0, 12 * zoom, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#26395A'; ctx.lineCap = 'round';
    ctx.lineWidth = 2 * zoom; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(h) * 6 * zoom, -Math.cos(h) * 6 * zoom); ctx.stroke();
    ctx.lineWidth = 1.4 * zoom; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m) * 9 * zoom, -Math.cos(m) * 9 * zoom); ctx.stroke();
    ctx.restore();
  }
}

export function boardSprite() {
  return new Sprite(-70, -120, 70, 50, ctx => {
    box(ctx, 0.2, 0.45, 0, 0.06, 0.06, 64, '#9B6A47'); box(ctx, 0.74, 0.45, 0, 0.06, 0.06, 64, '#9B6A47');
    const f = box(ctx, 0.12, 0.48, 26, 0.76, 0.05, 46, '#9B6A47');
    rectOn(ctx, f.j, 0.06, 0.08, 0.94, 0.9, '#FFF6E6', null, 0.01);
    for (let k = 0; k < 3; k++) rectOn(ctx, f.j, 0.12 + k * 0.28, 0.2, 0.32 + k * 0.28, 0.62, ['#F4A3A0', '#7FC8DD', '#FFD27A'][k], '#00000022', 0.02);
    gableRoof(ctx, 0.08, 0.42, 72, 0.84, 0.17, 14, '#3FA86A', 'i', 0.05, '#9B6A47');
    signOn(ctx, faceJ(0.12, 0.48, 26, 0.76, 0.05, 46), 0.5, 0.82, '🏠', '#3FA86A', 'Homes');
  });
}

export function sunwheelBase() {
  return new Sprite(-160, -320, 160, 100, ctx => {
    poly(ctx, [[0.1, 0.1, 0], [1.9, 0.1, 0], [1.9, 1.9, 0], [0.1, 1.9, 0]], '#EFE3CC', '#C9B79566');
    box(ctx, 0.5, 0.5, 0, 1, 1, 14, '#F6EBD9');
    const hub = P(1, 1, 150);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const [x, y] of [[0.35, 1.0], [1.0, 1.65]]) { const [bx, by] = P(x, y, 0); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(hub[0], hub[1]); ctx.stroke(); }
    ctx.strokeStyle = '#D9CBB3'; ctx.lineWidth = 2; for (const [x, y] of [[0.35, 1.0], [1.0, 1.65]]) { const [bx, by] = P(x, y, 0); ctx.beginPath(); ctx.moveTo(bx + 3, by); ctx.lineTo(hub[0] + 3, hub[1]); ctx.stroke(); }
  });
}
export function drawSunwheel(ctx, sx, sy, zoom, t) {
  const [hx, hy] = P(1, 1, 150), X = sx + hx * zoom, Y = sy + hy * zoom, R = 108 * zoom;
  ctx.save();
  ctx.lineWidth = 5 * zoom; ctx.strokeStyle = '#F0587A'; ctx.beginPath(); ctx.arc(X, Y, R, 0, 7); ctx.stroke();
  ctx.lineWidth = 2 * zoom; ctx.strokeStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(X, Y, R * 0.92, 0, 7); ctx.stroke();
  const n = 10, rot = t * 0.18;
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6 * zoom;
  for (let k = 0; k < n; k++) { const a = rot + k / n * Math.PI * 2; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * R, Y + Math.sin(a) * R); ctx.stroke(); }
  const cols = ['#FFC83D', '#2E9BD6', '#3FA86A', '#8E7CE0', '#F0587A'];
  for (let k = 0; k < n; k++) {
    const a = rot + k / n * Math.PI * 2, gx = X + Math.cos(a) * R, gy = Y + Math.sin(a) * R;
    ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 1.4 * zoom; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + 7 * zoom); ctx.stroke();
    ctx.fillStyle = cols[k % cols.length]; roundRect(ctx, gx - 9 * zoom, gy + 6 * zoom, 18 * zoom, 15 * zoom, 5 * zoom); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(gx - 6 * zoom, gy + 9 * zoom, 12 * zoom, 5 * zoom);
  }
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(X, Y, 9 * zoom, 0, 7); ctx.fill();
  ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(X, Y, 5 * zoom, 0, 7); ctx.fill();
  for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2 + rot; ctx.fillStyle = k % 2 ? '#FFF4B8' : '#FFFFFF'; ctx.beginPath(); ctx.arc(X + Math.cos(a) * R, Y + Math.sin(a) * R, 2.2 * zoom, 0, 7); ctx.fill(); }
  ctx.restore();
}

export function windmillBase() {
  return new Sprite(-130, -250, 130, 80, ctx => {
    const c = P(1, 1, 0);
    ctx.fillStyle = '#9AD77D'; ctx.beginPath(); ctx.ellipse(c[0], c[1], 70, 34, 0, 0, 7); ctx.fill();
    const base = 40, top = 22, H = 150;
    const g = ctx.createLinearGradient(c[0] - base, 0, c[0] + base, 0);
    g.addColorStop(0, '#FFF6E6'); g.addColorStop(0.6, '#F2E2C6'); g.addColorStop(1, '#D9C3A0');
    ctx.fillStyle = g; ctx.strokeStyle = '#B7A88E'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c[0] - base, c[1]); ctx.lineTo(c[0] - top, c[1] - H); ctx.lineTo(c[0] + top, c[1] - H); ctx.lineTo(c[0] + base, c[1]); ctx.ellipse(c[0], c[1], base, 12, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9B6A47'; roundRect(ctx, c[0] - 9, c[1] - 30, 18, 30, 8); ctx.fill();
    ctx.fillStyle = '#7FC3E8'; ctx.beginPath(); ctx.arc(c[0] + 6, c[1] - 90, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#C9672E'; ctx.beginPath(); ctx.moveTo(c[0] - top - 8, c[1] - H + 2); ctx.quadraticCurveTo(c[0], c[1] - H - 50, c[0] + top + 8, c[1] - H + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8C4A22'; ctx.stroke();
  });
}
export function drawWindmillBlades(ctx, sx, sy, zoom, t) {
  const c = P(1, 1, 0), X = sx + c[0] * zoom + 6 * zoom, Y = sy + (c[1] - 140) * zoom;
  ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 0.5);
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#9B6A47'; ctx.lineWidth = 1.6 * zoom;
    ctx.fillRect(4 * zoom, -2 * zoom, 82 * zoom, 4 * zoom);
    ctx.beginPath(); ctx.rect(26 * zoom, 2 * zoom, 58 * zoom, 15 * zoom); ctx.fill(); ctx.stroke();
    for (let q = 1; q < 4; q++) { ctx.beginPath(); ctx.moveTo((26 + q * 14.5) * zoom, 2 * zoom); ctx.lineTo((26 + q * 14.5) * zoom, 17 * zoom); ctx.stroke(); }
  }
  ctx.fillStyle = '#9B6A47'; ctx.beginPath(); ctx.arc(0, 0, 6 * zoom, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- nature & street furniture ----------
export function blob(ctx, x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill(); }
export function canopy(ctx, blobs, base, r) {
  const outline = darken(base, 0.4);
  for (const [x, y, s] of blobs) blob(ctx, x, y, s + 2.2, outline);
  for (const [x, y, s] of blobs) blob(ctx, x, y, s, darken(base, 0.12));
  for (const [x, y, s] of blobs) blob(ctx, x - s * 0.18, y - s * 0.22, s * 0.8, base);
  for (const [x, y, s] of blobs) blob(ctx, x - s * 0.34, y - s * 0.42, s * 0.4, lighten(base, 0.28));
  for (let k = 0; k < 8; k++) { const [x, y, s] = blobs[Math.floor(r() * blobs.length)]; blob(ctx, x + (r() - 0.5) * s, y + (r() - 0.5) * s, 1.6, lighten(base, 0.45)); }
}
export function treeSprite(kind, seed) {
  const r = rng(seed + 11);
  const scale = 0.85 + r() * 0.3;
  return new Sprite(-80, -220, 80, 30, ctx => {
    ctx.scale(scale, scale);
    if (kind === 'palm') {
      ctx.strokeStyle = '#9B6A47'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      const lean = (r() - 0.5) * 24;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lean * 0.2, -50, lean, -100); ctx.stroke();
      ctx.strokeStyle = '#7C5236'; ctx.lineWidth = 1.5;
      for (let k = 1; k < 8; k++) { const t = k / 8, x = lean * t * t, y = -100 * t; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y + 2); ctx.stroke(); }
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2 + r() * 0.3;
        ctx.save(); ctx.translate(lean, -100); ctx.rotate(a);
        ctx.fillStyle = k % 2 ? '#3FA86A' : '#5FC07E'; ctx.strokeStyle = '#2E7D4F'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(26, 6, 30, 7, 0.35, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      blob(ctx, lean - 4, -96, 4, '#8C5A30'); blob(ctx, lean + 4, -95, 4, '#8C5A30');
      return;
    }
    if (kind === 'pine') {
      ctx.fillStyle = '#8C5A3C'; ctx.fillRect(-4, -22, 8, 22);
      const tiers = [[-22, 40], [-58, 33], [-90, 25], [-116, 15]];
      for (const [y, w] of tiers) {
        ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y + 10, w, y); ctx.lineTo(0, y - w * 1.25); ctx.closePath();
        ctx.fillStyle = '#2F7D58'; ctx.strokeStyle = '#1E5A3E'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-w * 0.8, y - 3); ctx.lineTo(0, y - w * 1.15); ctx.lineTo(-w * 0.1, y + 2); ctx.closePath(); ctx.fillStyle = '#4C9E6E'; ctx.fill();
      }
      return;
    }
    // trunk
    ctx.fillStyle = '#8C5A3C'; ctx.strokeStyle = '#5E3A26'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-3, -24, -4, -46); ctx.lineTo(4, -46); ctx.quadraticCurveTo(3, -24, 6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    const base = kind === 'blossom' ? '#F7A8C4' : kind === 'willow' ? '#7CC46A' : ['#4FAE5A', '#5DB865', '#47A15A'][Math.floor(r() * 3)];
    const blobs = [[0, -78, 30], [-24, -62, 22], [24, -60, 22], [-12, -100, 20], [14, -96, 20], [0, -54, 20]];
    canopy(ctx, blobs, base, r);
    if (kind === 'blossom') for (let k = 0; k < 18; k++) blob(ctx, (r() - 0.5) * 60, -50 - r() * 60, 2.2, r() < 0.5 ? '#FFFFFF' : '#F0587A');
    if (kind === 'willow') { ctx.strokeStyle = '#5FA84E'; ctx.lineWidth = 2; for (let k = 0; k < 14; k++) { const x = -34 + k * 5; ctx.beginPath(); ctx.moveTo(x, -60); ctx.quadraticCurveTo(x + 3, -36, x - 2, -16 - r() * 10); ctx.stroke(); } }
    if (kind === 'round' && r() < 0.35) for (let k = 0; k < 5; k++) blob(ctx, (r() - 0.5) * 50, -55 - r() * 45, 3.2, '#F0587A');
  });
}
export function treeShadow() {
  return new Sprite(-50, -20, 70, 30, ctx => { ctx.fillStyle = '#21384F'; ctx.beginPath(); ctx.ellipse(12, 4, 34, 13, 0, 0, 7); ctx.fill(); }, 1);
}
export function smallSprite(kind, seed, face) {
  const r = rng(seed + 3);
  return new Sprite(-50, -90, 50, 24, ctx => {
    if (kind === 'flowers') {
      const cols = [['#F0587A', '#FFFFFF'], ['#FFC83D', '#FFFFFF'], ['#8E7CE0', '#FFC83D'], ['#FFFFFF', '#FFC83D']][Math.floor(r() * 4)];
      for (let k = 0; k < 9; k++) {
        const x = (r() - 0.5) * 40, y = (r() - 0.5) * 16;
        ctx.strokeStyle = '#3F9A5C'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 8); ctx.stroke();
        for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; blob(ctx, x + Math.cos(a) * 2.6, y - 9 + Math.sin(a) * 2.6, 2.2, cols[0]); }
        blob(ctx, x, y - 9, 1.6, cols[1]);
      }
    } else if (kind === 'bush') {
      canopy(ctx, [[-10, -12, 13], [10, -12, 13], [0, -20, 13]], '#4FAE5A', r);
    } else if (kind === 'lamp') {
      ctx.fillStyle = '#34476B'; ctx.fillRect(-2.5, -70, 5, 70); ctx.fillRect(-7, -4, 14, 4);
      roundRect(ctx, -9, -86, 18, 18, 5); ctx.fill();
      ctx.fillStyle = '#FFE9A6'; roundRect(ctx, -6, -83, 12, 12, 3); ctx.fill();
      ctx.fillStyle = '#34476B'; ctx.beginPath(); ctx.moveTo(-11, -86); ctx.lineTo(0, -94); ctx.lineTo(11, -86); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F0587A'; ctx.beginPath(); ctx.arc(8, -54, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#3FA86A'; ctx.beginPath(); ctx.arc(-8, -50, 6, 0, 7); ctx.fill();
    } else if (kind === 'bench') {
      // centred on the tile; seat runs along i or j
      const along = face === 'i' ? [0, 1] : [1, 0], across = face === 'i' ? [1, 0] : [0, 1];
      const pt = (a, c, z) => [along[0] * a + across[0] * c, along[1] * a + across[1] * c, z];
      for (const a of [-0.28, 0.28]) for (const c of [-0.08, 0.08]) { const [x, y] = P(...pt(a, c, 0)); ctx.fillStyle = '#5E3A26'; ctx.fillRect(x - 1.5, y - 11, 3, 11); }
      poly(ctx, [pt(-0.34, -0.12, 11), pt(0.34, -0.12, 11), pt(0.34, 0.12, 11), pt(-0.34, 0.12, 11)], '#D99A55', '#8C5A30', 1.2);
      poly(ctx, [pt(-0.34, -0.12, 11), pt(0.34, -0.12, 11), pt(0.34, -0.14, 24), pt(-0.34, -0.14, 24)], '#C98A4B', '#8C5A30', 1.2);
    }
  });
}

// ---------- ground tiles ----------
const TILE_COL = { 1: '#F3DFAE', 2: '#7CC562', 3: '#F0D9AE', 4: '#EFE6D6', 5: '#8FD06F', 7: '#C98A4B', 8: '#86C966', 9: '#D9A066', 10: '#EEF4F2', 11: '#C9BBF0', 12: '#D3ECF6' };
export function tileSprite(type, variant) {
  const r = rng(type * 97 + variant * 13 + 5);
  const s = new Sprite(-TW / 2 - 1, -1, TW / 2 + 1, TH + 1, ctx => {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(TW / 2 + 0.8, TH / 2); ctx.lineTo(0, TH + 0.8); ctx.lineTo(-TW / 2 - 0.8, TH / 2); ctx.closePath();
    ctx.fillStyle = TILE_COL[type]; ctx.fill(); ctx.save(); ctx.clip();
    if (type === 2 || type === 5 || type === 8) {
      for (let k = 0; k < 26; k++) {
        const x = (r() - 0.5) * TW, y = r() * TH;
        ctx.strokeStyle = r() < 0.5 ? darken(TILE_COL[type], 0.1) : lighten(TILE_COL[type], 0.15); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y - 4); ctx.stroke();
      }
      if (variant === 0) { ctx.fillStyle = lighten(TILE_COL[type], 0.08); ctx.beginPath(); ctx.ellipse((r() - .5) * 40, TH / 2 + (r() - .5) * 12, 22, 9, 0, 0, 7); ctx.fill(); }
      if (type === 8) for (let k = 0; k < 14; k++) blob(ctx, (r() - 0.5) * TW * 0.8, r() * TH, 2, ['#FFFFFF', '#FFC83D', '#F0587A', '#8E7CE0'][k % 4]);
      else if (r() < 0.4) for (let k = 0; k < 3; k++) blob(ctx, (r() - 0.5) * 60, 10 + r() * 40, 1.8, k % 2 ? '#FFFFFF' : '#FFE07A');
    } else if (type === 3) {
      for (let y = 4; y < TH; y += 9) for (let x = -TW / 2; x < TW / 2; x += 13) {
        ctx.fillStyle = [lighten('#E8CB97', 0.15), '#E8CB97', lighten('#E8CB97', 0.3)][Math.floor(r() * 3)];
        roundRect(ctx, x + (y % 18 ? 6 : 0) + (r() - .5) * 2, y, 11, 7, 3); ctx.fill();
      }
    } else if (type === 4) {
      ctx.strokeStyle = '#DCCFB8'; ctx.lineWidth = 1.2;
      for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 16, 0); ctx.lineTo(k * 16 + TW / 2, TH / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k * 16, 0); ctx.lineTo(k * 16 - TW / 2, TH / 2); ctx.stroke(); }
    } else if (type === 1) {
      for (let k = 0; k < 30; k++) blob(ctx, (r() - 0.5) * TW, r() * TH, 1, r() < 0.5 ? '#E3C98F' : '#FFF1CC');
    } else if (type === 9) { // wood floor
      ctx.strokeStyle = '#B98448'; ctx.lineWidth = 1.2;
      for (let k = -10; k <= 10; k++) { ctx.beginPath(); ctx.moveTo(k * 10, 0); ctx.lineTo(k * 10 + TW / 2, TH / 2); ctx.stroke(); }
      for (let k = 0; k < 10; k++) { const x = (r() - 0.5) * TW, y = r() * TH; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(-TW / 2, 0, TW, TH / 2);
    } else if (type === 10 || type === 12) { // kitchen and bathroom tiles
      ctx.strokeStyle = type === 10 ? '#CFDAD6' : '#A9D2E4'; ctx.lineWidth = 1.4;
      const n = type === 10 ? 2 : 4;
      ctx.beginPath();
      for (let k = 1; k < n; k++) {
        const t = k / n;
        ctx.moveTo(-TW / 2 * t, TH / 2 * t); ctx.lineTo(TW / 2 - TW / 2 * t, TH / 2 + TH / 2 * t);
        ctx.moveTo(TW / 2 * t, TH / 2 * t); ctx.lineTo(-TW / 2 + TW / 2 * t, TH / 2 + TH / 2 * t);
      }
      ctx.stroke();
      if (type === 10 && variant % 2) { ctx.fillStyle = 'rgba(63,168,106,.12)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(TW / 4, TH / 4); ctx.lineTo(0, TH / 2); ctx.lineTo(-TW / 4, TH / 4); ctx.fill(); }
    } else if (type === 11) { // carpet
      for (let k = 0; k < 40; k++) blob(ctx, (r() - 0.5) * TW, r() * TH, 1.1, r() < 0.5 ? '#B7A6E6' : '#DCD1F7');
    } else if (type === 7) {
      ctx.strokeStyle = '#9B6A37'; ctx.lineWidth = 1.5;
      for (let k = -8; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(k * 12, 0); ctx.lineTo(k * 12 - TW / 2, TH / 2 + k * 0); ctx.lineTo(k * 12, TH); ctx.stroke(); }
      for (let k = -8; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(k * 8 - 64, 0); ctx.lineTo(k * 8 + 64, TH); ctx.stroke(); }
    }
    ctx.restore();
  });
  return s;
}

// ---------- boats ----------
export function drawBoat(ctx, X, Y, zoom, t, b) {
  const bob = Math.sin(t * 1.4 + b.seed) * 2.5 * zoom, tilt = Math.sin(t * 1.1 + b.seed) * 0.05;
  ctx.save(); ctx.translate(X, Y + bob); ctx.rotate(tilt); ctx.scale(zoom, zoom);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(0, 6, 40, 9, 0, 0, 7); ctx.fill();
  const hull = ['#F0587A', '#2E9BD6', '#FFC83D', '#3FA86A'][b.seed % 4];
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#26395A55'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(34, -8); ctx.quadraticCurveTo(30, 6, 18, 6); ctx.lineTo(-22, 6); ctx.quadraticCurveTo(-32, 4, -34, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hull; ctx.fillRect(-30, -4, 62, 5);
  if (b.sail) {
    ctx.fillStyle = '#8C5A30'; ctx.fillRect(-1, -70, 3, 62);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(2, -68); ctx.quadraticCurveTo(28, -40, 26, -12); ctx.lineTo(2, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-2, -60); ctx.quadraticCurveTo(-20, -36, -18, -12); ctx.lineTo(-2, -12); ctx.closePath(); ctx.fill();
  } else { ctx.fillStyle = '#FFF6E6'; roundRect(ctx, -12, -24, 26, 16, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#7FC3E8'; ctx.fillRect(-7, -20, 16, 6); }
  ctx.restore();
}

// ---------- animal residents (see character.js) ----------
export { SPECIES, OUTFITS, drawAnimal, drawPortrait, WARDROBE, PALETTE, HAIR_COLORS, normLook, randomLook, occasionLook } from './character.js';

export function drawEmote(ctx, x, y, zoom, emoji, life = 1) {
  const s = zoom * (0.85 + 0.15 * Math.min(1, life * 4));
  ctx.save(); ctx.globalAlpha = Math.min(1, life * 3); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#26395A33'; ctx.lineWidth = 1.5;
  roundRect(ctx, -15, -32, 30, 26, 12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(0, 0); ctx.lineTo(4, -7); ctx.fill();
  ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 0, -19);
  ctx.restore();
}
