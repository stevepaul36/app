// Furniture and walls for the cottage interior, drawn with the same lit-box primitives as the town.
import { P, Sprite, box, poly, rectOn, windowOn, faceJ, faceI, fp, lit, darken, lighten, roundRect, NUP, NJ, NI, edge } from './art.js';

const WOOD = '#C98A4B', WOOD_D = '#9B6A37', WHITE = '#FAF7F2';
const blob = (ctx, x, y, r, c) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill(); };

function spriteFor(w, d, top, draw) {
  const pts = [P(0, 0, 0), P(w, 0, 0), P(0, d, 0), P(w, d, 0), P(0, 0, top), P(w, 0, top), P(0, d, top), P(w, d, top)];
  return new Sprite(Math.min(...pts.map(p => p[0])) - 20, Math.min(...pts.map(p => p[1])) - 20, Math.max(...pts.map(p => p[0])) + 20, Math.max(...pts.map(p => p[1])) + 20, draw);
}

const WALLPAPER = { bed: '#E6DDFB', bath: '#D6EEF7', kitchen: '#E3F3E6', living: '#FFF1D9' };

// One tile of wall. Back walls are full height; partitions and front walls are cut down so you can see in.
export function wallSprite(w) {
  const h = w.kind === 'back' ? 118 : w.kind === 'part' ? 30 : 20;
  const color = WALLPAPER[w.room] || '#FFF1D9';
  return spriteFor(1, 1, h + 10, ctx => {
    const f = w.axis === 'i' ? box(ctx, 0, -0.06, 0, 1, 0.12, h, w.kind === 'back' ? color : '#F6EFE4', { topColor: '#B9A99A' })
      : box(ctx, -0.06, 0, 0, 0.12, 1, h, w.kind === 'back' ? color : '#F6EFE4', { topColor: '#B9A99A' });
    const face = w.axis === 'i' ? f.j : f.i;
    if (w.kind === 'back') {
      for (let k = 1; k < 5; k++) rectOn(ctx, face, k / 5 - 0.012, 0.12, k / 5 + 0.012, 0.95, 'rgba(255,255,255,.45)', null);
      rectOn(ctx, face, 0, 0, 1, 0.09, '#FFFFFF', '#00000018');
      rectOn(ctx, face, 0, 0.9, 1, 0.94, 'rgba(255,255,255,.7)', null);
      if (w.win) windowOn(ctx, face, 0.5, 0.6, 0.5, 0.36, { shutter: null, flowers: w.room === 'kitchen' });
    } else {
      rectOn(ctx, face, 0, 0, 1, 0.3, '#FFFFFF', null);
    }
  });
}

export function furnitureSprite(f, part) {
  const t = f.type;
  if (t === 'sofa' && part) return spriteFor(f.w, f.d, 60, ctx => couch(ctx, f.w, '#F0587A', part));
  const tall = { bed: 60, bookshelf: 110, shower: 110, fridge: 110, sink: 100, tv: 80, sofa: 50, armchair: 50, desk: 80, plant: 80, floorlamp: 110, radio: 50, nightstand: 60, mailbox: 50 }[t] || 50;
  return spriteFor(f.w, f.d, tall, ctx => DRAW[t] && DRAW[t](ctx, f));
}

const DRAW = {
  bed(ctx, f) {
    box(ctx, 0.08, 0.05, 0, 1.84, 2.85, 14, WOOD);
    box(ctx, 0.12, 0.08, 14, 1.76, 2.75, 9, WHITE);
    box(ctx, 0.1, 1.0, 23, 1.8, 1.88, 5, '#7FB8E6', { topColor: '#8EC6F0' });
    for (let k = 0; k < 4; k++) poly(ctx, [[0.1, 1.2 + k * 0.42, 28.2], [1.9, 1.2 + k * 0.42, 28.2]], null, 'rgba(255,255,255,.55)', 2);
    box(ctx, 0.3, 0.2, 23, 0.6, 0.45, 9, '#FFFFFF'); box(ctx, 1.1, 0.2, 23, 0.6, 0.45, 9, '#FFFFFF');
    box(ctx, 0.04, 0.0, 0, 1.92, 0.12, 52, WOOD_D);
    const fc = faceJ(0.04, 0, 0, 1.92, 0.12, 52); rectOn(ctx, fc, 0.1, 0.55, 0.9, 0.85, lighten(WOOD, 0.2), null);
  },
  nightstand(ctx) {
    box(ctx, 0.2, 0.15, 0, 0.6, 0.6, 24, WOOD);
    const f = faceJ(0.2, 0.15, 0, 0.6, 0.6, 24); rectOn(ctx, f, 0.15, 0.3, 0.85, 0.7, lighten(WOOD, 0.15), '#00000022');
    const [x, y] = P(0.5, 0.45, 24);
    ctx.fillStyle = '#7A8798'; ctx.fillRect(x - 1.5, y - 18, 3, 18);
    ctx.fillStyle = '#FFE6A8'; ctx.beginPath(); ctx.moveTo(x - 10, y - 16); ctx.lineTo(x + 10, y - 16); ctx.lineTo(x + 6, y - 30); ctx.lineTo(x - 6, y - 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#E3B95E'; ctx.stroke();
  },
  bookshelf(ctx) {
    const fc = box(ctx, 0.05, 0.05, 0, 0.9, 0.38, 96, WOOD);
    const cols = ['#F0587A', '#2E9BD6', '#FFC83D', '#3FA86A', '#8E7CE0', '#E8823A'];
    for (let r = 0; r < 4; r++) {
      rectOn(ctx, fc.j, 0.06, r * 0.24 + 0.04, 0.94, r * 0.24 + 0.22, darken(WOOD, 0.35), null);
      let u = 0.08;
      for (let k = 0; u < 0.9; k++) { const w = 0.07 + ((k * 37 + r * 11) % 5) * 0.012; rectOn(ctx, fc.j, u, r * 0.24 + 0.05, Math.min(0.92, u + w), r * 0.24 + 0.2 - (k % 3) * 0.015, cols[(k + r * 2) % cols.length], null, 0.01); u += w + 0.01; }
    }
  },
  shower(ctx) {
    box(ctx, 0.05, 0.05, 0, 0.9, 0.9, 5, '#FFFFFF');
    poly(ctx, [[0.15, 0.15, 5.2], [0.85, 0.15, 5.2], [0.85, 0.85, 5.2], [0.15, 0.85, 5.2]], '#BFE3F2');
    const [hx, hy] = P(0.2, 0.5, 100); ctx.fillStyle = '#A0AEC0'; ctx.fillRect(hx - 2, hy, 4, 10); ctx.beginPath(); ctx.ellipse(hx + 6, hy + 12, 8, 3, 0.3, 0, 7); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.28;
    poly(ctx, [[0.05, 0.95, 5], [0.95, 0.95, 5], [0.95, 0.95, 104], [0.05, 0.95, 104]], '#9FDCF2', '#5FA9D6');
    poly(ctx, [[0.95, 0.05, 5], [0.95, 0.95, 5], [0.95, 0.95, 104], [0.95, 0.05, 104]], '#8ED0EA', '#5FA9D6');
    ctx.restore();
    poly(ctx, [[0.05, 0.95, 104], [0.95, 0.95, 104], [0.95, 0.05, 104]], null, '#A0AEC0', 2.4);
  },
  sink(ctx) {
    box(ctx, 0.12, 0.3, 0, 0.36, 0.4, 40, '#FFFFFF');
    box(ctx, 0.06, 0.18, 40, 0.62, 0.64, 9, '#FFFFFF');
    poly(ctx, [[0.14, 0.26, 49.2], [0.6, 0.26, 49.2], [0.6, 0.74, 49.2], [0.14, 0.74, 49.2]], '#BFE3F2');
    box(ctx, 0.02, 0.2, 62, 0.04, 0.6, 38, '#A9DDF0', { stroke: false });
    const m = faceI(0.02, 0.2, 62, 0.04, 0.6, 38); rectOn(ctx, m, 0.1, 0.6, 0.35, 0.9, 'rgba(255,255,255,.7)', null);
  },
  plant(ctx, f) {
    box(ctx, 0.3, 0.3, 0, 0.4, 0.4, 20, ['#E8823A', '#F6EBD9', '#2E9BD6'][f.variant || 0]);
    const [x, y] = P(0.5, 0.5, 20);
    const g = ['#3FA86A', '#4FAE5A', '#5FC07E'];
    if (f.variant === 2) { ctx.strokeStyle = '#3F9A5C'; ctx.lineWidth = 4; for (let k = 0; k < 6; k++) { ctx.save(); ctx.translate(x, y - 20); ctx.rotate(-1.6 + k * 0.6); ctx.fillStyle = g[k % 3]; ctx.beginPath(); ctx.ellipse(18, 0, 20, 5, 0, 0, 7); ctx.fill(); ctx.restore(); } }
    else for (let k = 0; k < 7; k++) blob(ctx, x + Math.cos(k) * 11, y - 18 - Math.sin(k * 1.7) * 12 - k * 2, 9, g[k % 3]);
  },
  radio(ctx) {
    box(ctx, 0.15, 0.15, 0, 0.7, 0.6, 26, WOOD);
    box(ctx, 0.25, 0.25, 26, 0.5, 0.3, 18, '#F0587A');
    const fc = faceJ(0.25, 0.25, 26, 0.5, 0.3, 18);
    for (const u of [0.28, 0.72]) { const [x, y] = P(...fp(fc, u, 0.5, 0.01)); blob(ctx, x, y, 4.5, '#5A3B4A'); blob(ctx, x, y, 2, '#B94A6A'); }
  },
  fridge(ctx) {
    const fc = box(ctx, 0.1, 0.12, 0, 0.8, 0.72, 100, '#F4F7FA');
    rectOn(ctx, fc.j, 0, 0.62, 1, 0.635, '#C8D3DE', null);
    rectOn(ctx, fc.j, 0.82, 0.68, 0.87, 0.9, '#A0AEC0', null, 0.02); rectOn(ctx, fc.j, 0.82, 0.3, 0.87, 0.55, '#A0AEC0', null, 0.02);
    rectOn(ctx, fc.j, 0.2, 0.74, 0.32, 0.82, '#F0587A', null, 0.01); rectOn(ctx, fc.j, 0.38, 0.7, 0.48, 0.78, '#FFC83D', null, 0.01);
  },
  counter(ctx, f) {
    const fc = box(ctx, 0.04, 0.12, 0, 0.92, 0.78, 34, WHITE);
    box(ctx, 0.02, 0.1, 34, 0.96, 0.82, 4, '#8FA6B8');
    rectOn(ctx, fc.j, 0.06, 0.12, 0.47, 0.85, '#F2EDE5', '#00000020'); rectOn(ctx, fc.j, 0.53, 0.12, 0.94, 0.85, '#F2EDE5', '#00000020');
    if (f.fruit) { const [x, y] = P(0.5, 0.45, 38); ctx.fillStyle = '#E3D2B8'; ctx.beginPath(); ctx.ellipse(x, y, 13, 5, 0, 0, Math.PI); ctx.fill(); blob(ctx, x - 5, y - 3, 4, '#F0587A'); blob(ctx, x + 3, y - 4, 4, '#FFC83D'); blob(ctx, x, y - 7, 4, '#3FA86A'); }
  },
  kitchensink(ctx) {
    DRAW.counter(ctx, {});
    poly(ctx, [[0.2, 0.25, 38.2], [0.8, 0.25, 38.2], [0.8, 0.75, 38.2], [0.2, 0.75, 38.2]], '#C9D6E2', '#8FA6B8', 1);
    const [x, y] = P(0.5, 0.18, 38); ctx.strokeStyle = '#A0AEC0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.quadraticCurveTo(x, y - 18, x + 8, y - 14); ctx.stroke();
  },
  stove(ctx) {
    const fc = box(ctx, 0.04, 0.12, 0, 0.92, 0.78, 34, '#F4F7FA');
    box(ctx, 0.02, 0.1, 34, 0.96, 0.82, 3, '#34476B');
    rectOn(ctx, fc.j, 0.12, 0.15, 0.88, 0.7, '#34476B', null); rectOn(ctx, fc.j, 0.2, 0.25, 0.8, 0.6, '#5F7290', null, 0.01);
    for (const [u, v] of [[0.3, 0.35], [0.7, 0.35], [0.3, 0.7], [0.7, 0.7]]) { const [x, y] = P(u, 0.1 + v * 0.8, 37.5); ctx.strokeStyle = '#C9D6E2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 7, 3.5, 0, 0, 7); ctx.stroke(); }
    const [x, y] = P(0.5, 0.35, 37.5); ctx.fillStyle = '#8FA6B8'; ctx.beginPath(); ctx.ellipse(x, y - 4, 11, 5, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 11, y - 9, 22, 5);
  },
  table(ctx) {
    for (const [x, y] of [[0.15, 0.2], [1.75, 0.2], [0.15, 0.7], [1.75, 0.7]]) box(ctx, x, y, 0, 0.08, 0.08, 28, WOOD_D);
    box(ctx, 0.05, 0.1, 28, 1.9, 0.8, 5, WOOD);
    const [x, y] = P(1, 0.5, 33); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x - 20, y, 10, 5, 0, 0, 7); ctx.ellipse(x + 20, y, 10, 5, 0, 0, 7); ctx.fill();
    blob(ctx, x, y - 6, 5, '#F7A8C4'); ctx.fillStyle = '#7FC3E8'; ctx.fillRect(x - 2, y - 4, 4, 6);
  },
  chair(ctx, f) {
    const back = f.facing === 'i' ? [0.18, 0.2, 0.1, 0.6] : [0.72, 0.2, 0.1, 0.6];
    for (const [x, y] of [[0.25, 0.25], [0.7, 0.25], [0.25, 0.7], [0.7, 0.7]]) box(ctx, x, y, 0, 0.06, 0.06, 18, WOOD_D);
    box(ctx, 0.2, 0.2, 18, 0.6, 0.6, 4, WOOD);
    box(ctx, back[0], back[1], 22, back[2], back[3], 24, WOOD);
  },
  tv(ctx) {
    const fc = box(ctx, 0.1, 0.25, 0, 1.8, 0.5, 22, WOOD);
    rectOn(ctx, fc.j, 0.05, 0.2, 0.48, 0.8, lighten(WOOD, 0.15), '#00000020'); rectOn(ctx, fc.j, 0.52, 0.2, 0.95, 0.8, lighten(WOOD, 0.15), '#00000020');
    box(ctx, 0.25, 0.42, 22, 1.5, 0.08, 56, '#26304A');
    const sc = faceJ(0.25, 0.42, 22, 1.5, 0.08, 56); rectOn(ctx, sc, 0.04, 0.08, 0.96, 0.94, '#3B4A6B', null, 0.01);
    rectOn(ctx, sc, 0.1, 0.55, 0.3, 0.9, 'rgba(255,255,255,.12)', null, 0.012);
  },
  sofa(ctx, f) { couch(ctx, f.w, '#F0587A'); },
  armchair(ctx) {
    box(ctx, 0.12, 0.1, 0, 0.78, 0.8, 18, '#3F8FB8');
    box(ctx, 0.08, 0.06, 0, 0.18, 0.88, 44, '#357DA3');
    box(ctx, 0.22, 0.04, 18, 0.66, 0.14, 12, '#3F8FB8'); box(ctx, 0.22, 0.82, 18, 0.66, 0.14, 12, '#3F8FB8');
    box(ctx, 0.28, 0.2, 18, 0.58, 0.6, 7, '#5BA8D0');
  },
  desk(ctx) {
    for (const [x, y] of [[0.65, 0.1], [0.65, 1.8], [0.15, 0.1], [0.15, 1.8]]) box(ctx, x, y, 0, 0.08, 0.08, 32, '#34476B');
    box(ctx, 0.1, 0.05, 32, 0.8, 1.9, 4, '#FFFFFF');
    box(ctx, 0.55, 0.55, 36, 0.12, 0.9, 40, '#26304A');
    const sc = faceI(0.55, 0.55, 36, 0.12, 0.9, 40); rectOn(ctx, sc, 0.06, 0.1, 0.94, 0.92, '#7FC3E8', null, 0.01); rectOn(ctx, sc, 0.1, 0.5, 0.5, 0.85, '#B8E4F7', null, 0.012);
    poly(ctx, [[0.25, 0.65, 36.2], [0.45, 0.65, 36.2], [0.45, 1.35, 36.2], [0.25, 1.35, 36.2]], '#D9E2EC', '#A0AEC0', 1);
    // chair
    for (const [x, y] of [[-0.6, 0.35], [-0.6, 0.65], [-0.3, 0.35], [-0.3, 0.65]]) box(ctx, x, y, 0, 0.05, 0.05, 16, '#34476B');
    box(ctx, -0.65, 0.28, 16, 0.42, 0.44, 5, '#8E7CE0'); box(ctx, -0.7, 0.3, 21, 0.08, 0.4, 24, '#8E7CE0');
  },
  floorlamp(ctx) {
    box(ctx, 0.35, 0.35, 0, 0.3, 0.3, 3, '#34476B');
    const [x, y] = P(0.5, 0.5, 3); ctx.fillStyle = '#34476B'; ctx.fillRect(x - 1.5, y - 76, 3, 76);
    ctx.fillStyle = '#FFE6A8'; ctx.beginPath(); ctx.moveTo(x - 14, y - 74); ctx.lineTo(x + 14, y - 74); ctx.lineTo(x + 8, y - 96); ctx.lineTo(x - 8, y - 96); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#E3B95E'; ctx.stroke();
  },
  mailbox(ctx) {
    const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#7A5236'; ctx.fillRect(x - 2.5, y - 34, 5, 34);
    box(ctx, 0.3, 0.38, 34, 0.42, 0.26, 16, '#2E9BD6');
    const [fx, fy] = P(0.7, 0.4, 50); ctx.fillStyle = '#F0587A'; ctx.fillRect(fx, fy - 10, 3, 12); ctx.fillRect(fx, fy - 10, 9, 5);
  },
  rug(ctx, f) {
    poly(ctx, [[0.1, 0.1, 0.5], [f.w - 0.1, 0.1, 0.5], [f.w - 0.1, f.d - 0.1, 0.5], [0.1, f.d - 0.1, 0.5]], '#F2A93B', '#D98A1E', 2);
    poly(ctx, [[0.35, 0.35, 0.6], [f.w - 0.35, 0.35, 0.6], [f.w - 0.35, f.d - 0.35, 0.6], [0.35, f.d - 0.35, 0.6]], '#FFD27A', '#FFFFFF', 2);
    const [x, y] = P(f.w / 2, f.d / 2, 0.7); blob(ctx, x, y, 8, '#F0587A');
  },
  bathrug(ctx, f) { poly(ctx, [[0.15, 0.2, 0.5], [f.w - 0.15, 0.2, 0.5], [f.w - 0.15, f.d - 0.2, 0.5], [0.15, f.d - 0.2, 0.5]], '#8ED0EA', '#FFFFFF', 3); },
  doormat(ctx) { poly(ctx, [[0.15, 0.3, 0.5], [0.85, 0.3, 0.5], [0.85, 0.85, 0.5], [0.15, 0.85, 0.5]], '#B98448', '#8C5A30', 2); },
};

// part: 'seat' (drawn behind someone sitting) or 'back' (in front of them); no part draws both
function couch(ctx, w, color, part) {
  if (part !== 'back') {
    box(ctx, 0.06, 0.1, 0, w - 0.12, 0.82, 18, darken(color, 0.1));
    box(ctx, 0.04, 0.08, 0, 0.22, 0.88, 30, color);
    for (let k = 0; k < w; k++) box(ctx, 0.28 + k * (w - 0.56) / w, 0.14, 18, (w - 0.56) / w - 0.04, 0.6, 7, lighten(color, 0.15));
  }
  if (part !== 'seat') {
    box(ctx, 0.04, 0.72, 0, w - 0.08, 0.24, 46, color);
    box(ctx, w - 0.26, 0.08, 0, 0.22, 0.88, 30, color);
    box(ctx, 0.35, 0.58, 25, 0.4, 0.14, 16, '#FFC83D');
  }
}

// Moving or glowing bits drawn each frame on top of the cached furniture.
export function drawFurnitureLive(ctx, f, sx, sy, zoom, t, on) {
  if (f.type === 'tv' && on) {
    const sc = faceJ(0.25, 0.42, 22, 1.5, 0.08, 56), cols = ['#7FC3E8', '#FFC83D', '#F0587A', '#3FA86A'], c = cols[Math.floor(t * 1.5) % cols.length];
    const pts = [fp(sc, 0.04, 0.08, 0.02), fp(sc, 0.96, 0.08, 0.02), fp(sc, 0.96, 0.94, 0.02), fp(sc, 0.04, 0.94, 0.02)].map(p => P(...p));
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(sx + x * zoom, sy + y * zoom) : ctx.moveTo(sx + x * zoom, sy + y * zoom))); ctx.fill(); ctx.restore();
  }
  if (f.type === 'stove' && on) {
    const [x, y] = P(0.5, 0.35, 44);
    for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`; ctx.beginPath(); ctx.arc(sx + (x + Math.sin(ph * 6 + k) * 4) * zoom, sy + (y - ph * 30) * zoom, (4 + ph * 5) * zoom, 0, 7); ctx.fill(); }
  }
  if (f.type === 'shower' && on) {
    ctx.strokeStyle = 'rgba(160,215,240,.8)'; ctx.lineWidth = 1.2 * zoom;
    for (let k = 0; k < 9; k++) { const [x, y] = P(0.3 + (k % 3) * 0.12, 0.35 + Math.floor(k / 3) * 0.12, 90 - ((t * 120 + k * 13) % 80)); ctx.beginPath(); ctx.moveTo(sx + x * zoom, sy + y * zoom); ctx.lineTo(sx + x * zoom, sy + (y + 6) * zoom); ctx.stroke(); }
  }
  if (f.type === 'radio' && on) {
    const [x, y] = P(0.5, 0.4, 50);
    ctx.font = `${Math.round(14 * zoom)}px sans-serif`; ctx.fillStyle = '#8E7CE0';
    for (let k = 0; k < 2; k++) { const ph = (t * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - ph; ctx.fillText(k ? '♫' : '♪', sx + (x + 10 + ph * 14 - k * 24) * zoom, sy + (y - ph * 30) * zoom); }
    ctx.globalAlpha = 1;
  }
}
// Warm pools of light from lamps at night.
export function lampGlow(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,214,130,${a})`); g.addColorStop(1, 'rgba(255,214,130,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
