// Hand-drawn (in code) art for the island towns: themed buildings, landmarks, trees, lamps and ground.
// Everything is original and built from simple lit boxes, roofs and shapes, like the rest of Willowvale.
import { P, TW, TH, Sprite, poly, box, faceJ, faceI, fp, rectOn, windowOn, lit, NI, NJ, NUP, darken, lighten, mix, edge, roundRect,
  gableRoof, hipRoof, doorOn, awningOn, signOn, bounds, drawVenue, drawHouse, drawApartment, blob, canopy } from './art.js';
import { rng } from './world.js';

const doorFace = (o, f) => (o.door === 'i' ? f.i : f.j);
const otherFace = (o, f) => (o.door === 'i' ? f.j : f.i);
const ground = (ctx, o, col = '#EFE3CC') => poly(ctx, [[0, 0, 0], [o.w, 0, 0], [o.w, o.d, 0], [0, o.d, 0]], col, darken(col, 0.2) + '66');
const dot = (ctx, pt, r, c) => { const [x, y] = P(...pt); blob(ctx, x, y, r, c); };

// Upturned-eave roof used across the Lantern Quarter (tiled, with curled corners).
function eaveRoof(ctx, x0, y0, z, w, d, rh, color, o = 0.28) {
  const st = edge(color);
  const a = [x0 - o, y0 - o, z], b = [x0 + w + o, y0 - o, z], c = [x0 + w + o, y0 + d + o, z], dd = [x0 - o, y0 + d + o, z];
  const r1 = [x0 + w * 0.25, y0 + d / 2, z + rh], r2 = [x0 + w * 0.75, y0 + d / 2, z + rh];
  if (w < d) { r1[0] = r2[0] = x0 + w / 2; r1[1] = y0 + d * 0.25; r2[1] = y0 + d * 0.75; }
  const lift = 9;
  const up = p => [p[0], p[1], p[2] + lift];
  poly(ctx, w >= d ? [up(a), up(b), r2, r1] : [up(a), up(dd), r2, r1], lit(color, [0, -0.5, 0.8]), st);
  poly(ctx, w >= d ? [up(a), up(dd), r1] : [up(a), up(b), r1], lit(color, [-0.5, 0, 0.8]), st);
  if (w >= d) { poly(ctx, [up(b), up(c), r2], lit(color, [0.6, 0, 0.8]), st); poly(ctx, [up(dd), up(c), r2, r1], lit(color, [0, 0.6, 0.8]), st); }
  else { poly(ctx, [up(dd), up(c), r2], lit(color, [0, 0.6, 0.8]), st); poly(ctx, [up(b), up(c), r2, r1], lit(color, [0.6, 0, 0.8]), st); }
  // tile ridges on the front slope
  ctx.save(); ctx.globalAlpha = 0.22;
  for (let k = 1; k < 7; k++) { const t = k / 7; poly(ctx, [[dd[0] + (c[0] - dd[0]) * t, dd[1] + (c[1] - dd[1]) * t, z + lift], [r1[0] + (r2[0] - r1[0]) * t, r1[1] + (r2[1] - r1[1]) * t, z + rh]], null, darken(color, 0.6), 1.4); }
  ctx.restore();
  // gold ridge and curled tips
  poly(ctx, [r1, r2], null, '#F2C14E', 3);
  for (const p of [a, b, c, dd]) dot(ctx, [p[0], p[1], p[2] + lift + 4], 3.2, '#F2C14E');
}
function lanternAt(ctx, pt, r = 6, col = '#E8333B') {
  const [x, y] = P(...pt);
  ctx.strokeStyle = '#5A3A22'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - r - 5); ctx.lineTo(x, y - r); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,150,.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.3, r * 0.55, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#F2C14E'; ctx.fillRect(x - r * 0.5, y - r - 1, r, 2); ctx.fillRect(x - r * 0.5, y + r - 1, r, 2);
  ctx.strokeStyle = '#F2C14E'; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x, y + r + 5); ctx.stroke();
}
function stringLights(ctx, a, b, n, cols) {
  const sag = 10;
  const pts = [];
  for (let k = 0; k <= n; k++) { const t = k / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * sag]); }
  ctx.strokeStyle = '#4A3A2E'; ctx.lineWidth = 1; ctx.beginPath(); pts.forEach((p, k) => { const [x, y] = P(...p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
  pts.slice(1, -1).forEach((p, k) => { const [x, y] = P(...p); blob(ctx, x, y + 3, 3, cols[k % cols.length]); });
}
function columns(ctx, f, us, h, col = '#FFFFFF') { for (const u of us) rectOn(ctx, f, u - 0.022, 0, u + 0.022, h, col, '#00000022', 0.07); }
function archWindow(ctx, f, u, v, ww, wh, frame = '#FFFFFF', glass = '#7FC3E8') {
  rectOn(ctx, f, u - ww / 2 - 0.02, v - wh / 2 - 0.02, u + ww / 2 + 0.02, v + wh / 2, frame, '#00000022');
  rectOn(ctx, f, u - ww / 2, v - wh / 2, u + ww / 2, v + wh / 2 - 0.02, glass, null, 0.008);
  const [cx, cy] = P(...fp(f, u, v + wh / 2, 0.008));
  const r = Math.max(4, ww * 40);
  ctx.fillStyle = frame; ctx.beginPath(); ctx.ellipse(cx, cy, r + 2, r * 0.8 + 2, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = glass; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.8, 0, Math.PI, 0); ctx.fill();
}
function dome(ctx, cx, cy, z, r, col, tip = '#F2C14E') {
  const [x, y] = P(cx, cy, z);
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.9, r * 0.1, x, y - r * 0.4, r * 1.2);
  g.addColorStop(0, lighten(col, 0.5)); g.addColorStop(1, darken(col, 0.18));
  ctx.fillStyle = g; ctx.strokeStyle = edge(col); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.bezierCurveTo(x - r, y - r * 1.1, x - r * 0.2, y - r * 1.25, x, y - r * 1.5); ctx.bezierCurveTo(x + r * 0.2, y - r * 1.25, x + r, y - r * 1.1, x + r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = darken(col, 0.25); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI); ctx.fill();
  if (tip) { ctx.strokeStyle = tip; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x, y - r * 1.5 - 8); ctx.stroke(); blob(ctx, x, y - r * 1.5 - 9, 2.4, tip); }
}
function chhatri(ctx, cx, cy, z, s, col) { // little domed rooftop kiosk on four posts
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ctx, cx + a * s * 0.32 - 0.02, cy + b * s * 0.32 - 0.02, z, 0.04, 0.04, 16, '#FFF4E0');
  box(ctx, cx - s * 0.4, cy - s * 0.4, z + 16, s * 0.8, s * 0.8, 3, '#FFF4E0');
  dome(ctx, cx, cy, z + 19, 9 * s * 2, col);
}
function glassGrid(ctx, f, cols, rows, tint = '#9ED8F5', frame = '#E8F4FA', lightOn = 0) {
  rectOn(ctx, f, 0, 0, 1, 1, tint, null, 0.002);
  const g0 = fp(f, 0.5, 1), g1 = fp(f, 0.5, 0);
  const [ax, ay] = P(...g0), [bx, by] = P(...g1);
  const grad = ctx.createLinearGradient(ax, ay, bx, by);
  grad.addColorStop(0, lighten(tint, 0.35)); grad.addColorStop(1, darken(tint, 0.15));
  poly(ctx, [fp(f, 0, 0, .004), fp(f, 1, 0, .004), fp(f, 1, 1, .004), fp(f, 0, 1, .004)], grad);
  ctx.save(); ctx.globalAlpha = 0.25;
  poly(ctx, [fp(f, 0.08, 1, .006), fp(f, 0.28, 1, .006), fp(f, 0.62, 0, .006), fp(f, 0.42, 0, .006)], '#FFFFFF');
  ctx.restore();
  for (let k = 1; k < cols; k++) rectOn(ctx, f, k / cols - 0.004, 0, k / cols + 0.004, 1, frame, null, 0.008);
  for (let k = 1; k < rows; k++) rectOn(ctx, f, 0, k / rows - 0.004, 1, k / rows + 0.004, frame, null, 0.008);
  if (lightOn) { const r = rng(lightOn); for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) if (r() < 0.18) rectOn(ctx, f, a / cols + 0.01, b / rows + 0.01, (a + 1) / cols - 0.01, (b + 1) / rows - 0.01, 'rgba(255,236,170,.55)', null, 0.007); }
}
function neonSign(ctx, f, u, v, text, col) {
  const [cx, cy] = P(...fp(f, u, v, 0.04));
  ctx.save(); ctx.font = '800 15px "Baloo 2", sans-serif';
  const tw = ctx.measureText(text).width + 18;
  roundRect(ctx, cx - tw / 2, cy - 12, tw, 24, 6); ctx.fillStyle = '#1F2140'; ctx.fill();
  ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = lighten(col, 0.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, cx, cy + 1);
  ctx.restore();
}

// ---------- buildings by style ----------
const STYLE = {
  // Maple Row
  school(ctx, o) {
    ground(ctx, o, '#E9DCC6');
    const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3, h = 88;
    const f = box(ctx, x0, y0, 0, w, d, h, '#D9735A', { top: false });
    const df = doorFace(o, f), of = otherFace(o, f);
    for (const ff of [df, of]) for (let fl = 0; fl < 2; fl++) for (let c = 0; c < 4; c++) { const u = (c + 0.5) / 4; if (ff === df && fl === 0 && Math.abs(u - 0.5) < 0.2) continue; windowOn(ctx, ff, u, 0.27 + fl * 0.47, 0.13, 0.26, { frame: '#FFF6E6' }); }
    rectOn(ctx, df, 0, 0.48, 1, 0.53, '#FFF6E6', null);
    doorOn(ctx, df, 0.5, 0.2, 0.42, '#3F6E8F');
    gableRoof(ctx, x0, y0, h, w, d, 40, '#5A6F8F', o.door === 'i' ? 'j' : 'i', 0.15, '#D9735A');
    // bell tower
    box(ctx, x0 + w * 0.4, y0 + d * 0.35, h + 20, 0.5, 0.5, 46, '#FFF6E6');
    const bt = faceJ(x0 + w * 0.4, y0 + d * 0.35, h + 20, 0.5, 0.5, 46);
    rectOn(ctx, bt, 0.25, 0.3, 0.75, 0.85, '#5A3A22', null); dot(ctx, fp(bt, 0.5, 0.45, 0.02), 4, '#F2C14E');
    hipRoof(ctx, x0 + w * 0.4, y0 + d * 0.35, h + 66, 0.5, 0.5, 26, '#D9485F', 0.06);
    // flag
    const [fx, fy] = P(x0 + w - 0.2, y0 + 0.2, h + 20); ctx.strokeStyle = '#5A6F8F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 54); ctx.stroke();
    ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.moveTo(fx, fy - 54); ctx.lineTo(fx + 20, fy - 48); ctx.lineTo(fx, fy - 42); ctx.fill();
    signOn(ctx, df, 0.5, 0.63, '🏫', '#D9485F', 'School');
  },
  pool(ctx, o) {
    ground(ctx, o, '#F1EBDD');
    poly(ctx, [[0.25, 0.25, 2], [o.w - 0.25, 0.25, 2], [o.w - 0.25, o.d - 0.25, 2], [0.25, o.d - 0.25, 2]], '#5BC6E8', '#FFFFFF', 5);
    ctx.save(); ctx.globalAlpha = 0.5; for (let k = 1; k < 4; k++) poly(ctx, [[0.25 + k * (o.w - 0.5) / 4, 0.3, 3], [0.25 + k * (o.w - 0.5) / 4, o.d - 0.3, 3]], null, '#FFFFFF', 2); ctx.restore();
    for (let k = 0; k < 9; k++) { const [x, y] = P(0.5 + (k % 3) * 0.8, 0.5 + Math.floor(k / 3) * 0.8, 3); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 10, 4, 0, 0, 3); ctx.stroke(); }
    // twisty slide and a ladder
    const sx = o.w - 0.35, sy = 0.35;
    box(ctx, sx - 0.12, sy - 0.12, 0, 0.24, 0.24, 64, '#FFC83D');
    ctx.strokeStyle = '#F0587A'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); const p0 = P(sx, sy, 64), p1 = P(sx - 0.6, sy + 0.4, 44), p2 = P(sx - 0.3, sy + 1.1, 20), p3 = P(sx - 0.9, sy + 1.4, 4);
    ctx.moveTo(...p0); ctx.bezierCurveTo(...p1, ...p2, ...p3); ctx.stroke();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    // umbrellas and loungers
    for (const [u, v, c] of [[0.1, o.d - 0.12, '#F0587A'], [o.w - 0.12, o.d - 0.1, '#3FA86A']]) {
      const [x, y] = P(u, v, 0); ctx.fillStyle = '#7A8798'; ctx.fillRect(x - 1, y - 40, 2, 40);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 20, y - 36); ctx.quadraticCurveTo(x, y - 54, x + 20, y - 36); ctx.closePath(); ctx.fill();
    }
  },
  townhouse(ctx, o) {
    const cols = ['#F6D7C3', '#D8E7F2', '#E5EFD3'], roofs = ['#8C4A3C', '#3F5F8F', '#4F7F4A'];
    const n = 3, along = o.door === 'i' ? o.d : o.w;
    for (let k = 0; k < n; k++) {
      const seg = (along - 0.3) / n;
      const x0 = o.door === 'i' ? 0.2 : 0.15 + k * seg, y0 = o.door === 'i' ? 0.15 + k * seg : 0.2;
      const w = o.door === 'i' ? o.w - 0.4 : seg, d = o.door === 'i' ? seg : o.d - 0.4;
      const h = 84 + (k % 2) * 8;
      const f = box(ctx, x0, y0, 0, w, d, h, cols[k], { top: false });
      const df = doorFace(o, f);
      doorOn(ctx, df, 0.5, 0.3, 0.38, roofs[k]);
      windowOn(ctx, df, 0.5, 0.72, 0.4, 0.2, { shutter: roofs[k], flowers: true });
      gableRoof(ctx, x0, y0, h, w, d, 34, roofs[k], o.door === 'i' ? 'i' : 'j', 0.08, cols[k]);
    }
  },
  // Skyhaven
  tower(ctx, o) { towerDraw(ctx, o, false); },
  skyscraper(ctx, o) { towerDraw(ctx, o, true); },
  office(ctx, o) {
    ground(ctx, o, '#D7DEE8');
    const x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = 230;
    const f = box(ctx, x0, y0, 0, w, d, h, '#BFD3EA');
    const df = doorFace(o, f), of = otherFace(o, f);
    glassGrid(ctx, df, 5, 9, '#6FA8E8', '#E6EEF8', 11); glassGrid(ctx, of, 5, 9, '#5A92D6', '#E6EEF8', 12);
    rectOn(ctx, df, 0.3, 0, 0.7, 0.09, '#2B3A55', null, 0.01); rectOn(ctx, df, 0.35, 0, 0.65, 0.08, '#8FD3F5', null, 0.012);
    box(ctx, x0 + w * 0.3, y0 + d * 0.3, h, w * 0.4, d * 0.4, 18, '#E6EEF8');
    // logo: a pixel heart
    const [cx, cy] = P(...fp(of, 0.5, 0.9, 0.03));
    ctx.fillStyle = '#FFFFFF'; roundRect(ctx, cx - 18, cy - 16, 36, 30, 8); ctx.fill();
    ctx.fillStyle = '#3F6FD8'; for (const [a, b] of [[-2, -1], [-1, -2], [1, -2], [2, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [-1, -1], [1, -1], [0, -1]]) ctx.fillRect(cx + a * 4 - 2, cy + b * 4 - 4, 4, 4);
    signOn(ctx, df, 0.5, 0.14, '💻', '#3F6FD8', 'Pixel Works');
  },
  arcade(ctx, o) {
    ground(ctx, o, '#D7DEE8');
    const x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = 96;
    const f = box(ctx, x0, y0, 0, w, d, h, '#3A2F6B');
    const df = doorFace(o, f), of = otherFace(o, f);
    rectOn(ctx, df, 0.06, 0.05, 0.94, 0.5, '#1F1A3F', null);
    for (let k = 0; k < 4; k++) { const u = 0.15 + k * 0.23; rectOn(ctx, df, u - 0.06, 0.08, u + 0.06, 0.4, ['#F0587A', '#5BC0EB', '#FFC83D', '#7CE07A'][k], null, 0.012); rectOn(ctx, df, u - 0.045, 0.24, u + 0.045, 0.36, '#1F1A3F', null, 0.015); }
    for (let k = 0; k < 12; k++) { const pt = fp(df, k / 11, 0.56, 0.02); const [x, y] = P(...pt); ctx.fillStyle = ['#F0587A', '#5BC0EB', '#FFC83D'][k % 3]; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
    for (let k = 0; k < 5; k++) rectOn(ctx, of, 0, 0.15 + k * 0.17, 1, 0.17 + k * 0.17, ['#C94BD8', '#5BC0EB'][k % 2] + '88', null);
    neonSign(ctx, df, 0.5, 0.78, 'ARCADE', '#F06AD8');
  },
  mall(ctx, o) {
    ground(ctx, o, '#D7DEE8');
    const x0 = 0.1, y0 = 0.1, w = o.w - 0.2, d = o.d - 0.2, h = 130;
    const f = box(ctx, x0, y0, 0, w, d, h, '#E6EEF8');
    const df = doorFace(o, f), of = otherFace(o, f);
    for (let fl = 0; fl < 3; fl++) { const v0 = fl / 3 + 0.03, v1 = (fl + 1) / 3 - 0.06; poly(ctx, [fp(df, 0.04, v0, .004), fp(df, 0.96, v0, .004), fp(df, 0.96, v1, .004), fp(df, 0.04, v1, .004)], '#8CCBEF'); rectOn(ctx, df, 0.04, v1, 0.96, v1 + 0.03, ['#F0587A', '#FFC83D', '#3FA86A'][fl], null, 0.01); }
    glassGrid(ctx, of, 4, 3, '#8CCBEF', '#FFFFFF');
    // shoppers' silhouettes and escalator
    poly(ctx, [fp(df, 0.62, 0.04, .01), fp(df, 0.85, 0.3, .01), fp(df, 0.85, 0.34, .01), fp(df, 0.62, 0.08, .01)], '#7A8798');
    rectOn(ctx, df, 0.42, 0, 0.58, 0.2, '#2B3A55', null, 0.012);
    box(ctx, x0 - 0.05, y0 - 0.05, h, w + 0.1, d + 0.1, 8, '#2E9BD6');
    signOn(ctx, df, 0.5, 0.9, '🛍️', '#2E9BD6', 'Skyline Mall');
  },
  cinema(ctx, o) {
    const palace = !!o.palace;
    ground(ctx, o, palace ? '#F2D7A8' : '#D7DEE8');
    const x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = palace ? 110 : 120;
    const wall = palace ? '#F7E3B5' : '#2B2F55', trim = palace ? '#8E3FB8' : '#F0587A';
    const f = box(ctx, x0, y0, 0, w, d, h, wall, { top: !palace });
    const df = doorFace(o, f), of = otherFace(o, f);
    if (palace) {
      for (const u of [0.15, 0.85]) archWindow(ctx, df, u, 0.28, 0.12, 0.3, '#FFFFFF', '#8E3FB8');
      for (let c = 0; c < 3; c++) archWindow(ctx, df, 0.25 + c * 0.25, 0.75, 0.1, 0.2, '#FFFFFF', '#F2A93B');
      for (let c = 0; c < 3; c++) archWindow(ctx, of, 0.25 + c * 0.25, 0.5, 0.1, 0.3, '#FFFFFF', '#8E3FB8');
      box(ctx, x0 - 0.05, y0 - 0.05, h, w + 0.1, d + 0.1, 8, '#E8B86A');
      dome(ctx, x0 + w / 2, y0 + d / 2, h + 8, 24, '#8E3FB8');
      for (const [a, b] of [[0.25, 0.25], [w - 0.25, 0.25], [0.25, d - 0.25], [w - 0.25, d - 0.25]]) chhatri(ctx, x0 + a, y0 + b, h + 8, 0.4, '#F29A1D');
    } else {
      for (let k = 0; k < 6; k++) rectOn(ctx, of, 0.08 + k * 0.15, 0.2, 0.14 + k * 0.15, 0.9, '#3A3F70', null);
      // poster cases
      for (const u of [0.15, 0.85]) { rectOn(ctx, df, u - 0.08, 0.08, u + 0.08, 0.42, '#FFFFFF', null); rectOn(ctx, df, u - 0.065, 0.1, u + 0.065, 0.4, u < 0.5 ? '#5BC0EB' : '#FFC83D', null, 0.01); }
    }
    doorOn(ctx, df, 0.5, 0.22, 0.32, palace ? '#8E3FB8' : '#C0304A');
    // marquee with bulbs
    const v = 0.42;
    poly(ctx, [fp(df, 0.22, v), fp(df, 0.78, v), fp(df, 0.78, v, 0.32), fp(df, 0.22, v, 0.32)], lit('#FFC83D', NUP), '#B98A1A', 1.2);
    rectOn(ctx, df, 0.22, v - 0.12, 0.78, v, trim, null, 0.32);
    for (let k = 0; k < 9; k++) { const [px, py] = P(...fp(df, 0.24 + k * 0.065, v - 0.06, 0.33)); ctx.fillStyle = '#FFF4B8'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill(); }
    if (!palace) neonSign(ctx, df, 0.5, 0.75, 'CINEMA', '#5BC0EB');
    else signOn(ctx, df, 0.5, 0.56, '🎬', trim, 'Picture Palace');
  },
  monorail(ctx, o) {
    ground(ctx, o, '#D7DEE8');
    const x0 = 0.1, y0 = 0.1, w = o.w - 0.2, d = o.d - 0.2;
    const along = w >= d;
    // pillars
    const pil = along ? [[x0 + 0.3, y0 + d / 2], [x0 + w - 0.3, y0 + d / 2]] : [[x0 + w / 2, y0 + 0.3], [x0 + w / 2, y0 + d - 0.3]];
    for (const [px, py] of pil) box(ctx, px - 0.1, py - 0.1, 0, 0.2, 0.2, 76, '#E6EEF8');
    // platform
    box(ctx, x0, y0, 76, w, d, 8, '#B8C4D4');
    // beam + pod
    if (along) { box(ctx, x0 - 0.3, y0 + d / 2 - 0.08, 84, w + 0.6, 0.16, 8, '#7A8798'); }
    else { box(ctx, x0 + w / 2 - 0.08, y0 - 0.3, 84, 0.16, d + 0.6, 8, '#7A8798'); }
    const pw = along ? w * 0.7 : 0.5, pd = along ? 0.5 : d * 0.7;
    const px0 = x0 + (w - pw) / 2, py0 = y0 + (d - pd) / 2;
    const pf = box(ctx, px0, py0, 92, pw, pd, 30, '#FFFFFF');
    const side = along ? pf.j : pf.i;
    rectOn(ctx, side, 0.05, 0.35, 0.95, 0.8, '#5BC0EB', null); rectOn(ctx, side, 0, 0.1, 1, 0.2, '#3F6FD8', null);
    for (let k = 1; k < 5; k++) rectOn(ctx, side, k / 5 - 0.008, 0.35, k / 5 + 0.008, 0.8, '#FFFFFF', null, 0.01);
    // stairs
    box(ctx, x0 + 0.05, y0 + d - 0.35, 0, 0.3, 0.3, 76, '#C9D3DE');
    signOn(ctx, faceJ(x0, y0, 0, w, d, 140), 0.5, 0.95, '🚝', '#3F6FD8', 'Monorail');
  },
  gym(ctx, o) {
    ground(ctx, o, '#D7DEE8');
    const x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = 90;
    const f = box(ctx, x0, y0, 0, w, d, h, '#E6EEF8');
    const df = doorFace(o, f), of = otherFace(o, f);
    glassGrid(ctx, df, 4, 2, '#9ED8F5');
    // climbing wall holds on the side
    rectOn(ctx, of, 0.05, 0.05, 0.95, 0.95, '#FFE3A3', null);
    const r = rng(7); for (let k = 0; k < 26; k++) dot(ctx, fp(of, 0.1 + r() * 0.8, 0.1 + r() * 0.8, 0.02), 2.6, ['#F0587A', '#3FA86A', '#3F6FD8', '#8E7CE0'][k % 4]);
    rectOn(ctx, df, 0.42, 0, 0.58, 0.45, '#2B3A55', null, 0.012);
    box(ctx, x0 - 0.04, y0 - 0.04, h, w + 0.08, d + 0.08, 7, '#3FA86A');
    signOn(ctx, df, 0.5, 0.7, '🏋️', '#3FA86A', 'Pulse Gym');
  },
  // Lumen Labs
  observatory(ctx, o) {
    ground(ctx, o, '#E3E8F2');
    const x0 = 0.2, y0 = 0.2, w = o.w - 0.4, d = o.d - 0.4, h = 70;
    const f = box(ctx, x0, y0, 0, w, d, h, '#F4F7FC');
    const df = doorFace(o, f), of = otherFace(o, f);
    doorOn(ctx, df, 0.5, 0.18, 0.55, '#3F4FB0');
    for (const u of [0.2, 0.8]) windowOn(ctx, df, u, 0.55, 0.1, 0.3, { cross: false });
    windowOn(ctx, of, 0.5, 0.55, 0.12, 0.3, { cross: false });
    box(ctx, x0 - 0.05, y0 - 0.05, h, w + 0.1, d + 0.1, 6, '#C9D3E6');
    const [cx, cy] = [x0 + w / 2, y0 + d / 2];
    dome(ctx, cx, cy, h + 6, 62, '#DDE4F2', null);
    // dome slit + telescope
    const [sx, sy] = P(cx, cy, h + 6);
    ctx.fillStyle = '#2B3160'; ctx.beginPath(); ctx.moveTo(sx - 8, sy - 6); ctx.lineTo(sx - 5, sy - 88); ctx.lineTo(sx + 5, sy - 88); ctx.lineTo(sx + 8, sy - 6); ctx.fill();
    ctx.save(); ctx.translate(sx, sy - 70); ctx.rotate(-0.6); ctx.fillStyle = '#F2C14E'; roundRect(ctx, -5, -34, 10, 40, 4); ctx.fill(); ctx.fillStyle = '#5A6F8F'; ctx.fillRect(-6, -36, 12, 5); ctx.restore();
    for (let k = 0; k < 5; k++) { const [x, y] = P(cx + Math.cos(k) * 0.9, cy + Math.sin(k) * 0.9, h + 120 + k * 6); ctx.fillStyle = '#FFE07A'; ctx.font = '10px sans-serif'; ctx.fillText('✦', x, y); }
  },
  lab(ctx, o) {
    ground(ctx, o, '#E3EEF0');
    const x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = 100;
    const f = box(ctx, x0, y0, 0, w, d, h, '#F4FBFB');
    const df = doorFace(o, f), of = otherFace(o, f);
    rectOn(ctx, df, 0, 0.46, 1, 0.52, '#2BB3A3', null);
    for (let fl = 0; fl < 2; fl++) for (let c = 0; c < 5; c++) { const u = (c + 0.5) / 5; if (fl === 0 && Math.abs(u - 0.5) < 0.12) continue; windowOn(ctx, df, u, 0.25 + fl * 0.48, 0.12, 0.28, { cross: false }); }
    for (let c = 0; c < 4; c++) windowOn(ctx, of, (c + 0.5) / 4, 0.5, 0.12, 0.6, { cross: false });
    doorOn(ctx, df, 0.5, 0.17, 0.42, '#2BB3A3');
    box(ctx, x0 - 0.04, y0 - 0.04, h, w + 0.08, d + 0.08, 6, '#C9D3DE');
    // rooftop tanks with bubbling pipes
    for (const [a, c] of [[0.3, '#7CE0C8'], [0.9, '#C9B5F5']]) {
      box(ctx, x0 + a, y0 + 0.3, h + 6, 0.36, 0.36, 26, '#E6EEF8');
      const [tx, ty] = P(x0 + a + 0.18, y0 + 0.48, h + 32); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(tx, ty, 13, 6, 0, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) blob(ctx, tx - 4 + k * 4, ty - 8 - k * 6, 2.2 + k * 0.6, c + 'bb');
    }
    // satellite dish
    const [dx, dy] = P(x0 + w - 0.4, y0 + d - 0.5, h + 6);
    ctx.fillStyle = '#7A8798'; ctx.fillRect(dx - 1.5, dy - 22, 3, 22);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(dx, dy - 28, 14, 8, -0.5, 0, 7); ctx.fill(); ctx.stroke();
    signOn(ctx, df, 0.5, 0.63, '🧪', '#2BB3A3', 'Lab');
  },
  museum(ctx, o) {
    ground(ctx, o, '#ECE6F6');
    const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3, h = 92;
    const f = box(ctx, x0, y0, 0, w, d, h, '#F1EEF9', { top: false });
    const df = doorFace(o, f), of = otherFace(o, f);
    // steps
    box(ctx, x0 + (o.door === 'i' ? w : 0.2 * w), y0 + (o.door === 'i' ? 0.2 * d : d), 0, o.door === 'i' ? 0.25 : w * 0.6, o.door === 'i' ? d * 0.6 : 0.25, 6, '#E3DCEF');
    columns(ctx, df, [0.12, 0.3, 0.7, 0.88], 0.8, '#FFFFFF');
    doorOn(ctx, df, 0.5, 0.2, 0.5, '#8E7CE0');
    for (let c = 0; c < 4; c++) windowOn(ctx, of, (c + 0.5) / 4, 0.5, 0.12, 0.4, {});
    gableRoof(ctx, x0, y0, h, w, d, 32, '#8E7CE0', o.door === 'i' ? 'j' : 'i', 0.18, '#F1EEF9');
    // friendly robot statue
    const [rx, ry] = P(o.door === 'i' ? o.w - 0.05 : 0.25, o.door === 'i' ? 0.25 : o.d - 0.05, 0);
    ctx.fillStyle = '#C9D3DE'; roundRect(ctx, rx - 10, ry - 34, 20, 24, 5); ctx.fill(); roundRect(ctx, rx - 9, ry - 52, 18, 16, 5); ctx.fill();
    ctx.fillStyle = '#5BC0EB'; ctx.fillRect(rx - 6, ry - 47, 4, 4); ctx.fillRect(rx + 2, ry - 47, 4, 4);
    ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ry - 52); ctx.lineTo(rx, ry - 60); ctx.stroke(); blob(ctx, rx, ry - 62, 3, '#F0587A');
    ctx.fillStyle = '#7A8798'; ctx.fillRect(rx - 8, ry - 10, 5, 10); ctx.fillRect(rx + 3, ry - 10, 5, 10);
    signOn(ctx, df, 0.5, 0.9, '🤖', '#8E7CE0', 'Robot Museum');
  },
  greenhouse(ctx, o) {
    ground(ctx, o, '#DDEFD8');
    const x0 = 0.2, y0 = 0.2, w = o.w - 0.4, d = o.d - 0.4, h = 44;
    const f = box(ctx, x0, y0, 0, w, d, h, '#BFE8D0', { top: false });
    glassGrid(ctx, f.j, 5, 2, '#A8E6C6', '#FFFFFF'); glassGrid(ctx, f.i, 5, 2, '#96D9B8', '#FFFFFF');
    // plants inside, glimpsed through glass
    const r = rng(3); for (let k = 0; k < 10; k++) { const [x, y] = P(x0 + 0.2 + r() * (w - 0.4), y0 + d - 0.05, 8 + r() * 20); blob(ctx, x, y, 6 + r() * 5, ['#3FA86A', '#5FC07E', '#2E7D4F'][k % 3]); }
    // glass dome roof
    const [cx, cy] = P(x0 + w / 2, y0 + d / 2, h);
    ctx.save(); ctx.globalAlpha = 0.75; dome(ctx, x0 + w / 2, y0 + d / 2, h, 70, '#C8F0DD', '#FFFFFF'); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 26, cy); ctx.quadraticCurveTo(cx + k * 12, cy - 90, cx, cy - 104); ctx.stroke(); }
    doorOn(ctx, doorFace(o, f), 0.5, 0.18, 0.9, '#3FA86A');
  },
  labhouse(ctx, o) {
    const look = ['#F4F7FC', '#E8F6F4', '#F2EEFB', '#FFF6E6', '#EAF4FF'][o.look % 5], acc = ['#2BB3A3', '#3F6FD8', '#8E7CE0', '#F2A93B', '#3FA86A'][o.look % 5];
    ground(ctx, o, '#CFEBC0');
    const x0 = 0.2, y0 = 0.2, w = o.w - 0.4, d = o.d - 0.4;
    const f = box(ctx, x0, y0, 0, w, d, 54, look);
    const df = doorFace(o, f), of = otherFace(o, f);
    windowOn(ctx, df, 0.25, 0.5, 0.3, 0.5, { cross: false }); doorOn(ctx, df, 0.72, 0.18, 0.75, acc);
    windowOn(ctx, of, 0.5, 0.55, 0.5, 0.4, { cross: false });
    const f2 = box(ctx, x0 + w * 0.35, y0 + 0.05, 54, w * 0.6, d * 0.6, 40, lighten(acc, 0.75));
    windowOn(ctx, f2.j, 0.5, 0.5, 0.6, 0.5, { cross: false });
    box(ctx, x0 + w * 0.35 - 0.03, y0 + 0.02, 94, w * 0.6 + 0.06, d * 0.6 + 0.06, 5, acc);
    // solar panels
    poly(ctx, [[x0 + 0.1, y0 + d - 0.6, 56], [x0 + 0.6, y0 + d - 0.6, 56], [x0 + 0.6, y0 + d - 0.15, 64], [x0 + 0.1, y0 + d - 0.15, 64]], '#2B4A8F', '#8FB3E8', 1.2);
  },
  // Lantern Quarter
  shophouse(ctx, o) {
    const shades = ['#D9363E', '#2E9B6E', '#F2A93B', '#3F6FD8', '#8E3FB8'];
    const sh = o.shade || shades[(o.look || 0) % shades.length];
    ground(ctx, o, '#D7D2CA');
    const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3, h = 82;
    const wall = mix(sh, '#FFF4E6', 0.82);
    const f = box(ctx, x0, y0, 0, w, d, h, wall, { top: false });
    const df = doorFace(o, f), of = otherFace(o, f);
    columns(ctx, df, [0.05, 0.95], 0.48, '#C0303A');
    rectOn(ctx, df, 0.1, 0.02, 0.9, 0.4, '#5A3A22', null);
    rectOn(ctx, df, 0.14, 0.05, 0.62, 0.36, '#F5D9A0', null, 0.008);
    doorOn(ctx, df, 0.76, 0.16, 0.36, '#C0303A');
    for (const u of [0.28, 0.72]) { rectOn(ctx, df, u - 0.12, 0.58, u + 0.12, 0.84, '#5A3A22', null); for (let k = 0; k < 3; k++) rectOn(ctx, df, u - 0.1 + k * 0.08, 0.6, u - 0.04 + k * 0.08, 0.82, '#F5E6C8', null, 0.008); }
    rectOn(ctx, df, 0, 0.47, 1, 0.53, '#C0303A', null, 0.05);
    windowOn(ctx, of, 0.5, 0.7, 0.2, 0.24, { frame: '#C0303A', cross: false });
    eaveRoof(ctx, x0, y0, h, w, d, 30, darken(sh, 0.1));
    for (const u of [0.2, 0.8]) lanternAt(ctx, fp(df, u, 0.44, 0.22), 6);
    if (o.icon) signOn(ctx, df, 0.5, 0.95, o.icon, sh, o.sign || o.type);
  },
  teahouse(ctx, o) {
    ground(ctx, o, '#D7D2CA');
    const x0 = 0.2, y0 = 0.2, w = o.w - 0.4, d = o.d - 0.4;
    const f = box(ctx, x0, y0, 0, w, d, 60, '#FFF4E6', { top: false });
    const df = doorFace(o, f), of = otherFace(o, f);
    columns(ctx, df, [0.04, 0.33, 0.67, 0.96], 1, '#C0303A'); columns(ctx, of, [0.04, 0.5, 0.96], 1, '#C0303A');
    for (const ff of [df, of]) for (let k = 0; k < 6; k++) rectOn(ctx, ff, 0.08 + k * 0.15, 0.25, 0.18 + k * 0.15, 0.8, '#F5E6C8', '#5A3A22', 0.008);
    eaveRoof(ctx, x0, y0, 60, w, d, 22, '#2E9B6E', 0.32);
    const f2 = box(ctx, x0 + 0.3, y0 + 0.3, 82, w - 0.6, d - 0.6, 38, '#FFF4E6', { top: false });
    for (const ff of [f2.j, f2.i]) { columns(ctx, ff, [0.06, 0.94], 1, '#C0303A'); windowOn(ctx, ff, 0.5, 0.55, 0.4, 0.5, { frame: '#C0303A' }); }
    eaveRoof(ctx, x0 + 0.3, y0 + 0.3, 120, w - 0.6, d - 0.6, 28, '#2E9B6E', 0.3);
    for (const u of [0.18, 0.5, 0.82]) lanternAt(ctx, fp(df, u, 0.92, 0.3), 6);
    signOn(ctx, df, 0.5, 0.5, '🍵', '#2E9B6E', 'Teahouse');
  },
  nightmarket(ctx, o) {
    ground(ctx, o, '#D7D2CA');
    const cols = ['#D9363E', '#F2A93B', '#2E9B6E', '#8E3FB8'];
    let k = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const sx = 0.3 + a * (o.w / 2), sy = 0.3 + b * (o.d / 2), w = o.w / 2 - 0.6, d = o.d / 2 - 0.6;
      const c = cols[k++ % 4];
      box(ctx, sx, sy, 0, w, d, 22, '#8C5A3C');
      const top = box(ctx, sx + 0.05, sy + 0.05, 22, w - 0.1, d - 0.1, 3, '#F5E6C8');
      for (let q = 0; q < 4; q++) dot(ctx, [sx + 0.2 + q * (w - 0.4) / 3, sy + d / 2, 28], 4, ['#F0587A', '#FFC83D', '#7CE07A', '#5BC0EB'][q]);
      for (const [px, py] of [[sx, sy + d], [sx + w, sy + d], [sx + w, sy], [sx, sy]]) box(ctx, px - 0.03, py - 0.03, 22, 0.06, 0.06, 34, '#5A3A22');
      poly(ctx, [[sx - 0.1, sy - 0.1, 58], [sx + w + 0.1, sy - 0.1, 58], [sx + w + 0.1, sy + d + 0.1, 52], [sx - 0.1, sy + d + 0.1, 52]], lit(c, NUP), edge(c));
      for (let q = 0; q < 5; q++) rectOn(ctx, faceJ(sx - 0.1, sy - 0.1, 44, w + 0.2, d + 0.2, 8), q / 5, 0, (q + 0.5) / 5, 1, '#FFFFFF', null, 0.01);
    }
    stringLights(ctx, [0.2, o.d - 0.1, 70], [o.w - 0.1, 0.2, 70], 10, ['#FFE07A', '#F0587A', '#FFE07A']);
    for (const [u, v] of [[0.15, o.d - 0.15], [o.w - 0.15, o.d - 0.15], [o.w - 0.15, 0.15]]) { box(ctx, u - 0.03, v - 0.03, 0, 0.06, 0.06, 74, '#5A3A22'); lanternAt(ctx, [u, v, 80], 7); }
  },
  moongarden(ctx, o) {
    ground(ctx, o, '#BFE3A8');
    // koi pond
    const [cx, cy] = P(o.w * 0.62, o.d * 0.6, 1);
    ctx.fillStyle = '#66C3E2'; ctx.strokeStyle = '#B7AFA3'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, 64, 28, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (const [dx, dy, c] of [[-20, 4, '#F28C28'], [14, -6, '#FFFFFF'], [26, 8, '#F28C28']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, 7, 3, 0.3, 0, 7); ctx.fill(); }
    blob(ctx, cx - 36, cy - 6, 6, '#4FAE5A'); blob(ctx, cx + 40, cy + 2, 5, '#4FAE5A');
    // round moon gate wall
    const wf = o.door === 'i' ? faceI(0.15, 0.15, 0, 0.18, o.d - 0.3, 64) : faceJ(0.15, 0.15, 0, o.w - 0.3, 0.18, 64);
    box(ctx, 0.15, 0.15, 0, o.door === 'i' ? 0.18 : o.w - 0.3, o.door === 'i' ? o.d - 0.3 : 0.18, 64, '#FFF4E6');
    const [gx, gy] = P(...fp(wf, 0.5, 0.48, 0.01));
    ctx.fillStyle = '#5FA34A'; ctx.beginPath(); ctx.ellipse(gx, gy, 22, 26, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 3; ctx.stroke();
    eaveRoof(ctx, 0.15, 0.15, 64, o.door === 'i' ? 0.18 : o.w - 0.3, o.door === 'i' ? o.d - 0.3 : 0.18, 10, '#3F4A5A', 0.12);
    // stone lantern and rocks
    stoneLantern(ctx, [0.5, o.d - 0.4, 0]);
    for (const [a, b] of [[o.w - 0.4, 0.5], [0.8, 0.8]]) { const [x, y] = P(a, b, 0); ctx.fillStyle = '#9AA3AE'; ctx.beginPath(); ctx.ellipse(x, y - 6, 12, 8, 0, 0, 7); ctx.fill(); }
  },
  // Sakura Hill
  machiya(ctx, o) {
    const sh = o.shade || ['#6B4A2E', '#4A3A2E', '#7A5A3A', '#5A4030', '#6E5236'][o.look % 5];
    ground(ctx, o, '#DCD3C2');
    const x0 = 0.18, y0 = 0.18, w = o.w - 0.36, d = o.d - 0.36, h = o.big ? 74 : 66;
    const f = box(ctx, x0, y0, 0, w, d, h, '#F6EFE2', { top: false });
    const df = doorFace(o, f), of = otherFace(o, f);
    // wooden lattice front
    rectOn(ctx, df, 0, 0, 1, 0.12, sh, null);
    for (let k = 0; k <= 10; k++) rectOn(ctx, df, k / 10 - 0.01, 0.12, k / 10 + 0.01, 0.9, sh, null, 0.006);
    for (let k = 0; k <= 4; k++) rectOn(ctx, df, 0, 0.12 + k * 0.19, 1, 0.135 + k * 0.19, sh, null, 0.006);
    rectOn(ctx, df, 0.38, 0, 0.62, 0.7, '#3A2A1E', null, 0.01);
    for (let k = 0; k <= 6; k++) rectOn(ctx, of, k / 6 - 0.012, 0, k / 6 + 0.012, 1, sh, null, 0.006);
    windowOn(ctx, of, 0.5, 0.55, 0.3, 0.3, { frame: sh, cross: true });
    if (o.curtain) { for (let k = 0; k < 3; k++) rectOn(ctx, df, 0.36 + k * 0.095, 0.48, 0.44 + k * 0.095, 0.78, k === 1 ? '#FFFFFF' : '#2B3F6B', null, 0.03); }
    hipRoof(ctx, x0, y0, h, w, d, 30, '#3F4A5A', 0.24);
    // small lower eave
    poly(ctx, [fp(df, -0.05, 0.62), fp(df, 1.05, 0.62), fp(df, 1.05, 0.58, 0.25), fp(df, -0.05, 0.58, 0.25)], lit('#3F4A5A', NUP), '#2B3340');
    if (o.icon) signOn(ctx, df, 0.5, 0.95, o.icon, o.color || '#D9485F', o.sign || o.type);
  },
  onsen(ctx, o) {
    ground(ctx, o, '#DCD3C2');
    const x0 = 0.15, y0 = 0.15, w = (o.w - 0.3) * 0.55, d = o.d - 0.3;
    const f = box(ctx, x0, y0, 0, w, d, 62, '#F6EFE2', { top: false });
    const df = doorFace(o, f), of = otherFace(o, f);
    for (let k = 0; k <= 6; k++) rectOn(ctx, df, k / 6 - 0.012, 0, k / 6 + 0.012, 1, '#6B4A2E', null, 0.006);
    rectOn(ctx, df, 0.3, 0.45, 0.7, 0.85, '#C9672E', null, 0.03);
    const [ix, iy] = P(...fp(df, 0.5, 0.65, 0.04)); ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♨️', ix, iy);
    hipRoof(ctx, x0, y0, 62, w, d, 30, '#3F4A5A', 0.22);
    // outdoor pools with rocks and steam
    const px = x0 + w + 0.2;
    for (const [a, b, r] of [[px + 0.5, o.d * 0.35, 46], [px + 0.8, o.d * 0.72, 38]]) {
      const [cx, cy] = P(a, b, 1);
      ctx.fillStyle = '#9AA3AE'; ctx.beginPath(); ctx.ellipse(cx, cy, r + 6, r * 0.45 + 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8FD8E8'; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cx - 14 + k * 9, cy - 16 - k * 9, 9 + k * 2, 6 + k, 0, 0, 7); ctx.fill(); }
    }
    // bamboo fence
    for (let k = 0; k < 14; k++) { const [x, y] = P(o.w - 0.08, 0.1 + k * (o.d - 0.2) / 13, 0); ctx.fillStyle = '#A8B85A'; ctx.fillRect(x - 2, y - 30, 4, 30); ctx.fillStyle = '#7F8F3A'; ctx.fillRect(x - 2, y - 18, 4, 1.5); }
  },
  shrine(ctx, o) {
    ground(ctx, o, '#E8E1D2');
    // little garden house at the back
    const x0 = 0.3, y0 = 0.25, w = o.w - 1.3, d = o.d - 1.3;
    box(ctx, x0 - 0.05, y0 - 0.05, 0, w + 0.1, d + 0.1, 10, '#CFC6B4');
    const f = box(ctx, x0, y0, 10, w, d, 46, '#F6EFE2', { top: false });
    for (const ff of [f.j, f.i]) { columns(ctx, ff, [0.05, 0.95], 1, '#D9473A'); rectOn(ctx, ff, 0.15, 0.1, 0.85, 0.8, '#F5E6C8', '#6B4A2E', 0.008); }
    gableRoof(ctx, x0, y0, 56, w, d, 30, '#3F4A5A', 'i', 0.28, '#F6EFE2');
    // red gate at the front
    const gx = o.door === 'i' ? o.w - 0.45 : o.w / 2, gy = o.door === 'i' ? o.d / 2 : o.d - 0.45;
    torii(ctx, gx, gy, o.door === 'i' ? 'j' : 'i', 1.3);
    stoneLantern(ctx, [0.35, o.d - 0.35, 0]); stoneLantern(ctx, [o.w - 0.35, 0.4, 0]);
    // wind chimes
    const [cx, cy] = P(x0 + w, y0 + d, 52); ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 10); ctx.stroke(); blob(ctx, cx, cy + 13, 4, '#9ED8F5');
  },
  // Marigold Bazaar
  haveli(ctx, o) {
    const walls = ['#F7B6C6', '#FFD27A', '#9ED8F5', '#C5E8A8', '#E8C1F5', '#FFB385'];
    const wall = o.shade || walls[(o.look || 0) % walls.length];
    const trim = darken(wall, 0.35);
    ground(ctx, o, '#E8C9A0');
    const x0 = 0.15, y0 = 0.15, w = o.w - 0.3, d = o.d - 0.3, h = 96;
    const f = box(ctx, x0, y0, 0, w, d, h, wall);
    const df = doorFace(o, f), of = otherFace(o, f);
    rectOn(ctx, df, 0, 0.47, 1, 0.52, '#FFFFFF', null);
    if (o.shop) { rectOn(ctx, df, 0.08, 0.02, 0.92, 0.4, '#FFF4E0', trim); for (let k = 0; k < 4; k++) dot(ctx, fp(df, 0.18 + k * 0.21, 0.18, 0.02), 5, ['#F0587A', '#FFC83D', '#7CE07A', '#F29A1D'][k]); awningOn(ctx, df, 0.04, 0.96, 0.46, ['#F0587A', '#FFFFFF']); }
    else { archWindow(ctx, df, 0.22, 0.22, 0.1, 0.24, '#FFFFFF', '#5BC0EB'); doorOn(ctx, df, 0.68, 0.16, 0.4, trim); }
    // jharokha: a little covered balcony
    const bv = 0.62;
    rectOn(ctx, df, 0.3, bv, 0.7, bv + 0.26, '#FFFFFF', '#00000022', 0.12);
    archWindow(ctx, df, 0.5, bv + 0.12, 0.14, 0.2, '#FFFFFF', '#8E3FB8');
    poly(ctx, [fp(df, 0.27, bv + 0.28, 0.16), fp(df, 0.73, bv + 0.28, 0.16), fp(df, 0.65, bv + 0.34, 0.06), fp(df, 0.35, bv + 0.34, 0.06)], '#FFFFFF', '#00000022', 1);
    for (const u of [0.25, 0.75]) archWindow(ctx, of, u, 0.68, 0.1, 0.2, '#FFFFFF', '#5BC0EB');
    archWindow(ctx, of, 0.5, 0.25, 0.12, 0.24, '#FFFFFF', '#5BC0EB');
    // parapet with scallops, chhatri on the roof and marigold garland over the door
    box(ctx, x0 - 0.03, y0 - 0.03, h, w + 0.06, d + 0.06, 8, '#FFFFFF');
    chhatri(ctx, x0 + w * 0.7, y0 + d * 0.3, h + 8, 0.5, trim);
    const g0 = fp(df, 0.05, 0.45, 0.03), g1 = fp(df, 0.95, 0.45, 0.03);
    for (let k = 0; k <= 12; k++) { const t = k / 12; const p = [g0[0] + (g1[0] - g0[0]) * t, g0[1] + (g1[1] - g0[1]) * t, g0[2] - Math.sin(t * Math.PI * 3) * 4]; dot(ctx, p, 2.6, k % 2 ? '#F29A1D' : '#FFC83D'); }
    if (o.icon) signOn(ctx, df, 0.5, 0.92, o.icon, darken(wall, 0.3), o.sign || o.type);
  },
  chai(ctx, o) {
    ground(ctx, o, '#E8C9A0');
    const x0 = 0.3, y0 = 0.3, w = o.w - 0.6, d = o.d - 0.6;
    const f = box(ctx, x0, y0, 0, w, d, 30, '#C9672E');
    rectOn(ctx, doorFace(o, f), 0.1, 0.2, 0.9, 0.8, '#FFF4E0', null);
    for (const [px, py] of [[x0, y0 + d], [x0 + w, y0 + d], [x0 + w, y0], [x0, y0]]) box(ctx, px - 0.03, py - 0.03, 30, 0.06, 0.06, 36, '#8C5A3C');
    poly(ctx, [[x0 - 0.25, y0 - 0.25, 70], [x0 + w + 0.25, y0 - 0.25, 70], [x0 + w + 0.25, y0 + d + 0.25, 62], [x0 - 0.25, y0 + d + 0.25, 62]], lit('#F29A1D', NUP), edge('#F29A1D'));
    for (let q = 0; q < 6; q++) rectOn(ctx, faceJ(x0 - 0.25, y0 - 0.25, 54, w + 0.5, d + 0.5, 8), q / 6, 0, (q + 0.5) / 6, 1, '#FFFFFF', null, 0.01);
    // kettle and cups
    const [kx, ky] = P(x0 + w / 2, y0 + d / 2, 32); ctx.fillStyle = '#C0C8D2'; ctx.beginPath(); ctx.ellipse(kx, ky - 6, 9, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(kx + 3, ky - 22, 5, 4, 0, 0, 7); ctx.fill();
    for (let k = 0; k < 3; k++) { const [x, y] = P(x0 + 0.15 + k * 0.2, y0 + d - 0.1, 32); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 3, y - 6, 6, 6); }
    // two stools
    for (const a of [0.2, 0.7]) { const [x, y] = P(o.door === 'i' ? o.w - 0.15 : a * o.w, o.door === 'i' ? a * o.d : o.d - 0.15, 0); ctx.fillStyle = '#8C5A3C'; ctx.fillRect(x - 1.5, y - 12, 3, 12); ctx.fillStyle = '#F0587A'; ctx.beginPath(); ctx.ellipse(x, y - 12, 8, 4, 0, 0, 7); ctx.fill(); }
  },
  bazaar(ctx, o) {
    ground(ctx, o, '#E8C9A0');
    const cols = [['#F0587A', '#FFFFFF'], ['#F29A1D', '#FFF4E0'], ['#3FA86A', '#FFFFFF'], ['#8E3FB8', '#FFE7A8'], ['#2E9BD6', '#FFFFFF'], ['#E8582A', '#FFE7A8']];
    let k = 0;
    for (let b = 0; b < 2; b++) for (let a = 0; a < 3; a++) {
      const sw = (o.w - 0.4) / 3, sd = (o.d - 0.4) / 2;
      const sx = 0.2 + a * sw + 0.08, sy = 0.2 + b * sd + 0.08, w = sw - 0.16, d = sd - 0.16;
      const c = cols[k++ % cols.length];
      box(ctx, sx, sy, 0, w, d, 20, '#B98448');
      for (let q = 0; q < 3; q++) { const [x, y] = P(sx + 0.15 + q * (w - 0.3) / 2, sy + d * 0.6, 22); ctx.fillStyle = ['#E8582A', '#F2C14E', '#7FBF4A', '#C0304A', '#8C5A30'][(q + k) % 5]; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x, y - 9); ctx.lineTo(x + 7, y); ctx.fill(); }
      for (const [px, py] of [[sx, sy + d], [sx + w, sy + d], [sx + w, sy], [sx, sy]]) box(ctx, px - 0.025, py - 0.025, 20, 0.05, 0.05, 30, '#6B4A2E');
      poly(ctx, [[sx - 0.08, sy - 0.08, 54], [sx + w + 0.08, sy - 0.08, 54], [sx + w + 0.08, sy + d + 0.08, 48], [sx - 0.08, sy + d + 0.08, 48]], lit(c[0], NUP), edge(c[0]));
      for (let q = 0; q < 4; q++) rectOn(ctx, faceJ(sx - 0.08, sy - 0.08, 40, w + 0.16, d + 0.16, 8), q / 4, 0, (q + 0.5) / 4, 1, c[1], null, 0.01);
    }
    // bunting
    stringLights(ctx, [0.1, o.d - 0.05, 66], [o.w - 0.05, o.d - 0.05, 66], 12, ['#F0587A', '#FFC83D', '#3FA86A', '#2E9BD6']);
    stringLights(ctx, [o.w - 0.05, 0.1, 66], [o.w - 0.05, o.d - 0.05, 66], 9, ['#FFC83D', '#8E3FB8', '#F29A1D']);
    for (const [u, v] of [[0.08, o.d - 0.05], [o.w - 0.05, o.d - 0.05], [o.w - 0.05, 0.08]]) box(ctx, u - 0.03, v - 0.03, 0, 0.06, 0.06, 68, '#6B4A2E');
    signOn(ctx, faceJ(0, 0, 0, o.w, o.d, 100), 0.5, 0.82, '🧺', '#F29A1D', 'Grand Bazaar');
  },
  pavilion(ctx, o) {
    ground(ctx, o, '#CFE8B8');
    // lotus pond
    const [cx, cy] = P(o.w * 0.35, o.d * 0.6, 1);
    ctx.fillStyle = '#66C3E2'; ctx.strokeStyle = '#E8C9A0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy, 66, 30, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (const [dx, dy] of [[-30, -4], [-6, 8], [18, -8], [36, 6], [-40, 10]]) { blob(ctx, cx + dx, cy + dy, 6, '#4FAE5A'); ctx.fillStyle = '#F7A8C4'; ctx.beginPath(); ctx.moveTo(cx + dx - 4, cy + dy - 2); ctx.lineTo(cx + dx, cy + dy - 9); ctx.lineTo(cx + dx + 4, cy + dy - 2); ctx.fill(); }
    // domed pavilion on pillars
    const px = o.w - 1.5, py = 0.35, s = 1.1;
    box(ctx, px - 0.05, py - 0.05, 0, s + 0.1, s + 0.1, 8, '#FFF4E0');
    for (const [a, b] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s], [s, s / 2]]) box(ctx, px + a - 0.04, py + b - 0.04, 8, 0.08, 0.08, 44, '#FFFFFF');
    box(ctx, px - 0.08, py - 0.08, 52, s + 0.16, s + 0.16, 10, '#FFF4E0');
    const f = faceJ(px - 0.08, py - 0.08, 52, s + 0.16, s + 0.16, 10);
    for (let k = 0; k < 6; k++) dot(ctx, fp(f, (k + 0.5) / 6, 0.5, 0.02), 2.4, '#E86A9A');
    dome(ctx, px + s / 2, py + s / 2, 62, 34, '#FFF4E0', '#F2C14E');
    for (const [a, b] of [[0, 0], [s, 0], [0, s], [s, s]]) chhatri(ctx, px + a, py + b, 62, 0.35, '#E86A9A');
    // arches along the garden wall
    for (let k = 0; k < 4; k++) { const ff = faceJ(0.1 + k * 0.6, o.d - 0.2, 0, 0.5, 0.1, 36); box(ctx, 0.1 + k * 0.6, o.d - 0.3, 0, 0.5, 0.1, 36, '#FFF4E0'); archWindow(ctx, ff, 0.5, 0.42, 0.2, 0.5, '#FFF4E0', '#5FA34A'); }
  },
};

function towerDraw(ctx, o, filler) {
  const pal = [['#9FC6EE', '#3F6FD8'], ['#B4E2DE', '#2BB3A3'], ['#CDBDF2', '#8E7CE0'], ['#F6C9A8', '#E8823A'], ['#BFD0E6', '#5A6F8F']];
  const [glass, acc] = pal[((o.look || 0) + (o.seed || 0)) % pal.length];
  ground(ctx, o, '#D7DEE8');
  const floors = filler ? 7 + ((o.seed || 0) * 3 + (o.i || 0)) % 5 : 5 + (o.look || 0) % 3;
  const FH = 32, x0 = 0.12, y0 = 0.12, w = o.w - 0.24, d = o.d - 0.24, h = floors * FH;
  const f = box(ctx, x0, y0, 0, w, d, h, '#E6EEF8');
  const df = doorFace(o, f), of = otherFace(o, f);
  for (const ff of [df, of]) glassGrid(ctx, { ...ff, o: [ff.o[0], ff.o[1], ff.o[2] + FH], h: h - FH }, Math.max(3, Math.round((ff.U[0] ? w : d) * 3)), floors - 1, glass, '#F4F8FC', (o.i || 1) * 31 + (o.j || 1));
  rectOn(ctx, df, 0, 0, 1, FH / h, '#2B3A55', null, 0.004);
  rectOn(ctx, df, 0.35, 0, 0.65, FH / h * 0.85, '#8FD3F5', null, 0.008);
  rectOn(ctx, df, 0, FH / h, 1, FH / h + 0.01, acc, null, 0.008);
  box(ctx, x0 - 0.03, y0 - 0.03, h, w + 0.06, d + 0.06, 6, acc);
  if (filler && (o.seed || 0) % 2 === 0) { const [ax, ay] = P(x0 + w / 2, y0 + d / 2, h + 6); ctx.strokeStyle = '#7A8798'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 40); ctx.stroke(); blob(ctx, ax, ay - 42, 3, '#F0587A'); }
  else { box(ctx, x0 + w * 0.25, y0 + d * 0.25, h + 6, w * 0.5, d * 0.5, 4, '#7A8798'); const [hx, hy] = P(x0 + w / 2, y0 + d / 2, h + 10); ctx.fillStyle = '#FFFFFF'; ctx.font = '800 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(filler ? 'H' : '', hx, hy + 5); }
  if (!filler) { const pl = [x0 + w * 0.2, y0 + d * 0.75, h + 6]; const [px, py] = P(...pl); blob(ctx, px, py - 6, 8, '#4FAE5A'); blob(ctx, px + 8, py - 3, 6, '#5FC07E'); }
}

// Two red posts and two cross beams: a gate that marks a special garden.
function torii(ctx, cx, cy, axis, s = 1) {
  const red = '#D9473A';
  const a = axis === 'i' ? [cx - 0.5 * s, cy] : [cx, cy - 0.5 * s], b = axis === 'i' ? [cx + 0.5 * s, cy] : [cx, cy + 0.5 * s];
  for (const p of [a, b]) box(ctx, p[0] - 0.05, p[1] - 0.05, 0, 0.1, 0.1, 74, red);
  const ext = 0.16 * s;
  const L = axis === 'i' ? [a[0] - ext, a[1] - 0.06] : [a[0] - 0.06, a[1] - ext];
  const len = (axis === 'i' ? b[0] - a[0] : b[1] - a[1]) + ext * 2;
  box(ctx, L[0], L[1], 58, axis === 'i' ? len : 0.12, axis === 'i' ? 0.12 : len, 6, red);
  box(ctx, L[0] - (axis === 'i' ? 0.06 : 0), L[1] - (axis === 'i' ? 0 : 0.06), 74, axis === 'i' ? len + 0.12 : 0.14, axis === 'i' ? 0.14 : len + 0.12, 7, '#3A2A2A');
}
function stoneLantern(ctx, pt) {
  const [x, y] = P(...pt);
  ctx.fillStyle = '#A9B0B8'; ctx.strokeStyle = '#7A828C'; ctx.lineWidth = 1.2;
  roundRect(ctx, x - 9, y - 6, 18, 6, 2); ctx.fill(); ctx.stroke();
  ctx.fillRect(x - 3, y - 26, 6, 20);
  roundRect(ctx, x - 9, y - 40, 18, 14, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFE9A6'; ctx.fillRect(x - 4, y - 37, 8, 8);
  ctx.fillStyle = '#A9B0B8'; ctx.beginPath(); ctx.moveTo(x - 13, y - 40); ctx.lineTo(x, y - 50); ctx.lineTo(x + 13, y - 40); ctx.closePath(); ctx.fill(); ctx.stroke();
  blob(ctx, x, y - 52, 3, '#A9B0B8');
}

const TALL = { school: 200, pool: 120, townhouse: 150, tower: 300, skyscraper: 420, office: 280, arcade: 150, mall: 190, cinema: 210, monorail: 190, gym: 140, observatory: 230, lab: 170, museum: 180, greenhouse: 170, labhouse: 140, shophouse: 170, teahouse: 200, nightmarket: 120, moongarden: 110, machiya: 140, onsen: 130, shrine: 140, haveli: 200, chai: 110, bazaar: 140, pavilion: 160 };
// How tall each style is (for the name tag) and how long its shadow is.
export function styleMeta(o) {
  const s = o.style;
  const top = { school: 190, pool: 70, townhouse: 125, tower: 5 * 32 + 30, skyscraper: 330, office: 255, arcade: 110, mall: 150, cinema: 160, monorail: 150, gym: 105, observatory: 200, lab: 135, museum: 135, greenhouse: 150, labhouse: 110, shophouse: 125, teahouse: 160, nightmarket: 85, moongarden: 85, machiya: 105, onsen: 100, shrine: 100, haveli: 150, chai: 80, bazaar: 75, pavilion: 130 }[s] || 140;
  const floors = s === 'tower' ? 5 + (o.look || 0) % 3 : 0;
  return { top: s === 'tower' ? floors * 32 + 26 : top, shadow: s === 'pool' || s === 'nightmarket' || s === 'bazaar' || s === 'moongarden' ? 30 : Math.min(260, top * 0.9) };
}
export function cityBuildingSprite(o) {
  const fn = STYLE[o.style];
  const tall = TALL[o.style] || 220;
  const [a, b, c, d] = bounds(o.w, o.d, tall);
  return new Sprite(a, b - (o.style === 'skyscraper' ? 60 : 0), c, d, ctx => { if (fn) fn(ctx, o); else drawVenue(ctx, o); });
}

// ---------- landmarks ----------
const LM = {
  bandstand(ctx, o) {
    const cx = o.w / 2, cy = o.d / 2, r = 0.85;
    const ring = n => Array.from({ length: n }, (_, k) => [cx + Math.cos(k / n * Math.PI * 2) * r, cy + Math.sin(k / n * Math.PI * 2) * r]);
    poly(ctx, ring(8).map(([x, y]) => [x, y, 12]), lit('#FFF4E0', NUP), '#C9B795');
    for (let k = 0; k < 8; k++) { const [x, y] = ring(8)[k]; if (y < cy - 0.3 && x < cx) continue; box(ctx, x - 0.03, y - 0.03, 12, 0.06, 0.06, 50, '#FFFFFF'); }
    const pts = ring(8).map(([x, y]) => [cx + (x - cx) * 1.15, cy + (y - cy) * 1.15, 62]);
    for (let k = 0; k < 8; k++) poly(ctx, [pts[k], pts[(k + 1) % 8], [cx, cy, 92]], lit('#3FA86A', [Math.cos(k / 8 * 6.28 + 0.4), Math.sin(k / 8 * 6.28 + 0.4), 0.8]), '#2E7D4F');
    blob(ctx, ...P(cx, cy, 96), 4, '#F2C14E');
    for (let k = 0; k < 3; k++) { const [x, y] = P(cx - 0.6 + k * 0.4, cy + 1.1, 40 + k * 8); ctx.fillStyle = '#26395A'; ctx.font = '16px sans-serif'; ctx.fillText('♪', x, y); }
  },
  holo(ctx, o) {
    const cx = o.w / 2, cy = o.d / 2;
    const [x, y] = P(cx, cy, 0);
    ctx.fillStyle = '#B8C4D4'; ctx.beginPath(); ctx.ellipse(x, y, 92, 44, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5BC6E8'; ctx.beginPath(); ctx.ellipse(x, y - 4, 80, 37, 0, 0, 7); ctx.fill();
    box(ctx, cx - 0.2, cy - 0.2, 0, 0.4, 0.4, 20, '#E6EEF8');
    const g = ctx.createLinearGradient(x, y - 140, x, y - 20);
    g.addColorStop(0, 'rgba(120,230,255,0)'); g.addColorStop(1, 'rgba(120,230,255,.55)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 26, y - 24); ctx.lineTo(x - 40, y - 140); ctx.lineTo(x + 40, y - 140); ctx.lineTo(x + 26, y - 24); ctx.fill();
    ctx.strokeStyle = 'rgba(160,240,255,.9)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x, y - 80, 30, 12, k * 1.05, 0, 7); ctx.stroke(); }
    blob(ctx, x, y - 80, 8, 'rgba(200,250,255,.95)');
  },
  atom(ctx, o) {
    const cx = o.w / 2, cy = o.d / 2;
    box(ctx, cx - 0.45, cy - 0.45, 0, 0.9, 0.9, 16, '#E6EEF8');
    box(ctx, cx - 0.12, cy - 0.12, 16, 0.24, 0.24, 40, '#C9D3DE');
    const [x, y] = P(cx, cy, 110);
    ctx.lineWidth = 5;
    for (const [k, c] of [[0, '#2BB3A3'], [1, '#F0587A'], [2, '#FFC83D']]) { ctx.strokeStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 52, 18, k * 1.05, 0, 7); ctx.stroke(); }
    blob(ctx, x, y, 12, '#3F6FD8'); blob(ctx, x - 3, y - 4, 4, '#9FC6EE');
    for (const [a, b, c] of [[44, -10, '#2BB3A3'], [-30, 30, '#F0587A'], [-10, -40, '#FFC83D']]) blob(ctx, x + a, y + b, 5, c);
  },
  pagoda(ctx, o) {
    const cx = o.w / 2, cy = o.d / 2;
    let z = 0, s = 1.7;
    box(ctx, cx - s / 2 - 0.1, cy - s / 2 - 0.1, 0, s + 0.2, s + 0.2, 10, '#B7AFA3');
    z = 10;
    for (let k = 0; k < 5; k++) {
      const h = 34 - k * 3;
      const f = box(ctx, cx - s / 2, cy - s / 2, z, s, s, h, '#FFF4E6', { top: false });
      for (const ff of [f.j, f.i]) { columns(ctx, ff, [0.06, 0.94], 1, '#C0303A'); rectOn(ctx, ff, 0.3, 0.15, 0.7, 0.85, '#C0303A', null); }
      eaveRoof(ctx, cx - s / 2, cy - s / 2, z + h, s, s, 14, '#C0303A', 0.32);
      z += h + 14; s *= 0.84;
    }
    const [x, y] = P(cx, cy, z); ctx.strokeStyle = '#F2C14E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.stroke();
    for (let k = 0; k < 4; k++) blob(ctx, x, y - 8 - k * 7, 4 - k * 0.5, '#F2C14E');
  },
  bigsakura(ctx, o) {
    const cx = o.w / 2, cy = o.d / 2;
    const [x, y] = P(cx, cy, 0);
    ctx.fillStyle = '#B7AFA3'; ctx.beginPath(); ctx.ellipse(x, y, 80, 36, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7A5A44'; ctx.strokeStyle = '#4E3628'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.bezierCurveTo(x - 6, y - 50, x - 30, y - 80, x - 40, y - 110); ctx.lineTo(x - 26, y - 112); ctx.bezierCurveTo(x - 12, y - 90, x, y - 80, x + 4, y - 100); ctx.bezierCurveTo(x + 14, y - 80, x + 40, y - 100, x + 46, y - 112); ctx.lineTo(x + 56, y - 106); ctx.bezierCurveTo(x + 30, y - 70, x + 14, y - 50, x + 14, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    const r = rng(77);
    const blobs = [[0, -150, 50], [-50, -130, 40], [50, -128, 42], [-24, -180, 36], [30, -176, 36], [-70, -110, 28], [72, -108, 28], [0, -118, 38]];
    canopy(ctx, blobs.map(([a, b, s]) => [x + a, y + b, s]), '#F7A8C4', r);
    for (let k = 0; k < 40; k++) blob(ctx, x + (r() - 0.5) * 180, y - 90 - r() * 120, 2.4, r() < 0.5 ? '#FFFFFF' : '#F0587A');
    for (let k = 0; k < 14; k++) blob(ctx, x + (r() - 0.5) * 150, y + (r() - 0.5) * 50, 2.2, '#F7A8C4');
  },
  rangoli(ctx, o) {
    const cx = o.w / 2, cy = o.d / 2;
    const ring = (r, n, z = 1) => Array.from({ length: n }, (_, k) => [cx + Math.cos(k / n * Math.PI * 2) * r, cy + Math.sin(k / n * Math.PI * 2) * r, z]);
    poly(ctx, ring(1.9, 24), '#F7E3C0', '#E8C9A0', 2);
    const cols = ['#E8333B', '#F29A1D', '#FFC83D', '#3FA86A', '#2E9BD6', '#8E3FB8', '#E86A9A'];
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, b = (k + 0.5) / 12 * Math.PI * 2; poly(ctx, [[cx + Math.cos(a) * 0.6, cy + Math.sin(a) * 0.6, 1], [cx + Math.cos((a + b) / 2) * 1.7, cy + Math.sin((a + b) / 2) * 1.7, 1], [cx + Math.cos(b + 0.25) * 0.6, cy + Math.sin(b + 0.25) * 0.6, 1]], cols[k % cols.length]); }
    poly(ctx, ring(0.75, 16), '#FFFFFF');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; poly(ctx, [[cx, cy, 1], [cx + Math.cos(a) * 0.65, cy + Math.sin(a) * 0.65, 1], [cx + Math.cos(a + 0.4) * 0.45, cy + Math.sin(a + 0.4) * 0.45, 1]], cols[(k + 2) % cols.length]); }
    poly(ctx, ring(0.2, 10), '#FFC83D');
    for (const [x, y] of ring(1.75, 16)) dot(ctx, [x, y, 1], 3, '#FFFFFF');
    // little lamps (diyas) around the edge
    for (const [x, y] of ring(2.05, 10)) { const [sx, sy] = P(x, y, 0); ctx.fillStyle = '#C9672E'; ctx.beginPath(); ctx.ellipse(sx, sy, 6, 3, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.ellipse(sx, sy - 4, 2, 4, 0, 0, 7); ctx.fill(); }
  },
  paifang(ctx, o) {
    const red = '#C0303A';
    const pts = [0.15, o.w / 2, o.w - 0.15];
    for (const x of pts) box(ctx, x - 0.07, o.d / 2 - 0.07, 0, 0.14, 0.14, 88, red);
    box(ctx, 0.05, o.d / 2 - 0.1, 70, o.w - 0.1, 0.2, 14, '#2E9B6E');
    const f = faceJ(0.05, o.d / 2 - 0.1, 70, o.w - 0.1, 0.2, 14);
    for (let k = 0; k < 8; k++) rectOn(ctx, f, (k + 0.2) / 8, 0.2, (k + 0.8) / 8, 0.8, '#F2C14E', null, 0.01);
    eaveRoof(ctx, 0, o.d / 2 - 0.16, 88, o.w, 0.32, 20, '#3F4A5A', 0.18);
    for (const x of [0.6, o.w - 0.6]) lanternAt(ctx, [x, o.d / 2 + 0.1, 62], 7);
  },
  turbine(ctx, o) {
    const [x, y] = P(0.5, 0.5, 0);
    ctx.fillStyle = '#F4F7FC'; ctx.strokeStyle = '#C9D3DE'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 2, y - 150); ctx.lineTo(x + 2, y - 150); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    blob(ctx, x, y - 152, 6, '#E6EEF8');
    for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(x, y - 152); ctx.rotate(k * 2.094 + (o.seed || 0)); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, -30, 5, 30, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
  },
  rickshaw(ctx, o) {
    const [x, y] = P(0.5, 0.5, 0);
    const c = ['#3FA86A', '#FFC83D', '#2E9BD6', '#F0587A'][(o.seed || 0) % 4];
    ctx.fillStyle = 'rgba(33,56,79,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 30, 10, 0, 0, 7); ctx.fill();
    for (const dx of [-16, 14]) { ctx.fillStyle = '#26395A'; ctx.beginPath(); ctx.arc(x + dx, y - 6, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = c; roundRect(ctx, x - 24, y - 30, 46, 24, 8); ctx.fill();
    ctx.fillStyle = '#26395A'; roundRect(ctx, x - 22, y - 46, 40, 18, 9); ctx.fill();
    ctx.fillStyle = '#FFE58A'; ctx.beginPath(); ctx.arc(x + 22, y - 18, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#9ED8F5'; roundRect(ctx, x + 2, y - 28, 14, 10, 3); ctx.fill();
  },
};
const LM_TALL = { bandstand: 120, holo: 170, atom: 160, pagoda: 300, bigsakura: 250, rangoli: 30, paifang: 130, turbine: 200, rickshaw: 60 };
export const LM_TOP = { bandstand: 105, holo: 150, atom: 145, pagoda: 290, bigsakura: 230, rangoli: 20, paifang: 120, turbine: 0, rickshaw: 0 };
export function landmarkSprite(o) {
  const [a, b, c, d] = bounds(o.w, o.d, LM_TALL[o.lm] || 150);
  return new Sprite(a - 40, b, c + 40, d, ctx => LM[o.lm]?.(ctx, o));
}

// Flat venues you walk onto: the jogging track and the koi pond.
export function flatSprite(o) {
  const [a, b, c, d] = bounds(o.w, o.d, 40);
  return new Sprite(a, b, c, d, ctx => {
    if (o.flatArt === 'track') {
      const cx = o.w / 2, cy = o.d / 2;
      const oval = (rx, ry, n = 28) => Array.from({ length: n }, (_, k) => [cx + Math.cos(k / n * 6.283) * rx, cy + Math.sin(k / n * 6.283) * ry, 0]);
      poly(ctx, oval(o.w / 2 - 0.05, o.d / 2 - 0.05), '#D9614C', '#FFFFFF', 2);
      poly(ctx, oval(o.w / 2 - 0.45, o.d / 2 - 0.45), null, 'rgba(255,255,255,.8)', 1.5);
      poly(ctx, oval(o.w / 2 - 0.8, o.d / 2 - 0.8), '#8FD06F', '#FFFFFF', 2);
      for (let k = 0; k < 4; k++) dot(ctx, [cx - 0.6 + k * 0.4, cy, 0], 2.5, '#FFFFFF');
      // start line
      poly(ctx, [[o.w - 0.85, cy, 0.2], [o.w - 0.05, cy, 0.2]], null, '#FFFFFF', 3);
    } else if (o.flatArt === 'koi') {
      const cx = o.w / 2, cy = o.d / 2;
      const oval = (rx, ry, n = 26) => Array.from({ length: n }, (_, k) => [cx + Math.cos(k / n * 6.283) * rx * (1 + 0.08 * Math.sin(k * 2)), cy + Math.sin(k / n * 6.283) * ry, 0]);
      poly(ctx, oval(o.w / 2 - 0.1, o.d / 2 - 0.1), '#B7AFA3');
      poly(ctx, oval(o.w / 2 - 0.3, o.d / 2 - 0.3), '#5DBFE0');
      const r = rng(9);
      for (let k = 0; k < 7; k++) { const [x, y] = P(cx + (r() - 0.5) * (o.w - 1), cy + (r() - 0.5) * (o.d - 1), 0); ctx.fillStyle = k % 3 ? '#F28C28' : '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3.5, r() * 3, 0, 7); ctx.fill(); }
      for (let k = 0; k < 4; k++) { const [x, y] = P(cx + (r() - 0.5) * (o.w - 1), cy + (r() - 0.5) * (o.d - 1), 0); blob(ctx, x, y, 6, '#4FAE5A'); }
      // little red bridge across the middle
      const b0 = [cx - 1.2, cy, 0], b1 = [cx + 1.2, cy, 0];
      ctx.strokeStyle = '#D9473A'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      const [ax, ay] = P(...b0), [bx, by] = P(...b1); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 26, bx, by); ctx.stroke();
      ctx.strokeStyle = '#F6EFE2'; ctx.lineWidth = 3; ctx.stroke();
    }
  });
}

// ---------- island bus stop ----------
export function busStopSprite() {
  const [a, b, c, d] = bounds(2, 1, 110);
  return new Sprite(a, b, c, d, ctx => {
    poly(ctx, [[0, 0, 0], [2, 0, 0], [2, 1, 0], [0, 1, 0]], '#E3DACB', '#C9B79566');
    for (const x of [0.2, 1.8]) box(ctx, x - 0.04, 0.2, 0, 0.08, 0.08, 64, '#3F6FD8');
    box(ctx, 0.15, 0.12, 0, 1.7, 0.08, 56, '#B8E0F2');
    box(ctx, 0.35, 0.35, 0, 1.3, 0.25, 16, '#C98A4B');
    poly(ctx, [[0.05, 0.05, 66], [1.95, 0.05, 66], [1.95, 0.75, 60], [0.05, 0.75, 60]], lit('#FFC83D', NUP), edge('#FFC83D'));
    // sign post
    const [x, y] = P(0.1, 0.9, 0); ctx.fillStyle = '#26395A'; ctx.fillRect(x - 1.5, y - 84, 3, 84);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#3F6FD8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 92, 14, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚌', x, y - 91);
  });
}

// ---------- trees, lamps and flowers ----------
export const CITY_TREES = new Set(['maple', 'planter', 'bamboo', 'cherry', 'banyan']);
export function cityTreeSprite(kind, seed) {
  const r = rng(seed + 21);
  const scale = 0.85 + r() * 0.3;
  return new Sprite(-90, -230, 90, 30, ctx => {
    ctx.scale(scale, scale);
    if (kind === 'bamboo') {
      for (let k = 0; k < 6; k++) {
        const x = -16 + k * 6 + (r() - 0.5) * 4, h = 110 + r() * 50, lean = (r() - 0.5) * 16;
        ctx.strokeStyle = k % 2 ? '#7FA83A' : '#94BF48'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + lean * 0.3, -h / 2, x + lean, -h); ctx.stroke();
        ctx.strokeStyle = '#5E7F2A'; ctx.lineWidth = 1.2; for (let q = 1; q < 6; q++) { const t = q / 6; ctx.beginPath(); ctx.moveTo(x + lean * t * t - 2.5, -h * t); ctx.lineTo(x + lean * t * t + 2.5, -h * t); ctx.stroke(); }
        for (let q = 0; q < 4; q++) { const t = 0.55 + q * 0.13; ctx.save(); ctx.translate(x + lean * t * t, -h * t); ctx.rotate((q % 2 ? 1 : -1) * (0.7 + r() * 0.4)); ctx.fillStyle = '#6FAE3A'; ctx.beginPath(); ctx.ellipse(10, 0, 12, 3, 0, 0, 7); ctx.fill(); ctx.restore(); }
      }
      return;
    }
    if (kind === 'planter') {
      ctx.fillStyle = '#C9D3DE'; ctx.strokeStyle = '#8FA0B4'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(18, -2); ctx.lineTo(14, -22); ctx.lineTo(-14, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A5A44'; ctx.fillRect(-2.5, -50, 5, 30);
      canopy(ctx, [[0, -64, 20], [-14, -54, 14], [14, -54, 14], [0, -80, 14]], '#4FAE5A', r);
      return;
    }
    // trunk
    ctx.fillStyle = kind === 'cherry' ? '#6E4A3A' : '#8C5A3C'; ctx.strokeStyle = '#5E3A26'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-3, -24, -5, -46); ctx.lineTo(5, -46); ctx.quadraticCurveTo(3, -24, 7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (kind === 'banyan') {
      const blobs = [[0, -84, 36], [-34, -70, 28], [34, -68, 28], [-16, -108, 26], [18, -104, 26], [-50, -60, 20], [50, -58, 20]];
      canopy(ctx, blobs, '#3F8F4E', r);
      ctx.strokeStyle = '#7A5A44'; ctx.lineWidth = 1.6; for (let k = 0; k < 9; k++) { const x = -46 + k * 11; ctx.beginPath(); ctx.moveTo(x, -56); ctx.lineTo(x + (r() - 0.5) * 4, -6 - r() * 10); ctx.stroke(); }
      return;
    }
    const base = kind === 'maple' ? ['#E8823A', '#D9533A', '#F2A93B', '#C9452E'][Math.floor(r() * 4)] : '#F7B8D0';
    const blobs = [[0, -78, 30], [-24, -62, 22], [24, -60, 22], [-12, -100, 20], [14, -96, 20], [0, -54, 20]];
    canopy(ctx, blobs, base, r);
    if (kind === 'cherry') for (let k = 0; k < 22; k++) blob(ctx, (r() - 0.5) * 64, -46 - r() * 66, 2.2, r() < 0.5 ? '#FFFFFF' : '#F06A9A');
    if (kind === 'maple') for (let k = 0; k < 8; k++) blob(ctx, (r() - 0.5) * 50, -2 + r() * 6, 2, ['#E8823A', '#F2A93B', '#D9533A'][k % 3]);
  });
}
export function cityLampSprite(kind, seed) {
  return new Sprite(-50, -100, 50, 24, ctx => {
    if (kind === 'neon') {
      ctx.fillStyle = '#5A6F8F'; ctx.fillRect(-2, -84, 4, 84); ctx.fillRect(-6, -4, 12, 4);
      ctx.fillRect(-2, -86, 22, 4); ctx.fillStyle = '#E8F8FF'; roundRect(ctx, 8, -84, 16, 5, 2); ctx.fill();
      ctx.fillStyle = 'rgba(160,230,255,.35)'; ctx.beginPath(); ctx.ellipse(16, -78, 10, 4, 0, 0, 7); ctx.fill();
    } else if (kind === 'lantern') {
      ctx.fillStyle = '#5A3A22'; ctx.fillRect(-2, -78, 4, 78); ctx.fillRect(-2, -80, 18, 3);
      const draw = (x, y) => { ctx.strokeStyle = '#5A3A22'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 8); ctx.stroke(); ctx.fillStyle = '#E8333B'; ctx.beginPath(); ctx.ellipse(x, y, 8, 10, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,230,150,.6)'; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 2.5, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#F2C14E'; ctx.fillRect(x - 4, y - 11, 8, 2); ctx.fillRect(x - 4, y + 9, 8, 2); };
      draw(14, -66);
    } else if (kind === 'stonelantern') {
      stoneLantern(ctx, [0, 0, 0]);
    } else if (kind === 'brass') {
      ctx.fillStyle = '#B98A2E'; ctx.fillRect(-2.5, -72, 5, 72); ctx.fillRect(-7, -4, 14, 4);
      ctx.fillStyle = '#D9A93E'; ctx.beginPath(); ctx.moveTo(-10, -72); ctx.lineTo(10, -72); ctx.lineTo(6, -88); ctx.lineTo(-6, -88); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE9A6'; ctx.fillRect(-5, -86, 10, 12);
      ctx.fillStyle = '#B98A2E'; ctx.beginPath(); ctx.moveTo(-9, -88); ctx.quadraticCurveTo(0, -102, 9, -88); ctx.fill(); blob(ctx, 0, -100, 2.5, '#D9A93E');
      // marigold garland
      for (let k = 0; k < 6; k++) blob(ctx, -6 + k * 2.4, -60 + Math.sin(k) * 2, 2.2, k % 2 ? '#F29A1D' : '#FFC83D');
    }
  });
}
export function marigoldSprite(seed) {
  const r = rng(seed + 5);
  return new Sprite(-30, -30, 30, 16, ctx => {
    for (let k = 0; k < 8; k++) {
      const x = (r() - 0.5) * 40, y = (r() - 0.5) * 14;
      ctx.strokeStyle = '#3F9A5C'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 8); ctx.stroke();
      blob(ctx, x, y - 10, 4.2, k % 3 ? '#F29A1D' : '#FFC83D'); blob(ctx, x - 1, y - 11, 2, lighten('#F29A1D', 0.4));
    }
  });
}

// ---------- ground skins ----------
const SKIN_COL = { 13: '#59616E', 14: '#C9C4BC', 15: '#D9946A', 16: '#E8E1D2', 17: '#C0504A', 18: '#E2E8F0', 19: '#86C25A', 20: '#C8735A', 21: '#F0F2F4', 22: '#E8C99A' };
export const SKIN_RADAR = { 13: '#7A828E', 14: '#D9D4CC', 15: '#E8A87E', 16: '#F2ECDF', 17: '#D96A62', 18: '#F2F5F8', 19: '#98CC6E', 20: '#D98A70', 21: '#FFFFFF', 22: '#F2D7AE' };
export function skinTileSprite(type, variant) {
  const r = rng(type * 131 + variant * 17 + 3);
  return new Sprite(-TW / 2 - 1, -1, TW / 2 + 1, TH + 1, ctx => {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(TW / 2 + 0.8, TH / 2); ctx.lineTo(0, TH + 0.8); ctx.lineTo(-TW / 2 - 0.8, TH / 2); ctx.closePath();
    const base = SKIN_COL[type]; ctx.fillStyle = base; ctx.fill(); ctx.save(); ctx.clip();
    const grid = (n, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 1; k < n; k++) { const t = k / n; ctx.moveTo(-TW / 2 * t, TH / 2 * t); ctx.lineTo(TW / 2 - TW / 2 * t, TH / 2 + TH / 2 * t); ctx.moveTo(TW / 2 * t, TH / 2 * t); ctx.lineTo(-TW / 2 + TW / 2 * t, TH / 2 + TH / 2 * t); } ctx.stroke(); };
    if (type === 13) { for (let k = 0; k < 40; k++) blob(ctx, (r() - 0.5) * TW, r() * TH, 0.9, r() < 0.5 ? '#4E5562' : '#6A7280'); if (variant === 1) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-14, TH / 2 - 2, 28, 4); } }
    else if (type === 14 || type === 20) {
      const c = type === 14 ? ['#D6D1C9', '#BDB7AE', '#CEC9C1'] : ['#D27F64', '#B9644C', '#DC8E72'];
      for (let y = 3; y < TH; y += 8) for (let x = -TW / 2; x < TW / 2; x += type === 14 ? 12 : 14) { ctx.fillStyle = c[Math.floor(r() * 3)]; roundRect(ctx, x + (y % 16 ? 6 : 0), y, type === 14 ? 10 : 12, 6, type === 14 ? 3 : 1.5); ctx.fill(); }
    }
    else if (type === 15 || type === 22) { grid(3, type === 15 ? '#C27E56' : '#D9B784'); for (let k = 0; k < 18; k++) blob(ctx, (r() - 0.5) * TW, r() * TH, 1, type === 15 ? '#E6A27C' : '#F2D9B0'); if (type === 22 && variant === 0) { ctx.strokeStyle = '#E86A9A55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, TH / 2, 18, 9, 0, 0, 7); ctx.stroke(); } }
    else if (type === 16) { ctx.strokeStyle = '#D6CDBB'; ctx.lineWidth = 1.4; for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(k * 11 - 30, 0); ctx.lineTo(k * 11 + 34, TH); ctx.stroke(); } }
    else if (type === 17) { grid(2, '#A8403B'); for (let k = 0; k < 10; k++) blob(ctx, (r() - 0.5) * TW, r() * TH, 1, '#D86A62'); if (variant === 0) { ctx.strokeStyle = '#F2C14E88'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, TH / 2, 14, 7, 0, 0, 7); ctx.stroke(); } }
    else if (type === 18 || type === 21) { grid(4, type === 18 ? '#CDD5E0' : '#DDE2E8'); if (variant === 2 && type === 18) { ctx.fillStyle = 'rgba(91,192,235,.25)'; ctx.fillRect(-20, TH / 2 - 1, 40, 2); } }
    else if (type === 19) {
      for (let k = 0; k < 26; k++) { const x = (r() - 0.5) * TW, y = r() * TH; ctx.strokeStyle = r() < 0.5 ? darken(base, 0.1) : lighten(base, 0.15); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y - 4); ctx.stroke(); }
      for (let k = 0; k < 6; k++) { ctx.fillStyle = ['#E8823A', '#F2A93B', '#D9533A'][k % 3]; ctx.beginPath(); ctx.ellipse((r() - 0.5) * TW * 0.8, r() * TH, 3, 1.6, r() * 3, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  });
}
