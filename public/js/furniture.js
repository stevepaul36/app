// Furniture and walls for the cottage interior, drawn with the same lit-box primitives as the town.
import { P, Sprite, box, poly, rectOn, windowOn, faceJ, faceI, fp, lit, darken, lighten, roundRect, NUP, NJ, NI, edge } from './art.js';

const WOOD = '#C98A4B', WOOD_D = '#9B6A37', WHITE = '#FAF7F2';
const blob = (ctx, x, y, r, c) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill(); };

function spriteFor(w, d, top, draw) {
  const pts = [P(0, 0, 0), P(w, 0, 0), P(0, d, 0), P(w, d, 0), P(0, 0, top), P(w, 0, top), P(0, d, top), P(w, d, top)];
  return new Sprite(Math.min(...pts.map(p => p[0])) - 20, Math.min(...pts.map(p => p[1])) - 20, Math.max(...pts.map(p => p[0])) + 20, Math.max(...pts.map(p => p[1])) + 20, draw);
}

const WALLPAPER = { bed: '#E6DDFB', bath: '#D6EEF7', kitchen: '#E3F3E6', living: '#FFF1D9', cafe: '#FBE3C8', shop: '#E3F3E6', arcade: '#3A2F6B', restaurant: '#FFE1C7', library: '#EADCC6', museum: '#ECE6F6', cinema: '#5A2A4A', gym: '#DDEEF8', office: '#E6EEF8', lab: '#E0F4F1', workshop: '#FFF1D9' };

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
  const tall = { plot: 20, workbench: 80, d_plantpot: 70, d_lamp: 110, d_stool: 40, d_bookstack: 50, d_teddy: 60, d_aquarium: 80, d_vase: 70, d_jackolantern: 50, d_rug: 6, d_shellchime: 120, barcounter: 90, pastrycase: 60, menuboard: 130, cafetable: 50, cafechair: 50, shelf: 110, shelf2: 70, till: 70, arcadecab: 110, claw: 120, prizes: 80, stool: 40, exhibit: 110, screen: 130, seat: 50, popcorn: 90, treadmill: 70, weights: 70, mat: 10, officedesk: 80, labbench: 80, crafttable: 60, wardrobe: 120, bed: 60, bookshelf: 110, shower: 110, fridge: 110, sink: 100, tv: 80, sofa: 50, armchair: 50, desk: 80, plant: 80, floorlamp: 110, radio: 50, nightstand: 60, mailbox: 50 }[t] || 50;
  return spriteFor(f.w, f.d, tall, ctx => DRAW[t] && DRAW[t](ctx, f));
}

const DRAW = {
  plot(ctx) {
    poly(ctx, [[0.04, 0.04, 0], [0.96, 0.04, 0], [0.96, 0.96, 0], [0.04, 0.96, 0]], '#A0703E');
    poly(ctx, [[0.12, 0.12, 2], [0.88, 0.12, 2], [0.88, 0.88, 2], [0.12, 0.88, 2]], '#7A5236');
    for (let k = 0; k < 3; k++) poly(ctx, [[0.18, 0.25 + k * 0.25, 2.2], [0.82, 0.25 + k * 0.25, 2.2]], null, '#5E3A26', 1.2);
  },
  workbench(ctx) {
    box(ctx, 0.08, 0.15, 0, 0.84, 0.7, 34, '#B98448');
    box(ctx, 0.05, 0.12, 34, 0.9, 0.76, 5, '#D9A86A');
    for (const [x, y] of [[0.1, 0.17], [0.86, 0.17], [0.1, 0.8], [0.86, 0.8]]) box(ctx, x, y, 0, 0.05, 0.05, 34, '#7A5236');
    const [hx, hy] = P(0.35, 0.45, 39); ctx.fillStyle = '#7A8798'; ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.5); ctx.fillRect(-2, -12, 4, 14); ctx.fillStyle = '#C0C8D2'; ctx.fillRect(-7, -15, 14, 6); ctx.restore();
    const [sx, sy] = P(0.7, 0.4, 39); ctx.fillStyle = '#C9A866'; ctx.fillRect(sx - 9, sy - 3, 18, 4); ctx.fillStyle = '#A07850'; ctx.fillRect(sx - 6, sy - 6, 14, 3);
    box(ctx, 0.15, 0.05, 39, 0.7, 0.06, 36, '#8C5A3C');
    const pb = faceJ(0.15, 0.05, 39, 0.7, 0.06, 36); for (let k = 0; k < 4; k++) { const [x, y] = P(...fp(pb, 0.15 + k * 0.23, 0.6, 0.02)); ctx.fillStyle = ['#7A8798', '#F0587A', '#FFC83D', '#3FA86A'][k]; ctx.fillRect(x - 1.5, y - 10, 3, 12); }
  },
  d_plantpot(ctx) { const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#C9672E'; ctx.beginPath(); ctx.moveTo(x - 12, y - 20); ctx.lineTo(x + 12, y - 20); ctx.lineTo(x + 9, y); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fill(); blob(ctx, x, y - 32, 13, '#4FAE5A'); blob(ctx, x - 9, y - 27, 9, '#5FC07E'); blob(ctx, x + 9, y - 28, 9, '#3F9A5C'); },
  d_lamp(ctx) { const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#7A5236'; ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 1.5, y - 66, 3, 66); ctx.fillStyle = '#FFE9A6'; ctx.beginPath(); ctx.moveTo(x - 14, y - 64); ctx.lineTo(x + 14, y - 64); ctx.lineTo(x + 9, y - 84); ctx.lineTo(x - 9, y - 84); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#C9A866'; ctx.stroke(); },
  d_stool(ctx) { DRAW.stool(ctx); },
  d_bookstack(ctx) { for (let k = 0; k < 5; k++) { const [x, y] = P(0.5, 0.5, k * 6); ctx.fillStyle = ['#F0587A', '#2E9BD6', '#FFC83D', '#3FA86A', '#8E7CE0'][k]; ctx.save(); ctx.translate(x, y); ctx.rotate((k % 2 ? 0.08 : -0.06)); ctx.fillRect(-14, -6, 28, 6); ctx.fillStyle = '#FFFFFF66'; ctx.fillRect(-12, -5, 3, 4); ctx.restore(); } },
  d_teddy(ctx) { const [x, y] = P(0.5, 0.5, 0); const b = '#C98A4B'; blob(ctx, x, y - 14, 13, b); blob(ctx, x, y - 34, 11, b); blob(ctx, x - 9, y - 43, 4.5, b); blob(ctx, x + 9, y - 43, 4.5, b); blob(ctx, x, y - 31, 4.5, '#F2D3A6'); blob(ctx, x - 4, y - 37, 1.6, '#26395A'); blob(ctx, x + 4, y - 37, 1.6, '#26395A'); ctx.fillStyle = '#F0587A'; ctx.fillRect(x - 6, y - 25, 12, 3); },
  d_aquarium(ctx) { box(ctx, 0.12, 0.25, 0, 0.76, 0.5, 26, '#8C5A3C'); box(ctx, 0.12, 0.25, 26, 0.76, 0.5, 40, '#9ED8F5', { topColor: '#C8EEFA' }); const f = faceJ(0.12, 0.25, 26, 0.76, 0.5, 40); for (let k = 0; k < 3; k++) { const [x, y] = P(...fp(f, 0.2 + k * 0.3, 0.3 + (k % 2) * 0.3, 0.02)); ctx.fillStyle = k === 1 ? '#FFC83D' : '#F28C28'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0, 0, 7); ctx.fill(); } for (let k = 0; k < 4; k++) { const [x, y] = P(...fp(f, 0.1 + k * 0.25, 0.05, 0.02)); ctx.fillStyle = '#3FA86A'; ctx.fillRect(x - 1, y - 12, 2, 12); } },
  d_vase(ctx) { const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#5BC0EB'; ctx.beginPath(); ctx.ellipse(x, y - 12, 10, 13, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 5, y - 30, 10, 8); for (let k = 0; k < 5; k++) { ctx.strokeStyle = '#3F9A5C'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x - 12 + k * 6, y - 46 - (k % 2) * 6); ctx.stroke(); blob(ctx, x - 12 + k * 6, y - 47 - (k % 2) * 6, 4, ['#F0587A', '#FFC83D', '#F7A8C4', '#8E7CE0', '#FFFFFF'][k]); } },
  d_jackolantern(ctx) { const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#F28C28'; ctx.beginPath(); ctx.ellipse(x, y - 14, 17, 14, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#C9672E'; ctx.lineWidth = 1.5; for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.ellipse(x + dx, y - 14, 4, 13, 0, 0, 7); ctx.stroke(); } ctx.fillStyle = '#FFE07A'; ctx.beginPath(); ctx.moveTo(x - 9, y - 18); ctx.lineTo(x - 5, y - 23); ctx.lineTo(x - 2, y - 18); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 2, y - 18); ctx.lineTo(x + 5, y - 23); ctx.lineTo(x + 9, y - 18); ctx.fill(); ctx.fillRect(x - 8, y - 12, 16, 3); ctx.fillStyle = '#3F9A5C'; ctx.fillRect(x - 2, y - 32, 4, 6); },
  d_rug(ctx) { const [x, y] = P(0.5, 0.5, 0.5); ctx.fillStyle = '#F7A8C4'; ctx.beginPath(); ctx.ellipse(x, y, 52, 26, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 40, 20, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#E86A9A'; ctx.beginPath(); ctx.ellipse(x, y, 22, 11, 0, 0, 7); ctx.fill(); },
  d_shellchime(ctx) { const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#8C5A3C'; ctx.fillRect(x - 1.5, y - 90, 3, 90); ctx.fillRect(x - 14, y - 90, 28, 3); for (let k = 0; k < 4; k++) { ctx.strokeStyle = '#C9B795'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 12 + k * 8, y - 87); ctx.lineTo(x - 12 + k * 8, y - 70 + k % 2 * 6); ctx.stroke(); blob(ctx, x - 12 + k * 8, y - 67 + k % 2 * 6, 3.5, ['#F7E3C0', '#F7A8C4', '#FFFFFF', '#F2D3A6'][k]); } },
  barcounter(ctx, f) {
    const fc = box(ctx, 0.02, 0.12, 0, f.w - 0.04, 0.76, 38, '#8C5A3C');
    box(ctx, 0, 0.08, 38, f.w, 0.84, 5, '#F2E6D6');
    for (let k = 0; k < f.w * 2; k++) rectOn(ctx, fc.j, (k + 0.15) / (f.w * 2), 0.15, (k + 0.85) / (f.w * 2), 0.85, '#A36B47', '#00000018');
    if (f.machine) {
      box(ctx, 0.25, 0.25, 43, 0.5, 0.4, 30, '#C9D3DE'); const m = faceJ(0.25, 0.25, 43, 0.5, 0.4, 30);
      rectOn(ctx, m, 0.15, 0.25, 0.85, 0.75, '#34476B', null); for (const u of [0.3, 0.7]) { const [x, y] = P(...fp(m, u, 0.2, 0.03)); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 3, y - 5, 6, 6); }
      const [rx, ry] = P(f.w - 0.5, 0.45, 43); ctx.fillStyle = '#26304A'; roundRect(ctx, rx - 10, ry - 16, 20, 14, 3); ctx.fill(); ctx.fillStyle = '#7CE07A'; ctx.fillRect(rx - 7, ry - 14, 14, 5);
    }
    if (f.steam) for (let k = 1; k < f.w; k += 2) { const [x, y] = P(k + 0.3, 0.45, 43); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x, y, 11, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#F2A93B'; ctx.beginPath(); ctx.ellipse(x, y - 1, 8, 3, 0, 0, 7); ctx.fill(); }
  },
  pastrycase(ctx) {
    box(ctx, 0.05, 0.12, 0, 0.9, 0.76, 34, '#8C5A3C');
    box(ctx, 0.08, 0.15, 34, 0.84, 0.7, 24, '#CFEAF5', { topColor: '#E6F6FC' });
    const f = faceJ(0.08, 0.15, 34, 0.84, 0.7, 24);
    for (let k = 0; k < 4; k++) { const [x, y] = P(...fp(f, 0.15 + k * 0.23, 0.35, 0.02)); ctx.fillStyle = ['#F2A93B', '#F7A8C4', '#C98A4B', '#FFE07A'][k]; ctx.beginPath(); ctx.ellipse(x, y, 6, 4, 0, 0, 7); ctx.fill(); }
  },
  menuboard(ctx, f) {
    box(ctx, 0.1, 0.02, 60, f.w - 0.2, 0.08, 56, '#2B3A33');
    const fc = faceJ(0.1, 0.02, 60, f.w - 0.2, 0.08, 56);
    for (let k = 0; k < 4; k++) rectOn(ctx, fc, 0.12, 0.18 + k * 0.18, 0.62 - (k % 2) * 0.15, 0.24 + k * 0.18, '#FFFFFFcc', null, 0.01);
    for (let k = 0; k < 4; k++) rectOn(ctx, fc, 0.75, 0.18 + k * 0.18, 0.88, 0.24 + k * 0.18, '#FFE07A', null, 0.01);
  },
  cafetable(ctx) {
    const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#5A4636'; ctx.fillRect(x - 2, y - 30, 4, 30); ctx.beginPath(); ctx.ellipse(x, y, 10, 4, 0, 0, 7); ctx.fill();
    const [tx, ty] = P(0.5, 0.5, 30); ctx.fillStyle = '#F2E6D6'; ctx.strokeStyle = '#B9A48A'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(tx, ty, 30, 15, 0, 0, 7); ctx.fill(); ctx.stroke();
    blob(ctx, tx - 8, ty - 2, 4.5, '#FFFFFF'); blob(ctx, tx + 9, ty + 1, 4.5, '#FFFFFF'); blob(ctx, tx + 1, ty - 7, 3.5, '#F7A8C4');
  },
  cafechair(ctx, f) { DRAW.chair(ctx, f); },
  shelf(ctx, f) {
    const fc = box(ctx, 0.05, 0.05, 0, 0.9, 0.4, 96, '#E8EEF4');
    const cols = [['#F0587A', '#FFC83D', '#3FA86A'], ['#2E9BD6', '#F2A93B', '#8E7CE0'], ['#7CE07A', '#F7A8C4', '#FFE07A'], ['#E8823A', '#5BC0EB', '#C94BD8']][(f.variant || 0) % 4];
    for (let r = 0; r < 4; r++) { rectOn(ctx, fc.j, 0.04, r * 0.24 + 0.05, 0.96, r * 0.24 + 0.07, '#A0AEC0', null); for (let k = 0; k < 5; k++) rectOn(ctx, fc.j, 0.08 + k * 0.18, r * 0.24 + 0.07, 0.2 + k * 0.18, r * 0.24 + 0.2 - (k % 2) * 0.03, cols[(k + r) % 3], '#00000018', 0.01); }
  },
  shelf2(ctx, f) {
    const fc = box(ctx, 0.08, 0.15, 0, f.w - 0.16, 0.7, 52, '#E8EEF4');
    const cols = ['#F0587A', '#FFC83D', '#3FA86A', '#2E9BD6', '#F2A93B', '#8E7CE0'];
    for (let r = 0; r < 2; r++) for (let k = 0; k < f.w * 3; k++) rectOn(ctx, fc.j, 0.04 + k / (f.w * 3), 0.1 + r * 0.45, 0.04 + (k + 0.7) / (f.w * 3), 0.38 + r * 0.45, cols[(k + r + (f.variant || 0)) % cols.length], '#00000018', 0.01);
    for (let k = 0; k < f.w * 2; k++) { const [x, y] = P(0.3 + k * 0.5, 0.5, 52); blob(ctx, x, y - 5, 5, cols[(k + 3) % cols.length]); }
  },
  till(ctx, f) {
    const fc = box(ctx, 0.04, 0.12, 0, f.w - 0.08, 0.76, 38, '#F4F7FA');
    box(ctx, 0.02, 0.1, 38, f.w - 0.04, 0.8, 4, '#3FA86A');
    rectOn(ctx, fc.j, 0.05, 0.2, 0.95, 0.8, '#E3F3E6', '#00000018');
    const [x, y] = P(0.5, 0.45, 42); ctx.fillStyle = '#26304A'; roundRect(ctx, x - 12, y - 18, 24, 16, 3); ctx.fill(); ctx.fillStyle = '#7CE07A'; ctx.fillRect(x - 9, y - 16, 18, 6);
    if (f.books) for (let k = 0; k < 3; k++) { const [bx, by] = P(1.3, 0.45, 42 + k * 5); ctx.fillStyle = ['#F0587A', '#2E9BD6', '#FFC83D'][k]; ctx.fillRect(bx - 12, by - 4, 24, 5); }
  },
  arcadecab(ctx, f) {
    const col = f.game === 'hop' ? '#3FA86A' : '#3F6FD8';
    const side = f.side;
    const fc = side ? box(ctx, 0.1, 0.15, 0, 0.55, 0.7, 96, col) : box(ctx, 0.15, 0.1, 0, 0.7, 0.55, 96, col);
    const face = side ? fc.i : fc.j;
    rectOn(ctx, face, 0.1, 0.5, 0.9, 0.85, '#1F1A3F', null);
    rectOn(ctx, face, 0.15, 0.55, 0.85, 0.8, f.game === 'hop' ? '#9FE6A0' : '#9FD8F5', null, 0.01);
    rectOn(ctx, face, 0.05, 0.36, 0.95, 0.44, '#26304A', null, 0.03);
    const [jx, jy] = P(...fp(face, 0.35, 0.42, 0.05)); ctx.fillStyle = '#26304A'; ctx.fillRect(jx - 1.5, jy - 9, 3, 9); blob(ctx, jx, jy - 10, 3.5, '#F0587A');
    for (const u of [0.6, 0.75]) { const [bx, by] = P(...fp(face, u, 0.41, 0.05)); blob(ctx, bx, by, 2.6, u < 0.7 ? '#FFC83D' : '#7CE07A'); }
    rectOn(ctx, face, 0.05, 0.88, 0.95, 0.98, '#FFC83D', null, 0.01);
  },
  claw(ctx) {
    const fc = box(ctx, 0.12, 0.12, 0, 0.76, 0.76, 40, '#F0587A');
    box(ctx, 0.12, 0.12, 40, 0.76, 0.76, 60, '#D8F0FA', { topColor: '#F0587A' });
    const f = faceJ(0.12, 0.12, 40, 0.76, 0.76, 60);
    for (let k = 0; k < 6; k++) { const [x, y] = P(...fp(f, 0.15 + (k % 3) * 0.3, 0.12 + Math.floor(k / 3) * 0.12, -0.3)); blob(ctx, x, y, 6, ['#FFC83D', '#8E7CE0', '#7CE07A', '#5BC0EB', '#F7A8C4', '#E8823A'][k]); }
    const [cx, cy] = P(0.5, 0.5, 92); ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 10); ctx.moveTo(cx - 6, cy + 16); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx + 6, cy + 16); ctx.stroke();
    rectOn(ctx, fc.j, 0.2, 0.3, 0.8, 0.7, '#FFE07A', null);
  },
  prizes(ctx, f) {
    DRAW.till(ctx, f);
    for (let k = 0; k < 5; k++) { const [x, y] = P(0.3 + k * 0.35, 0.5, 42); ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(['🧸', '🎈', '⭐', '🦄', '🎁'][k], x, y - 2); }
  },
  stool(ctx) {
    const [x, y] = P(0.5, 0.5, 0); ctx.fillStyle = '#7A8798'; ctx.fillRect(x - 1.5, y - 26, 3, 26); ctx.beginPath(); ctx.ellipse(x, y, 8, 3, 0, 0, 7); ctx.fill();
    const [tx, ty] = P(0.5, 0.5, 26); ctx.fillStyle = '#F0587A'; ctx.beginPath(); ctx.ellipse(tx, ty, 11, 5.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#C0304A'; ctx.fillRect(tx - 11, ty, 22, 3);
  },
  exhibit(ctx, f) {
    box(ctx, 0.15, 0.15, 0, 0.7, 0.7, 26, '#FFFFFF');
    const [x, y] = P(0.5, 0.5, 26);
    if (f.variant === 'robot') { ctx.fillStyle = '#C9D3DE'; roundRect(ctx, x - 12, y - 34, 24, 26, 5); ctx.fill(); roundRect(ctx, x - 10, y - 54, 20, 18, 5); ctx.fill(); ctx.fillStyle = '#5BC0EB'; ctx.fillRect(x - 6, y - 48, 4, 4); ctx.fillRect(x + 2, y - 48, 4, 4); blob(ctx, x, y - 60, 3, '#F0587A'); }
    else if (f.variant === 'dino') { ctx.strokeStyle = '#F2E6D6'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 22, y - 8); ctx.quadraticCurveTo(x - 4, y - 40, x + 10, y - 30); ctx.lineTo(x + 20, y - 46); ctx.stroke(); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 14 + k * 7, y - 22 - k * 3); ctx.lineTo(x - 14 + k * 7, y - 6); ctx.stroke(); } }
    else { blob(ctx, x, y - 30, 14, '#F2A93B'); ctx.strokeStyle = '#C9B5F5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 30, 24, 6, -0.3, 0, 7); ctx.stroke(); blob(ctx, x + 20, y - 46, 5, '#5BC0EB'); }
  },
  screen(ctx, f) {
    box(ctx, 0.1, 0.02, 30, f.w - 0.2, 0.1, 90, '#1A1530');
    const fc = faceJ(0.1, 0.02, 30, f.w - 0.2, 0.1, 90); rectOn(ctx, fc, 0.03, 0.05, 0.97, 0.95, '#F4F7FA', null, 0.01);
    box(ctx, -0.05, 0.0, 0, 0.3, 0.3, 120, '#C0304A'); box(ctx, f.w - 0.25, 0.0, 0, 0.3, 0.3, 120, '#C0304A');
  },
  seat(ctx) {
    box(ctx, 0.12, 0.15, 0, 0.76, 0.6, 18, '#C0304A');
    box(ctx, 0.12, 0.7, 0, 0.76, 0.2, 44, '#D9485F');
    box(ctx, 0.06, 0.15, 0, 0.08, 0.75, 26, '#8C2A3A'); box(ctx, 0.86, 0.15, 0, 0.08, 0.75, 26, '#8C2A3A');
  },
  popcorn(ctx) {
    box(ctx, 0.15, 0.15, 0, 0.7, 0.7, 36, '#C0304A');
    box(ctx, 0.18, 0.18, 36, 0.64, 0.64, 40, '#FFF6D8', { topColor: '#C0304A' });
    const f = faceJ(0.18, 0.18, 36, 0.64, 0.64, 40);
    for (let k = 0; k < 14; k++) { const [x, y] = P(...fp(f, 0.1 + (k * 37 % 80) / 100, 0.05 + (k * 13 % 40) / 100, -0.2)); blob(ctx, x, y, 3, '#FFFDF4'); }
  },
  treadmill(ctx, f) {
    box(ctx, 0.2, 0.1, 0, 0.6, f.d - 0.2, 10, '#34476B');
    poly(ctx, [[0.25, 0.2, 10.2], [0.75, 0.2, 10.2], [0.75, f.d - 0.15, 10.2], [0.25, f.d - 0.15, 10.2]], '#26304A');
    for (const x of [0.22, 0.73]) box(ctx, x, 0.12, 10, 0.05, 0.05, 48, '#A0AEC0');
    box(ctx, 0.2, 0.08, 58, 0.6, 0.12, 12, '#5BC0EB');
  },
  weights(ctx, f) {
    box(ctx, 0.1, 0.2, 0, f.w - 0.2, 0.5, 30, '#34476B');
    for (let k = 0; k < 4; k++) { const [x, y] = P(0.35 + k * 0.42, 0.45, 30); ctx.fillStyle = ['#F0587A', '#2E9BD6', '#FFC83D', '#3FA86A'][k]; ctx.fillRect(x - 10, y - 6, 20, 4); blob(ctx, x - 10, y - 4, 5, '#26304A'); blob(ctx, x + 10, y - 4, 5, '#26304A'); }
  },
  mat(ctx, f) { poly(ctx, [[0.1, 0.1, 0.5], [f.w - 0.1, 0.1, 0.5], [f.w - 0.1, f.d - 0.1, 0.5], [0.1, f.d - 0.1, 0.5]], '#5BC0EB', '#2E9BD6', 2); poly(ctx, [[f.w / 2, 0.1, 0.6], [f.w / 2, f.d - 0.1, 0.6]], null, '#FFFFFF', 2); },
  officedesk(ctx, f) {
    box(ctx, 0.05, 0.15, 0, f.w - 0.1, 0.7, 32, '#F4F7FA');
    box(ctx, 0.02, 0.12, 32, f.w - 0.04, 0.76, 4, '#C9D3DE');
    for (const u of [0.25, f.w - 0.75]) { box(ctx, u, 0.3, 36, 0.5, 0.06, 30, '#26304A'); const sc = faceJ(u, 0.3, 36, 0.5, 0.06, 30); rectOn(ctx, sc, 0.07, 0.1, 0.93, 0.9, '#7FC3E8', null, 0.01); rectOn(ctx, sc, 0.15, 0.55, 0.6, 0.8, '#FFFFFF88', null, 0.012); }
  },
  labbench(ctx, f) {
    box(ctx, 0.05, 0.15, 0, f.w - 0.1, 0.7, 32, '#F4FBFB');
    box(ctx, 0.02, 0.12, 32, f.w - 0.04, 0.76, 4, '#2BB3A3');
    for (let k = 0; k < 4; k++) { const [x, y] = P(0.3 + k * 0.45, 0.45, 36); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = '#A0AEC0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3, y - 18); ctx.lineTo(x - 3, y - 10); ctx.lineTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.lineTo(x + 3, y - 10); ctx.lineTo(x + 3, y - 18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = ['#7CE0C8', '#F7A8C4', '#FFE07A', '#C9B5F5'][k]; ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 8, y); ctx.lineTo(x - 8, y); ctx.fill(); }
  },
  crafttable(ctx, f) {
    DRAW.table(ctx, { w: f.w, d: 1 });
    for (let k = 0; k < 5; k++) { const [x, y] = P(0.3 + k * 0.35, 0.45, 34); ctx.fillStyle = ['#F0587A', '#FFC83D', '#3FA86A', '#2E9BD6', '#8E7CE0'][k]; ctx.fillRect(x - 4, y - 3, 8, 3); }
  },
  wardrobe(ctx) {
    const fc = box(ctx, 0.05, 0.1, 0, 0.45, 0.8, 104, '#E8B87A');
    box(ctx, 0.02, 0.07, 104, 0.51, 0.86, 6, WOOD_D);
    const f = fc.i;
    rectOn(ctx, f, 0.06, 0.06, 0.48, 0.94, '#F2C98F', '#00000022', 0.01); rectOn(ctx, f, 0.52, 0.06, 0.94, 0.94, '#F2C98F', '#00000022', 0.01);
    rectOn(ctx, f, 0.42, 0.45, 0.46, 0.6, '#8C5A30', null, 0.02); rectOn(ctx, f, 0.54, 0.45, 0.58, 0.6, '#8C5A30', null, 0.02);
    rectOn(ctx, f, 0.15, 0.72, 0.38, 0.86, '#F0587A', null, 0.015); rectOn(ctx, f, 0.62, 0.72, 0.85, 0.86, '#7FC8DD', null, 0.015);
  },
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
  if (f.type === 'arcadecab') {
    const face = f.side ? faceI(0.1, 0.15, 0, 0.55, 0.7, 96) : faceJ(0.15, 0.1, 0, 0.7, 0.55, 96);
    const pts = [fp(face, 0.15, 0.55, 0.02), fp(face, 0.85, 0.55, 0.02), fp(face, 0.85, 0.8, 0.02), fp(face, 0.15, 0.8, 0.02)].map(p => P(...p));
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4, cy = pts.reduce((a, p) => a + p[1], 0) / 4;
    ctx.save(); ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(sx + x * zoom, sy + y * zoom) : ctx.moveTo(sx + x * zoom, sy + y * zoom))); ctx.clip();
    ctx.fillStyle = f.game === 'hop' ? '#B6F0B0' : '#1F2A5A'; ctx.fillRect(sx + (cx - 30) * zoom, sy + (cy - 30) * zoom, 60 * zoom, 60 * zoom);
    ctx.font = `${Math.round(10 * zoom)}px sans-serif`; ctx.textAlign = 'center';
    if (f.game === 'hop') { const ph = (t * 1.6) % 1; ctx.fillText('🐰', sx + cx * zoom, sy + (cy + 4 - Math.sin(ph * Math.PI) * 8) * zoom); }
    else for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; ctx.fillText('⭐', sx + (cx - 10 + k * 10) * zoom, sy + (cy - 14 + ph * 26) * zoom); }
    ctx.restore();
  }
  if (f.type === 'screen') {
    const fc = faceJ(0.1, 0.02, 30, f.w - 0.2, 0.1, 90);
    const cols = ['#9FD8F5', '#FFE07A', '#F7A8C4', '#B6F0B0'], c = cols[Math.floor(t / 2.5) % cols.length];
    const pts = [fp(fc, 0.05, 0.08, 0.02), fp(fc, 0.95, 0.08, 0.02), fp(fc, 0.95, 0.92, 0.02), fp(fc, 0.05, 0.92, 0.02)].map(p => P(...p));
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(sx + x * zoom, sy + y * zoom) : ctx.moveTo(sx + x * zoom, sy + y * zoom))); ctx.fill();
    const [mx, my] = P(...fp(fc, 0.3 + 0.4 * ((Math.sin(t * 0.7) + 1) / 2), 0.4, 0.03));
    ctx.font = `${Math.round(30 * zoom)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(['🐉', '🚀', '🦄', '🐳'][Math.floor(t / 2.5) % 4], sx + mx * zoom, sy + my * zoom);
    ctx.restore();
  }
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
