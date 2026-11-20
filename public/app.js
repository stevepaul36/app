// Willowvale: the illustrated animal city. Canvas 2D engine + phone-first UI.
import { N, T, buildWorld, findPath, nearestWalkable, DISTRICTS, districtAt, HOMES, VENUES, NEIGHBOURS } from './js/world.js';
import * as A from './js/art.js';

const IS_NATIVE = location.protocol === 'capacitor:' || !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const API_BASE = IS_NATIVE ? (safeGet('willowvale_server') || 'https://willowvale-animal-town.onrender.com') : '';
const $ = id => document.getElementById(id);
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const today = () => new Date().toLocaleDateString('en-CA');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ITEMS = { berries: { icon: '🫐', one: 'berry', many: 'berries' }, fish: { icon: '🐟', one: 'fish', many: 'fish' }, flowers: { icon: '🌼', one: 'flower', many: 'flowers' }, crafts: { icon: '🎁', one: 'keepsake', many: 'keepsakes' } };
const itemName = (k, n) => n === 1 ? ITEMS[k].one : ITEMS[k].many;

// ---------- persistent state ----------
function loadProgress() {
  const base = { coins: 35, inventory: { berries: 2, fish: 0, flowers: 1, crafts: 0 }, visits: {}, friends: {}, done: [], daily: {} };
  const v2 = store.get('willowvale_progress_v2', null);
  if (v2) return Object.assign(base, v2, { inventory: Object.assign(base.inventory, v2.inventory || {}) });
  const v1 = store.get('willowvale_progress_v1', null);
  if (v1 && v1.inventory) Object.assign(base.inventory, v1.inventory);
  return base;
}
const S = {
  token: safeGet('willowvale_token') || '',
  user: null,
  profile: store.get('willowvale_player_v2', null),
  progress: loadProgress(),
  settings: Object.assign({ labels: true, reduced: false }, store.get('willowvale_settings_v2', {})),
  coins: 0,
  properties: null,
  online: 'guest',
  sheet: null,
  run: false,
};
S.coins = S.progress.coins;
const saveProgress = () => { if (!S.token) S.progress.coins = S.coins; store.set('willowvale_progress_v2', S.progress); };
const saveSettings = () => store.set('willowvale_settings_v2', S.settings);

// ---------- world ----------
const world = buildWorld();
const canvas = $('world'), ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
const mobile = () => Math.min(W, H) < 620;
const cam = { x: 0, y: 0, zoom: 0.6, tz: 0, free: false };

const tileCache = new Map();
function tileSpr(type, i, j) {
  const v = (i * 7 + j * 13) % 4, k = type * 10 + v;
  if (!tileCache.has(k)) tileCache.set(k, A.tileSprite(type, v));
  return tileCache.get(k);
}
const treeCache = new Map();
function treeSpr(kind, seed) { const k = kind + (seed % 5); if (!treeCache.has(k)) treeCache.set(k, A.treeSprite(kind, seed % 5)); return treeCache.get(k); }
const smallCache = new Map();
function smallSpr(kind, seed, face) { const k = kind + (kind === 'bench' ? face : seed % 6); if (!smallCache.has(k)) smallCache.set(k, A.smallSprite(kind, seed % 6, face)); return smallCache.get(k); }
const TREE_SHADOW = A.treeShadow();

// Static scene objects with their art.
const things = [];
const flats = [];
const venuesById = {};
for (const o of world.objects) {
  const t = { o, box: [o.i, o.j, o.i + o.w, o.j + o.d], ax: o.i, ay: o.j, interactive: true };
  if (['house', 'apartment', 'villa', 'venue', 'shop'].includes(o.kind)) {
    t.sprite = A.buildingSprite(o);
    const h = { house: 120, apartment: 200, villa: 140, venue: 140, shop: 120 }[o.kind];
    t.shadow = A.shadowSprite(o.w, o.d, h);
    t.top = { house: 130, apartment: 230, villa: 160, venue: 165, shop: 135 }[o.kind];
    if (o.id === 'station') t.top = 90;
    if (o.kind === 'venue') venuesById[o.id] = o;
    if (o.kind === 'shop' && o.label === 'Cottage') t.interactive = false;
  } else if (o.kind === 'fountain') { t.sprite = A.fountainSprite(); t.live = 'fountain'; }
  else if (o.kind === 'clock') { t.sprite = A.clockSprite(); t.shadow = A.shadowSprite(1, 1, 120); t.live = 'clock'; t.top = 240; }
  else if (o.kind === 'board') { t.sprite = A.boardSprite(); }
  else if (o.kind === 'sunwheel') { t.sprite = A.sunwheelBase(); t.live = 'sunwheel'; t.top = 280; }
  else if (o.kind === 'windmill') { t.sprite = A.windmillBase(); t.live = 'windmill'; t.shadow = A.shadowSprite(2, 2, 90); t.top = 200; }
  things.push(t);
}
for (const d of world.decor) {
  const x = d.i + 0.5 + (d.ox || 0), y = d.j + 0.5 + (d.oy || 0);
  if (d.kind === 'flowers' || d.kind === 'bench') { flats.push({ d, x, y, sprite: smallSpr(d.kind, d.seed || 0, d.face) }); continue; }
  const t = { o: d, box: [d.i + 0.2, d.j + 0.2, d.i + 0.8, d.j + 0.8], ax: x, ay: y, centered: true };
  if (d.kind === 'tree') { t.sprite = treeSpr(d.tree, d.seed); t.treeShadow = true; }
  else t.sprite = smallSpr(d.kind, d.seed || 0, d.face);
  things.push(t);
}
for (const b of world.boats) things.push({ o: b, box: [b.x - 0.4, b.y - 0.4, b.x + 0.4, b.y + 0.4], ax: b.x, ay: b.y, centered: true, live: 'boat' });

// ---------- characters ----------
class Walker {
  constructor(x, y, species, outfit, opts = {}) {
    Object.assign(this, { x, y, species, outfit, path: [], dir: 'front', flip: false, walk: 0, moving: false, speed: opts.speed || 2, seed: opts.seed || 0, emote: null, emoteLife: 0, name: opts.name || '', wait: 1 + Math.random() * 3, wave: 0 });
  }
  go(path, onArrive) { this.path = path || []; this.onArrive = onArrive || null; if (!this.path.length && onArrive) { const f = onArrive; this.onArrive = null; f(); } }
  face(tx, ty) { const dx = tx - this.x, dy = ty - this.y, sdx = dx - dy, sdy = dx + dy; this.dir = sdy >= -0.2 ? 'front' : 'back'; this.flip = sdx > 0; }
  update(dt) {
    if (this.emote) { this.emoteLife -= dt; if (this.emoteLife <= 0) this.emote = null; }
    if (this.wave > 0) this.wave -= dt;
    if (!this.path.length) { this.moving = false; return; }
    const [tx, ty] = this.path[0], dx = tx - this.x, dy = ty - this.y, dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.moving = true;
    this.face(tx, ty);
    if (dist <= step) {
      this.x = tx; this.y = ty; this.path.shift();
      if (!this.path.length) { this.moving = false; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); } }
    } else { this.x += dx / dist * step; this.y += dy / dist * step; }
    this.walk += step * 5.2;
  }
  say(emoji, life = 2.4) { this.emote = emoji; this.emoteLife = life; }
}

const playerStart = [23.5, 23.5];
const BASE_SPEED = 4.2;
const player = new Walker(...playerStart, S.profile?.species || 'fox', S.profile?.outfit ?? 0, { speed: BASE_SPEED, seed: 3 });
const npcs = NEIGHBOURS.map((n, k) => {
  const spot = nearestWalkable(world, n.home[0], n.home[1]) || [22, 22];
  const w = new Walker(spot[0] + 0.5, spot[1] + 0.5, n.species, n.outfit, { speed: 1.5 + (k % 3) * 0.2, seed: k * 3 + 1, name: n.name });
  w.data = n; w.home = spot; w.busy = 0;
  return w;
});
function npcThink(n, dt) {
  if (n.busy > 0) { n.busy -= dt; n.face(player.x, player.y); return; }
  if (n.path.length) return;
  n.wait -= dt;
  if (Math.hypot(player.x - n.x, player.y - n.y) < 2.2) { n.face(player.x, player.y); if (!n.greeted) { n.greeted = true; n.say(['👋', '☀️', '💛', '🎵'][n.seed % 4]); } }
  else n.greeted = false;
  if (n.wait > 0) return;
  n.wait = 2 + Math.random() * 5;
  if (Math.random() < 0.3) { n.say(['🎵', '☀️', '🌼', '🍯', '💬', '✨'][Math.floor(Math.random() * 6)]); return; }
  for (let k = 0; k < 6; k++) {
    const ti = n.home[0] + Math.floor((Math.random() - 0.5) * 12), tj = n.home[1] + Math.floor((Math.random() - 0.5) * 12);
    if (!world.walkable(ti, tj)) continue;
    const p = findPath(world, n.x, n.y, ti + 0.5, tj + 0.5);
    if (p && p.length < 18) { n.go(p.slice(1)); return; }
  }
}

// Butterflies and birds for life in the air.
const butterflies = Array.from({ length: 8 }, (_, k) => ({ cx: [14, 17, 8, 12, 27, 5, 18, 30][k] + 0.5, cy: [12, 19, 27, 32, 8, 35, 36, 14][k] + 0.5, seed: k * 1.7, col: ['#FFC83D', '#F0587A', '#FFFFFF', '#8E7CE0'][k % 4] }));
const clouds = Array.from({ length: 5 }, (_, k) => ({ x: k * 11 - 6, y: (k * 17) % 40, r: 3 + (k % 3) }));
let birds = null;

// ---------- view ----------
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  document.body.classList.toggle('is-phone', mobile());
}
window.addEventListener('resize', resize); resize();
cam.zoom = mobile() ? 0.56 : 0.72;
{ const p = A.P(player.x, player.y, 30); cam.x = p[0]; cam.y = p[1]; }

const toScreen = (x, y, z = 0) => { const p = A.P(x, y, z); return [(p[0] - cam.x) * cam.zoom + W / 2, (p[1] - cam.y) * cam.zoom + H / 2]; };
function toWorld(sx, sy) {
  const px = (sx - W / 2) / cam.zoom + cam.x, py = (sy - H / 2) / cam.zoom + cam.y;
  const a = px / (A.TW / 2), b = py / (A.TH / 2);
  return [(a + b) / 2, (b - a) / 2];
}
function setZoom(z, ax = W / 2, ay = H / 2) {
  const before = toWorld(ax, ay);
  cam.zoom = Math.max(0.3, Math.min(1.5, z));
  const after = toWorld(ax, ay);
  const pb = A.P(...before), pa = A.P(...after);
  cam.x += pb[0] - pa[0]; cam.y += pb[1] - pa[1];
}

// Painter's order for boxes on the iso grid. Boxes that share a range on one axis are ordered by the
// other axis; boxes that are only diagonal neighbours never overlap on screen, so they get no order.
const EPS = 0.001;
function behind(a, b) {
  const iOver = a.box[0] < b.box[2] - EPS && b.box[0] < a.box[2] - EPS;
  const jOver = a.box[1] < b.box[3] - EPS && b.box[1] < a.box[3] - EPS;
  if (iOver && jOver) return (a.box[0] + a.box[2] + a.box[1] + a.box[3]) < (b.box[0] + b.box[2] + b.box[1] + b.box[3]);
  if (jOver) return a.box[2] <= b.box[0] + EPS;
  if (iOver) return a.box[3] <= b.box[1] + EPS;
  return a.box[2] <= b.box[0] + EPS && a.box[3] <= b.box[1] + EPS;
}
function sortScene(list) {
  const out = [], state = new Map();
  const visit = n => {
    const st = state.get(n);
    if (st === 2) return; if (st === 1) return; // cycle guard
    state.set(n, 1);
    for (const m of list) if (m !== n && state.get(m) !== 2 && behind(m, n)) visit(m);
    state.set(n, 2); out.push(n);
  };
  list.sort((a, b) => (a.box[0] + a.box[1]) - (b.box[0] + b.box[1]));
  for (const n of list) visit(n);
  return out;
}

let drawn = [];
const pops = [];
let marker = null, t0 = performance.now(), time = 0, onboardT = 0;

let grads = null;
function gradients() {
  if (grads && grads.w === W && grads.h === H) return grads;
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#6FCDEB'); sea.addColorStop(1, '#3FAAD8');
  const sun = ctx.createRadialGradient(W * 0.15, -H * 0.1, 0, W * 0.15, -H * 0.1, Math.max(W, H) * 1.1);
  sun.addColorStop(0, 'rgba(255,236,190,.28)'); sun.addColorStop(0.5, 'rgba(255,236,190,.06)'); sun.addColorStop(1, 'rgba(40,70,110,.10)');
  grads = { w: W, h: H, sea, sun };
  return grads;
}
function drawSea() { ctx.fillStyle = gradients().sea; ctx.fillRect(0, 0, W, H); }

function frame(now) {
  const dt = S.sheet === 'pause' ? 0 : Math.min(0.05, (now - t0) / 1000); t0 = now; time += S.settings.reduced ? dt * 0.4 : dt;
  update(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawSea();
  const z = cam.zoom;
  // visible tile window
  const corners = [toWorld(0, 0), toWorld(W, 0), toWorld(0, H), toWorld(W, H)];
  const i0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c[0]))) - 2), i1 = Math.min(N - 1, Math.ceil(Math.max(...corners.map(c => c[0]))) + 2);
  const j0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c[1]))) - 2), j1 = Math.min(N - 1, Math.ceil(Math.max(...corners.map(c => c[1]))) + 4);

  // sea sparkle
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2 * z; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let j = j0 - 6; j <= j1 + 6; j += 2) for (let i = i0 - 6; i <= i1 + 6; i += 2) {
    if (world.get(i, j) !== T.SEA) continue;
    const ph = Math.sin(time * 1.3 + i * 1.7 + j * 2.3);
    if (ph < 0.45) continue;
    const [sx, sy] = toScreen(i + 0.5 + ((i * 7 + j) % 3) * 0.3, j + 0.5);
    const w = 9 * z * (ph - 0.3) * 1.4;
    ctx.moveTo(sx - w, sy); ctx.quadraticCurveTo(sx, sy - 4 * z, sx + w, sy);
  }
  ctx.stroke();

  // ground tiles, cliffs and foam
  const sea = (i, j) => world.get(i, j) === T.SEA;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const t = world.get(i, j);
    if (t === T.SEA) continue;
    const [sx, sy] = toScreen(i, j);
    if (sea(i + 1, j) || sea(i, j + 1)) {
      const drop = 22 * z;
      ctx.fillStyle = '#D8B878';
      if (sea(i + 1, j)) { const [ax, ay] = toScreen(i + 1, j), [bx, by] = toScreen(i + 1, j + 1); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by + drop); ctx.lineTo(ax, ay + drop); ctx.fill(); }
      ctx.fillStyle = '#E5C88A';
      if (sea(i, j + 1)) { const [ax, ay] = toScreen(i, j + 1), [bx, by] = toScreen(i + 1, j + 1); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by + drop); ctx.lineTo(ax, ay + drop); ctx.fill(); }
    }
    if (t === T.POND) drawPond(i, j, sx, sy, z);
    else tileSpr(t, i, j).draw(ctx, sx, sy, z);
  }
  // edges: path curbs and shoreline foam
  ctx.lineCap = 'round';
  const roadEdge = (a, b) => { const n = world.get(a, b); return n !== T.PATH && n !== T.PLAZA && n !== T.DOCK && n !== T.SEA; };
  ctx.beginPath();
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = world.get(i, j); if (t === T.PATH || t === T.PLAZA) edgeLines(i, j, roadEdge); }
  ctx.strokeStyle = 'rgba(170,128,70,.42)'; ctx.lineWidth = 2.2 * z; ctx.stroke();
  ctx.beginPath();
  const foam = 22 * z + Math.sin(time * 1.6) * 3 * z;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = world.get(i, j); if (t !== T.SEA) edgeLines(i, j, sea, foam); }
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = (3.2 + Math.sin(time * 2) * 0.8) * z; ctx.stroke();
  // cloud shadows drift across the island
  if (!S.settings.reduced) {
    ctx.fillStyle = 'rgba(30,60,90,.07)';
    for (const c of clouds) {
      const x = ((c.x + time * 0.35) % 60) - 8, y = c.y;
      const [sx, sy] = toScreen(x, y);
      ctx.beginPath(); ctx.ellipse(sx, sy, c.r * 60 * z, c.r * 26 * z, 0, 0, 7); ctx.fill();
    }
  }
  // shadows and flat decorations
  const pad = 260 * z;
  const onScreen = (sx, sy, r = pad) => sx > -r && sx < W + r && sy > -r && sy < H + r * 1.5;
  ctx.globalAlpha = 0.22;
  for (const t of things) {
    if (!t.shadow && !t.treeShadow) continue;
    const [sx, sy] = toScreen(t.ax, t.ay);
    if (!onScreen(sx, sy)) continue;
    (t.shadow || TREE_SHADOW).draw(ctx, sx, sy, z);
  }
  ctx.globalAlpha = 1;
  for (const f of flats) { const [sx, sy] = toScreen(f.x, f.y); if (onScreen(sx, sy, 80 * z)) f.sprite.draw(ctx, sx, sy, z); }
  if (marker) {
    const [sx, sy] = toScreen(marker.x, marker.y); marker.life -= 0.016;
    const p = (time * 1.5) % 1;
    ctx.strokeStyle = `rgba(255,200,61,${1 - p})`; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.ellipse(sx, sy, (10 + p * 22) * z, (5 + p * 11) * z, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.ellipse(sx, sy, 6 * z, 3 * z, 0, 0, 7); ctx.fill();
    if (!player.path.length && marker.life < 0) marker = null;
  }
  // under-player ring
  { const [sx, sy] = toScreen(player.x, player.y); ctx.fillStyle = 'rgba(255,200,61,.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, 20 * z, 9 * z, 0, 0, 7); ctx.fill(); }

  // sorted objects
  const list = [];
  for (const t of things) {
    const [sx, sy] = toScreen(t.ax, t.ay);
    if (!onScreen(sx, sy, 330 * z)) continue;
    list.push(t);
  }
  const chars = [player, ...npcs].map(c => ({ char: c, box: [c.x - 0.25, c.y - 0.25, c.x + 0.25, c.y + 0.25] }));
  for (const c of chars) { const [sx, sy] = toScreen(c.char.x, c.char.y); if (onScreen(sx, sy, 100)) list.push(c); }
  drawn = sortScene(list);
  for (const t of drawn) drawThing(t, z);
  drawPlayerIfHidden(z);

  // overlays
  for (const b of butterflies) {
    const x = b.cx + Math.sin(time * 0.6 + b.seed) * 1.6, y = b.cy + Math.cos(time * 0.45 + b.seed * 2) * 1.6;
    const [sx, sy] = toScreen(x, y, 30 + Math.sin(time * 3 + b.seed) * 8);
    if (!onScreen(sx, sy, 20)) continue;
    const f = Math.abs(Math.sin(time * 14 + b.seed)) * 0.8 + 0.2;
    ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(sx - 3 * z * f, sy, 3.5 * z * f, 3 * z, 0, 0, 7); ctx.ellipse(sx + 3 * z * f, sy, 3.5 * z * f, 3 * z, 0, 0, 7); ctx.fill();
  }
  for (const c of [player, ...npcs]) {
    if (!c.emote) continue;
    const [sx, sy] = toScreen(c.x, c.y);
    A.drawEmote(ctx, sx, sy - 74 * z, Math.max(0.7, z), c.emote, c.emoteLife);
  }
  drawLabels(z);
  drawBirds(dt);
  for (let k = pops.length - 1; k >= 0; k--) {
    const p = pops[k]; p.life -= dt;
    if (p.life <= 0) { pops.splice(k, 1); continue; }
    const [sx, sy] = toScreen(p.x, p.y);
    const rise = (1.6 - p.life) * 40;
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.font = `800 ${Math.round(18 * Math.max(0.8, z))}px "Baloo 2", system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(p.text, sx, sy - 90 * z - rise); ctx.fillStyle = p.color || '#C98A1E'; ctx.fillText(p.text, sx, sy - 90 * z - rise);
    ctx.restore();
  }
  // warm sunlight wash
  ctx.fillStyle = gradients().sun; ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
}

function edgeLines(i, j, test, drop = 0) {
  const sides = [[1, 0, [i + 1, j], [i + 1, j + 1]], [0, 1, [i, j + 1], [i + 1, j + 1]], [-1, 0, [i, j], [i, j + 1]], [0, -1, [i, j], [i + 1, j]]];
  for (const [a, b, p, q] of sides) {
    if (!test(i + a, j + b)) continue;
    const d = (a > 0 || b > 0) ? drop : 0;
    const [ax, ay] = toScreen(...p), [bx, by] = toScreen(...q);
    ctx.moveTo(ax, ay + d); ctx.lineTo(bx, by + d);
  }
}
function drawPond(i, j, sx, sy, z) {
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 64 * z, sy + 32 * z); ctx.lineTo(sx, sy + 64 * z); ctx.lineTo(sx - 64 * z, sy + 32 * z); ctx.closePath();
  ctx.fillStyle = '#66C3E2'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.6 * z;
  const ph = (time * 0.6 + (i * 3 + j) * 0.37) % 1;
  ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(sx, sy + 32 * z, (8 + ph * 22) * z, (3 + ph * 9) * z, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  if ((i * 5 + j * 3) % 4 === 0) { ctx.fillStyle = '#4FAE5A'; ctx.beginPath(); ctx.ellipse(sx - 16 * z, sy + 30 * z, 10 * z, 5 * z, 0, 0.4, 6.0); ctx.lineTo(sx - 16 * z, sy + 30 * z); ctx.fill(); ctx.fillStyle = '#F7A8C4'; ctx.beginPath(); ctx.arc(sx - 14 * z, sy + 27 * z, 3 * z, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#D9CBB3'; ctx.lineWidth = 4 * z;
  ctx.beginPath(); edgeLines(i, j, (a, b) => world.get(a, b) !== T.POND); ctx.stroke();
}

function drawThing(t, z) {
  if (t.char) {
    const c = t.char, [sx, sy] = toScreen(c.x, c.y);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(z * 1.15, z * 1.15);
    A.drawAnimal(ctx, c.species, c.outfit, { t: time, walk: c.walk, moving: c.moving, dir: c.dir, flip: c.flip, seed: c.seed, wave: c.wave > 0, happy: c.wave > 0 || !!c.emote });
    ctx.restore();
    return;
  }
  if (t.live === 'boat') { const [sx, sy] = toScreen(t.ax, t.ay); A.drawBoat(ctx, sx, sy, z, time, t.o); return; }
  const [sx, sy] = t.centered ? toScreen(t.ax, t.ay) : toScreen(t.ax, t.ay);
  if (t.o.kind === 'tree' && !S.settings.reduced) {
    // gentle sway
    ctx.save(); ctx.translate(sx, sy); ctx.transform(1, 0, Math.sin(time * 1.2 + t.ax * 0.7 + t.ay) * 0.025, 1, 0, 0);
    t.sprite.draw(ctx, 0, 0, z); ctx.restore();
  } else t.sprite.draw(ctx, sx, sy, z);
  if (t.live === 'fountain') A.drawFountainWater(ctx, sx, sy, z, time);
  else if (t.live === 'clock') A.drawClockHands(ctx, sx, sy, z, new Date());
  else if (t.live === 'sunwheel') A.drawSunwheel(ctx, sx, sy, z, time);
  else if (t.live === 'windmill') A.drawWindmillBlades(ctx, sx, sy, z, time);
  t.sx = sx; t.sy = sy;
}

// When a building stands between the camera and the player, show the player through it.
function drawPlayerIfHidden(z) {
  const k = drawn.findIndex(t => t.char === player);
  if (k < 0) return;
  const [sx, sy] = toScreen(player.x, player.y);
  const probes = [[sx, sy - 30 * z], [sx, sy - 60 * z], [sx, sy - 8 * z]];
  const hidden = drawn.slice(k + 1).some(t => t.sprite && t.sx !== undefined && !t.centered && probes.some(([px, py]) => t.sprite.hit((px - t.sx) / z, (py - t.sy) / z)));
  if (!hidden) return;
  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.translate(sx, sy); ctx.scale(z * 1.15, z * 1.15);
  A.drawAnimal(ctx, player.species, player.outfit, { t: time, walk: player.walk, moving: player.moving, dir: player.dir, flip: player.flip, seed: player.seed, shadow: false });
  ctx.restore();
}

function drawLabels(z) {
  if (!S.settings.labels || z < 0.38) return;
  ctx.save();
  const fs = Math.round(Math.max(11, Math.min(15, 13 * z * 1.4)));
  ctx.font = `700 ${fs}px "Baloo 2", system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const t of drawn) {
    const o = t.o; if (!o || !t.top) continue;
    let text = null, icon = '', col = '#26395A';
    if (o.kind === 'venue') { text = o.name.replace(/^The /, ''); icon = o.icon; col = o.color; }
    else if (o.home && S.sheet === 'homes') { const p = propFor(o.id); text = p && p.status !== 'available' ? (p.status === 'owned' ? 'Owned' : 'Rented') : `✦ ${o.rent}/day`; icon = '🏠'; col = '#3FA86A'; }
    else if (o.kind === 'sunwheel') { text = 'Sunwheel'; icon = '🎡'; col = '#F0587A'; }
    if (!text) continue;
    const [x, y] = toScreen(o.i + o.w / 2, o.j + o.d / 2, t.top + 18);
    if (x < -100 || x > W + 100 || y < -40 || y > H + 40) continue;
    const tw = ctx.measureText(text).width, w = tw + fs * 2.2, h = fs * 1.9;
    ctx.fillStyle = 'rgba(255,255,255,.94)'; A.roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = col; A.roundRect(ctx, x - w / 2, y + h / 2 - 3, w, 3, 1.5); ctx.fill();
    ctx.font = `${fs}px sans-serif`; ctx.fillText(icon, x - w / 2 + fs * 0.5, y + 1);
    ctx.font = `700 ${fs}px "Baloo 2", system-ui, sans-serif`; ctx.fillStyle = '#26395A'; ctx.fillText(text, x - w / 2 + fs * 1.75, y + 1);
  }
  ctx.restore();
}

function drawBirds(dt) {
  if (S.settings.reduced) return;
  if (!birds || birds.x > W + 120) birds = { x: -140 - Math.random() * 600, y: 60 + Math.random() * H * 0.35, n: 3 + Math.floor(Math.random() * 3) };
  birds.x += dt * 38;
  ctx.strokeStyle = 'rgba(38,57,90,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let k = 0; k < birds.n; k++) {
    const x = birds.x - k * 22, y = birds.y + (k % 2) * 12 + k * 4, f = Math.sin(time * 9 + k) * 4;
    ctx.beginPath(); ctx.moveTo(x - 7, y - f); ctx.quadraticCurveTo(x - 3, y - 4, x, y); ctx.quadraticCurveTo(x + 3, y - 4, x + 7, y - f); ctx.stroke();
  }
}

// ---------- simulation ----------
const keys = new Set();
function update(dt) {
  // direct walking from the stick or keyboard (screen directions turned into grid directions)
  const running = S.run || keys.has('run');
  player.speed = BASE_SPEED * (running ? 1.7 : 1);
  let sx = 0, sy = 0, mag = 0;
  if (keys.has('up')) sy -= 1; if (keys.has('down')) sy += 1; if (keys.has('left')) sx -= 1; if (keys.has('right')) sx += 1;
  if (sx || sy) { const m = Math.hypot(sx, sy); sx /= m; sy /= m; mag = 1; }
  else if (joy.vx || joy.vy) { mag = Math.min(1, Math.hypot(joy.vx, joy.vy)); sx = joy.vx / mag; sy = joy.vy / mag; }
  let kx = 0, ky = 0;
  if (mag) { kx = sx / 64 + sy / 32; ky = sy / 32 - sx / 64; const m = Math.hypot(kx, ky); kx /= m; ky /= m; }
  if (mag) {
    player.path = []; player.onArrive = null; marker = null; cam.free = false;
    const sp = player.speed * dt * (0.35 + 0.65 * mag), nx = player.x + kx * sp, ny = player.y + ky * sp;
    if (world.walkable(Math.floor(nx), Math.floor(ny))) { player.x = nx; player.y = ny; }
    else if (world.walkable(Math.floor(nx), Math.floor(player.y))) player.x = nx;
    else if (world.walkable(Math.floor(player.x), Math.floor(ny))) player.y = ny;
    player.face(player.x + kx, player.y + ky); player.moving = true; player.walk += sp * 5.2;
    hideHint();
  } else player.update(dt);
  updateNearby();
  for (const n of npcs) { npcThink(n, dt); n.update(dt); }
  // camera
  const onboarding = !$('onboarding').classList.contains('hidden');
  let target;
  if (onboarding) { onboardT += dt; target = A.P(22 + Math.cos(onboardT * 0.08) * 7, 22 + Math.sin(onboardT * 0.08) * 7, 30); }
  else target = A.P(player.x, player.y, 34);
  if (cam.tz) {
    const nz = cam.zoom + (cam.tz - cam.zoom) * (S.settings.reduced ? 1 : 1 - Math.exp(-dt * 8));
    cam.zoom = Math.abs(nz - cam.tz) < 0.002 ? cam.tz : nz; if (cam.zoom === cam.tz) cam.tz = 0;
  }
  if (!cam.free) {
    const k = S.settings.reduced ? 1 : 1 - Math.exp(-dt * 5);
    // keep the player above an open sheet on phones
    const sheetLift = S.sheet && mobile() ? Math.min(H * 0.22, 180) / cam.zoom : 0;
    cam.x += (target[0] - cam.x) * k; cam.y += (target[1] + sheetLift - cam.y) * k;
  }
  // district chip
  const square = player.x >= 19 && player.x < 25 && player.y >= 19 && player.y < 25;
  const d = square ? 'square' : districtAt(player.x, player.y);
  if (d !== update.lastDistrict) {
    update.lastDistrict = d;
    $('district-name').textContent = square ? 'Town Square' : DISTRICTS[d].name;
    $('district-name').style.background = square ? '#C98A1E' : A.darken(DISTRICTS[d].color, 0.15);
  }
  drawRadar();
}

// ---------- input ----------
const pointers = new Map();
let gesture = null;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture?.(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) gesture = { kind: 'tap', x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; gesture = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.zoom }; }
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId), cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  if (!gesture) return;
  if (gesture.kind === 'pinch' && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    setZoom(gesture.z * Math.hypot(a.x - b.x, a.y - b.y) / gesture.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    return;
  }
  gesture.moved += Math.hypot(cur.x - prev.x, cur.y - prev.y);
  if (gesture.moved > 10) {
    gesture.kind = 'drag'; cam.free = true; cam.tz = 0; $('cam-button').classList.add('free');
    cam.x -= (cur.x - prev.x) / cam.zoom; cam.y -= (cur.y - prev.y) / cam.zoom;
  }
});
const endPointer = e => {
  const had = pointers.delete(e.pointerId);
  if (!had) return;
  if (gesture && gesture.kind === 'tap' && pointers.size === 0 && performance.now() - gesture.t < 700) tap(e.clientX, e.clientY);
  if (pointers.size === 0) gesture = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); if (!pointers.size) gesture = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(cam.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const KEYMAP = { Shift: 'run', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
window.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.key === 'Escape') { closeSheet(); return; }
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interactNearby(); return; }
  if (e.key === 'r' || e.key === 'R') { toggleRun(); return; }
  if (e.key === 'c' || e.key === 'C') { cameraButton(); return; }
  if (e.key === 'p' || e.key === 'P') { S.sheet === 'pause' ? closeSheet() : showSettings(); return; }
  if (e.key === '+' || e.key === '=') setZoom(cam.zoom * 1.15);
  if (e.key === '-') setZoom(cam.zoom / 1.15);
  const k = KEYMAP[e.key]; if (k) { keys.add(k); e.preventDefault(); }
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys.delete(k); });
window.addEventListener('blur', () => keys.clear());

function hitThing(sx, sy) {
  for (let k = drawn.length - 1; k >= 0; k--) {
    const t = drawn[k];
    if (t.char) {
      if (t.char === player) continue;
      const [cx, cy] = toScreen(t.char.x, t.char.y);
      if (Math.abs(sx - cx) < 24 * cam.zoom + 8 && sy < cy + 8 && sy > cy - 82 * cam.zoom - 8) return t;
      continue;
    }
    if (!t.interactive || !t.sprite || t.sx === undefined) continue;
    const lx = (sx - t.sx) / cam.zoom, ly = (sy - t.sy) / cam.zoom;
    if (t.sprite.hit(lx, ly)) return t;
  }
  return null;
}
function tap(sx, sy) {
  if (!$('onboarding').classList.contains('hidden')) return;
  hideHint();
  const hit = hitThing(sx, sy);
  if (hit && hit.char) { goMeet(hit.char); return; }
  if (hit) { visitThing(hit.o); return; }
  const [x, y] = toWorld(sx, sy);
  walkTo(x, y);
}
function walkTo(x, y, onArrive) {
  cam.free = false; $('cam-button').classList.remove('free');
  const p = findPath(world, player.x, player.y, x, y);
  if (!p) { toast('You can’t walk there.'); return false; }
  const end = p[p.length - 1];
  marker = { x: end[0], y: end[1], life: 0.6 };
  player.go(p.slice(1), onArrive);
  return true;
}
function near(x, y, r = 1.6) { return Math.hypot(player.x - x, player.y - y) <= r; }

function visitThing(o) {
  const dest = o.doorTile ? [o.doorTile[0] + 0.5, o.doorTile[1] + 0.5] : (() => { const s = nearestWalkable(world, o.i + o.w, o.j + o.d); return s ? [s[0] + 0.5, s[1] + 0.5] : [player.x, player.y]; })();
  const open = () => { player.face(o.i + o.w / 2, o.j + o.d / 2); openThing(o); };
  if (near(...dest, 1.2)) open(); else if (walkTo(...dest, open)) toastQuiet(`Walking to ${o.name || o.label || 'there'}…`);
}
function openThing(o) {
  if (o.kind === 'venue') showVenue(o);
  else if (o.home) showHome(o);
  else if (o.kind === 'board') showHomes();
  else if (o.kind === 'clock') showInfo('🕰️', 'Town Clock', `It's ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} in Willowvale. Everyone meets under the clock.`);
  else if (o.kind === 'sunwheel') showVenue({ id: 'sunwheel', name: 'The Sunwheel', type: 'Ride', icon: '🎡', color: '#F0587A', desc: 'The tallest thing on the island. On a clear day you can see all four districts.', activity: { title: 'Ride the Sunwheel', verb: 'Riding', story: 'From the top you spotted the windmill, the theatre and three boats.', reward: 'coins', amount: 0, coins: 3 }, i: o.i, j: o.j, w: o.w, d: o.d, landmark: true });
  else if (o.kind === 'windmill') showInfo('🌾', 'Fernhill Windmill', 'The oldest building on the island. Clover says it squeaks before it rains.');
  else if (o.kind === 'shop') showInfo(o.icon || '🏡', o.label, { Bakery: 'Honey buns, fresh every morning. Marlow does the baking.', Florist: 'Bunches from the Fernhill meadows.', Books: 'A tiny bookshop with a very sleepy cat.' }[o.label] || 'A little shop in Old Town.');
}
function goMeet(n) {
  n.busy = 6; n.path = [];
  const ni = Math.floor(n.x), nj = Math.floor(n.y);
  const side = [[ni + 1, nj - 1], [ni - 1, nj + 1], [ni + 1, nj], [ni, nj + 1], [ni - 1, nj], [ni, nj - 1]].find(([a, b]) => world.walkable(a, b));
  const tgt = side || nearestWalkable(world, ni, nj) || [ni, nj];
  const meet = () => { n.busy = 4; n.face(player.x, player.y); player.face(n.x, n.y); n.wave = 1.4; n.say('👋'); showNeighbour(n); };
  if (near(n.x, n.y, 2.2)) meet(); else walkTo(tgt[0] + 0.5, tgt[1] + 0.5, meet);
}
function findNearby() {
  let best = null, bd = 2.4;
  for (const n of npcs) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { bd = d; best = { n }; } }
  for (const o of world.objects) {
    if (!o.doorTile || (o.kind === 'shop' && o.label === 'Cottage')) continue;
    const d = Math.hypot(o.doorTile[0] + 0.5 - player.x, o.doorTile[1] + 0.5 - player.y);
    if (d < bd) { bd = d; best = { o }; }
  }
  return best;
}
function interactNearby() {
  const best = findNearby();
  if (!best) { toast('Nothing close by. Walk up to a door or a neighbour.'); return; }
  if (best.n) goMeet(best.n); else openThing(best.o);
}
// The big action button shows what is in reach: a neighbour to talk to or a door to open.
const TALK_ICON = '<svg viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 014 13.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="10" r="1.2" fill="currentColor"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor"/></svg>';
const DOOR_ICON = '<svg viewBox="0 0 24 24"><path d="M6 21V4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5V21M3.5 21h17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14.5" cy="12.5" r="1.3" fill="currentColor"/></svg>';
let actDefault = null, lastNear = '';
function updateNearby() {
  const btn = $('act-button');
  if (actDefault === null) actDefault = $('act-icon').innerHTML;
  const best = player.moving && player.path.length > 1 ? null : findNearby();
  const key = best ? (best.n ? 'n:' + best.n.name : 'o:' + (best.o.id || best.o.name || best.o.label)) : '';
  if (key === lastNear) return;
  lastNear = key;
  btn.disabled = !best; btn.classList.toggle('ready', !!best);
  if (!best) { $('act-icon').innerHTML = actDefault; $('act-label').textContent = 'Nearby'; btn.setAttribute('aria-label', 'Interact (nothing in reach)'); return; }
  if (best.n) { $('act-icon').innerHTML = TALK_ICON; $('act-label').textContent = 'Talk to ' + best.n.name; btn.setAttribute('aria-label', 'Talk to ' + best.n.name); return; }
  const o = best.o, name = o.name || o.label || 'Door';
  $('act-icon').innerHTML = o.icon ? `<span>${esc(o.icon)}</span>` : o.kind === 'board' ? '<span>🏠</span>' : DOOR_ICON;
  $('act-label').textContent = (o.home ? 'View ' : o.kind === 'board' ? '' : 'Enter ') + name.replace(/^The /, '');
  btn.setAttribute('aria-label', $('act-label').textContent);
}

// ---------- UI helpers ----------
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }
function toastQuiet(msg) { if (!S.sheet) toast(msg); }
function setCoins(n, pop) {
  const diff = n - S.coins; S.coins = n; $('coins').textContent = n;
  if (pop && diff) { pops.push({ x: player.x, y: player.y, text: (diff > 0 ? '+' : '') + diff + ' ✦', life: 1.6 }); const c = $('coin-pill'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  saveProgress();
}
function addItem(k, n) { S.progress.inventory[k] = (S.progress.inventory[k] || 0) + n; saveProgress(); }
function hideHint() { $('hint').classList.add('hidden'); }

function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function openSheet(name, kicker, title, body, opts = {}) {
  S.sheet = name; hideHint();
  $('sheet-kicker').textContent = kicker || '';
  $('sheet-title').textContent = title;
  const b = $('sheet-body'); b.innerHTML = ''; b.scrollTop = 0;
  if (typeof body === 'string') b.innerHTML = body; else if (body) b.append(body);
  $('sheet').classList.remove('hidden'); $('sheet').classList.toggle('compact', !!opts.compact);
  $('sheet').setAttribute('aria-label', title);
  document.querySelectorAll('.dock-item').forEach(x => x.classList.toggle('active', x.dataset.mode === (opts.tab || name)));
  return b;
}
function closeSheet() {
  S.sheet = null; $('sheet').classList.add('hidden');
  document.querySelectorAll('.dock-item').forEach(x => x.classList.toggle('active', x.dataset.mode === 'explore'));
}
$('sheet-close').onclick = closeSheet;

function thumb(o, size = 76) {
  const c = document.createElement('canvas'); c.className = 'thumb';
  const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = size * dpr; c.height = size * dpr; c.style.width = c.style.height = size + 'px';
  const t = things.find(x => x.o === o) || things.find(x => x.o.id === o.id);
  const g = c.getContext('2d');
  if (t && t.sprite) {
    const [bx, by, bw, bh] = t.sprite.opaqueBox(), k = Math.min(size / bw, size / bh) * 0.86;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(t.sprite.canvas, bx, by, bw, bh, (size - bw * k) / 2, (size - bh * k) / 2, bw * k, bh * k);
  }
  return c;
}
function portrait(species, outfit, size = 56, opts = {}) {
  const c = document.createElement('canvas'); c.className = 'portrait'; c.style.width = c.style.height = size + 'px';
  A.drawPortrait(c, species, outfit, { size, ...opts });
  return c;
}

// ---------- sheets ----------
function propFor(id) { return S.properties?.find(p => p.id === id) || null; }
async function loadProperties() {
  try { const d = await request('/api/properties'); S.properties = d.properties || []; }
  catch { S.properties = S.properties || HOMES.map(h => ({ ...h, status: 'available' })); }
  return S.properties;
}
function homeCard(o, big = false) {
  const p = propFor(o.id) || { ...o, status: 'available' };
  const mine = S.user && (p.owner === S.user.username || p.tenant === S.user.username);
  const status = mine ? (p.owner === S.user.username ? 'Yours' : 'Your rental') : p.status === 'owned' ? 'Owned' : p.status === 'rented' ? 'Rented' : 'Available';
  const el = h(`<article class="card home-card ${big ? 'big' : ''}">
    <div class="card-art"></div>
    <div class="card-main">
      <div class="card-top"><h3>${esc(o.name)}</h3><span class="chip ${status === 'Available' ? 'chip-ok' : mine ? 'chip-mine' : 'chip-off'}">${status}</span></div>
      <p class="card-sub">${esc(o.kind[0].toUpperCase() + o.kind.slice(1))} · ${esc(DISTRICTS[districtAt(o.i, o.j)].name)}</p>
      ${big ? `<p class="card-text">${esc(p.description || o.description)}</p>` : ''}
      <div class="price-row"><span><b>✦ ${o.rent}</b> a day to rent</span><span><b>✦ ${o.price}</b> to buy</span></div>
      <div class="card-actions">
        <button class="btn btn-primary" data-act="rent" ${status !== 'Available' ? 'disabled' : ''}>Rent</button>
        <button class="btn btn-sun" data-act="buy" ${status !== 'Available' ? 'disabled' : ''}>Buy</button>
        ${big ? '' : '<button class="btn btn-ghost" data-act="go">Visit</button>'}
      </div>
    </div></article>`);
  el.querySelector('.card-art').append(thumb(o, big ? 120 : 84));
  el.querySelector('[data-act=rent]').onclick = () => propertyAction(o, 'rent');
  el.querySelector('[data-act=buy]').onclick = () => propertyAction(o, 'buy');
  const go = el.querySelector('[data-act=go]'); if (go) go.onclick = () => { closeSheet(); visitThing(o); };
  return el;
}
async function showHomes(filter = 'all') {
  const body = openSheet('homes', 'Willowvale homes', 'Find your place', '<div class="loading-text">Checking which homes are free…</div>', { tab: 'homes' });
  await loadProperties();
  if (S.sheet !== 'homes') return;
  body.innerHTML = '';
  const tabs = h(`<div class="filter-row" role="tablist">${[['all', 'All'], ['house', 'Cottages'], ['apartment', 'Apartments'], ['villa', 'Villas']].map(([k, l]) => `<button class="filter ${k === filter ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>`);
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => showHomes(b.dataset.f));
  body.append(tabs);
  if (!S.token) body.append(h(`<div class="notice"><b>Want a home of your own?</b><span>Renting and buying need a free account so your home is saved.</span><button class="btn btn-small btn-primary" id="homes-signin">Make an account</button></div>`));
  const homes = world.objects.filter(o => o.home && (filter === 'all' || o.kind === filter));
  for (const o of homes) body.append(homeCard(o));
  const s = body.querySelector('#homes-signin'); if (s) s.onclick = () => showProfile('Make an account to rent or buy homes.');
}
function showHome(o) { loadProperties().then(() => { if (S.sheet === 'home:' + o.id) { const b = $('sheet-body'); b.innerHTML = ''; b.append(homeCard(o, true)); } }); openSheet('home:' + o.id, 'Home', o.name, homeCard(o, true), { tab: 'homes' }); }
async function propertyAction(o, action) {
  if (!S.token) { showProfile(`Make an account to ${action} ${o.name}.`); return; }
  try {
    const d = await request('/api/properties/' + encodeURIComponent(o.id) + '/' + action, 'POST', {});
    if (d.world) setCoins(d.world.coins, true);
    toast(d.message || (action === 'buy' ? 'Home bought!' : 'Home rented!'));
    player.say('🏡');
    await loadProperties();
    if (S.sheet === 'homes') showHomes(); else showHome(o);
  } catch (e) { toast(e.message); }
}

function visitedToday(id) { return !!S.progress.visits[id + '|' + today()]; }
function showVenue(v) {
  const a = v.activity, done = visitedToday(v.id);
  const el = h(`<div class="venue">
    <div class="venue-hero" style="--accent:${v.color}"><div class="venue-art"></div><div><span class="chip" style="background:${v.color}22;color:${A.darken(v.color, 0.25)}">${esc(v.icon)} ${esc(v.type)}</span><p class="card-text">${esc(v.desc)}</p></div></div>
    <div class="activity">
      <div class="activity-head"><b>${esc(a.title)}</b><span class="reward">+${a.coins} ✦${a.amount ? ` · +${a.amount} ${ITEMS[a.reward].icon}` : ''}</span></div>
      <p class="activity-text">${done ? 'You’ve done this today. Come back tomorrow, or try somewhere new.' : 'One go a day. Rewards land in your bag.'}</p>
      <button class="btn btn-primary btn-wide play" ${done ? 'disabled' : ''}><span class="fill"></span><span class="label">${done ? 'Done for today ✓' : esc(a.title)}</span></button>
    </div></div>`);
  const art = el.querySelector('.venue-art');
  if (v.landmark) art.append(h(`<div class="emoji-art">${v.icon}</div>`)); else art.append(thumb(v, 112));
  const btn = el.querySelector('.play');
  btn.onclick = () => {
    if (visitedToday(v.id)) return;
    btn.disabled = true; btn.classList.add('running'); btn.querySelector('.label').textContent = a.verb + '…';
    player.say({ berries: '☕', coins: '✨', fish: '🎣', crafts: '🎨', flowers: '📖' }[a.reward] || '✨', 1.6);
    setTimeout(() => {
      S.progress.visits[v.id + '|' + today()] = true;
      if (a.amount) addItem(a.reward, a.amount);
      S.progress.done.unshift({ place: v.name, what: a.title, at: Date.now() }); S.progress.done = S.progress.done.slice(0, 30);
      setCoins(S.coins + a.coins, true);
      btn.classList.remove('running'); btn.querySelector('.label').textContent = 'Done for today ✓';
      el.querySelector('.activity-text').textContent = a.story;
      el.querySelector('.activity').classList.add('complete');
      player.say('⭐', 2); checkGoals();
    }, S.settings.reduced ? 300 : 1400);
  };
  openSheet('venue:' + v.id, v.type, v.name, el, { tab: 'places' });
}
function showPlaces() {
  const body = openSheet('places', 'Around the island', 'Places to visit', null, { tab: 'places' });
  const groups = {};
  for (const v of VENUES) (groups[districtAt(v.i, v.j)] ||= []).push(v);
  for (const [d, list] of Object.entries(groups)) {
    body.append(h(`<h4 class="group-title"><i style="background:${DISTRICTS[d].color}"></i>${esc(DISTRICTS[d].name)}</h4>`));
    for (const v of list) {
      const done = visitedToday(v.id);
      const el = h(`<article class="card place-card"><div class="card-art"></div><div class="card-main"><div class="card-top"><h3>${esc(v.name)}</h3>${done ? '<span class="chip chip-ok">Done ✓</span>' : `<span class="chip chip-sun">+${v.activity.coins} ✦</span>`}</div><p class="card-sub">${esc(v.activity.title)}</p><div class="card-actions"><button class="btn btn-small btn-primary">Go there</button></div></div></article>`);
      el.querySelector('.card-art').append(thumb(v, 72));
      el.querySelector('button').onclick = () => { closeSheet(); visitThing(v); };
      body.append(el);
    }
  }
}
function friendship(name) { return S.progress.friends[name] || { hearts: 0, day: '' }; }
function hearts(n) { return '<span class="hearts" aria-label="' + n + ' of 5 hearts">' + [0, 1, 2, 3, 4].map(k => `<i class="${k < n ? 'on' : ''}">♥</i>`).join('') + '</span>'; }
function showFriends() {
  const body = openSheet('friends', 'Your neighbours', 'Friends', null, { tab: 'friends' });
  body.append(h('<p class="lead">Say hello every day and bring neighbours what they love to fill their hearts.</p>'));
  for (const n of npcs) {
    const f = friendship(n.name), wants = ITEMS[n.data.wants];
    const el = h(`<article class="card friend-card"><div class="card-art round"></div><div class="card-main"><div class="card-top"><h3>${esc(n.name)}</h3>${hearts(f.hearts)}</div><p class="card-sub">${esc(A.SPECIES[n.species].label)} · ${esc(DISTRICTS[districtAt(n.x, n.y)].name)} · loves ${wants.icon}</p><div class="card-actions"><button class="btn btn-small btn-ghost">Find ${esc(n.name)}</button></div></div></article>`);
    el.querySelector('.card-art').append(portrait(n.species, n.outfit, 60));
    el.querySelector('button').onclick = () => { closeSheet(); goMeet(n); };
    body.append(el);
  }
}
function showNeighbour(n) {
  const f = friendship(n.name), wants = n.data.wants, have = S.progress.inventory[wants] || 0, met = f.day === today();
  const el = h(`<div class="neighbour">
    <div class="neighbour-hero"><div class="portrait-wrap"></div><div class="bubble"><p>“${esc(n.data.line)}”</p></div></div>
    <div class="friend-row"><span>Friendship</span>${hearts(f.hearts)}</div>
    <div class="actions-col">
      <button class="btn btn-primary btn-wide" data-a="hello" ${met ? 'disabled' : ''}>${met ? 'You said hello today ✓' : 'Say hello'}</button>
      <button class="btn btn-sun btn-wide" data-a="give" ${have < 1 || f.gift === today() ? 'disabled' : ''}>${f.gift === today() ? 'Gift given today ✓' : `Give 1 ${ITEMS[wants].icon} ${itemName(wants, 1)} · +10 ✦`}</button>
      ${have < 1 && f.gift !== today() ? `<p class="hint-text">${esc(n.name)} would love a ${itemName(wants, 1)}. ${wants === 'fish' ? 'Try fishing at the marina.' : wants === 'berries' ? 'The café gives berries.' : wants === 'flowers' ? 'The library and clinic give flowers.' : 'Make one at the community centre.'}</p>` : ''}
    </div></div>`);
  el.querySelector('.portrait-wrap').append(portrait(n.species, n.outfit, 104, { full: true, wave: true, t: time }));
  const bump = (k, fn) => { const cur = friendship(n.name); fn(cur); S.progress.friends[n.name] = cur; saveProgress(); };
  el.querySelector('[data-a=hello]').onclick = () => {
    bump(n.name, c => { c.day = today(); c.hearts = Math.min(5, (c.hearts || 0) + (c.hearts < 2 ? 1 : 0)); });
    n.say('💛'); player.wave = 1.2; setCoins(S.coins + 1, true); S.progress.daily[today() + ':hello'] = (S.progress.daily[today() + ':hello'] || 0) + 1; saveProgress(); checkGoals(); showNeighbour(n);
  };
  el.querySelector('[data-a=give]').onclick = () => {
    if ((S.progress.inventory[wants] || 0) < 1) return;
    addItem(wants, -1);
    bump(n.name, c => { c.gift = today(); c.hearts = Math.min(5, (c.hearts || 0) + 1); });
    n.say('😊', 3); setCoins(S.coins + 10, true); S.progress.daily[today() + ':gift'] = 1; saveProgress(); checkGoals(); showNeighbour(n);
  };
  openSheet('neighbour:' + n.name, A.SPECIES[n.species].label + ' · neighbour', n.name, el, { tab: 'friends' });
}
const GOALS = [
  { id: 'places', text: 'Try activities at 3 places', need: 3, count: () => Object.keys(S.progress.visits).filter(k => k.endsWith('|' + today())).length },
  { id: 'hello', text: 'Say hello to 3 neighbours', need: 3, count: () => S.progress.daily[today() + ':hello'] || 0 },
  { id: 'gift', text: 'Give a neighbour a gift', need: 1, count: () => S.progress.daily[today() + ':gift'] || 0 },
];
function checkGoals() {
  for (const g of GOALS) { const k = today() + ':goal:' + g.id; if (!S.progress.daily[k] && g.count() >= g.need) { S.progress.daily[k] = 1; setCoins(S.coins + 15, true); toast(`Daily goal done: ${g.text}. +15 ✦`); } }
  saveProgress();
}
function showJournal() {
  const inv = S.progress.inventory;
  const el = h(`<div class="journal">
    <div class="bag">${Object.entries(ITEMS).map(([k, it]) => `<div class="bag-item"><span>${it.icon}</span><b>${inv[k] || 0}</b><small>${esc(it.many)}</small></div>`).join('')}</div>
    <h4 class="group-title">Today’s goals <small>+15 ✦ each</small></h4>
    ${GOALS.map(g => { const c = Math.min(g.need, g.count()); return `<div class="goal ${c >= g.need ? 'met' : ''}"><div class="goal-top"><span>${esc(g.text)}</span><b>${c}/${g.need}</b></div><div class="bar"><i style="width:${c / g.need * 100}%"></i></div></div>`; }).join('')}
    <h4 class="group-title">Recently</h4>
    ${S.progress.done.length ? '<ul class="log">' + S.progress.done.slice(0, 6).map(d => `<li><b>${esc(d.what)}</b><span>${esc(d.place)}</span></li>`).join('') + '</ul>' : '<p class="lead">Nothing yet. Visit a place and try its activity to start your journal.</p>'}
  </div>`);
  openSheet('journal', 'Your journal', 'Today in Willowvale', el, { tab: 'journal' });
}
function showInfo(icon, title, text) {
  openSheet('info', 'Landmark', title, h(`<div class="info"><div class="emoji-art">${icon}</div><p class="card-text">${esc(text)}</p></div>`), { compact: true, tab: 'explore' });
}
function showDistricts() {
  const body = openSheet('districts', 'Travel', 'Districts', null, { tab: 'explore' });
  for (const [k, d] of Object.entries(DISTRICTS)) {
    const here = districtAt(player.x, player.y) === k;
    const el = h(`<button class="district-row ${here ? 'here' : ''}"><i style="background:${d.color}"></i><span><b>${esc(d.name)}</b><small>${esc(d.blurb)}</small></span><em>${here ? 'You’re here' : 'Take the tram'}</em></button>`);
    el.onclick = () => { if (here) { closeSheet(); return; } travel(k); };
    body.append(el);
  }
}
function travel(k) {
  closeSheet();
  const fade = $('fade'); fade.classList.add('on');
  setTimeout(() => {
    const [i, j] = DISTRICTS[k].spawn; player.x = i + 0.5; player.y = j + 0.5; player.path = []; player.onArrive = null; marker = null; cam.free = false;
    const p = A.P(player.x, player.y, 34); cam.x = p[0]; cam.y = p[1];
    fade.classList.remove('on'); toast(`Welcome to ${DISTRICTS[k].name}`); player.say('🚋', 1.6);
  }, S.settings.reduced ? 50 : 420);
}

// ---------- profile, account & settings ----------
function avatarEditor(state, onChange) {
  const el = h(`<div class="editor"><div class="species-row" role="radiogroup" aria-label="Animal"></div><div class="outfit-row" role="radiogroup" aria-label="Outfit"></div></div>`);
  const sr = el.querySelector('.species-row'), or = el.querySelector('.outfit-row');
  for (const [k, s] of Object.entries(A.SPECIES)) {
    const b = h(`<button class="species ${state.species === k ? 'on' : ''}" role="radio" aria-checked="${state.species === k}" aria-label="${s.label}"><span>${s.label}</span></button>`);
    b.prepend(portrait(k, state.outfit, 48));
    b.onclick = () => { state.species = k; onChange(); };
    sr.append(b);
  }
  A.OUTFITS.forEach((o, k) => {
    const b = h(`<button class="swatch ${state.outfit === k ? 'on' : ''}" role="radio" aria-checked="${state.outfit === k}" aria-label="Outfit ${k + 1}" style="--a:${o.shirt};--b:${o.extraColor}"></button>`);
    b.onclick = () => { state.outfit = k; onChange(); };
    or.append(b);
  });
  return el;
}
function applyProfile() {
  player.species = S.profile.species; player.outfit = S.profile.outfit;
  $('player-name').textContent = S.user ? S.user.username : S.profile.name;
  A.drawPortrait($('hud-avatar'), S.profile.species, S.profile.outfit, { size: 40 });
  store.set('willowvale_player_v2', S.profile);
}
function showProfile(message) {
  const state = { ...S.profile };
  const el = h(`<div class="profile">
    ${message ? `<div class="notice"><b>${esc(message)}</b></div>` : ''}
    <div class="profile-hero"><div class="portrait-wrap"></div><label class="field"><span>Your name in town</span><input id="profile-name" maxlength="16" value="${esc(state.name)}" autocomplete="nickname"></label></div>
    <div class="editor-slot"></div>
    <section class="account"></section></div>`);
  const redraw = () => {
    el.querySelector('.portrait-wrap').innerHTML = ''; el.querySelector('.portrait-wrap').append(portrait(state.species, state.outfit, 96, { full: true, t: time }));
    const slot = el.querySelector('.editor-slot'); slot.innerHTML = ''; slot.append(avatarEditor(state, () => { redraw(); save(); }));
  };
  const save = () => { state.name = (el.querySelector('#profile-name').value.trim() || state.name).slice(0, 16); S.profile = { ...state }; applyProfile(); };
  el.querySelector('#profile-name').addEventListener('change', save);
  redraw();
  const acc = el.querySelector('.account');
  if (S.token) {
    acc.innerHTML = `<h4 class="group-title">Account</h4><p class="lead">Signed in as <b>${esc(S.user?.username || 'player')}</b>. ${S.online === 'live' ? 'Connected to the shared town.' : 'Shared town is offline right now.'}</p><button class="btn btn-ghost btn-wide" id="logout-button">Log out</button>`;
    acc.querySelector('#logout-button').onclick = () => { logout(); showProfile(); };
  } else {
    acc.innerHTML = `<h4 class="group-title">Save your home with an account</h4>
      <p class="lead">Accounts let you rent and buy homes. Use a nickname, not your real name.</p>
      <label class="field"><span>Nickname</span><input id="auth-username" autocomplete="username" maxlength="20" placeholder="3–20 letters, numbers or _"></label>
      <label class="field"><span>Password</span><input id="auth-password" type="password" autocomplete="current-password" placeholder="8 or more characters"></label>
      <p class="form-error" id="auth-error" role="alert"></p>
      <div class="row2"><button class="btn btn-primary" id="signup-button">Create account</button><button class="btn btn-ghost" id="login-button">Log in</button></div>`;
    acc.querySelector('#signup-button').onclick = () => auth('register');
    acc.querySelector('#login-button').onclick = () => auth('login');
  }
  openSheet('profile', 'You', 'Your character', el, { tab: 'explore' });
}
async function auth(type) {
  const u = $('auth-username').value.trim(), p = $('auth-password').value, err = $('auth-error');
  err.textContent = '';
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) { err.textContent = 'Nicknames are 3–20 letters, numbers or underscores.'; return; }
  if (p.length < 8) { err.textContent = 'Passwords need at least 8 characters.'; return; }
  try {
    const d = await request('/api/auth/' + type, 'POST', { username: u, password: p });
    S.token = d.token; try { localStorage.setItem('willowvale_token', S.token); } catch { /* ignore */ }
    S.user = d.user; setCoins(d.world.coins); applyProfile(); connect();
    toast(type === 'register' ? `Welcome to Willowvale, ${u}!` : `Welcome back, ${u}!`);
    closeSheet();
  } catch (e) {
    err.textContent = /Persistent accounts are not configured/.test(e.message) ? 'Accounts aren’t switched on for this town yet. You can keep playing as a guest; your progress stays on this device.' : e.message;
  }
}
function logout() {
  S.token = ''; S.user = null; try { localStorage.removeItem('willowvale_token'); } catch { /* ignore */ }
  if (socket) socket.disconnect(); S.online = 'guest'; $('online-dot').className = 'online-dot';
  setCoins(S.progress.coins); applyProfile(); toast('Logged out. You’re playing as a guest.');
}
function showSettings() {
  const el = h(`<div class="settings">
    <label class="switch"><input type="checkbox" id="set-labels" ${S.settings.labels ? 'checked' : ''}><span class="track"></span><span>Show place names</span></label>
    <label class="switch"><input type="checkbox" id="set-reduced" ${S.settings.reduced ? 'checked' : ''}><span class="track"></span><span>Reduce motion</span></label>
    <h4 class="group-title">How to play</h4>
    <ul class="tips"><li><b>Walk</b> Use the stick, tap the ground, or WASD / arrow keys.</li><li><b>Visit</b> Tap a building to walk to its door.</li><li><b>Meet</b> Tap a neighbour to say hello and help them out.</li><li><b>Look around</b> Drag to pan, pinch or scroll to zoom.</li></ul>
    <p class="fine">Be kind to other players and never share personal details. Coins are in-game only.</p></div>`);
  el.querySelector('#set-labels').onchange = e => { S.settings.labels = e.target.checked; saveSettings(); };
  el.querySelector('#set-reduced').onchange = e => { S.settings.reduced = e.target.checked; saveSettings(); };
  el.prepend(h(`<div class="pause-actions"><button class="btn btn-primary btn-wide btn-big" id="resume-button">Resume</button><button class="btn btn-ghost btn-wide" id="pause-profile">Character &amp; account</button></div>`));
  el.querySelector('#resume-button').onclick = closeSheet;
  el.querySelector('#pause-profile').onclick = () => showProfile();
  el.querySelector('.tips').insertAdjacentHTML('beforeend', '<li><b>Controls</b> Stick to move, hand button to talk or go inside, shoe to run, camera to centre and zoom.</li><li><b>Keyboard</b> WASD to move, Shift or R to run, E or Space to interact, C for camera, P to pause.</li>');
  openSheet('pause', 'Paused', 'Willowvale', el, { tab: 'explore' });
}

// ---------- network ----------
async function request(path, method = 'GET', body) {
  const res = await fetch(API_BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({ error: 'The town server didn’t answer. Check your connection and try again.' }));
  if (!res.ok) throw Error(data.error || 'Request failed');
  return data;
}
let socket = null;
function loadIo() {
  if (typeof window.io === 'function') return Promise.resolve(true);
  return new Promise(r => { const s = document.createElement('script'); s.src = API_BASE + '/socket.io/socket.io.js'; s.onload = () => r(true); s.onerror = () => r(false); document.head.append(s); });
}
async function connect() {
  if (!S.token || !(await loadIo())) return;
  if (socket) socket.disconnect();
  socket = window.io(API_BASE || undefined, { auth: { token: S.token } });
  socket.on('connect', () => { S.online = 'live'; $('online-dot').className = 'online-dot live'; socket.emit('town:join', { townId: 'willowvale' }); });
  socket.on('connect_error', () => { S.online = 'offline'; $('online-dot').className = 'online-dot'; });
  socket.on('town:presence', d => { $('online-dot').title = d.count + ' player' + (d.count === 1 ? '' : 's') + ' in town'; });
  socket.on('town:state', d => { if (d.world) setCoins(d.world.coins); });
  socket.on('town:error', d => toast(d.message));
}
async function restoreSession() {
  if (!S.token) return;
  try { const d = await request('/api/me'); S.user = d.user; setCoins(d.world.coins); applyProfile(); connect(); }
  catch { S.token = ''; try { localStorage.removeItem('willowvale_token'); } catch { /* ignore */ } }
}

// ---------- chrome wiring ----------
document.querySelectorAll('.dock-item').forEach(b => b.onclick = () => {
  const m = b.dataset.mode;
  if (S.sheet && document.querySelector('.dock-item.active') === b && m !== 'explore') { closeSheet(); return; }
  ({ explore: closeSheet, homes: () => showHomes(), places: showPlaces, friends: showFriends, journal: showJournal })[m]();
});
$('profile-button').onclick = () => showProfile();
$('radar-button').onclick = showDistricts;
$('pause-button').onclick = () => (S.sheet === 'pause' ? closeSheet() : showSettings());
$('act-button').onclick = interactNearby;
$('run-button').onclick = toggleRun;
$('cam-button').onclick = cameraButton;
function toggleRun() { S.run = !S.run; $('run-button').setAttribute('aria-pressed', String(S.run)); toastQuiet(S.run ? 'Running' : 'Walking'); }
// Camera: first press brings the view back to you; after that it steps through three zoom levels.
function cameraButton() {
  if (cam.free) { cam.free = false; $('cam-button').classList.remove('free'); return; }
  const levels = mobile() ? [0.4, 0.56, 0.8] : [0.45, 0.72, 1.0];
  const cur = cam.tz || cam.zoom, k = levels.findIndex(l => l > cur + 0.02);
  cam.tz = levels[k === -1 ? 0 : k];
}

// ---------- on-screen stick ----------
const joy = { id: null, cx: 0, cy: 0, vx: 0, vy: 0 };
{
  const el = $('joystick'), knob = $('joy-knob'), R = 46;
  const move = e => {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
    const m = Math.hypot(dx, dy);
    if (m > R) { dx *= R / m; dy *= R / m; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = Math.min(1, m / R) < 0.15;
    joy.vx = dead ? 0 : dx / R; joy.vy = dead ? 0 : dy / R;
  };
  const end = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.vx = joy.vy = 0; knob.style.transform = ''; el.classList.remove('active'); };
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
    const r = el.getBoundingClientRect(); joy.id = e.pointerId; joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2;
    el.classList.add('active'); move(e);
  });
  el.addEventListener('pointermove', e => { if (e.pointerId === joy.id) move(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, end));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', !!coarse);
window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') document.body.classList.add('touch'); }, { capture: true });

// ---------- radar ----------
// A small map of the island drawn once, then panned so you are always in the middle.
const RS = 12 / A.TW; // radar pixels per world pixel (drawn at 2x, shown at about half)
const radarMap = (() => {
  const c = document.createElement('canvas'), w = N * A.TW * RS, h = N * A.TH * RS;
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  const g = c.getContext('2d'), ox = w / 2;
  const col = { [T.SAND]: '#F3DFAE', [T.GRASS]: '#8FD06F', [T.PATH]: '#FFF3D6', [T.PLAZA]: '#FFFFFF', [T.PARK]: '#A3DB83', [T.POND]: '#7FD0EA', [T.DOCK]: '#D9A56B', [T.MEADOW]: '#9AD77D' };
  const dia = (i, j, w2 = 1, d2 = 1, fill) => {
    const p = (x, y) => { const [a, b] = A.P(x, y); return [a * RS + ox, b * RS]; };
    g.beginPath(); g.moveTo(...p(i, j)); g.lineTo(...p(i + w2, j)); g.lineTo(...p(i + w2, j + d2)); g.lineTo(...p(i, j + d2)); g.closePath(); g.fillStyle = fill; g.fill();
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const t = world.get(i, j); if (t !== T.SEA) dia(i, j, 1.04, 1.04, col[t]); }
  for (const o of world.objects) dia(o.i, o.j, o.w, o.d, o.kind === 'venue' ? A.lighten(o.color, 0.1) : o.home ? '#B9C6D6' : '#C9D3DE');
  return { c, ox };
})();
function drawRadar() {
  const cv = $('radar'), css = cv.clientWidth || 96, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(css * dpr)) { cv.width = cv.height = Math.round(css * dpr); }
  const g = cv.getContext('2d'), size = css, k = 0.5 * (size / 96) * 1.15;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#5BC0EB'; g.fillRect(0, 0, size, size);
  const [px, py] = A.P(player.x, player.y);
  const toR = (x, y) => { const [a, b] = A.P(x, y); return [size / 2 + (a - px) * RS * k, size / 2 + (b - py) * RS * k]; };
  g.drawImage(radarMap.c, size / 2 - (px * RS + radarMap.ox) * k, size / 2 - py * RS * k, radarMap.c.width * k, radarMap.c.height * k);
  for (const v of VENUES) { const [x, y] = toR(v.i + v.w / 2, v.j + v.d / 2); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); g.fillStyle = v.color; g.beginPath(); g.arc(x, y, 2.9, 0, 7); g.fill(); }
  g.fillStyle = '#26395A';
  for (const n of npcs) { const [x, y] = toR(n.x, n.y); g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
  if (marker) { const [x, y] = toR(marker.x, marker.y); g.strokeStyle = '#FFC83D'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.stroke(); }
  // you: an arrow pointing the way you face
  const ang = { front: player.flip ? Math.PI * 0.25 : Math.PI * 0.75, back: player.flip ? -Math.PI * 0.25 : -Math.PI * 0.75 }[player.dir];
  g.save(); g.translate(size / 2, size / 2); g.rotate(ang + Math.PI / 2);
  g.fillStyle = '#F0587A'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5.5, 5.5); g.lineTo(0, 2.5); g.lineTo(-5.5, 5.5); g.closePath(); g.stroke(); g.fill();
  g.restore();
}

// ---------- onboarding ----------
function startOnboarding() {
  const names = ['Pippin', 'Maple', 'Juno', 'Rowan', 'Poppy', 'Basil', 'Tansy', 'Moss'];
  const state = { species: 'fox', outfit: 0, name: names[Math.floor(Math.random() * names.length)] };
  $('name-input').value = state.name;
  const draw = () => {
    A.drawPortrait($('onboard-avatar'), state.species, state.outfit, { size: 132, full: true, t: time, wave: true });
    const slot = $('editor-slot'); slot.innerHTML = ''; slot.append(avatarEditor(state, draw));
  };
  draw();
  const tick = () => { if ($('onboarding').classList.contains('hidden')) return; A.drawPortrait($('onboard-avatar'), state.species, state.outfit, { size: 132, full: true, t: time, wave: (time % 4) < 1.2 }); requestAnimationFrame(tick); };
  tick();
  const begin = then => {
    state.name = ($('name-input').value.trim() || state.name).slice(0, 16);
    S.profile = { ...state }; applyProfile();
    $('onboarding').classList.add('hidden'); document.body.classList.remove('onboarding-open');
    const p = A.P(player.x, player.y, 34); cam.x = p[0]; cam.y = p[1];
    player.wave = 1.6; player.say('👋');
    $('hint').classList.remove('hidden'); setTimeout(hideHint, 9000);
    if (then) then();
  };
  $('start-button').onclick = () => begin();
  $('signin-link').onclick = () => begin(() => showProfile());
}

applyProfileSafe();
function applyProfileSafe() {
  if (S.profile) { applyProfile(); $('onboarding').classList.add('hidden'); $('hint').classList.remove('hidden'); setTimeout(hideHint, 7000); }
  else { S.profile = { species: 'fox', outfit: 0, name: 'Guest' }; document.body.classList.add('onboarding-open'); startOnboarding(); }
}
setCoins(S.coins);
restoreSession();
requestAnimationFrame(t => { t0 = t; requestAnimationFrame(frame); });
$('loading').classList.add('done');
setTimeout(() => $('loading').remove(), 700);
