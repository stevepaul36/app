// Willowvale: the illustrated animal city. Canvas 2D engine + phone-first UI.
import { N, T, buildWorld, findPath, nearestWalkable, stepOK, DISTRICTS, districtAt, HOMES, VENUES, NEIGHBOURS } from './js/world.js';
import * as A from './js/art.js';
import * as F from './js/furniture.js';
import { buildHome, O as HOME_O } from './js/home.js';
import { buildInterior, KIT_OF, STAFF_TITLE, GAMES } from './js/interiors.js';
import * as SND from './js/audio.js';
import { STARTER, ACHIEVEMENTS, SIGNATURE, ALL_EMOJIS, replyTo, unlockedSet } from './js/emoji.js';
import { CITY_LIST, ROUTES, CITY_PACKS, cityMeta, buildCity, addWillowvaleRoad } from './js/cities.js';
import * as CA from './js/cityart.js';
import { GAME } from './js/games.js';
import * as L from './js/life.js';
const { ITEMS, itemName } = L;
import { NEEDS, freshNeeds, mood, moodLabel, moodColor, needColor, SPEEDS, GAME_MIN_PER_SEC, clockText, dayOf, hourOf, skyTint, isNight, actionsFor, TRAITS, SKILLS, SKILL_MAX, xpForLevel, CAREER, CAREERS, friendLevel } from './js/sim.js';

const IS_NATIVE = location.protocol === 'capacitor:' || !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const API_BASE = IS_NATIVE ? (safeGet('willowvale_server') || 'https://willowvale-animal-town.onrender.com') : '';
// Running inside a Reddit post (Devvit): the Reddit account replaces nicknames and passwords, saves go to
// the post's app server, and the daily errands follow the calendar so everyone shares the same ones.
const RD = window.WV_REDDIT || null;
const $ = id => document.getElementById(id);
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* storage blocked */ } }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const today = () => new Date().toLocaleDateString('en-CA');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


// ---------- persistent state ----------
// A save can come back damaged (an old version, a half-written write, a hand-edited cloud save).
// Drop any part that has the wrong type so the setup below fills it with a fresh default.
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const SHAPE_LISTS = ['done', 'achievements', 'owned', 'packs', 'decor', 'plots'];
const SHAPE_MAPS = ['visits', 'friends', 'daily', 'stats', 'places', 'skills', 'jobs', 'visited', 'unlocked', 'homes', 'found', 'restore', 'picked', 'needs'];
function fixShape(p) {
  for (const k of SHAPE_LISTS) if (k in p && !Array.isArray(p[k])) delete p[k];
  for (const k of SHAPE_MAPS) if (k in p && !isObj(p[k])) delete p[k];
  for (const [k, v] of Object.entries(p.inventory)) if (!Number.isFinite(v) || v < 0) p.inventory[k] = 0;
  p.coins = Number.isFinite(p.coins) && p.coins >= 0 ? Math.floor(p.coins) : 35;
  if (!Number.isFinite(p.clock) || p.clock < 0) delete p.clock;
  if (typeof p.city !== 'string') delete p.city;
  return p;
}
function loadProgress() {
  const base = { coins: 35, inventory: { berries: 2, fish: 0, flowers: 1, crafts: 0, seed_carrot: 3, seed_tulip: 2, wood: 2 }, starter: 1, visits: {}, friends: {}, done: [], daily: {} };
  const v2 = store.get('willowvale_progress_v2', null);
  if (v2 && typeof v2 === 'object' && !Array.isArray(v2)) return fixShape(Object.assign(base, v2, { inventory: Object.assign(base.inventory, isObj(v2.inventory) ? v2.inventory : {}) }));
  const v1 = store.get('willowvale_progress_v1', null);
  if (v1 && v1.inventory) Object.assign(base.inventory, v1.inventory);
  return base;
}
const S = {
  token: RD ? (RD.user ? 'reddit' : '') : (safeGet('willowvale_token') || ''),
  user: null,
  profile: (v => isObj(v) && typeof v.species === 'string' ? v : null)(store.get('willowvale_player_v2', null)),
  progress: loadProgress(),
  settings: Object.assign({ labels: true, reduced: false, music: true, sfx: true, freewill: true }, store.get('willowvale_settings_v2', {})),
  coins: 0,
  properties: null,
  online: 'guest',
  sheet: null,
  run: false,
};
S.coins = S.progress.coins;
S.progress.needs = Object.assign(freshNeeds(), S.progress.needs || {});
if (typeof S.progress.clock !== 'number') S.progress.clock = 8 * 60;
S.speed = 1;
S.progress.stats = Object.assign({}, S.progress.stats || {});
S.progress.achievements = S.progress.achievements || [];
S.progress.places = S.progress.places || {};
S.progress.owned = S.progress.owned || [];
S.progress.skills = Object.assign(Object.fromEntries(SKILLS.map(k => [k.k, { lv: 0, xp: 0 }])), S.progress.skills || {});
// careers: one ladder per town, one shift a day across all of them
S.progress.jobs = S.progress.jobs || {};
if (S.progress.job) { S.progress.jobs.tram = { level: S.progress.job.level || 0, good: S.progress.job.good || 0 }; S.progress.lastWorkDay = S.progress.job.lastDay || 0; delete S.progress.job; }
for (const k of Object.keys(CAREERS)) S.progress.jobs[k] = Object.assign({ level: 0, good: 0 }, S.progress.jobs[k] || {});
S.progress.lastWorkDay = S.progress.lastWorkDay || 0;
// the island road: where you are, where you've been, homes you rent elsewhere, emoji packs
S.progress.city = S.progress.city || 'willowvale';
S.progress.visited = Object.assign({ willowvale: 1 }, S.progress.visited || {});
S.progress.unlocked = S.progress.unlocked || {};
S.progress.packs = S.progress.packs || [];
S.progress.homes = S.progress.homes || {};
// garden, decorating, collections, the Old Garden
S.progress.plots = S.progress.plots || Array.from({ length: 6 }, () => ({}));
S.progress.decor = S.progress.decor || [];
S.progress.found = S.progress.found || {};
S.progress.restore = S.progress.restore || { stage: 0, given: {} };
S.progress.picked = S.progress.picked || {};
if (!S.progress.starter) { S.progress.starter = 1; for (const [k, n] of [['seed_carrot', 3], ['seed_tulip', 2], ['wood', 2]]) S.progress.inventory[k] = (S.progress.inventory[k] || 0) + n; }
if (typeof S.progress.rentDay !== 'number') S.progress.rentDay = Math.floor((S.progress.clock || 0) / 1440);
const skillLv = k => S.progress.skills[k]?.lv || 0;
// Profiles saved before the wardrobe used an outfit number; turn it into a full look.
if (S.profile && !S.profile.look) S.profile.look = A.normLook(S.profile.outfit ?? 0);
const cleanName = v => String(v || '').replace(/[^\p{L} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);
SND.setPrefs({ music: S.settings.music, sfx: S.settings.sfx, musicVol: S.settings.musicVol ?? 1, sfxVol: S.settings.sfxVol ?? 1 });
let RESETTING = false;
// One wallet: coins live in the save, on this device and (when signed in) in the cloud.
const CLOUD = Object.assign({ version: 0, user: null, dirty: false, state: 'off', savedAt: 0, ready: false }, store.get('willowvale_cloud_v1', {}));
const saveProgress = () => { if (RESETTING) return; S.progress.coins = S.coins; store.set('willowvale_progress_v2', S.progress); CLOUD.dirty = true; };
const saveSettings = () => store.set('willowvale_settings_v2', S.settings);

// ---------- world ----------
let cityWorld = null, cityThings = [], cityFlats = [], cityNpcs = [], myHome = null, C = null;
let world = null;
const canvas = $('world'), ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
const mobile = () => Math.min(W, H) < 620;
const cam = { x: 0, y: 0, zoom: 0.6, tz: 0, free: false };

const tileCache = new Map();
function tileSpr(type, i, j) {
  const v = (i * 7 + j * 13) % 4, k = type * 10 + v;
  if (!tileCache.has(k)) tileCache.set(k, type >= 13 ? CA.skinTileSprite(type, v) : A.tileSprite(type, v));
  return tileCache.get(k);
}
const treeCache = new Map();
function treeSpr(kind, seed) { const k = kind + (seed % 5); if (!treeCache.has(k)) treeCache.set(k, CA.CITY_TREES.has(kind) ? CA.cityTreeSprite(kind, seed % 5) : A.treeSprite(kind, seed % 5)); return treeCache.get(k); }
const smallCache = new Map();
function smallSpr(kind, seed, face, art) {
  const k = kind + (art || '') + (kind === 'bench' ? face : seed % 6);
  if (!smallCache.has(k)) smallCache.set(k, art === 'marigold' ? CA.marigoldSprite(seed % 6) : art ? CA.cityLampSprite(art, seed % 6) : A.smallSprite(kind, seed % 6, face));
  return smallCache.get(k);
}
const TREE_SHADOW = A.treeShadow();

// Static scene objects with their art. Each town builds its own set the first time you visit.
let things = [];
let flats = [];
let venuesById = {};
const BUILDING_KINDS = ['house', 'apartment', 'villa', 'venue', 'shop', 'myhome'];
function makeThings(wd) {
  const list = [], flatList = [], byId = {};
  for (const o of wd.objects) {
    const t = { o, box: [o.i, o.j, o.i + o.w, o.j + o.d], ax: o.i, ay: o.j, interactive: true };
    if (o.kind === 'venue') byId[o.id] = o;
    if (o.flatArt) { flatList.push({ d: o, obj: o, x: o.i, y: o.j, sprite: CA.flatSprite(o) }); continue; }
    if (BUILDING_KINDS.includes(o.kind)) {
      if (o.style) { t.sprite = CA.cityBuildingSprite(o); const m = CA.styleMeta(o); t.top = m.top; t.shadow = A.shadowSprite(o.w, o.d, m.shadow); }
      else {
        t.sprite = A.buildingSprite(o);
        const hh = { house: 120, myhome: 120, apartment: 200, villa: 140, venue: 140, shop: 120 }[o.kind];
        t.shadow = A.shadowSprite(o.w, o.d, hh);
        t.top = { house: 130, myhome: 130, apartment: 230, villa: 160, venue: 165, shop: 135 }[o.kind];
        if (o.vstyle) t.top = 50 + (o.vstyle.floors || 2) * 44;
        if (o.id === 'station') t.top = 90;
      }
      if (o.home || o.kind === 'apartment') { t.balc = CA.balconyPoints(o); t.balcLooks = []; }
    } else if (o.kind === 'landmark') {
      if (o.flat) { flatList.push({ d: o, obj: o, x: o.i, y: o.j, sprite: CA.landmarkSprite(o) }); continue; }
      t.sprite = CA.landmarkSprite(o); t.top = CA.LM_TOP[o.lm] || 0; t.interactive = !o.deco;
      if (!o.deco && o.lm !== 'rangoli') t.shadow = A.shadowSprite(o.w, o.d, Math.min(160, t.top * 0.6));
    } else if (o.kind === 'busstop') { t.sprite = CA.busStopSprite(); t.top = 100; }
    else if (o.kind === 'boathire') { t.sprite = CA.boatHireSprite(); t.top = 90; }
    else if (o.kind === 'fountain') { t.sprite = A.fountainSprite(); t.live = 'fountain'; }
    else if (o.kind === 'clock') { t.sprite = A.clockSprite(); t.shadow = A.shadowSprite(1, 1, 120); t.live = 'clock'; t.top = 240; }
    else if (o.kind === 'board') { t.sprite = A.boardSprite(); }
    else if (o.kind === 'sunwheel') { t.sprite = A.sunwheelBase(); t.live = 'sunwheel'; t.top = 280; }
    else if (o.kind === 'windmill') { t.sprite = A.windmillBase(); t.live = 'windmill'; t.shadow = A.shadowSprite(2, 2, 90); t.top = 200; }
    list.push(t);
  }
  addDecor(list, flatList, wd.decor);
  for (const b of wd.boats) list.push({ o: b, box: [b.x - 0.4, b.y - 0.4, b.x + 0.4, b.y + 0.4], ax: b.x, ay: b.y, centered: true, live: 'boat' });
  return { things: list, flats: flatList, byId };
}
function addDecor(list, flatList, decor) {
  for (const d of decor) {
    const x = d.i + 0.5 + (d.ox || 0), y = d.j + 0.5 + (d.oy || 0);
    if (d.kind === 'flowers' || d.kind === 'bench') { flatList.push({ d, x, y, sprite: smallSpr(d.kind, d.seed || 0, d.face, d.kind === 'flowers' && d.marigold && (d.seed % 2) ? 'marigold' : null) }); continue; }
    const t = { o: d, box: [d.i + 0.2, d.j + 0.2, d.i + 0.8, d.j + 0.8], ax: x, ay: y, centered: true };
    if (d.kind === 'tree') { t.sprite = treeSpr(d.tree, d.seed); t.treeShadow = true; }
    else t.sprite = smallSpr(d.kind, d.seed || 0, d.face, d.kind === 'lamp' ? d.art : null);
    list.push(t);
  }
}

// Inside your cottage: walls on tile edges, furniture, and a little garden.
function makeRoomThings(rw) {
  const list = [], flatList = [];
  for (const w of rw.walls) {
    const sprite = F.wallSprite(w);
    const ax = w.axis === 'i' ? HOME_O[0] + w.k : HOME_O[0] + w.at, ay = w.axis === 'i' ? HOME_O[1] + w.at : HOME_O[1] + w.k;
    list.push({ o: { kind: 'wall' }, wall: w, sprite, ax, ay, box: w.axis === 'i' ? [ax, ay - 0.06, ax + 1, ay + 0.06] : [ax - 0.06, ay, ax + 0.06, ay + 1] });
  }
  for (const f of rw.objects) {
    const t = { o: f, furn: true, sprite: F.furnitureSprite(f), ax: f.i, ay: f.j, box: [f.i, f.j, f.i + f.w, f.j + f.d], interactive: !f.decor && !f.flat };
    if (f.flat) flatList.push({ d: f, x: f.i, y: f.j, sprite: t.sprite, furn: f, tap: !f.decor }); else list.push(t);
  }
  addDecor(list, flatList, rw.decor);
  rw.doorObj = rw.objects.find(f => f.door);
  return { things: list, flats: flatList };
}
const homeWorld = buildHome();
const homeThings = [], homeFlats = [];
for (const w of homeWorld.walls) {
  const sprite = F.wallSprite(w);
  const ax = w.axis === 'i' ? HOME_O[0] + w.k : HOME_O[0] + w.at, ay = w.axis === 'i' ? HOME_O[1] + w.at : HOME_O[1] + w.k;
  homeThings.push({ o: { kind: 'wall' }, wall: w, sprite, ax, ay, box: w.axis === 'i' ? [ax, ay - 0.06, ax + 1, ay + 0.06] : [ax - 0.06, ay, ax + 0.06, ay + 1] });
}
for (const f of homeWorld.objects) {
  if (f.type === 'sofa') {
    homeThings.push({ o: f, furn: true, sprite: F.furnitureSprite(f, 'seat'), ax: f.i, ay: f.j, box: [f.i, f.j, f.i + f.w, f.j + 0.7], interactive: true });
    homeThings.push({ o: f, furn: true, sprite: F.furnitureSprite(f, 'back'), ax: f.i, ay: f.j, box: [f.i, f.j + 0.72, f.i + f.w, f.j + f.d], interactive: true });
    continue;
  }
  const t = { o: f, furn: true, sprite: F.furnitureSprite(f), ax: f.i, ay: f.j, box: [f.i, f.j, f.i + f.w, f.j + f.d], interactive: !f.decor && !f.flat };
  if (f.flat) homeFlats.push({ d: f, x: f.i, y: f.j, sprite: t.sprite, furn: f }); else homeThings.push(t);
}
addDecor(homeThings, homeFlats, homeWorld.decor);
const homeDoor = homeWorld.objects.find(f => f.door);
homeWorld.doorObj = homeDoor;
const roomCenter = () => world.roomSize ? [HOME_O[0] + world.roomSize[0] / 2, HOME_O[1] + world.roomSize[1] / 2] : [HOME_O[0] + 6.5, HOME_O[1] + 6];

// ---------- characters ----------
class Walker {
  constructor(x, y, species, outfit, opts = {}) {
    Object.assign(this, { x, y, species, outfit, path: [], dir: 'front', flip: false, walk: 0, moving: false, speed: opts.speed || 2, seed: opts.seed || 0, emote: null, emoteLife: 0, name: opts.name || '', wait: 1 + Math.random() * 3, wave: 0, ox: 0, oy: 0, sitK: 0 });
  }
  // Jump to a spot (a seat, a bed) but let the body glide there on screen instead of popping.
  snapTo(x, y) { this.ox += this.x - x; this.oy += this.y - y; if (Math.hypot(this.ox, this.oy) > 3) this.ox = this.oy = 0; this.x = x; this.y = y; }
  tick(dt) {
    const k = 1 - Math.exp(-dt * 10); this.ox -= this.ox * k; this.oy -= this.oy * k;
    const seat = this.pose === 'sit' || this.pose === 'ground' ? 1 : 0;
    this.sitK += (seat - this.sitK) * (1 - Math.exp(-dt * 8)); if (Math.abs(seat - this.sitK) < 0.01) this.sitK = seat;
    if (seat) this.lastSeat = this.pose;
  }
  go(path, onArrive) { this.path = path || []; this.onArrive = onArrive || null; if (!this.path.length && onArrive) { const f = onArrive; this.onArrive = null; f(); } }
  face(tx, ty) { const dx = tx - this.x, dy = ty - this.y, sdx = dx - dy, sdy = dx + dy; this.dir = sdy >= -0.2 ? 'front' : 'back'; this.flip = sdx > 0; }
  update(dt) {
    this.tick(dt);
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
const player = new Walker(...playerStart, S.profile?.species || 'fox', S.profile?.look || A.OUTFITS[0], { speed: BASE_SPEED, seed: 3 });
let npcs = [];
function makeNpcs(defs, wd, base) {
  return defs.map((n, k) => {
    const spot = nearestWalkable(wd, n.home[0], n.home[1]) || [22, 22];
    const w = new Walker(spot[0] + 0.5, spot[1] + 0.5, n.species, A.randomLook(base + k * 31 + 5), { speed: 1.5 + (k % 3) * 0.2, seed: k * 3 + 1, name: n.name });
    w.data = n; w.home = spot; w.busy = 0; w.traits = n.traits || [];
    w.needs = { hunger: 55 + (k * 7) % 40, energy: 60 + (k * 11) % 35, fun: 45 + (k * 13) % 45, social: 40 + (k * 5) % 50, hygiene: 60 + (k * 3) % 35, comfort: 55 + (k * 9) % 40 };
    w.task = null; w.doing = 'Out for a walk';
    if (n.traits?.includes('Athletic')) w.speed *= TRAITS.Athletic.speed;
    w.baseSpeed = w.speed;
    return w;
  });
}
// ---------- the garden ----------
function plotOptions(o) {
  const p = S.progress.plots[o.plot], st = L.plotStage(p), now = S.progress.clock, out = [];
  const go = (fn, emoji) => () => { const d = approachOf(o); const run = () => { player.face(o.i + 0.5, o.j + 0.5); player.say(emoji, 1.4); fn(); }; if (near(...d, 1.2)) run(); else walkTo(...d, run); };
  if (st === 'empty') {
    const seeds = Object.keys(ITEMS).filter(k => ITEMS[k].cat === 'seed' && have(k) > 0);
    for (const k of seeds.slice(0, 5)) out.push({ icon: ITEMS[k].icon, label: `Plant ${ITEMS[ITEMS[k].crop].many}`, note: `${have(k)} left`, run: go(() => plantPlot(o.plot, k), '🌱') });
    if (!seeds.length) out.push({ icon: '🌱', label: 'No seeds. Buy some at the market', disabled: 'No seeds', run: () => {} });
  } else {
    if (st === 'ready') out.push({ icon: ITEMS[p.crop].icon, label: `Harvest ${ITEMS[p.crop].many}`, run: go(() => harvestPlot(o.plot), '🧺') });
    else out.push({ icon: '💧', label: L.plotWet(p, now) ? 'Already watered' : 'Water the plot', disabled: L.plotWet(p, now) ? 'Watered' : '', run: go(() => waterPlot(o.plot), '💧') });
    if (st !== 'ready') out.push({ icon: '⏳', label: `${Math.round(p.grown / L.CROPS[p.crop].grow * 100)}% grown`, disabled: 'Growing', run: () => {} });
  }
  return out;
}
function plantPlot(k, seed) {
  if (have(seed) < 1) return;
  addItem(seed, -1);
  S.progress.plots[k] = { crop: ITEMS[seed].crop, grown: 0, at: S.progress.clock, wetUntil: raining() ? S.progress.clock + 1440 : 0 };
  bumpStat('planted'); SND.sfx('pop'); toast(raining() ? 'Planted! The rain is watering it for you.' : 'Planted! Water it so it grows.'); saveProgress();
}
function waterPlot(k) {
  const p = S.progress.plots[k]; p.wetUntil = S.progress.clock + 1440; L.growPlot(p, S.progress.clock);
  bumpStat('waters'); SND.sfx('splash'); toast('Watered. It will grow for a whole day.'); saveProgress(); checkQuests();
}
function harvestPlot(k) {
  const p = S.progress.plots[k]; const n = L.harvestCount(p, L.seasonOf(gameDay()));
  addItem(p.crop, n); toast(`You picked ${n} ${itemName(p.crop, n)}! ${ITEMS[p.crop].icon}`); player.say(ITEMS[p.crop].icon, 2);
  S.progress.plots[k] = {}; bumpStat('harvests'); addXP('creativity', 3); SND.sfx('coin'); saveProgress(); checkQuests(); checkAchievements();
}
function drawPlotLive(f, sx, sy, z) {
  const p = S.progress.plots[f.furn.plot]; if (!p) return;
  const now = S.progress.clock, st = L.plotStage(p);
  const [cx, cy] = A.P(0.5, 0.5, 2);
  const x = sx + cx * z, y = sy + cy * z;
  if (L.plotWet(p, now)) { ctx.fillStyle = 'rgba(40,24,10,.32)'; ctx.beginPath(); ctx.ellipse(x, y, 46 * z, 23 * z, 0, 0, 7); ctx.fill(); }
  if (st === 'empty') return;
  const col = L.CROPS[p.crop].color, sway = Math.sin(time * 1.6 + f.furn.plot) * 1.5 * z;
  ctx.save(); ctx.lineCap = 'round';
  const sprout = (dx, dy, hgt, leaf) => { ctx.strokeStyle = '#3F9A5C'; ctx.lineWidth = 2.2 * z; ctx.beginPath(); ctx.moveTo(x + dx * z, y + dy * z); ctx.lineTo(x + dx * z + sway, y + (dy - hgt) * z); ctx.stroke(); ctx.fillStyle = '#5FC07E'; ctx.beginPath(); ctx.ellipse(x + (dx - leaf * 0.6) * z + sway, y + (dy - hgt) * z, leaf * z, leaf * 0.5 * z, -0.5, 0, 7); ctx.ellipse(x + (dx + leaf * 0.6) * z + sway, y + (dy - hgt) * z, leaf * z, leaf * 0.5 * z, 0.5, 0, 7); ctx.fill(); };
  const spots = [[-18, -4], [0, 4], [18, -4], [-8, 10], [10, 10]];
  if (st === 'seed') for (const [dx, dy] of spots) { ctx.fillStyle = '#C9A866'; ctx.beginPath(); ctx.arc(x + dx * z, y + dy * z, 2 * z, 0, 7); ctx.fill(); }
  else if (st === 'sprout') for (const [dx, dy] of spots) sprout(dx, dy, 8, 4);
  else for (const [dx, dy] of spots) { sprout(dx, dy, st === 'ready' ? 20 : 15, 6); if (st === 'ready') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + dx * z + sway, y + (dy - 22) * z, 5.5 * z, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x + (dx - 1.6) * z + sway, y + (dy - 23.6) * z, 1.8 * z, 0, 7); ctx.fill(); } }
  if (st === 'ready' && (time * 2 % 2) < 1.4) { ctx.font = `${Math.round(14 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✨', x, y - 40 * z); }
  ctx.restore();
}

// ---------- gathering: shells, sticks, stones, flowers and bugs ----------
function pickupsFor(rec) {
  const day = gameDay(), h = hourOf(S.progress.clock), night = h >= 20 || h < 5, key = rec.id + ':' + day + ':' + (night ? 'n' : 'd');
  if (rec.pickKey === key) return rec.pickups;
  const wd = rec.world, r = L.seeded(hashStr(rec.id) + day * 97), list = [];
  const treeNear = (i, j) => wd.decor.some(d => d.kind === 'tree' && Math.abs(d.i - i) <= 1 && Math.abs(d.j - j) <= 1);
  for (let tries = 0; tries < 600 && list.length < 18; tries++) {
    const i = 2 + Math.floor(r() * (N - 4)), j = 2 + Math.floor(r() * (N - 4)), t = wd.get(i, j);
    if (!wd.walkable(i, j) || wd.isRoad(i, j)) continue;
    const zone = t === T.SAND ? 'sand' : treeNear(i, j) ? 'tree' : (t === T.GRASS || t === T.PARK || t === T.MEADOW) ? 'grass' : null;
    if (!zone) continue;
    list.push({ k: list.length, item: L.pickWeighted(L.PICKUPS[zone], r), x: i + 0.3 + r() * 0.4, y: j + 0.3 + r() * 0.4, bug: false });
  }
  const br = L.seeded(hashStr(rec.id) + day * 131 + (night ? 7 : 0));
  for (let tries = 0; tries < 400 && list.filter(p => p.bug).length < (night ? 6 : 7); tries++) {
    const i = 2 + Math.floor(br() * (N - 4)), j = 2 + Math.floor(br() * (N - 4)), t = wd.get(i, j);
    if (!wd.walkable(i, j) || wd.isRoad(i, j) || !(t === T.GRASS || t === T.PARK || t === T.MEADOW)) continue;
    if (weatherNow() === 'snow' && br() < 0.6) continue;
    list.push({ k: 100 + list.length, item: L.pickWeighted(night ? L.BUGS.night : L.BUGS.day, br), x: i + 0.5, y: j + 0.5, bug: true, ph: br() * 6 });
  }
  rec.pickKey = key; rec.pickups = list;
  return list;
}
const pickedKey = (rec, p) => rec.id + ':' + gameDay() + ':' + p.k + (p.bug ? (hourOf(S.progress.clock) >= 20 || hourOf(S.progress.clock) < 5 ? 'n' : 'd') : '');
function livePickups() {
  if (world.interior || player.boat || !C) return [];
  return pickupsFor(C).filter(p => !S.progress.picked[pickedKey(C, p)]);
}
function pickupPos(p) { if (!p.bug) return [p.x, p.y, 0]; const a = time * (p.item === 'snail' ? 0.1 : 0.7) + p.ph; return [p.x + Math.cos(a) * 0.5, p.y + Math.sin(a * 1.3) * 0.4, p.item === 'snail' || p.item === 'beetle' || p.item === 'cricket' || p.item === 'ladybug' ? 2 : 22 + Math.sin(time * 3 + p.ph) * 6]; }
function drawPickups(z) {
  for (const p of livePickups()) {
    const [x, y, hz] = pickupPos(p), [sx, sy] = toScreen(x, y, hz); if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue;
    if (!p.bug) { ctx.fillStyle = 'rgba(33,56,79,.18)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2 * z, 10 * z, 4 * z, 0, 0, 7); ctx.fill(); }
    const bob = p.bug ? 0 : Math.sin(time * 2 + p.k) * 2 * z;
    ctx.font = `${Math.round((p.bug ? 17 : 19) * z * 1.2)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (p.item === 'firefly') { ctx.fillStyle = `rgba(255,240,140,${0.5 + 0.4 * Math.sin(time * 5 + p.ph)})`; ctx.beginPath(); ctx.arc(sx, sy, 5 * z, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,240,140,.25)'; ctx.beginPath(); ctx.arc(sx, sy, 12 * z, 0, 7); ctx.fill(); }
    else ctx.fillText(ITEMS[p.item].icon, sx, sy - 8 * z + bob);
  }
}
function nearestPickup(x, y, r = 1.3) { let best = null, bd = r; for (const p of livePickups()) { const [px, py] = pickupPos(p); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = p; } } return best; }
function collectPickup(p) {
  if (!p || S.progress.picked[pickedKey(C, p)]) return;
  const go = () => {
    if (S.progress.picked[pickedKey(C, p)]) return;
    const [px, py] = pickupPos(p); player.face(px, py);
    if (p.bug && (p.item === 'bee' || p.item === 'butterfly') && Math.random() < 0.2 - skillLv('fitness') * 0.015) { toast(`The ${itemName(p.item, 1)} flew away! Try again.`); player.say('💨', 1.4); p.ph += 2; return; }
    S.progress.picked[pickedKey(C, p)] = 1;
    addItem(p.item, 1); bumpStat(p.bug ? 'bugs' : 'gathers'); SND.sfx('pop'); player.say(ITEMS[p.item].icon, 1.5);
    toast(`${p.bug ? 'Caught' : 'Found'} a ${ITEMS[p.item].icon} ${itemName(p.item, 1)}!`); checkQuests(); checkAchievements();
  };
  const [px, py] = pickupPos(p);
  if (Math.hypot(px - player.x, py - player.y) < 1.2) go(); else walkTo(px, py, go);
}
// old picked keys are cleared away so the save stays small
function pruneDaily() { const d = gameDay(); for (const k of Object.keys(S.progress.daily)) { const m = k.match(/^(?:req|mail|q):(\d+)/); if (m && +m[1] < d - 2) delete S.progress.daily[k]; } }
function prunePicked() { const d = gameDay(); for (const k of Object.keys(S.progress.picked)) if (+k.split(':')[1] < d) delete S.progress.picked[k]; }

// ---------- the market: buy seeds, sell what you've gathered ----------
function showMarket(tab = 'buy') {
  const body = openSheet('market', C.meta.name + ' market', tab === 'buy' ? 'Buy seeds' : 'Sell your things', null, { tab: 'places' });
  const tabs = h(`<div class="filter-row" role="tablist"><button class="filter ${tab === 'buy' ? 'on' : ''}" data-t="buy">Buy seeds</button><button class="filter ${tab === 'sell' ? 'on' : ''}" data-t="sell">Sell</button></div>`);
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => showMarket(b.dataset.t)); body.append(tabs);
  body.append(h(`<div class="notice calm"><b>You have ✦ ${S.coins}</b><span>${tab === 'buy' ? `It’s ${L.SEASONS[L.seasonOf(gameDay())].name.toLowerCase()}. Crops in season give an extra one when you pick them.` : 'Prices are shown before you sell. Keep a few for gifts and recipes!'}</span></div>`));
  if (tab === 'buy') {
    for (const k of Object.keys(ITEMS).filter(x => ITEMS[x].cat === 'seed')) {
      const it = ITEMS[k], crop = L.CROPS[it.crop], inSeason = crop.season && crop.season.includes(L.seasonOf(gameDay()));
      const el = h(`<div class="trade-row"><span class="trade-icon">${it.icon}</span><div class="trade-main"><b>${esc(ITEMS[it.crop].many[0].toUpperCase() + ITEMS[it.crop].many.slice(1))}</b><small>Ready in ${Math.round(crop.grow / 60)} watered hours · picks ${crop.yield[0]}–${crop.yield[1]}${inSeason ? ' · <em>in season</em>' : ''} · you have ${have(k)}</small></div><button class="btn btn-sun btn-small" data-n="1">✦ ${it.cost}</button><button class="btn btn-ghost btn-small" data-n="5">5 for ✦ ${it.cost * 5}</button></div>`);
      el.querySelectorAll('button').forEach(b => b.onclick = () => { const n = +b.dataset.n, cost = it.cost * n; if (S.coins < cost) { toast(`You need ✦ ${cost}.`); return; } setCoins(S.coins - cost, true); addItem(k, n); SND.sfx('coin'); toast(`Bought ${n} ${itemName(k, n)}.`); showMarket('buy'); });
      body.append(el);
    }
  } else {
    const list = Object.keys(S.progress.inventory).filter(k => L.sellable(k) && have(k) - placedCount(k) > 0);
    if (!list.length) body.append(h(`<p class="lead">Nothing to sell yet. Gather shells, catch bugs, grow crops or go fishing.</p>`));
    for (const k of list) {
      const it = ITEMS[k], n = have(k) - placedCount(k);
      const el = h(`<div class="trade-row"><span class="trade-icon">${it.icon}</span><div class="trade-main"><b>${esc(it.many[0].toUpperCase() + it.many.slice(1))}</b><small>✦ ${it.price} each · you have ${n}${placedCount(k) ? ` (+${placedCount(k)} in your home)` : ''}</small></div><button class="btn btn-sun btn-small" data-n="1">Sell 1 · ✦ ${it.price}</button>${n > 1 ? `<button class="btn btn-ghost btn-small" data-n="${n}">All ${n} · ✦ ${it.price * n}</button>` : ''}</div>`);
      el.querySelectorAll('button').forEach(b => b.onclick = () => { const m = Math.min(+b.dataset.n, have(k) - placedCount(k)); if (m < 1) return; addItem(k, -m); setCoins(S.coins + it.price * m, true); bumpStat('sold'); SND.sfx('coin'); toast(`Sold ${m} ${itemName(k, m)} for ✦ ${it.price * m}.`); checkQuests(); showMarket('sell'); });
      body.append(el);
    }
  }
}

// ---------- crafting ----------
function showCraft() {
  const inv = S.progress.inventory;
  const body = openSheet('craft', 'Workbench', 'Make something', null, { tab: 'journal' });
  body.append(h(`<p class="lead">Neighbours teach you new recipes once you’re friends (3 hearts).</p>`));
  for (const r of L.RECIPES) {
    const known = L.recipeKnown(r, S.progress.friends), ok = known && L.canCraft(r, inv), it = ITEMS[r.id];
    const needs = Object.entries(r.needs).map(([k, n]) => `<span class="need-chip ${have(k) >= n ? 'ok' : ''}">${ITEMS[k].icon} ${Math.min(have(k), n)}/${n}</span>`).join('');
    const el = h(`<div class="trade-row ${known ? '' : 'locked'}"><span class="trade-icon">${known ? it.icon : '🔒'}</span><div class="trade-main"><b>${esc(it.one[0].toUpperCase() + it.one.slice(1))}${it.cat === 'decor' ? ' <small class="tag">for your home</small>' : ''}</b><small>${known ? needs : `Learn it from ${esc(r.teach)} (3 hearts)`}</small></div>${known ? `<button class="btn ${ok ? 'btn-primary' : 'btn-ghost'} btn-small" ${ok ? '' : 'disabled'}>Make</button>` : ''}</div>`);
    const b = el.querySelector('button');
    if (b) b.onclick = () => { if (!L.craft(r, inv)) return; if (!S.progress.found[r.id]) { S.progress.found[r.id] = 1; } addXP(r.skill, 6); bumpStat('crafted'); SND.sfx('done'); player.say(it.icon, 2); toast(`You made a ${it.icon} ${it.one}!${it.cat === 'decor' ? ' Tap 🛋️ Decorate at home to place it.' : ''}`); saveProgress(); checkQuests(); checkAchievements(); showCraft(); };
    body.append(el);
  }
}

// ---------- neighbour requests ----------
function requestOpen(n) {
  if (!n || n.generic || !n.data) return null;
  const rq = L.requestFor(n.name, gameDay());
  if (!rq || S.progress.daily['req:' + gameDay() + ':' + n.name]) return null;
  return rq;
}
function deliverRequest(n, rq) {
  if (have(rq.item) < rq.n) return;
  const d = Math.hypot(n.x - player.x, n.y - player.y);
  const give = () => {
    addItem(rq.item, -rq.n); setCoins(S.coins + rq.coins, true);
    S.progress.daily['req:' + gameDay() + ':' + n.name] = 1;
    const f = friendship(n.name); f.hearts = Math.min(5, (f.hearts || 0) + 1);
    addMemory(n.name, `You brought me ${rq.n} ${itemName(rq.item, rq.n)} when I needed ${rq.n === 1 ? 'it' : 'them'}`, f);
    S.progress.friends[n.name] = f;
    n.say('🥰', 3); player.say('💛', 2); SND.sfx('unlock'); bumpStat('delivered');
    toast(`${n.name} is so happy! +${rq.coins} ✦ and a heart.`); saveProgress(); checkQuests(); checkAchievements();
  };
  if (d < 2) give(); else walkTo(n.x, n.y + 0.8, give);
}
function drawRequestBadge(c, sx, sy, z) {
  const rq = requestOpen(c.orig || c); if (!rq || c.pose === 'sleep') return;
  const y = sy - 92 * z - Math.abs(Math.sin(time * 2)) * 3 * z;
  ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#F2A93B'; ctx.lineWidth = 2 * z;
  ctx.beginPath(); ctx.arc(sx, y, 12 * z, 0, 7); ctx.fill(); ctx.stroke();
  ctx.font = `${Math.round(13 * z)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ITEMS[rq.item].icon, sx, y + 1);
  ctx.restore();
}

// ---------- journal pieces ----------
function guideHtml() {
  const st = statsView();
  const steps = [['meals', 1, 'Cook breakfast at the fridge'], ['planted', 1, 'Plant a seed in your garden, just outside the front door'], ['waters', 1, 'Water your plot so it grows'], ['gathers', 3, 'Pick up 3 things outdoors: sticks, shells, flowers'], ['hellos', 1, 'Say hello to a neighbour'], ['crafted', 1, 'Make a stool at your workbench (4 sticks)']];
  if (steps.every(([k, n]) => (st[k] || 0) >= n)) return '';
  return `<h4 class="group-title">Getting started</h4><ul class="guide">${steps.map(([k, n, t]) => `<li class="${(st[k] || 0) >= n ? 'ok' : ''}"><i>${(st[k] || 0) >= n ? '✓' : ''}</i><span>${esc(t)}</span></li>`).join('')}</ul>`;
}
function requestsHtml() {
  const list = cityNpcs.map(n => [n, requestOpen(n)]).filter(([, r]) => r);
  if (!list.length) return '';
  return `<h4 class="group-title">Requests in ${esc(C.meta.name)} today</h4><ul class="log">${list.map(([n, r]) => `<li><b>${esc(n.name)} wants ${r.n} ${ITEMS[r.item].icon}</b><span>You have ${have(r.item)} · ✦ ${r.coins}</span></li>`).join('')}</ul>`;
}
function collectionHtml() {
  const groups = [['crop', 'Crops'], ['bug', 'Bugs'], ['material', 'Beach & woods'], ['made', 'Made by you'], ['decor', 'Furniture']];
  const fishNames = Object.keys(S.progress.catches || {});
  const total = Object.keys(ITEMS).filter(k => groups.some(([g]) => ITEMS[k].cat === g) || k === 'flowers').length + 7;
  const got = Object.keys(S.progress.found).length + fishNames.length;
  return `<h4 class="group-title">Collection book <small>${got} of ${total}</small></h4><div class="collection">${groups.map(([g, label]) => `<div class="col-group"><b>${label}</b><div>${Object.keys(ITEMS).filter(k => ITEMS[k].cat === g || (g === 'material' && k === 'flowers')).map(k => S.progress.found[k] ? `<span title="${esc(itemName(k, 1))}">${ITEMS[k].icon}</span>` : '<span class="unknown" title="Not found yet">❔</span>').join('')}</div></div>`).join('')}<div class="col-group"><b>Fish</b><div>${['Minnow', 'Sardine', 'Snapper', 'Pufferfish', 'Squid', 'Octopus', 'Golden fish'].map(f => (S.progress.catches || {})[f] ? `<span title="${f}">${{ Minnow: '🐟', Sardine: '🐟', Snapper: '🐠', Pufferfish: '🐡', Squid: '🦑', Octopus: '🐙', 'Golden fish': '✨' }[f]}</span>` : '<span class="unknown">❔</span>').join('')}</div></div></div>`;
}

// ---------- decorating your home ----------
const DECOR = { on: false, sel: null, pick: -1, undo: [], things: [] };
const placedCount = k => S.progress.decor.filter(d => d.item === k).length;
const freeDecor = k => have(k) - placedCount(k);
function decorTileOK(i, j, ignore = -1) {
  const t = homeWorld.get(i, j);
  if (!homeWorld.inb(i, j) || t === T.PATH || t === T.SEA) return false;
  if (homeWorld.objects.some(f => f.type === 'plot' && f.i === i && f.j === j)) return false;
  const door = homeDoor; if (Math.abs(i - door.i) + Math.abs(j - door.j) <= 1) return false;
  if (S.progress.decor.some((d, k) => k !== ignore && d.i === i && d.j === j)) return false;
  const was = DECOR.things.find(t2 => t2.o.decorIdx === ignore);
  if (homeWorld.blocked[homeWorld.idx(i, j)] && !(was && was.o.i === i && was.o.j === j)) return false;
  const [hi, hj] = [i - HOME_O[0], j - HOME_O[1]];
  return hi >= -3 && hj >= -3 && hi <= 15 && hj <= 14;
}
function refreshDecor() {
  for (const t of DECOR.things) { if (t.o.type !== 'd_rug') homeWorld.blocked[homeWorld.idx(t.o.i, t.o.j)] = 0; }
  for (const arr of [homeThings, homeFlats]) for (let k = arr.length - 1; k >= 0; k--) if (arr[k].o?.decorIdx !== undefined || arr[k].d?.decorIdx !== undefined) arr.splice(k, 1);
  DECOR.things = [];
  S.progress.decor.forEach((d, k) => {
    if (!ITEMS[d.item]) return;
    const f = { kind: 'furn', type: 'd_' + d.item, i: d.i, j: d.j, w: 1, d: 1, name: ITEMS[d.item].one[0].toUpperCase() + ITEMS[d.item].one.slice(1), decorIdx: k, decor: !actionsFor('d_' + d.item).length };
    const nb = [[0.5, 1.5], [1.5, 0.5], [-0.5, 0.5], [0.5, -0.5]].map(([a, b]) => [d.i + a, d.j + b]).find(([x, y]) => homeWorld.walkable(Math.floor(x), Math.floor(y)));
    f.stand = nb || [d.i + 0.5, d.j + 1.5]; f.look = [d.i + 0.5, d.j + 0.5];
    const t = { o: f, furn: true, sprite: F.furnitureSprite(f), ax: f.i, ay: f.j, box: [f.i, f.j, f.i + 1, f.j + 1], interactive: true, flipX: !!d.rot };
    if (d.item === 'rug') { homeFlats.unshift({ d: f, x: f.i, y: f.j, sprite: t.sprite, furn: f }); t.flat = true; }
    else { homeThings.push(t); homeWorld.blocked[homeWorld.idx(d.i, d.j)] = 1; }
    if (d.item === 'lamp') f.lamp = true;
    DECOR.things.push(t);
  });
}
function startDecor() {
  if (sceneName !== 'home') return;
  cancelActions(); closePie(); closeSheet();
  DECOR.on = true; DECOR.sel = null; DECOR.pick = -1; DECOR.undo = [];
  document.body.classList.add('decorating'); renderDecorBar();
  toast('Pick something below, then tap where it should go.');
}
function endDecor() { DECOR.on = false; DECOR.sel = null; DECOR.pick = -1; document.body.classList.remove('decorating'); $('decor-bar').classList.add('hidden'); saveProgress(); checkAchievements(); }
function renderDecorBar() {
  const bar = $('decor-bar'); bar.classList.remove('hidden');
  const items = Object.keys(ITEMS).filter(k => ITEMS[k].cat === 'decor' && have(k) > 0);
  const picked = DECOR.pick >= 0 ? S.progress.decor[DECOR.pick] : null;
  bar.innerHTML = `<div class="decor-top"><b>${picked ? `${ITEMS[picked.item].icon} ${esc(itemName(picked.item, 1))}` : DECOR.sel ? `Tap a spot for your ${esc(itemName(DECOR.sel, 1))}` : 'Decorate'}</b>
    ${picked ? '<button class="btn btn-ghost btn-small" data-a="rot">↻ Turn</button><button class="btn btn-ghost btn-small" data-a="move">✥ Move</button><button class="btn btn-ghost btn-small" data-a="store">📦 Put away</button>' : ''}
    <button class="btn btn-ghost btn-small" data-a="undo" ${DECOR.undo.length ? '' : 'disabled'}>↶ Undo</button><button class="btn btn-primary btn-small" data-a="done">Done</button></div>
    <div class="decor-tray">${items.length ? items.map(k => `<button class="decor-item ${DECOR.sel === k ? 'on' : ''}" data-k="${k}" ${freeDecor(k) > 0 ? '' : 'disabled'}><span>${ITEMS[k].icon}</span><small>${freeDecor(k)} left</small></button>`).join('') : '<p class="lead">Make furniture at your workbench (🪑 stool: 4 sticks) and it will show up here.</p>'}</div>`;
  bar.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { DECOR.sel = DECOR.sel === b.dataset.k ? null : b.dataset.k; DECOR.pick = -1; renderDecorBar(); });
  const act2 = { done: endDecor,
    undo: () => { const u = DECOR.undo.pop(); if (!u) return; S.progress.decor = u; refreshDecor(); DECOR.pick = -1; renderDecorBar(); },
    rot: () => { DECOR.undo.push(JSON.parse(JSON.stringify(S.progress.decor))); picked.rot = picked.rot ? 0 : 1; refreshDecor(); renderDecorBar(); },
    move: () => { DECOR.moving = DECOR.pick; toast('Tap where it should go.'); },
    store: () => { DECOR.undo.push(JSON.parse(JSON.stringify(S.progress.decor))); S.progress.decor.splice(DECOR.pick, 1); DECOR.pick = -1; refreshDecor(); renderDecorBar(); SND.sfx('close'); } };
  bar.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act2[b.dataset.a]());
}
function decorTap(sx, sy) {
  const [wx, wy] = toWorld(sx, sy), i = Math.floor(wx), j = Math.floor(wy);
  const at = S.progress.decor.findIndex(d => d.i === i && d.j === j);
  if (DECOR.moving !== undefined && DECOR.moving >= 0) {
    const k = DECOR.moving; DECOR.moving = -1;
    if (!decorTileOK(i, j, k)) { toast('It won’t fit there. Try an empty spot.'); return; }
    DECOR.undo.push(JSON.parse(JSON.stringify(S.progress.decor))); S.progress.decor[k].i = i; S.progress.decor[k].j = j; refreshDecor(); SND.sfx('pop'); renderDecorBar(); return;
  }
  if (at >= 0 && !DECOR.sel) { DECOR.pick = at; renderDecorBar(); return; }
  if (!DECOR.sel) { DECOR.pick = -1; renderDecorBar(); return; }
  if (freeDecor(DECOR.sel) < 1) { toast('You’ve placed all of those.'); return; }
  if (!decorTileOK(i, j)) { toast('It won’t fit there. Try an empty spot.'); return; }
  DECOR.undo.push(JSON.parse(JSON.stringify(S.progress.decor)));
  S.progress.decor.push({ item: DECOR.sel, i, j, rot: 0 });
  refreshDecor(); SND.sfx('pop');
  if (freeDecor(DECOR.sel) < 1) DECOR.sel = null;
  renderDecorBar();
}
function drawDecorGrid(z) {
  if (!DECOR.on) return;
  ctx.save(); ctx.lineWidth = 1.2;
  for (let j = HOME_O[1] - 3; j <= HOME_O[1] + 14; j++) for (let i = HOME_O[0] - 3; i <= HOME_O[0] + 15; i++) {
    const own = S.progress.decor.findIndex(d => d.i === i && d.j === j), ok = own >= 0 || decorTileOK(i, j);
    if (!ok) continue;
    const pts = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => toScreen(a, b, 1));
    ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = own === DECOR.pick && own >= 0 ? 'rgba(255,200,61,.45)' : own >= 0 ? 'rgba(63,168,106,.25)' : 'rgba(255,255,255,.18)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
  }
  ctx.restore();
}

refreshDecor();

// ---------- the Old Garden: a Willowvale community project ----------
function placeOldGarden(wd) {
  const free = (i, j) => { for (let y = j - 1; y <= j + 3; y++) for (let x = i - 1; x <= i + 3; x++) { const t = wd.get(x, y); if (wd.blocked[wd.idx(x, y)]) return false; const inside = x >= i && x < i + 3 && y >= j && y < j + 3; if (inside && !(t === T.GRASS || t === T.PARK || t === T.MEADOW)) return false; } return true; };
  const cands = [];
  for (let j = 4; j < N - 6; j++) for (let i = 4; i < N - 6; i++) if (free(i, j)) { const near = [[i + 1, j + 3], [i + 3, j + 1]].find(([x, y]) => wd.walkable(x, y)); if (near) cands.push([Math.hypot(i - 20, j - 16), i, j, near]); }
  cands.sort((a, b) => a[0] - b[0]);
  const c = cands[0]; if (!c) return null;
  const [, i, j, near] = c;
  const o = { kind: 'landmark', lm: 'oldgarden', i, j, w: 3, d: 3, name: 'The Old Garden', acts: 'oldgarden', icon: '🌱', stage: S.progress.restore.stage, stand: [near[0] + 0.5, near[1] + 0.5], doorTile: near };
  for (let y = j; y < j + 3; y++) for (let x = i; x < i + 3; x++) wd.blocked[wd.idx(x, y)] = 1;
  wd.decor = wd.decor.filter(d => !(d.i >= i - 1 && d.i <= i + 3 && d.j >= j - 1 && d.j <= j + 3));
  wd.objects.push(o);
  return o;
}
const FERN = { name: 'Fern', species: 'deer', traits: ['Outdoorsy', 'Artist', 'Early Bird'], line: 'The garden is so lovely now, I just had to move in. Thank you!', wants: 'flowers' };
function addFern(rec) {
  if (rec.npcs.some(n => n.name === 'Fern') || !rec.garden) return;
  const fern = makeNpcs([{ ...FERN, home: [rec.garden.i + 1, rec.garden.j + 4] }], rec.world, 777)[0];
  rec.npcs.push(fern); if (C === rec) { cityNpcs = rec.npcs; if (sceneName === 'city') npcs = cityNpcs; }
}
function showRestore() {
  const r = S.progress.restore, step = L.RESTORE[r.stage];
  const body = openSheet('restore', 'Willowvale community project', 'The Old Garden', null, { tab: 'places' });
  body.append(h(`<div class="restore-steps">${L.RESTORE.map((x, k) => `<div class="restore-step ${k < r.stage ? 'ok' : k === r.stage ? 'now' : ''}"><i>${k < r.stage ? '✓' : k + 1}</i><span>${esc(x.title)}</span></div>`).join('')}</div>`));
  if (!step) { body.append(h(`<div class="notice calm"><b>The garden is restored! 🌺</b><span>Butterflies are back, the gazebo glows at night, and Fern the deer moved in next door. Thank you for helping Willowvale grow.</span></div>`)); return; }
  const left = k => step.needs[k] - (r.given[k] || 0);
  body.append(h(`<p class="lead">${esc(step.text)}</p>`));
  for (const k of Object.keys(step.needs)) {
    const el = h(`<div class="trade-row"><span class="trade-icon">${ITEMS[k].icon}</span><div class="trade-main"><b>${esc(itemName(k, 2)[0].toUpperCase() + itemName(k, 2).slice(1))}</b><small>${r.given[k] || 0} of ${step.needs[k]} given · you have ${have(k)}</small></div><button class="btn btn-sun btn-small" ${left(k) > 0 && have(k) > 0 ? '' : 'disabled'}>${left(k) > 0 ? `Give ${Math.min(left(k), have(k)) || ''}` : 'Done ✓'}</button></div>`);
    el.querySelector('button').onclick = () => {
      const n = Math.min(left(k), have(k)); if (n < 1) return;
      addItem(k, -n); r.given[k] = (r.given[k] || 0) + n; SND.sfx('pop');
      if (Object.keys(step.needs).every(x => left(x) <= 0)) {
        r.stage++; r.given = {}; setCoins(S.coins + 40, true); SND.sfx('unlock');
        celebrations.push({ title: 'The garden grows!', emojis: ['🌱', '🌼', '🦋'].slice(0, 1 + r.stage % 3), label: `${step.title}: done! +40 ✦` });
        const rec = CITIES.willowvale; if (rec && rec.garden) { rec.garden.stage = r.stage; const t = rec.things.find(t2 => t2.o === rec.garden); if (t) { t.sprite = CA.landmarkSprite(rec.garden); t.top = CA.oldGardenTop(r.stage); } }
        if (r.stage >= L.RESTORE.length && rec) { addFern(rec); celebrations.push({ title: 'A new neighbour!', emojis: ['🦌', '🏡'], label: 'Fern the deer loved the garden so much she moved in.' }); }
        nextCelebration(); checkAchievements();
      }
      saveProgress(); showRestore();
    };
    body.append(el);
  }
}

// ---------- daily quests ----------
function questState() {
  const day = RD ? RD.dayNo : gameDay(), key = 'q:' + day;
  const st = statsView();
  if (!S.progress.daily[key]) S.progress.daily[key] = { base: Object.fromEntries(L.QUESTS.map(q => [q.stat, st[q.stat] || 0])), done: {} };
  const q = S.progress.daily[key];
  return L.questsFor(day).map(x => ({ ...x, have: Math.min(x.n, (st[x.stat] || 0) - (q.base[x.stat] || 0)), done: !!q.done[x.id] }));
}
function checkQuests() {
  const day = RD ? RD.dayNo : gameDay(), key = 'q:' + day;
  for (const q of questState()) if (!q.done && q.have >= q.n) { S.progress.daily[key].done[q.id] = 1; setCoins(S.coins + 20, true); bumpStat('quests'); toast(`Quest done: ${q.text}! +20 ✦`); SND.sfx('done'); }
  for (const k of Object.keys(S.progress.daily)) if (k.startsWith('q:') && +k.slice(2) < day - 1) delete S.progress.daily[k];
  saveProgress();
}

// ---------- arcade games ----------
function gameDone(id, res) {
  const sc = (res && res.score) || 0;
  S.progress.highscores = S.progress.highscores || {};
  const best = S.progress.highscores[id] || 0;
  if (sc > best) S.progress.highscores[id] = sc;
  const coins = Math.min(25, Math.floor(sc / 4));
  if (coins) setCoins(S.coins + coins, true);
  S.progress.needs.fun = Math.min(100, S.progress.needs.fun + 10 + Math.min(20, sc));
  addXP('logic', Math.min(12, sc / 3));
  bumpStat('games');
  if (sc) { player.say(sc > best ? '🏆' : '😄', 2); toast(`${GAMES[id].name}: ${sc} points${coins ? `, +${coins} ✦` : ''}${sc > best && best ? '. New high score!' : ''}`); }
  staffReact({ emotes: ['🏆'] });
  saveProgress(); checkAchievements();
}

// ---------- boats and fishing ----------
const BOAT = { dock: null };
function seaTileNear(x, y, r = 8) {
  let best = null, bd = Infinity;
  for (let j = Math.floor(y - r); j <= y + r; j++) for (let i = Math.floor(x - r); i <= x + r; i++) {
    if (!cityWorld.inb(i, j) || cityWorld.get(i, j) !== T.SEA) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => cityWorld.get(i + a, j + b) === T.SEA).length >= 3;
    const d = Math.hypot(i + 0.5 - x, j + 0.5 - y); if (open && d < bd) { bd = d; best = [i, j]; }
  }
  return best;
}
function startBoat() {
  if (sceneName !== 'city' || player.boat) return;
  const at = seaTileNear(player.x, player.y);
  if (!at) { toast('There’s no open water close by. Try the marina or a pier.'); return; }
  cancelActions(); closePie(); closeSheet();
  const base = cityWorld, bw = Object.create(base);
  bw.walkable = (i, j) => base.inb(i, j) && base.get(i, j) === T.SEA; bw.edge = null; bw.boating = true;
  BOAT.dock = [player.x, player.y]; BOAT.world = bw;
  fadeTo(() => {
    world = bw; player.x = at[0] + 0.5; player.y = at[1] + 0.5; player.path = []; player.onArrive = null; player.boat = true; player.pose = null; lastNear = '';
    document.body.classList.add('boating'); SND.sfx('splash'); toast('Steer with the stick or tap the water. Tap 🎣 to fish!'); bumpStat('boats');
  });
}
function endBoat() {
  if (!player.boat) return;
  fadeTo(() => {
    world = cityWorld; player.boat = false; player.pose = null; player.path = []; lastNear = '';
    const d = BOAT.dock || C.stop.stand; player.x = d[0]; player.y = d[1];
    document.body.classList.remove('boating');
  });
}
function castLine() {
  if (!player.boat || GAME.isOpen()) return;
  player.arms = 'hold'; player.say('🎣', 1.5); SND.sfx('splash');
  GAME.fish(res => {
    player.arms = null;
    if (res && res.caught) {
      const f = res.caught;
      S.progress.inventory.fish = (S.progress.inventory.fish || 0) + 1;
      setCoins(S.coins + f.coins, true); bumpStat('fish');
      S.progress.catches = S.progress.catches || {}; S.progress.catches[f.name] = (S.progress.catches[f.name] || 0) + 1;
      S.progress.needs.fun = Math.min(100, S.progress.needs.fun + 14);
      player.say(f.icon, 2.5); SND.sfx('coin'); toast(`You caught a ${f.name}! +${f.coins} ✦ and a fish for your bag.`);
      saveProgress(); checkAchievements();
    } else if (res && !res.quit) player.say('💦', 1.6);
  }, skillLv('fitness') + (raining() ? 3 : 0));
}
function drawRowboat(sx, sy, z) {
  const bob = Math.sin(time * 1.6) * 2 * z;
  ctx.save(); ctx.translate(sx, sy + bob); ctx.scale(z, z);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(0, 8, 44, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#C98A4B'; ctx.strokeStyle = '#7A5236'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(40, -6); ctx.quadraticCurveTo(36, 10, 20, 10); ctx.lineTo(-24, 10); ctx.quadraticCurveTo(-38, 8, -40, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F0587A'; ctx.fillRect(-36, -3, 72, 4);
  ctx.restore();
}

// ---------- inside places: cafés, shops, the arcade... ----------
const ROOMS = {};
let ROOM = null;
const kitFor = o => o && o.kind === 'venue' ? KIT_OF[kindKey(o)] || null : null;
function getRoom(v) {
  const key = C.id + ':' + v.id;
  if (!ROOMS[key]) { const rw = buildInterior(v, kitFor(v), kindKey(v)); ROOMS[key] = { world: rw, ...makeRoomThings(rw), npcs: [] }; }
  return ROOMS[key];
}
function hashStr(t) { let x = 7; for (const ch of t) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; }
function cloneNpc(n, x, y) {
  const w = new Walker(x, y, n.species, n.outfit, { speed: 1.3, seed: n.seed, name: n.name });
  w.data = n.data; w.orig = n; w.needs = n.needs; w.traits = n.traits; w.doing = n.doing; w.busy = 0; w.home = n.home;
  return w;
}
function visitorNpc(seed, x, y, title) {
  const species = Object.keys(A.SPECIES)[seed % Object.keys(A.SPECIES).length];
  const w = new Walker(x, y, species, A.randomLook(seed * 7 + 3), { speed: 1.3, seed, name: title });
  w.data = { name: title, line: '' }; w.generic = true; w.needs = {}; w.traits = []; w.doing = title; w.busy = 0;
  return w;
}
function enterVenue(v) {
  cancelActions(); closePie();
  if (!kitFor(v)) return;
  ROOM = getRoom(v);
  const rw = ROOM.world;
  // who's here: the worker behind the counter, and any neighbour who came in
  const people = [];
  const worker = cityNpcs.find(n => n.task && n.task.kind === 'work' && n.task.place === v.id);
  const sp = rw.staffSpots[0];
  if (sp) {
    const st = worker ? cloneNpc(worker, sp[0], sp[1]) : visitorNpc(hashStr(v.id), sp[0], sp[1], STAFF_TITLE[rw.kit] || 'Helper');
    st.staff = true; st.spot = sp; st.doing = `Working at ${v.name}`; people.push(st);
  }
  const free = rw.seats.slice().sort(() => Math.random() - 0.5);
  const inside = cityNpcs.filter(n => n !== worker && n.task && n.task.place === v.id);
  for (const n of inside) { const seat = free.shift(); if (!seat) break; const c = cloneNpc(n, seat.use[0], seat.use[1]); seatAt(c, seat); c.sitK = 1; people.push(c); }
  const extra = Math.max(0, Math.min(free.length, 2 + (hashStr(v.id + dayOf(S.progress.clock)) % 2)) - inside.length);
  for (let k = 0; k < extra; k++) { const seat = free.shift(); if (!seat) break; const c = visitorNpc(hashStr(v.id) + k * 17 + 5, seat.use[0], seat.use[1], 'Visitor'); seatAt(c, seat); c.sitK = 1; people.push(c); }
  ROOM.npcs = people;
  fadeTo(() => { setScene('venue', ...rw.insideDoor); player.face(player.x - 1, player.y - 1); toast(`Welcome to ${v.name}!`); markVisited(v); });
}
// What people do once seated, by kind of place.
const SEAT_DOING = { cafe: ['sip', 'cup'], restaurant: ['eat', 'bowl'], library: ['read', 'book'], cinema: ['eat', 'popcorn'], office: ['type', null], lab: ['stir', null], workshop: ['chop', null] };
function seatAt(c, seat) {
  c.seat = seat; seat.taken = c; c.snapTo(seat.use[0], seat.use[1]); c.pose = seat.virtual ? null : 'sit'; if (seat.look) c.face(...seat.look);
  const doing = !seat.virtual && ROOM && SEAT_DOING[ROOM.world.kit];
  c.arms = doing ? doing[0] : null; c.prop = doing ? doing[1] : null;
  c.stay = 30 + Math.random() * 60; c.emoteT = 1 + Math.random() * 4;
}
function markVisited(v) { bumpStat('visits'); S.progress.places = S.progress.places || {}; if (!S.progress.places[v.id]) { S.progress.places[v.id] = 1; saveProgress(); checkAchievements(); } }
// Life inside: the worker serves and waves, customers eat, chat and come and go.
function interiorThink(n, dt) {
  if (n.busy > 0) { n.busy -= dt; n.face(player.x, player.y); return; }
  n.emoteT = (n.emoteT || 3) - dt;
  const kit = ROOM.world.kit;
  if (n.staff) {
    if (n.path.length) return;
    if (Math.hypot(n.x - n.spot[0], n.y - n.spot[1]) > 0.3) { const p = findPath(world, n.x, n.y, n.spot[0], n.spot[1]); if (p) n.go(p); return; }
    if (Math.hypot(player.x - n.x, player.y - n.y) < 3) n.face(player.x, player.y);
    if (n.emoteT <= 0) { n.emoteT = 4 + Math.random() * 4; n.say(({ cafe: ['☕', '😊', '🥐'], shop: ['🛒', '😊', '👋'], arcade: ['🕹️', '🏆', '😄'], restaurant: ['🍜', '🔥', '😋'], library: ['🤫', '📚'], museum: ['🤖', '🦖', '✨'], cinema: ['🍿', '🎬'], gym: ['💪', '👟'], office: ['💻', '💡'], lab: ['🧪', '🔬'], workshop: ['🎨', '✂️'] }[kit] || ['😊'])[Math.floor(Math.random() * 2.99)], 2); }
    return;
  }
  if (n.leaving) { if (!n.path.length && !n.onArrive) n.gone = true; return; }
  if (n.seat) {
    n.stay -= dt;
    if (n.emoteT <= 0) { n.emoteT = 3 + Math.random() * 4; n.say(({ cafe: ['😋', '☕', '💬', '😂'], restaurant: ['😋', '🍜', '🥟', '💬'], library: ['📖', '🤓', '💡'], museum: ['😮', '📸'], cinema: ['😂', '😮', '🍿'], office: ['⌨️', '💡'], lab: ['💥', '🤓'], workshop: ['🎨', '✨'] }[kit] || ['😊', '💬'])[Math.floor(Math.random() * 3.99) % 4] || '😊', 1.8); }
    if (n.stay <= 0 && !n.orig) { // visitors drift off and new ones wander in
      n.seat.taken = null; n.seat = null; n.pose = null; n.arms = null; n.prop = null; n.leaving = true;
      const out = ROOM.world.outsideDoor; const p = findPath(world, n.x, n.y, out[0], out[1]); if (p) n.go(p, () => { n.gone = true; }); else n.gone = true;
    }
  }
}
function interiorTick(dt) {
  if (sceneName !== 'venue' || !ROOM) return;
  for (const n of ROOM.npcs) { interiorThink(n, dt); n.update(dt); }
  if (ROOM.npcs.some(n => n.gone)) { ROOM.npcs = ROOM.npcs.filter(n => !n.gone); npcs = ROOM.npcs; }
  ROOM.arriveT = (ROOM.arriveT ?? 8) - dt;
  if (ROOM.arriveT <= 0) {
    ROOM.arriveT = 10 + Math.random() * 14;
    const seat = ROOM.world.seats.find(s => !s.taken && !s.virtual) || ROOM.world.seats.find(s => !s.taken);
    if (seat && ROOM.npcs.length < 7) {
      const out = ROOM.world.outsideDoor, c = visitorNpc(Math.floor(Math.random() * 999), out[0], out[1], 'Visitor');
      seat.taken = c; const p = findPath(world, out[0], out[1], seat.use[0], seat.use[1] + (seat.virtual ? 0 : 0.6));
      if (p) { c.go(p, () => seatAt(c, seat)); c.say('👋', 1.5); ROOM.npcs.push(c); npcs = ROOM.npcs; } else seat.taken = null;
    }
  }
}
function staffReact(def) {
  if (sceneName !== 'venue' || !ROOM) return;
  const st = ROOM.npcs.find(n => n.staff); if (!st) return;
  st.face(player.x, player.y); st.say(def.emotes ? def.emotes[0] : '😊', 2); st.wave = 1;
}

// ---------- towns ----------
const CITIES = {};
function getCity(id) {
  if (CITIES[id]) return CITIES[id];
  let rec;
  if (id === 'willowvale') {
    const wd = buildWorld(); addWillowvaleRoad(wd);
    const garden = placeOldGarden(wd);
    rec = { id, world: wd, venues: VENUES, districts: DISTRICTS, districtAt, neighbours: NEIGHBOURS, stop: wd.stop, garden };
  } else {
    const wd = buildCity(id);
    rec = { id, world: wd, venues: wd.venues, districts: wd.districts, districtAt: wd.districtAt, neighbours: wd.neighbours, stop: wd.stop };
  }
  const made = makeThings(rec.world);
  Object.assign(rec, made, { venuesById: made.byId, myHome: rec.world.objects.find(o => o.kind === 'myhome') || null });
  rec.npcs = makeNpcs(rec.neighbours, rec.world, id.length * 97);
  if (rec.garden && S.progress.restore.stage >= L.RESTORE.length) addFern(rec);
  rec.meta = cityMeta(id);
  CITIES[id] = rec;
  return rec;
}
function useCity(id) {
  C = getCity(id);
  cityWorld = C.world; cityThings = C.things; cityFlats = C.flats; cityNpcs = C.npcs; myHome = C.myHome; venuesById = C.venuesById;
  S.progress.city = id;
  SND.setCity(id);
  if (typeof socket !== 'undefined' && socket && socket.connected) joinTown();
}
if (!cityMeta(S.progress.city) || !cityOpen(S.progress.city)) S.progress.city = 'willowvale';
useCity(S.progress.city);
world = cityWorld; things = cityThings; flats = cityFlats; npcs = cityNpcs;
if (S.progress.city !== 'willowvale') { player.x = C.stop.stand[0]; player.y = C.stop.stand[1] + 1; }
let sceneName = 'city';
function setScene(name, x, y) {
  sceneName = name;
  if (name === 'home') { world = homeWorld; things = homeThings; flats = homeFlats; npcs = []; }
  else if (name === 'venue') { world = ROOM.world; things = ROOM.things; flats = ROOM.flats; npcs = ROOM.npcs; }
  else { world = cityWorld; things = cityThings; flats = cityFlats; npcs = cityNpcs; }
  player.x = x; player.y = y; player.path = []; player.onArrive = null; player.using = null; player.pose = null;
  if (player.boat) { player.boat = false; document.body.classList.remove('boating'); }
  marker = null; cam.free = false; cam.tz = 0; cam.manual = false;
  if (name === 'home' || name === 'venue') { cam.zoom = mobile() ? (name === 'venue' ? 0.46 : 0.4) : 0.66; const rc = roomCenter(); const p = A.P(rc[0], rc[1], 30); cam.x = p[0]; cam.y = p[1]; }
  else { cam.zoom = mobile() ? 0.56 : 0.72; const p = A.P(player.x, player.y, 34); cam.x = p[0]; cam.y = p[1]; }
  radarMap = buildRadarMap(); update.lastDistrict = null; lastNear = '';
  document.body.classList.toggle('indoors', name === 'home' || name === 'venue');
  document.body.classList.toggle('at-home', name === 'home');
  if (name !== 'home' && DECOR.on) endDecor();
}
function fadeTo(fn) {
  SND.sfx('door');
  const f = $('fade'); f.classList.add('on');
  setTimeout(() => { fn(); f.classList.remove('on'); }, S.settings.reduced ? 40 : 380);
}
function enterHome(o) {
  cancelActions(); closePie();
  const door = o && o.doorTile ? o.doorTile : myHome ? myHome.doorTile : C.stop.doorTile;
  S.progress.homeDoor = { city: C.id, x: door[0] + 0.5, y: door[1] + 0.5, name: o?.name || 'Your cottage' };
  fadeTo(() => { setScene('home', ...homeWorld.insideDoor); player.face(player.x - 1, player.y - 1); toast(o && o.home ? `Welcome home to ${o.name}` : 'Home sweet home'); });
}
function leaveHome() {
  cancelActions(); closePie();
  if (sceneName === 'venue') { const v = ROOM.world.venue, dt0 = v.doorTile || [v.i + v.w, v.j + v.d]; fadeTo(() => { setScene('city', dt0[0] + 0.5, dt0[1] + 0.5); player.face(player.x + 1, player.y + 1); }); return; }
  const hd = S.progress.homeDoor && S.progress.homeDoor.city === C.id ? S.progress.homeDoor : null;
  const [x, y] = hd ? [hd.x, hd.y] : myHome ? [myHome.doorTile[0] + 0.5, myHome.doorTile[1] + 0.5] : C.stop.stand;
  fadeTo(() => { setScene('city', x, y); player.face(player.x + 1, player.y + 1); });
}
// ---------- neighbours live their own lives ----------
// Each neighbour has the same six needs as you and picks what to do the way Sims do: every place and
// object advertises what it fixes, the neighbour scores each offer against their needs and traits,
// nearer offers score higher, and they choose among the best few. At night they go home to sleep.
const PLACE_WORDS = { cafe: 'At the café', market: 'At the market', community: 'At a workshop', theatre: 'At the theatre', library: 'At the library', marina: 'Fishing at the marina', clinic: 'Freshening up at the clinic', sunwheel: 'On the Sunwheel', windmill: 'By the windmill', fountain: 'At the fountain', bench: 'Resting on a bench' };
const benchTaken = new Set();
const sleepHours = n => { for (const t of n.traits) if (TRAITS[t]?.sleep) return TRAITS[t].sleep; return [22, 6]; };
const asleepAt = (n, h) => { const [a, b] = sleepHours(n); return a > b ? (h >= a || h < b) : (h >= a && h < b); };
const traitMult = (n, id) => n.traits.reduce((m, t) => m * (TRAITS[t]?.likes?.[id] ?? 1), 1);
function npcVisible(n) { return n.pose !== 'inside'; }
function npcEnd(n) {
  const t = n.task; if (!t) return;
  if (t.bench) benchTaken.delete(t.bench);
  if (t.partner && t.partner.task && t.partner.task.partner === n) { const p = t.partner; p.task = null; p.pose = null; p.arms = null; p.wait = 1 + Math.random() * 2; }
  n.task = null; n.pose = null; n.arms = null; n.prop = null; n.path = []; n.onArrive = null; n.wait = 1 + Math.random() * 3; n.doing = 'Out for a walk';
  if (n.baseSpeed) n.speed = n.baseSpeed;
}
// A morning jog: twice round the ring lane.
function npcJog(n) {
  const loop = cityWorld.jogLoop || [[10.5, 10.5], [33.5, 10.5], [33.5, 33.5], [10.5, 33.5]];
  let k0 = 0, bd = Infinity; loop.forEach(([x, y], k) => { const d = Math.hypot(x - n.x, y - n.y); if (d < bd) { bd = d; k0 = k; } });
  const pts = []; for (let k = 0; k <= loop.length * 2; k++) pts.push(loop[(k0 + k) % loop.length]);
  let path = [], from = [n.x, n.y];
  for (const p of pts) { const seg = findPath(cityWorld, from[0], from[1], p[0], p[1]); if (!seg) break; path = path.concat(seg.slice(1)); from = p; }
  if (path.length < 4) return false;
  n.task = { kind: 'jog', label: 'Out for a jog', phase: 'walk', emoteT: 2 }; n.doing = 'Out for a jog';
  n.speed = (n.baseSpeed || n.speed) * 1.8; n.jogDay = dayOf(S.progress.clock);
  n.go(path, () => { if (n.task && n.task.kind === 'jog') npcEnd(n); });
  return true;
}
function npcStart(n, task) {
  n.task = task; n.doing = task.label;
  const p = findPath(cityWorld, n.x, n.y, task.dest[0], task.dest[1]);
  if (!p) { npcEnd(n); return; }
  task.phase = 'walk';
  n.go(p.slice(1), () => {
    if (n.task !== task) return;
    task.phase = 'do'; task.t = 0; task.emoteT = 1 + Math.random() * 2;
    if (task.pose === 'inside') n.pose = 'inside';
    else if (task.pose === 'sit') { n.snapTo(task.seat[0], task.seat[1]); n.pose = 'sit'; }
    else if (task.look) n.face(...task.look);
    if (task.pose === 'ground') { n.pose = 'ground'; if (task.look) n.face(...task.look); }
    if (task.kind === 'chat') { const q = task.partner; if (!q.task || q.task.partner !== n) { npcEnd(n); return; } q.task.phase = 'do'; q.task.t = 0; n.face(q.x, q.y); q.face(n.x, n.y); n.arms = 'talk'; q.arms = 'talk'; }
    if (task.arms) n.arms = task.arms;
    if (task.prop) n.prop = task.prop;
  });
}
function npcDecide(n) {
  const h = hourOf(S.progress.clock), day = dayOf(S.progress.clock), weekday = day % 7 !== 6 && day % 7 !== 0;
  // routines: joggers run in the morning, workers head to work on weekdays
  if (n.data.jogger && h >= 6 && h < 9 && n.jogDay !== day && !asleepAt(n, h) && n.needs.energy > 35 && Math.random() < 0.7 && npcJog(n)) return;
  const job = n.data.work && venuesById[n.data.work];
  if (job && weekday && h >= 9 && h < 16 && n.workDay !== day && !asleepAt(n, h)) {
    n.workDay = day;
    const stand = job.flatArt || ACTIONS_STAND.has(kindKey(job));
    npcStart(n, { kind: 'work', label: `Working at ${job.name.replace(/^The /, '')}`, dest: approachOf(job, cityWorld), pose: stand ? 'stand' : 'inside', mins: (16 - h) * 60, gain: { social: 12, fun: 6 }, emotes: ['💼', '😊', '✨'], look: [job.i + job.w / 2, job.j + job.d / 2], place: job.id });
    return;
  }
  if (asleepAt(n, h)) {
    const wake = sleepHours(n)[1] * 60, now = S.progress.clock % 1440;
    npcStart(n, { kind: 'sleep', label: 'Asleep at home', dest: [n.home[0] + 0.5, n.home[1] + 0.5], pose: 'inside', mins: ((wake - now) + 1440) % 1440 || 60, gain: { energy: 95, hygiene: 40, hunger: 35, comfort: 30 } });
    return;
  }
  const picks = [];
  const add = (score, task) => picks.push({ score: score * (0.75 + Math.random() * 0.5), task });
  const scoreGain = gain => Object.entries(gain || {}).reduce((sum, [k, v]) => sum + v * Math.pow((100 - n.needs[k]) / 100, 2) * 2, 0);
  for (const t of cityThings) {
    const o = t.o; if (!t.interactive || !o) continue;
    npcOffers(n, o, add, scoreGain);
  }
  for (const f of cityFlats) if (f.obj && !f.obj.deco) npcOffers(n, f.obj, add, scoreGain);
  for (const f of cityFlats) {
    if (f.d.kind !== 'bench') continue;
    const key = f.d.i + ',' + f.d.j; if (benchTaken.has(key)) continue;
    const d = Math.hypot(f.x - n.x, f.y - n.y), def = actionsFor('bench')[0];
    add(scoreGain(def.gain) * traitMult(n, 'sit') / (1 + d / 14), { kind: 'act', label: PLACE_WORDS.bench, dest: [f.x, f.y], seat: [f.x, f.y], pose: 'sit', bench: key, mins: def.mins, gain: def.gain, emotes: ['☀️', '😌', '🐦'] });
  }
  for (const q of cityNpcs) {
    if (q === n || q.task || q.busy > 0 || asleepAt(q, h)) continue;
    const d = Math.hypot(q.x - n.x, q.y - n.y); if (d > 16) continue;
    add(scoreGain({ social: 30, fun: 6 }) * traitMult(n, 'chat') / (1 + d / 14), { kind: 'chat', label: `Chatting with ${q.name}`, partner: q, mins: 20, gain: { social: 30, fun: 6 }, emotes: ['💬', '😄', '🌼', '🎵', '😂'] });
  }
  add(3 + Math.random() * 3, { kind: 'wander', label: 'Out for a walk' });
  picks.sort((a, b) => b.score - a.score);
  const top = picks.slice(0, 3), pick = top[Math.floor(Math.random() * top.length)].task;
  if (pick.kind === 'wander') {
    for (let k = 0; k < 6; k++) {
      const ti = n.home[0] + Math.floor((Math.random() - 0.5) * 14), tj = n.home[1] + Math.floor((Math.random() - 0.5) * 14);
      if (!cityWorld.walkable(ti, tj)) continue;
      const p = findPath(cityWorld, n.x, n.y, ti + 0.5, tj + 0.5);
      if (p && p.length < 20) { n.go(p.slice(1)); n.wait = 2 + Math.random() * 4; n.doing = 'Out for a walk'; return; }
    }
    n.wait = 2; return;
  }
  if (pick.kind === 'chat') {
    const q = pick.partner, qi = Math.floor(q.x), qj = Math.floor(q.y);
    const side = [[qi + 1, qj - 1], [qi - 1, qj + 1], [qi + 1, qj], [qi, qj + 1]].find(([a, b]) => cityWorld.walkable(a, b));
    if (!side) { n.wait = 2; return; }
    pick.dest = [side[0] + 0.5, side[1] + 0.5];
    q.path = []; q.onArrive = null; q.task = { kind: 'chat', label: `Chatting with ${n.name}`, partner: n, phase: 'wait', mins: 20, gain: pick.gain, emotes: pick.emotes }; q.doing = q.task.label;
  }
  if (pick.bench) benchTaken.add(pick.bench);
  npcStart(n, pick);
}
const ACTIONS_STAND = new Set(['nightmarket', 'bazaar', 'chai', 'garden', 'shrinegarden', 'koi', 'track', 'rangoli', 'bandstand', 'bigtree', 'admire']);
function npcOffers(n, o, add, scoreGain) {
  const key = kindKey(o); if (!key || key === 'myhome' || key === 'busstop') return;
  const dest = approachOf(o, cityWorld), d = Math.hypot(dest[0] - n.x, dest[1] - n.y);
  const word = PLACE_WORDS[key] || (o.name ? `At ${o.name.replace(/^The /, '')}` : 'Out and about');
  for (const def of actionsFor(key)) {
    if (def.special || def.job || def.hearts || def.needSkill || def.pose === 'jog') continue;
    let dd = dest;
    if (o.flatArt || o.flat) dd = [o.i + 0.5 + Math.random() * (o.w - 1), o.j + 0.5 + Math.random() * (o.d - 1)];
    const wet = (weatherNow() === 'rain' || weatherNow() === 'snow') && (def.pose === 'stand' || def.pose === 'ground' || o.flatArt || o.flat || o.kind === 'bench' || o.kind === 'fountain') ? 0.25 : 1;
    add(scoreGain(def.gain) * traitMult(n, def.id) * wet / (1 + d / 14), { kind: 'act', label: word, dest: dd, pose: def.pose === 'stand' || def.pose === 'ground' ? def.pose : 'inside', mins: def.mins, gain: def.gain, emotes: def.emotes, arms: def.arms, prop: def.prop, look: [o.i + (o.w || 1) / 2, o.j + (o.d || 1) / 2], place: o.kind === 'venue' ? o.id : o.kind });
  }
}
function npcThink(n, dt, gm) {
  // needs keep moving wherever you are
  const sleeping = n.task && n.task.kind === 'sleep' && n.task.phase === 'do';
  for (const nd of NEEDS) {
    let rate = nd.decay * n.traits.reduce((m, t) => m * (TRAITS[t]?.decay?.[nd.k] ?? 1), 1);
    if (sleeping) rate *= 0.3;
    n.needs[nd.k] = Math.max(0, n.needs[nd.k] - rate * gm / 60);
  }
  if (n.busy > 0) {
    if (n.task) npcEnd(n);
    n.busy -= dt; if (sceneName === 'city') n.face(player.x, player.y); n.doing = `With ${S.profile?.name || 'you'}`;
    return;
  }
  const t = n.task;
  if (t) {
    if (t.phase === 'do') {
      const part = Math.min(gm, t.mins - t.t); t.t += part;
      for (const [k, v] of Object.entries(t.gain || {})) n.needs[k] = Math.min(100, n.needs[k] + v * part / t.mins);
      t.emoteT -= dt;
      if (t.emoteT <= 0 && t.emotes && n.pose !== 'inside') { t.emoteT = 2.2 + Math.random() * 2; n.say(t.emotes[Math.floor(Math.random() * t.emotes.length)], 1.8); }
      if (t.kind === 'chat' && t.partner && (!t.partner.task || t.partner.task.partner !== n)) { npcEnd(n); return; }
      if (t.t >= t.mins - 0.001) npcEnd(n);
    } else if (t.phase === 'wait') { if (!t.partner.task || t.partner.task.partner !== n) npcEnd(n); }
    else if (t.kind === 'jog') { t.emoteT -= dt; if (t.emoteT <= 0) { t.emoteT = 3 + Math.random() * 3; n.say(['💦', '🏃', '💪', '☀️'][Math.floor(Math.random() * 4)], 1.4); } if (!n.path.length && !n.onArrive) npcEnd(n); }
    else if (!n.path.length && !n.onArrive) npcEnd(n);
    return;
  }
  if (n.path.length) return;
  if (sceneName === 'city' && Math.hypot(player.x - n.x, player.y - n.y) < 2.2) { n.face(player.x, player.y); if (!n.greeted) { n.greeted = true; n.say(['👋', '☀️', '💛', '🎵'][n.seed % 4]); } }
  else n.greeted = false;
  n.wait -= dt;
  if (n.wait > 0) return;
  npcDecide(n);
}
// How many neighbours are inside each place right now (shown on the place's name tag).
function insideCount(place) { let c = 0; for (const n of cityNpcs) if (n.pose === 'inside' && n.task && n.task.place === place) c++; return c; }

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
  cam.manual = true;
  const before = toWorld(ax, ay);
  cam.zoom = Math.max(ADMIN.on ? 0.12 : 0.3, Math.min(1.5, z));
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
  const garden = ctx.createLinearGradient(0, 0, 0, H);
  garden.addColorStop(0, '#BDE7C4'); garden.addColorStop(1, '#8FCB78');
  grads = { w: W, h: H, sea, sun, garden };
  return grads;
}
function drawSea() {
  if (world.interior) { ctx.fillStyle = gradients().garden; ctx.fillRect(0, 0, W, H); return; }
  ctx.fillStyle = gradients().sea; ctx.fillRect(0, 0, W, H);
}

// One bad frame must never stop the game: log it and keep the loop running.
function frame(now) {
  try { drawFrame(now); } catch (e) { console.error('frame error', e); }
  requestAnimationFrame(frame);
}
function drawFrame(now) {
  const dt = S.sheet === 'pause' ? 0 : Math.min(0.05, (now - t0) / 1000); t0 = now; time += S.settings.reduced ? dt * 0.4 : dt;
  update(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawSea();
  const z = cam.zoom;
  // visible tile window
  const corners = [toWorld(0, 0), toWorld(W, 0), toWorld(0, H), toWorld(W, H)];
  const i0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c[0]))) - 2), i1 = Math.min(N - 1, Math.ceil(Math.max(...corners.map(c => c[0]))) + 2);
  const j0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c[1]))) - 2), j1 = Math.min(N - 1, Math.ceil(Math.max(...corners.map(c => c[1]))) + 4);

  const indoor = !!world.interior;
  // sea sparkle
  if (!indoor) {
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
  }

  // ground tiles, cliffs and foam
  const sea = (i, j) => !indoor && world.get(i, j) === T.SEA;
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
    else tileSpr(world.skin?.[t] ?? t, i, j).draw(ctx, sx, sy, z);
  }
  // edges: path curbs and shoreline foam
  ctx.lineCap = 'round';
  const roadEdge = (a, b) => { const n = world.get(a, b); return n !== T.PATH && n !== T.PLAZA && n !== T.DOCK && n !== T.SEA; };
  ctx.beginPath();
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = world.get(i, j); if (t === T.PATH || t === T.PLAZA) edgeLines(i, j, roadEdge); }
  ctx.strokeStyle = 'rgba(170,128,70,.42)'; ctx.lineWidth = 2.2 * z; ctx.stroke();
  if (!indoor) {
  ctx.beginPath();
  const foam = 22 * z + Math.sin(time * 1.6) * 3 * z;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = world.get(i, j); if (t !== T.SEA) edgeLines(i, j, sea, foam); }
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = (3.2 + Math.sin(time * 2) * 0.8) * z; ctx.stroke();
  }
  // cloud shadows drift across the island
  if (!S.settings.reduced && !indoor) {
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
  for (const f of flats) { const [sx, sy] = toScreen(f.x, f.y); if (onScreen(sx, sy, (f.obj ? 420 : 80) * z)) { f.sprite.draw(ctx, sx, sy, z); if (f.furn && f.furn.type === 'plot') drawPlotLive(f, sx, sy, z); } }
  drawPickups(z);
  if (world === homeWorld) drawDecorGrid(z);
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
  const chars = [player, ...npcs, ...shownPeers()].map(c => {
    if (c.using && c.using.type === 'sofa') return { char: c, box: [c.x - 0.2, c.y - 0.25, c.x + 0.2, c.y + 0.25] };
    if (c.using) { const u = c.using; return { char: c, box: [u.i + 0.02, u.j + 0.02, u.i + u.w + 0.02, u.j + u.d + 0.02] }; }
    return { char: c, box: [c.x - 0.25, c.y - 0.25, c.x + 0.25, c.y + 0.25] };
  });
  for (const c of chars) { const [sx, sy] = toScreen(c.char.x, c.char.y); if (onScreen(sx, sy, 100)) list.push(c); }
  drawn = sortScene(list);
  for (const t of drawn) drawThing(t, z);
  drawPlayerIfHidden(z);
  drawFx(z);

  // overlays
  if (!indoor) for (const b of butterflies) {
    const x = b.cx + Math.sin(time * 0.6 + b.seed) * 1.6, y = b.cy + Math.cos(time * 0.45 + b.seed * 2) * 1.6;
    const [sx, sy] = toScreen(x, y, 30 + Math.sin(time * 3 + b.seed) * 8);
    if (!onScreen(sx, sy, 20)) continue;
    const f = Math.abs(Math.sin(time * 14 + b.seed)) * 0.8 + 0.2;
    ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(sx - 3 * z * f, sy, 3.5 * z * f, 3 * z, 0, 0, 7); ctx.ellipse(sx + 3 * z * f, sy, 3.5 * z * f, 3 * z, 0, 0, 7); ctx.fill();
  }
  for (const c of [player, ...npcs, ...shownPeers()]) {
    if (!c.emote) continue;
    const [sx, sy] = toScreen(c.x, c.y);
    A.drawEmote(ctx, sx, sy - 74 * z, Math.max(0.7, z), c.emote, c.emoteLife);
  }
  drawLabels(z);
  drawPeerNames(z);
  if (!indoor) drawBirds(dt);
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
  drawDaylight(z);
}

// Sun by day, warm evening light, then night with lamps glowing.
const setTimeout0 = [];
function drawWeather(z) {
  if (world.interior) return;
  const w = weatherNow();
  if (w === 'cloudy' || w === 'rain' || w === 'snow') { ctx.fillStyle = w === 'rain' ? 'rgba(60,80,110,.16)' : w === 'snow' ? 'rgba(235,242,255,.14)' : 'rgba(90,100,120,.08)'; ctx.fillRect(0, 0, W, H); }
  if (S.settings.reduced) return;
  if (w === 'rain') { ctx.strokeStyle = 'rgba(200,225,255,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let k = 0; k < 140; k++) { const x = ((k * 97.3 + time * 60) % (W + 80)) - 40, y = ((k * 53.7 + time * 620) % (H + 60)) - 30; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); } ctx.stroke(); }
  if (w === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 110; k++) { const x = ((k * 97.3 + Math.sin(time + k) * 20 + time * 12) % (W + 40)) - 20, y = ((k * 61.1 + time * 46) % (H + 40)) - 20; ctx.beginPath(); ctx.arc(x, y, 1.4 + (k % 3), 0, 7); ctx.fill(); } }
}
function drawDaylight(z) {
  while (setTimeout0.length) setTimeout0.shift()();
  drawWeather(z);
  const hr = hourOf(S.progress.clock), [r, g, b, a] = skyTint(hr);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - a * 2.2); ctx.fillStyle = gradients().sun; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  if (a > 0.005) { ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`; ctx.fillRect(0, 0, W, H); }
  if (a > 0.15) {
    ctx.globalCompositeOperation = 'lighter';
    const k = Math.min(1, (a - 0.15) / 0.25);
    for (const t of things) {
      const lamp = t.o && (t.o.kind === 'lamp' || t.o.lamp);
      if (!lamp) continue;
      const [sx, sy] = t.o.lamp ? toScreen(t.ax + 0.5, t.ay + 0.5, 70) : toScreen(t.ax, t.ay, 78);
      if (sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200) continue;
      F.lampGlow(ctx, sx, sy, 150 * z, 0.32 * k);
    }
    if (world.interior) for (const w of world.walls) if (w.win) { const [sx, sy] = w.axis === 'i' ? toScreen(HOME_O[0] + w.k + 0.5, HOME_O[1] + w.at, 70) : toScreen(HOME_O[0] + w.at, HOME_O[1] + w.k + 0.5, 70); F.lampGlow(ctx, sx, sy, 90 * z, 0.12 * k); }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
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

// How a character is drawn this frame: seated blend, three-quarter turn, glide offset.
function charOpts(c) {
  const sit = c.sitK > 0.02 && c.pose !== 'sleep';
  return { t: time, walk: c.walk, moving: c.moving, dir: c.pose === 'sleep' || c.faceFront ? 'front' : c.dir, flip: c.flip, seed: c.seed, turn: !c.faceFront && c.pose !== 'sleep', wave: c.wave > 0, happy: c.wave > 0 || !!c.emote, pose: sit ? 'sit' : c.pose === 'sleep' ? 'stand' : c.pose, sitK: c.sitK, ground: (c.pose || c.lastSeat) === 'ground', asleep: c.pose === 'sleep', shadow: c.pose !== 'sleep', arms: c.arms, prop: c.prop, override: c.override, blanket: c.pose === 'sleep' ? c.blanket : null, shake: c.shake > 0 ? Math.min(1, c.shake) : 0, saved: c.saved };
}
function drawThing(t, z) {
  if (t.char) {
    const c = t.char;
    if (c.pose === 'inside') return;
    const [sx, sy] = toScreen(c.x + (c.ox || 0), c.y + (c.oy || 0));
    if (c.boat) drawRowboat(sx, sy, z * 1.15);
    ctx.save(); ctx.translate(sx, sy - (c.boat ? 8 * z : 0) + (c.boat ? Math.sin(time * 1.6) * 2 * z : 0)); ctx.scale(z * 1.15, z * 1.15);
    if (c.pose === 'sleep') { ctx.translate(0, -24); ctx.rotate(c.flip ? 1.25 : -1.25); ctx.translate(0, 26); }
    if (c !== player) setTimeout0.push(() => drawRequestBadge(c, sx, sy, z));
    A.drawAnimal(ctx, c.species, c.outfit, charOpts(c));
    ctx.restore();
    return;
  }
  if (t.live === 'boat') { const [sx, sy] = toScreen(t.ax, t.ay); A.drawBoat(ctx, sx, sy, z, time, t.o); return; }
  const [sx, sy] = t.centered ? toScreen(t.ax, t.ay) : toScreen(t.ax, t.ay);
  if (t.o.kind === 'tree' && !S.settings.reduced) {
    // gentle sway
    ctx.save(); ctx.translate(sx, sy); ctx.transform(1, 0, Math.sin(time * 1.2 + t.ax * 0.7 + t.ay) * 0.025, 1, 0, 0);
    t.sprite.draw(ctx, 0, 0, z); ctx.restore();
  } else if (t.flipX) { ctx.save(); ctx.translate(sx, sy); ctx.scale(-1, 1); t.sprite.draw(ctx, 0, 0, z); ctx.restore(); }
  else t.sprite.draw(ctx, sx, sy, z);
  if (t.live === 'fountain') A.drawFountainWater(ctx, sx, sy, z, time);
  else if (t.live === 'clock') A.drawClockHands(ctx, sx, sy, z, new Date());
  else if (t.live === 'sunwheel') A.drawSunwheel(ctx, sx, sy, z, time);
  else if (t.live === 'windmill') A.drawWindmillBlades(ctx, sx, sy, z, time);
  if (t.balc && t.balc.length && z > 0.3) drawBalconyPeople(t, sx, sy, z);
  if (t.furn) F.drawFurnitureLive(ctx, t.o, sx, sy, z, time, activeObject() === t.o || (t.o.type === 'tv' && act && act.phase === 'do' && act.step.tv) || (t.o.type === 'stove' && act && act.phase === 'do' && act.step.objType === 'stove'));
  t.sx = sx; t.sy = sy;
}

// Neighbours out on their balconies: waving in the day, a few night owls after dark.
const SPECIES_LIST = Object.keys(A.SPECIES);
function drawBalconyPeople(t, sx, sy, z) {
  const h = hourOf(S.progress.clock), night = h < 6 || h >= 21, slot = Math.floor(S.progress.clock / 90);
  t.balc.forEach((b, k) => {
    const seed = hashStr((t.o.id || t.o.name || '') + k);
    const here = ((seed + slot * 7) % 10) < (night ? 1 : 4);
    if (!here) return;
    const look = t.balcLooks[k] || (t.balcLooks[k] = A.randomLook(seed));
    const [px, py] = A.P(b[0], b[1], b[2]);
    ctx.save(); ctx.translate(sx + px * z, sy + py * z); ctx.scale(z * 0.72, z * 0.72);
    const waving = ((time + seed % 9) % 7) < 1.3;
    A.drawAnimal(ctx, SPECIES_LIST[seed % SPECIES_LIST.length], look, { t: time, dir: 'front', flip: seed % 2 === 0, seed, turn: true, wave: waving, happy: waving, shadow: false });
    ctx.restore();
  });
}

// Steam and bubbles in the shower, droplets when shaking dry.
function drawFx(z) {
  const showering = act && act.phase === 'do' && act.step.pose === 'shower';
  const burning = act && act.phase === 'do' && act.step.burnable && act.item.burnt;
  if (burning) { const [bx, by] = toScreen(player.x - 0.6, player.y - 1, 40); for (let k = 0; k < 5; k++) { const ph = (time * 0.6 + k / 5) % 1; ctx.fillStyle = `rgba(90,90,100,${0.35 * (1 - ph)})`; ctx.beginPath(); ctx.arc(bx + Math.sin(k * 2 + time) * 10 * z, by - ph * 60 * z, (6 + ph * 10) * z, 0, 7); ctx.fill(); } }
  if (!showering && !(player.shake > 0)) return;
  const [sx, sy] = toScreen(player.x, player.y);
  ctx.save();
  if (showering) {
    for (let k = 0; k < 7; k++) { const ph = (time * 0.5 + k / 7) % 1; ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(k * 2.1 + time) * 18 * z, sy - (40 + ph * 70) * z, (8 + ph * 12) * z, 0, 7); ctx.fill(); }
    for (let k = 0; k < 6; k++) { const ph = (time * 0.8 + k / 6) % 1; ctx.strokeStyle = `rgba(180,225,245,${1 - ph})`; ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.arc(sx + Math.cos(k * 1.7) * 14 * z, sy - (30 + k * 6 + ph * 25) * z, 3 * z, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  if (player.shake > 0) {
    ctx.fillStyle = 'rgba(127,200,221,.85)';
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + time * 3, r = (18 + (1.1 - player.shake) * 40) * z; ctx.beginPath(); ctx.ellipse(sx + Math.cos(a) * r, sy - 40 * z + Math.sin(a) * r * 0.6, 2.2 * z, 3.2 * z, a, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}

// When a building stands between the camera and the player, show the player through it.
function drawPlayerIfHidden(z) {
  const k = drawn.findIndex(t => t.char === player);
  if (k < 0 || player.sitK > 0.4 || player.pose === 'sleep') return;
  const [sx, sy] = toScreen(player.x + player.ox, player.y + player.oy);
  const probes = [[sx, sy - 30 * z], [sx, sy - 60 * z], [sx, sy - 8 * z]];
  const hidden = drawn.slice(k + 1).some(t => t.sprite && t.sx !== undefined && !t.centered && probes.some(([px, py]) => t.sprite.hit((px - t.sx) / z, (py - t.sy) / z)));
  if (!hidden) return;
  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.translate(sx, sy); ctx.scale(z * 1.15, z * 1.15);
  A.drawAnimal(ctx, player.species, player.outfit, { ...charOpts(player), shadow: false });
  ctx.restore();
}

function drawLabels(z) {
  if (!S.settings.labels || z < 0.38) return;
  ctx.save();
  const fs = Math.round(Math.max(11, Math.min(15, 13 * z * 1.4)));
  ctx.font = `700 ${fs}px "Baloo 2", system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const flatTags = world.interior ? [] : flats.filter(f => f.obj && !f.obj.deco).map(f => ({ o: f.obj, top: 30 }));
  for (const t of [...drawn, ...flatTags]) {
    const o = t.o; if (!o || !t.top) continue;
    let text = null, icon = '', col = '#26395A';
    if (o.kind === 'venue') { const c = insideCount(o.id); text = o.name.replace(/^The /, '') + (c ? `  👥 ${c}` : ''); icon = o.icon; col = o.color; }
    else if (o.home && S.sheet === 'homes') { const st = homeStatus(o); text = st === 'Available' ? `✦ ${o.rent}/day` : st; icon = '🏠'; col = '#3FA86A'; }
    else if (o.kind === 'sunwheel') { text = 'Sunwheel'; icon = '🎡'; col = '#F0587A'; }
    else if (o.kind === 'myhome') { text = 'Your home'; icon = '🏡'; col = '#F2A93B'; }
    else if (o.home && homeIsMine(o)) { text = 'Your home'; icon = '🏡'; col = '#F2A93B'; }
    else if (o.kind === 'busstop') { text = 'Island bus'; icon = '🚌'; col = '#3F6FD8'; }
    else if (o.kind === 'landmark' && o.name && (t.top > 60 || o.flat)) { text = o.name.replace(/^The /, ''); icon = o.icon || '⭐'; col = C.meta.color; }
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
  const onboardingOpen = !$('onboarding').classList.contains('hidden');
  // game time: speed setting, faster while asleep at work or at a long show
  const curDef = act && act.phase === 'do' ? act.step : null;
  const fast = curDef && curDef.fast ? curDef.fast : 1;
  const gm = onboardingOpen ? 0 : dt * GAME_MIN_PER_SEC * S.speed * fast;
  const simDt = dt * Math.min(S.speed, 3);
  if (gm) { tickClock(gm); tickNeeds(gm, curDef); tickAction(gm, dt); }
  // direct walking from the stick or keyboard (screen directions turned into grid directions)
  const running = S.run || keys.has('run');
  const tired = S.progress.needs.energy < 10 ? 0.7 : 1;
  player.speed = BASE_SPEED * (player.boat ? 1.7 : 1) * (running ? 1.7 : 1) * tired * (1 + 0.02 * skillLv('fitness')) * (player.jogging ? 1.5 : 1);
  let sx = 0, sy = 0, mag = 0;
  if (keys.has('up')) sy -= 1; if (keys.has('down')) sy += 1; if (keys.has('left')) sx -= 1; if (keys.has('right')) sx += 1;
  if (sx || sy) { const m = Math.hypot(sx, sy); sx /= m; sy /= m; mag = 1; }
  else if (joy.vx || joy.vy) { mag = Math.min(1, Math.hypot(joy.vx, joy.vy)); sx = joy.vx / mag; sy = joy.vy / mag; }
  let kx = 0, ky = 0;
  if (mag) { kx = sx / 64 + sy / 32; ky = sy / 32 - sx / 64; const m = Math.hypot(kx, ky); kx /= m; ky /= m; }
  if (mag) {
    if (act || queue.length) cancelActions();
    player.path = []; player.onArrive = null; marker = null; cam.free = false;
    const sp = player.speed * simDt * (0.35 + 0.65 * mag), nx = player.x + kx * sp, ny = player.y + ky * sp;
    const ok = (x, y) => { const ci = Math.floor(player.x), cj = Math.floor(player.y), ti = Math.floor(x), tj = Math.floor(y); return world.walkable(ti, tj) && stepOK(world, ci, cj, ti, tj); };
    if (ok(nx, ny)) { player.x = nx; player.y = ny; }
    else if (ok(nx, player.y)) player.x = nx;
    else if (ok(player.x, ny)) player.y = ny;
    player.face(player.x + kx, player.y + ky); player.moving = true; player.walk += sp * 5.2; player.tick(simDt);
    hideHint();
  } else player.update(simDt);
  updateNearby();
  if (player.shake > 0) { player.shake -= dt; if (player.shake <= 0) { player.shake = 0; player.override = null; player.faceFront = false; } }
  if (player.moving) { const st = Math.floor(player.walk / 3.14); if (st !== update.lastStep) { update.lastStep = st; SND.sfx('step'); if (st % 8 === 0) addXP('fitness', 1); } }
  if (!onboardingOpen) autonomy(dt);
  for (const n of cityNpcs) { npcThink(n, simDt, gm); n.update(simDt); }
  tickPeers(dt);
  interiorTick(simDt);
  updateHudClock();
  // camera
  const onboarding = !$('onboarding').classList.contains('hidden');
  let target;
  if (onboarding) { onboardT += dt; target = A.P(22 + Math.cos(onboardT * 0.08) * 7, 22 + Math.sin(onboardT * 0.08) * 7, 30); }
  else if (world.interior) {
    // overview of the cottage, but a close-up on you while you're busy with something
    const busy = (act && act.phase === 'do') || player.shake > 0;
    const rc = roomCenter(), c = A.P(rc[0], rc[1], 30), p = A.P(player.x, player.y, 36), w = busy ? 1 : 0.4;
    target = [c[0] * (1 - w) + p[0] * w, c[1] * (1 - w) + p[1] * w];
    if (!cam.manual && !cam.tz) { const want = busy ? (mobile() ? 0.66 : 0.9) : (mobile() ? 0.4 : 0.62); cam.zoom += (want - cam.zoom) * (S.settings.reduced ? 1 : 1 - Math.exp(-dt * 2.5)); }
  }
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
  const d = world.venueRoom ? 'venue' : world.interior ? 'home' : square ? 'square' : C.districtAt(player.x, player.y);
  if (d + C.id !== update.lastDistrict) {
    update.lastDistrict = d + C.id;
    $('district-name').textContent = d === 'venue' ? world.venue.name : d === 'home' ? (S.progress.homeDoor?.name || 'Your cottage') : square ? (C.id === 'willowvale' ? 'Town Square' : C.meta.name) : C.districts[d].name;
    $('district-name').style.background = d === 'venue' ? A.darken(world.venue.color || '#C98A1E', 0.1) : d === 'home' ? '#C98A1E' : square ? A.darken(C.meta.color, 0.1) : A.darken(C.districts[d].color, 0.15);
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
      if (t.char === player || t.char.pose === 'inside') continue;
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
  if (DECOR.on) { decorTap(sx, sy); return; }
  if (player.boat) { const [wx, wy] = toWorld(sx, sy); const ti = Math.floor(wx), tj = Math.floor(wy); if (world.walkable(ti, tj)) { walkTo(ti + 0.5, tj + 0.5); } else toast('Tap the water to steer, or ⚓ to go back to shore.'); return; }
  if (!$('onboarding').classList.contains('hidden')) return;
  hideHint();
  if (S.sheet) closeSheet(); // tapping the town means you're done with the open screen
  const hit = hitThing(sx, sy);
  if (hit && hit.char) { showPie({ npc: hit.char }, sx, sy); return; }
  if (hit) { showPie({ o: hit.o }, sx, sy); return; }
  const [x, y] = toWorld(sx, sy), ti = Math.floor(x), tj = Math.floor(y);
  // flat things you can still use: the front door mat and benches
  if (world.interior && world.doorObj && ti === world.doorObj.i && tj === world.doorObj.j) { showPie({ o: world.doorObj }, sx, sy); return; }
  const mat = world.interior && flats.find(f => f.tap && f.furn && ti >= f.furn.i && ti < f.furn.i + f.furn.w && tj >= f.furn.j && tj < f.furn.j + f.furn.d);
  if (mat) { showPie({ o: mat.furn }, sx, sy); return; }
  const bench = !world.interior && flats.find(f => f.d.kind === 'bench' && f.d.i === ti && f.d.j === tj);
  if (bench) { showPie({ o: bench.d }, sx, sy); return; }
  { const [wx, wy] = toWorld(sx, sy); const pk = nearestPickup(wx, wy, 0.9); if (pk) { collectPickup(pk); return; } }
  const flatObj = !world.interior && flats.find(f => f.obj && !f.obj.deco && ti >= f.obj.i && ti < f.obj.i + f.obj.w && tj >= f.obj.j && tj < f.obj.j + f.obj.d);
  if (flatObj) { showPie({ o: flatObj.obj }, sx, sy); return; }
  cancelActions();
  walkTo(x, y);
}
function walkTo(x, y, onArrive) {
  cam.free = false; $('cam-button').classList.remove('free');
  if (player.using) standUp();
  const p = findPath(world, player.x, player.y, x, y);
  if (!p) { toast('You can’t walk there.'); return false; }
  const end = p[p.length - 1];
  marker = { x: end[0], y: end[1], life: 0.6 };
  player.go(p.slice(1), onArrive);
  return true;
}
function near(x, y, r = 1.6) { return Math.hypot(player.x - x, player.y - y) <= r; }

// Where you stand to use something.
function approachOf(o, wd = world) {
  if (o.stand) return o.stand;
  if (o.doorTile) return [o.doorTile[0] + 0.5, o.doorTile[1] + 0.5];
  if (o.kind === 'bench') return [o.i + 0.5, o.j + 0.5];
  const s = nearestWalkable(wd, o.i + (o.w || 1), o.j + (o.d || 1));
  return s ? [s[0] + 0.5, s[1] + 0.5] : [player.x, player.y];
}
function kindKey(o) {
  if (o.kind === 'furn') return o.door ? 'door' : o.acts || o.type;
  if (o.kind === 'venue') return o.acts || o.id;
  if (o.kind === 'landmark') return o.deco ? null : o.acts || null;
  if (o.home && homeIsMine(o)) return 'myhome';
  if (o.kind === 'shop') return o.label === 'Bakery' ? 'cafe' : null;
  return o.kind;
}
function displayName(o) { return o.name || o.label || ({ boathire: 'Boat hire', fountain: 'Fountain', bench: 'Bench', board: 'Property board', clock: 'Town Clock', busstop: 'Island bus stop' }[o.kind]) || 'Here'; }

// Lists and other screens use this to send you somewhere and pop the menu on arrival.
function visitThing(o) {
  const go = () => { const dest = approachOf(o); const open = () => { player.face(o.i + (o.w || 1) / 2, o.j + (o.d || 1) / 2); const [sx, sy] = toScreen(o.i + (o.w || 1) / 2, o.j + (o.d || 1) / 2, 40); showPie({ o }, sx, sy); }; if (near(...dest, 1.2)) open(); else if (walkTo(...dest, open)) toastQuiet(`Walking to ${displayName(o)}…`); };
  if (world.interior) { leaveHome(); setTimeout(go, 600); } else go();
}
function goMeet(n) {
  if (world.interior) { leaveHome(); setTimeout(() => goMeet(n), 600); return; }
  const def = actionsFor('neighbour')[0];
  queueAction(def, { npc: n });
}
function findNearby() {
  let best = null, bd = 2.2;
  for (const n of npcs) { if (!npcVisible(n)) continue; const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { bd = d; best = { n }; } }
  for (const t of things) {
    const o = t.o; if (!t.interactive || !o) continue;
    if (!o.doorTile && !o.stand) continue;
    const [ax, ay] = approachOf(o), d = Math.hypot(ax - player.x, ay - player.y);
    if (d < bd) { bd = d; best = { o }; }
  }
  if (!world.interior) for (const f of flats) if (f.obj && !f.obj.deco) { const o = f.obj; const inside = player.x >= o.i && player.x < o.i + o.w && player.y >= o.j && player.y < o.j + o.d; const d = inside ? 0.5 : Math.hypot(o.stand[0] - player.x, o.stand[1] - player.y); if (d < bd) { bd = d; best = { o }; } }
  if (world.interior) for (const f of flats) if (f.tap && f.furn && f.furn.stand) { const d = Math.hypot(f.furn.stand[0] - player.x, f.furn.stand[1] - player.y); if (d < bd) { bd = d; best = { o: f.furn }; } }
  if (world.interior && world.doorObj) { const dO = world.doorObj; const d = Math.hypot(dO.stand[0] - player.x, dO.stand[1] - player.y); if (d < bd) best = { o: dO }; }
  return best;
}
function interactNearby() {
  const pk = nearestPickup(player.x, player.y, 1.4); if (pk) { collectPickup(pk); return; }
  const best = findNearby();
  if (!best) { toast('Nothing close by. Walk up to something or someone.'); return; }
  const tx = best.n ? best.n.x : best.o.i + (best.o.w || 1) / 2, ty = best.n ? best.n.y : best.o.j + (best.o.d || 1) / 2;
  const [sx, sy] = toScreen(tx, ty, 40);
  showPie(best.n ? { npc: best.n } : { o: best.o }, sx, sy);
}
// The big action button shows what is in reach.
const TALK_ICON = '<svg viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 014 13.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="10" r="1.2" fill="currentColor"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor"/></svg>';
let actDefault = null, lastNear = '';
function updateNearby() {
  const btn = $('act-button');
  if (actDefault === null) actDefault = $('act-icon').innerHTML;
  if (player.boat) {
    if (lastNear === 'boat') return; lastNear = 'boat';
    btn.disabled = false; btn.classList.add('ready'); $('act-icon').innerHTML = '<span>🎣</span>'; $('act-label').textContent = 'Fish'; btn.setAttribute('aria-label', 'Cast your fishing line'); return;
  }
  const pk = nearestPickup(player.x, player.y, 1.4);
  if (pk) { const key = 'pk' + pk.k; if (lastNear === key) return; lastNear = key; btn.disabled = false; btn.classList.add('ready'); $('act-icon').innerHTML = `<span>${ITEMS[pk.item].icon}</span>`; $('act-label').textContent = pk.bug ? 'Catch' : 'Pick up'; btn.setAttribute('aria-label', (pk.bug ? 'Catch ' : 'Pick up ') + itemName(pk.item, 1)); return; }
  const best = (player.moving && player.path.length > 1) || act ? null : findNearby();
  const key = best ? (best.n ? 'n:' + best.n.name : 'o:' + displayName(best.o) + best.o.i + best.o.j) : '';
  if (key === lastNear) return;
  lastNear = key;
  btn.disabled = !best; btn.classList.toggle('ready', !!best);
  if (!best) { $('act-icon').innerHTML = actDefault; $('act-label').textContent = 'Nearby'; btn.setAttribute('aria-label', 'Interact (nothing in reach)'); return; }
  if (best.n) { $('act-icon').innerHTML = TALK_ICON; $('act-label').textContent = best.n.name; btn.setAttribute('aria-label', 'Interact with ' + best.n.name); return; }
  const o = best.o, first = actionsFor(kindKey(o))[0];
  $('act-icon').innerHTML = `<span>${esc(o.icon || first?.icon || '✋')}</span>`;
  $('act-label').textContent = displayName(o).replace(/^The /, '');
  btn.setAttribute('aria-label', 'Interact with ' + displayName(o));
}

// ---------- tap menu ----------
let pieTarget = null;
function showPie(target, sx, sy) {
  if (S.sheet) return; // e.g. arriving somewhere after a walk: never cover a screen the player opened meanwhile
  const o = target.o, n = target.npc;
  const opts = [];
  let defs = n ? (n.generic || n.peer ? [] : actionsFor('neighbour')) : actionsFor(kindKey(o));
  if (n && n.peer) {
    opts.push({ icon: '👋', label: `Wave to ${n.name}`, run: () => sendEmote(['👋'], n) });
    opts.push({ icon: '💬', label: 'Send emojis', run: () => showPeerChat(n) });
    opts.push({ icon: '🚶', label: 'Walk over', run: () => { const i = Math.floor(n.x), j = Math.floor(n.y); const spot = [[i + 1, j], [i, j + 1], [i - 1, j], [i, j - 1]].find(([a, b]) => world.walkable(a, b)); if (spot) walkTo(spot[0] + 0.5, spot[1] + 0.5, () => player.face(n.x, n.y)); } });
  }
  if (o && o.type === 'plot') plotOptions(o).forEach(x => opts.push(x));
  if (n && !n.generic && !n.peer) { const rq = requestOpen(n); if (rq) { const got = have(rq.item); opts.push({ icon: ITEMS[rq.item].icon, label: `Give ${rq.n} ${itemName(rq.item, rq.n)}`, note: `+${rq.coins} ✦`, disabled: got < rq.n ? `You have ${got}` : '', run: () => deliverRequest(n, rq) }); } }
  if (o && o.kind === 'furn' && o.venue) defs = defs.filter(d => !d.special && (!o.only || o.only.includes(d.id)) && !(o.use && d.job));
  if (o && o.kind === 'furn' && o.game) defs = [{ id: 'play', label: `Play ${GAMES[o.game].name}`, icon: GAMES[o.game].icon, special: 'game', coins: -1 }];
  if (n && n.generic) opts.push({ icon: '👋', label: 'Say hi', run: () => { n.busy = 3; n.face(player.x, player.y); n.say(['👋', '😊', '💛'][Math.floor(Math.random() * 3)], 2); player.say('👋', 1.5); SND.sfx('chat'); } });
  if (o && o.kind === 'venue' && kitFor(o) && sceneName === 'city') opts.push({ icon: '🚪', label: 'Go inside', run: () => { const d = approachOf(o); const go = () => enterVenue(o); if (near(...d, 1.3)) go(); else walkTo(...d, go); } });
  for (const def of defs) {
    let disabled = '', note = '';
    if (def.coins < 0 && S.coins < -def.coins) { disabled = 'Not enough coins'; }
    if (n && def.hearts && friendship(n.name).hearts < def.hearts) { disabled = `Needs ${def.hearts} hearts`; }
    if (def.coins) note = (def.coins > 0 ? '+' : '') + def.coins + ' ✦';
    if (def.job) { note = `+${rankOf(def.career).pay} ✦`; disabled = jobBlocked(def.career) ? (hourOf(S.progress.clock) < 7 || hourOf(S.progress.clock) >= 18 ? 'Open 7 AM–6 PM' : 'Done for today') : ''; }
    if (def.needSkill) for (const [k, lv] of Object.entries(def.needSkill)) if (skillLv(k) < lv) disabled = `Needs ${SKILLS.find(x => x.k === k).label} ${lv}`;
    opts.push({ icon: def.icon, label: def.label, note, disabled, run: () => queueAction(def, n ? { npc: n } : { o }) });
  }
  if (n && (n.generic || n.peer)) { /* their options are added above */ }
  else if (n) { opts.unshift({ icon: '💬', label: 'Emoji chat', run: () => meetThen(n, () => showEmojiChat(n)) }); opts.push({ icon: '🎁', label: 'Gifts & friendship', run: () => { n.busy = 4; showNeighbour(n); } }); }
  else if (o.kind === 'venue') opts.push({ icon: '⭐', label: visitedToday(o.id) ? 'Today’s activity ✓' : `Today: ${o.activity.title}`, run: () => visitThenSheet(o, () => showVenue(o)) });
  else if (o.home) opts.push({ icon: '🏠', label: homeIsMine(o) ? 'Your home' : 'See the listing', run: () => showHome(o) });
  else if (o.kind === 'busstop') opts.push({ icon: '🛍️', label: 'Coin shop', run: () => showShop() });
  else if (o.kind === 'board') opts.push({ icon: '🏠', label: 'Browse homes', run: () => showHomes() });
  else if (o.kind === 'clock') opts.push({ icon: '🕰️', label: 'Check the time', run: () => toast(`It’s ${clockText(S.progress.clock)}, day ${dayOf(S.progress.clock)}.`) });
  else if (o.kind === 'shop' && o.label !== 'Bakery') opts.push({ icon: o.icon || '🏪', label: 'Look in the window', run: () => showInfo(o.icon || '🏪', o.label, { Florist: 'Bunches from the Fernhill meadows.', Books: 'A tiny bookshop with a very sleepy cat.' }[o.label] || 'A little shop in Old Town.') });
  if (!opts.length) return;
  pieTarget = target;
  const pie = $('pie'), ring = $('pie-ring');
  ring.innerHTML = '';
  $('pie-title').textContent = n ? n.name : displayName(o);
  const R = Math.min(118, Math.max(92, opts.length * 22));
  const cx = Math.max(R * 0.5 + 70, Math.min(W - R * 0.5 - 70, sx)), cy = Math.max(R + 70, Math.min(H - R - 110, sy));
  ring.style.left = cx + 'px'; ring.style.top = cy + 'px';
  pie.classList.remove('hidden'); // visible first, so the buttons can be measured
  opts.forEach((op, k) => {
    const a = -Math.PI / 2 + (opts.length === 1 ? 0 : (k / opts.length) * Math.PI * 2);
    const b = document.createElement('button');
    b.className = 'pie-btn'; b.disabled = !!op.disabled;
    b.style.setProperty('--x', Math.cos(a) * R + 'px'); b.style.setProperty('--y', Math.sin(a) * R + 'px'); b.style.setProperty('--d', k * 25 + 'ms');
    b.innerHTML = `<span class="pie-icon">${esc(op.icon)}</span><span class="pie-label">${esc(op.label)}${op.note ? ` <em>${esc(op.note)}</em>` : ''}${op.disabled ? `<small>${esc(op.disabled)}</small>` : ''}</span>`;
    b.onclick = e => { e.stopPropagation(); closePie(); op.run(); };
    ring.append(b);
    // keep every button fully on screen, even on narrow phones
    const bw = b.offsetWidth, bh = b.offsetHeight; let x = Math.cos(a) * R, y = Math.sin(a) * R;
    x += Math.max(0, 8 - (cx + x - bw / 2)) - Math.max(0, cx + x + bw / 2 - (W - 8));
    y += Math.max(0, 60 - (cy + y - bh / 2)) - Math.max(0, cy + y + bh / 2 - (H - 96));
    b.style.setProperty('--x', x + 'px'); b.style.setProperty('--y', y + 'px');
  });
  const center = h(`<div class="pie-center"><b>${esc(n ? n.name : displayName(o))}</b></div>`);
  ring.append(center);
  pie.classList.remove('hidden'); SND.sfx('pop');
  if (n) { n.busy = Math.max(n.busy, 3); n.face(player.x, player.y); }
}
function closePie() { $('pie').classList.add('hidden'); pieTarget = null; }
$('pie').addEventListener('pointerdown', e => { if (e.target === $('pie')) { e.preventDefault(); closePie(); } });
function visitThenSheet(o, fn) {
  const dest = approachOf(o);
  if (near(...dest, 1.4)) fn(); else walkTo(...dest, fn);
}

// ---------- actions ----------
const queue = [];
let act = null; // { item, k, step, phase: 'walk' | 'do', t, emoteT }
function activeObject() { return act && act.phase === 'do' && act.obj ? act.obj : null; }
function stepsOf(def, target) {
  const base = def.steps ? def.steps : [{ ...def, obj: null }];
  return base.map(s => ({ ...s, target: s.obj ? null : target, objType: s.obj }));
}
function queueAction(def, target) {
  if (def.special === 'leave') { leaveHome(); return; }
  if (def.special === 'wardrobe') { const d = approachOf(target.o); const go = () => { player.face(...(target.o.look || d)); showWardrobe(); }; if (near(...d, 1.3)) go(); else walkTo(...d, go); return; }
  if (def.special === 'enter') { const go = () => enterHome(target.o); const d = approachOf(target.o); if (near(...d, 1.3)) go(); else walkTo(...d, go); return; }
  if (def.special === 'game') { const d = approachOf(target.o); const go = () => { player.face(...(target.o.look || d)); if (S.coins < 1) { toast('A game costs ✦ 1.'); return; } setCoins(S.coins - 1, true); GAME.play(target.o.game, res => gameDone(target.o.game, res), (S.progress.highscores || {})[target.o.game] || 0); }; if (near(...d, 1.3)) go(); else walkTo(...d, go); return; }
  if (target && target.o && target.o.kind === 'furn' && target.o.venue && !def.steps) {
    const sitting = !!target.o.use && target.o.type !== 'treadmill';
    const arms = def.arms || { eat: 'eat', tea: 'sip', read: 'read', games: 'type', experiment: 'stir', craft: 'chop', cookclass: 'stir' }[def.id] || null;
    const prop = def.prop || { eat: 'bowl', tea: 'cup', read: 'book' }[def.id] || null;
    def = { ...def, pose: def.pose === 'inside' || def.pose === 'stand' ? (sitting ? 'sit' : 'stand') : def.pose, arms, prop };
  }
  if (def.special === 'market' || def.special === 'craft' || def.special === 'restore') { const d = approachOf(target.o); const go = () => (def.special === 'market' ? showMarket() : def.special === 'craft' ? showCraft() : showRestore()); if (near(...d, 1.6)) go(); else walkTo(...d, go); return; }
  if (def.special === 'boat') { const d = approachOf(target.o); const go = () => startBoat(); if (near(...d, 1.6)) go(); else walkTo(...d, go); return; }
  if (def.special === 'travel') { const go = () => showIsland(); const d = approachOf(target.o); if (near(...d, 1.3)) go(); else walkTo(...d, go); return; }
  if (def.coins < 0 && S.coins < -def.coins) { toast('Not enough coins for that.'); return; }
  if (def.job) { const why = jobBlocked(def.career); if (why) { toast(why); return; } }
  if (def.needSkill) for (const [k, lv] of Object.entries(def.needSkill)) if (skillLv(k) < lv) { toast(`You need ${SKILLS.find(x => x.k === k).label.toLowerCase()} level ${lv} for that.`); return; }
  if (queue.length >= 4) { toast('Your to-do list is full.'); return; }
  queue.push({ def, target, label: def.label, icon: def.icon, steps: stepsOf(def, target) });
  renderQueue();
  if (!act) startNext();
}
function cancelActions() {
  queue.length = 0;
  if (act) { endStep(true); act = null; }
  renderQueue();
}
function cancelQueued(k) {
  if (k === 0 && act) { endStep(true); act = null; queue.shift(); renderQueue(); startNext(); return; }
  queue.splice(k, 1); renderQueue();
}
function standUp() {
  const u = player.using; player.using = null; player.pose = null;
  if (u && u.stand) player.snapTo(u.stand[0], u.stand[1]);
}
function startNext() {
  if (!queue.length) { act = null; renderQueue(); return; }
  const item = queue[0];
  act = { item, k: 0 };
  startStep();
}
function resolveStepTarget(step) {
  if (step.target) return step.target;
  const f = things.find(t => t.o && t.o.kind === 'furn' && t.o.type === step.objType);
  return f ? { o: f.o } : null;
}
function startStep() {
  const step = act.item.steps[act.k];
  const target = resolveStepTarget(step);
  if (!target) { toast('You need to be at home for that.'); queue.shift(); act = null; renderQueue(); startNext(); return; }
  if (player.using) standUp();
  act.step = step; act.target = target; act.phase = 'walk'; act.t = 0; act.emoteT = 0;
  // TV time happens on the sofa
  let o = target.o;
  if (step.tv && o && o.type !== 'sofa') { const sofa = things.find(t => t.o.type === 'sofa'); if (sofa) { o = sofa.o; act.target = { o }; } }
  act.obj = o || null;
  let dest;
  if (target.npc) {
    const n = target.npc; n.busy = 12; n.path = [];
    const ni = Math.floor(n.x), nj = Math.floor(n.y);
    const side = [[ni + 1, nj - 1], [ni - 1, nj + 1], [ni + 1, nj], [ni, nj + 1], [ni - 1, nj], [ni, nj - 1]].find(([a, b]) => world.walkable(a, b));
    const tgt = side || nearestWalkable(world, ni, nj) || [ni, nj];
    dest = [tgt[0] + 0.5, tgt[1] + 0.5];
    if (near(n.x, n.y, 1.8)) dest = null;
  } else dest = approachOf(o);
  renderQueue();
  if (!dest || near(...dest, 0.35)) beginDoing(); else if (!walkTo(...dest, beginDoing)) { queue.shift(); act = null; renderQueue(); startNext(); }
}
function beginDoing() {
  if (!act) return;
  const step = act.step, o = act.obj, n = act.target.npc;
  act.phase = 'do'; act.t = 0;
  marker = null;
  if (n) { n.busy = 9999; n.path = []; player.face(n.x, n.y); n.face(player.x, player.y); n.wave = 1.2; }
  else if (o) {
    if (o.use && (step.pose === 'sit' || step.pose === 'sleep' || step.pose === 'shower')) {
      player.using = o; player.snapTo(o.use[0], o.use[1]);
      if (o.look) player.face(...o.look);
      if (step.pose === 'sleep') player.flip = false;
    } else if (o.look) player.face(...o.look);
    else player.face(o.i + (o.w || 1) / 2, o.j + (o.d || 1) / 2);
  }
  player.pose = step.pose === 'chat' || step.pose === 'stand' ? null : step.pose === 'shower' ? null : step.pose;
  if (step.pose === 'sit' && !(o && o.use) && o && o.kind !== 'bench') player.pose = null;
  if (step.pose === 'sit' && o && o.kind === 'bench') { player.snapTo(o.i + 0.5, o.j + 0.5); player.pose = 'sit'; }
  const def = act.item.def;
  staffReact(def);
  player.arms = step.arms || null; player.prop = step.prop || null;
  player.override = step.outfit || def.outfit || null; player.saved = S.profile?.sleepLook ? { sleep: S.profile.sleepLook } : null;
  player.blanket = step.blanket || null; player.faceFront = !!step.faceFront;
  if (step.pose === 'jog' && o) {
    player.pose = null;
    const cx = o.i + o.w / 2, cy = o.j + o.d / 2, rx = o.w / 2 - 0.3, ry = o.d / 2 - 0.3;
    act.jog = Array.from({ length: 10 }, (_, k) => [cx + Math.cos(k / 10 * 6.283) * rx, cy + Math.sin(k / 10 * 6.283) * ry]);
    player.jogging = true; player.go(act.jog.slice());
  }
  if (step.loop) SND.startLoop(step.loop);
  if (act.item.def.job && act.item.startMood == null) act.item.startMood = mood(S.progress.needs);
  if (step.burnable && skillLv('cooking') < 2 && Math.random() < 0.35) { act.item.burnt = true; setTimeout(() => { if (act && act.step === step) { player.say('💨', 2); toast('Oops, a little burnt! Cooking gets better with practice.'); } }, 2500); }
  if (step.start) SND.sfx(step.start);
  if (step.pose === 'inside') SND.sfx('door');
}
function endStep(cancelled) {
  if (!act) return;
  if (player.jogging) { player.jogging = false; player.path = []; player.onArrive = null; act.jog = null; }
  if (act.target && act.target.npc) { act.target.npc.busy = 2; }
  standUp();
  SND.stopLoops();
  player.arms = null; player.prop = null; player.blanket = null; player.faceFront = false;
  // a shower ends with a shake-off before the towel comes off
  if (!cancelled && act.step && act.step.after === 'shake') { player.shake = 1.1; player.faceFront = true; SND.sfx('splash'); }
  else player.override = null;
  if (cancelled) player.say('✋', 1);
}
function tickAction(gm, dt) {
  if (!act || act.phase !== 'do') return;
  const step = act.step, mins = step.mins || 1, part = Math.min(gm, mins - act.t);
  act.t += part;
  const N2 = S.progress.needs;
  const mealMult = step.meal ? (act.item.burnt ? 0.5 : 1 + 0.04 * skillLv('cooking')) : 1;
  for (const [k, v] of Object.entries(step.gain || {})) N2[k] = Math.min(100, N2[k] + v * part / mins * (k === 'hunger' ? mealMult : 1));
  if (step.skill) addXP(step.skill, part * 0.4);
  if (act.jog && !player.path.length) player.go(act.jog.slice());
  for (const [k, v] of Object.entries(step.cost || {})) N2[k] = Math.max(0, N2[k] - v * part / mins);
  act.emoteT -= dt;
  if (act.emoteT <= 0 && step.emotes) {
    act.emoteT = 1.8;
    if (step.tick) SND.sfx(step.tick);
    const e = step.emotes[Math.floor(Math.random() * step.emotes.length)];
    if (act.target.npc && Math.random() < 0.5) act.target.npc.say(e, 1.6); else player.say(e, 1.6);
  }
  if (act.t >= mins - 0.001) finishStep();
}
function finishStep() {
  const item = act.item, step = act.step, def = item.def;
  const last = act.k >= item.steps.length - 1;
  if (!last) { endStep(false); act.k++; startStep(); return; }
  endStep(false);
  if (def.coins) setCoins(S.coins + def.coins, true);
  if (def.give) { S.progress.inventory[def.give] = (S.progress.inventory[def.give] || 0) + 1; toast(`You got a ${ITEMS[def.give].icon} ${itemName(def.give, 1)}!`); }
  if (def.id === 'claw') { if (Math.random() < 0.4) { S.progress.inventory.crafts = (S.progress.inventory.crafts || 0) + 1; toast('You won a 🧸 prize!'); player.say('🧸', 2); } else toast('So close! The claw slipped.'); }
  if (def.job) finishShift(def.career || 'tram', item.startMood);
  if (def.id === 'craft' && skillLv('creativity') > 0) { setCoins(S.coins + 2 * skillLv('creativity'), true); toast(`Someone bought your craft for ${2 * skillLv('creativity')} ✦!`); }
  if (def.special === 'mail') {
    const pals = Object.entries(S.progress.friends).filter(([, f]) => (f.hearts || 0) >= 3).map(([nm]) => nm);
    if (pals.length && S.progress.daily['mail:' + gameDay()] !== 1) {
      S.progress.daily['mail:' + gameDay()] = 1;
      const from = pals[gameDay() % pals.length], gifts = ['seed_strawberry', 'seed_sunflower', 'seed_tomato', 'seed_pumpkin', 'shell', 'feather', 'crafts', 'flowers'], g = gifts[(gameDay() + from.length) % gifts.length], n = ITEMS[g].cat === 'seed' ? 2 : 3;
      addItem(g, n); showInfo('✉️', `A letter from ${from}`, `“Thanks for being such a good friend! Here’s something for you.” You got ${n} ${ITEMS[g].icon} ${itemName(g, n)}.`);
    } else { const notes = ['A postcard from Nori: “The gulls say hi.”', 'A coupon for one free honey bun.', 'Your library card is ready!', 'A drawing from Dot of the Sunwheel.', 'The weather report: ' + L.WEATHER[L.weatherOf(gameDay() + 1)].name.toLowerCase() + ' tomorrow.']; toast(notes[Math.floor(Math.random() * notes.length)]); }
  }
  if (def.friend && act.target.npc) befriend(act.target.npc, def.friend);
  if (def.id === 'fish') addItem('fish', 1);
  if (def.stat) bumpStat(def.stat);
  const o = act.obj;
  if (o && o.kind === 'venue') { S.progress.places[o.id] = 1; saveProgress(); }
  SND.sfx('done');
  player.say('⭐', 1.2);
  checkAchievements();
  queue.shift(); act = null; renderQueue(); startNext();
}
function befriend(n, kind) {
  const f = friendship(n.name); const day = today(), before = f.hearts || 0;
  const chatCap = skillLv('charisma') >= 3 ? 4 : 3;
  if (!f.mem || !f.mem.length) addMemory(n.name, 'We met for the first time', f);
  if (kind === 'chat' && f.day !== day) { bumpStat('hellos'); f.day = day; f.hearts = Math.min(chatCap, before + (before < chatCap ? 1 : 0)); S.progress.daily[day + ':hello'] = (S.progress.daily[day + ':hello'] || 0) + 1; }
  if (kind === 'joke' && f.joke !== day) { f.joke = day; f.hearts = Math.min(4, (f.hearts || 0) + (f.hearts < 4 ? 1 : 0)); addMemory(n.name, 'You told a joke that made me laugh', f); }
  if (kind === 'story' && f.story !== day) { f.story = day; f.hearts = Math.min(5, (f.hearts || 0) + (f.hearts < 5 ? 1 : 0)); addMemory(n.name, 'You told me a wonderful story', f); }
  if (kind === 'hug' && f.hug !== day) { f.hug = day; f.hearts = Math.min(5, (f.hearts || 0) + 1); addMemory(n.name, 'We had a big hug', f); }
  if (kind === 'emoji' && !f.emoji) { f.emoji = 1; addMemory(n.name, 'We chatted in emojis', f); }
  const after = f.hearts || 0;
  if (before < 3 && after >= 3) addMemory(n.name, 'We became friends', f);
  if (before < 5 && after >= 5) addMemory(n.name, 'We became best friends!', f);
  S.progress.friends[n.name] = f; n.say('💛', 2); saveProgress(); checkGoals(); checkAchievements();
}
function addMemory(name, text, f = friendship(name)) {
  f.mem = (f.mem || []).filter(m => m.text !== text);
  f.mem.unshift({ day: dayOf(S.progress.clock), text });
  f.mem = f.mem.slice(0, 8);
  S.progress.friends[name] = f;
}
function renderQueue() {
  const el = $('queue'); el.innerHTML = '';
  queue.forEach((q, k) => {
    const b = document.createElement('button');
    b.className = 'q-item' + (k === 0 && act ? ' current' : '');
    b.setAttribute('aria-label', `Cancel ${q.label}`); b.title = `${q.label} (tap to cancel)`;
    b.innerHTML = `<span>${esc(q.icon)}</span><i class="q-x" aria-hidden="true">×</i>`;
    b.onclick = () => cancelQueued(k);
    el.append(b);
  });
  if (queue[0]) { const c = document.createElement('span'); c.className = 'q-label'; c.textContent = queue[0].label; el.append(c); }
}
function updateQueueProgress() {
  const cur = $('queue').querySelector('.q-item.current');
  if (!cur || !act) return;
  const total = act.item.steps.reduce((a, s) => a + (s.mins || 1), 0), done = act.item.steps.slice(0, act.k).reduce((a, s) => a + (s.mins || 1), 0) + (act.phase === 'do' ? act.t : 0);
  cur.style.setProperty('--p', Math.round(done / total * 100) + '%');
}

// ---------- needs & clock ----------
const warned = {};
function tickClock(gm) {
  const before = S.progress.clock; S.progress.clock += gm;
  for (const p of S.progress.plots) L.growPlot(p, S.progress.clock, raining());
  if (Math.floor(before / 1440) !== Math.floor(S.progress.clock / 1440)) { toast(`Good morning! Day ${dayOf(S.progress.clock)} in ${C.meta.name}.`); chargeRent(); prunePicked(); pruneDaily(); checkAchievements(); }
  if (Math.floor(before / 30) !== Math.floor(S.progress.clock / 30)) saveProgress();
}
function tickNeeds(gm, curDef) {
  const N2 = S.progress.needs, hrs = gm / 60;
  for (const nd of NEEDS) {
    let rate = nd.decay;
    if (curDef && curDef.slow && curDef.slow[nd.k] !== undefined) rate *= curDef.slow[nd.k];
    if (curDef && curDef.gain && curDef.gain[nd.k]) rate = 0;
    if (nd.k === 'comfort' && (player.pose === 'sit' || player.pose === 'ground')) rate = 0;
    if (nd.k === 'energy' && player.pose === 'sleep') rate = 0;
    if (nd.k === 'energy') rate *= 1 - 0.03 * skillLv('fitness');
    N2[nd.k] = Math.max(0, N2[nd.k] - rate * hrs);
    if (N2[nd.k] < 22 && !warned[nd.k]) { warned[nd.k] = true; toast(`${nd.icon} ${nd.low} ${nd.fix}`); player.say(nd.icon, 3); }
    if (N2[nd.k] > 40) warned[nd.k] = false;
  }
}
let hudTick = 0;
function updateHudClock() {
  updateQueueProgress();
  if (++hudTick % 10) return;
  SND.setScene(sceneName, isNight(hourOf(S.progress.clock)));
  { const w = weatherNow(), hr = hourOf(S.progress.clock), night = hr < 6 || hr >= 20; $('clock-time').textContent = `${night && w === 'sunny' ? '🌙' : night && w === 'cloudy' ? '☁️' : L.WEATHER[w].icon} ${clockText(S.progress.clock)}`; }
  $('clock').title = `${L.SEASONS[L.seasonOf(gameDay())].name}, ${L.WEATHER[weatherNow()].name.toLowerCase()}`;
  const m = mood(S.progress.needs);
  $('mood-ring').style.setProperty('--m', moodColor(m));
  $('mood-ring').style.setProperty('--p', m + '%');
  if (S.sheet === 'needs') renderNeeds();
}
function cycleSpeed() {
  const k = SPEEDS.indexOf(S.speed); S.speed = SPEEDS[(k + 1) % SPEEDS.length];
  $('speed-button').textContent = '▶'.repeat(S.speed); $('speed-button').setAttribute('aria-label', `Game speed ${S.speed}x`);
  toastQuiet(`Time speed ${S.speed}×`);
}
function showNeeds() {
  const el = h(`<div class="needs"><div class="mood-row"><div class="portrait-wrap"></div><div><small>Mood</small><b id="needs-mood"></b><span id="needs-clock"></span></div></div><div class="need-list" id="need-list"></div><p class="lead" id="need-tip"></p><button class="btn btn-ghost btn-wide" id="needs-profile">Character &amp; account</button></div>`);
  el.querySelector('.portrait-wrap').append(portrait(player.species, player.outfit, 76, { full: true, t: time }));
  el.querySelector('#needs-profile').onclick = () => showProfile();
  openSheet('needs', 'How you’re doing', S.profile?.name || 'You', el, { tab: 'explore' });
  renderNeeds();
}
function renderNeeds() {
  const list = $('need-list'); if (!list) return;
  const N2 = S.progress.needs, m = mood(N2);
  $('needs-mood').textContent = moodLabel(m); $('needs-mood').style.color = A.darken(moodColor(m), 0.2);
  $('needs-clock').textContent = `${clockText(S.progress.clock)} · Day ${dayOf(S.progress.clock)}`;
  list.innerHTML = NEEDS.map(nd => { const v = Math.round(N2[nd.k]); return `<div class="need"><span class="need-icon">${nd.icon}</span><div class="need-main"><div class="need-top"><b>${nd.label}</b><span>${v}</span></div><div class="need-bar"><i style="width:${v}%;background:${needColor(v)}"></i></div></div></div>`; }).join('');
  const low = NEEDS.slice().sort((a, b) => N2[a.k] - N2[b.k])[0];
  $('need-tip').textContent = N2[low.k] < 60 ? `${low.label} is lowest. ${low.fix}` : 'You’re doing great. Go have some fun!';
}

// ---------- UI helpers ----------
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }
function toastQuiet(msg) { if (!S.sheet) toast(msg); }
function setCoins(n, pop) {
  const diff = n - S.coins; S.coins = n; $('coins').textContent = n;
  if (pop && diff > 0) SND.sfx('coin');
  if (diff > 0) setTimeout(checkAchievements, 0);
  if (pop && diff) { pops.push({ x: player.x, y: player.y, text: (diff > 0 ? '+' : '') + diff + ' ✦', life: 1.6 }); const c = $('coin-pill'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  saveProgress();
}
function addItem(k, n) {
  S.progress.inventory[k] = Math.max(0, (S.progress.inventory[k] || 0) + n);
  if (n > 0 && ITEMS[k] && ITEMS[k].cat !== 'seed' && !S.progress.found[k]) { S.progress.found[k] = 1; setTimeout(() => toast(`New in your collection book: ${ITEMS[k].icon} ${itemName(k, 1)}!`), 900); }
  saveProgress();
}
const have = k => S.progress.inventory[k] || 0;
const gameDay = () => dayOf(S.progress.clock);
const weatherNow = () => L.weatherAt(gameDay(), S.progress.clock || 0);
const raining = () => weatherNow() === 'rain';
function hideHint() { $('hint').classList.add('hidden'); }

function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function openSheet(name, kicker, title, body, opts = {}) {
  if (typeof closePie === 'function') closePie();
  if (!S.sheet) SND.sfx('open');
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
  if (S.sheet) SND.sfx('close');
  S.sheet = null; $('sheet').classList.add('hidden');
  document.querySelectorAll('.dock-item').forEach(x => x.classList.toggle('active', x.dataset.mode === 'explore'));
}
$('sheet-close').onclick = closeSheet;

function thumb(o, size = 76) {
  const c = document.createElement('canvas'); c.className = 'thumb';
  const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = size * dpr; c.height = size * dpr; c.style.width = c.style.height = size + 'px';
  const t = cityThings.find(x => x.o === o) || cityFlats.find(x => x.obj === o) || things.find(x => x.o === o) || (o.id && things.find(x => x.o.id === o.id));
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
const localHomes = () => true; // every home, in every town, is kept in your save
function homeIsMine(o) {
  if (S.progress.homes[o.id]) return true;
  const p = !localHomes() && propFor(o.id);
  return !!(p && S.user && (p.owner === S.user.username || p.tenant === S.user.username));
}
function homeStatus(o) {
  const mine = S.progress.homes[o.id];
  if (mine) return mine.type === 'own' ? 'Yours' : 'Your rental';
  if (localHomes()) return 'Available';
  const p = propFor(o.id) || { status: 'available' };
  if (homeIsMine(o)) return p.owner === S.user.username ? 'Yours' : 'Your rental';
  return p.status === 'owned' ? 'Owned' : p.status === 'rented' ? 'Rented' : 'Available';
}
function homeCard(o, big = false) {
  const p = propFor(o.id) || { ...o, status: 'available' };
  const status = homeStatus(o), mine = status === 'Yours' || status === 'Your rental';
  const rental = S.progress.homes[o.id];
  const el = h(`<article class="card home-card ${big ? 'big' : ''}">
    <div class="card-art"></div>
    <div class="card-main">
      <div class="card-top"><h3>${esc(o.name)}</h3><span class="chip ${status === 'Available' ? 'chip-ok' : mine ? 'chip-mine' : 'chip-off'}">${status}</span></div>
      <p class="card-sub">${esc(o.kind[0].toUpperCase() + o.kind.slice(1))} · ${esc(C.districts[C.districtAt(o.i, o.j)].name)}</p>
      ${big ? `<p class="card-text">${esc(p.description || o.description)}</p>` : ''}
      <div class="price-row"><span><b>✦ ${o.rent}</b> a day to rent</span><span><b>✦ ${o.price}</b> to buy</span></div>
      <div class="card-actions">
        ${mine ? `<button class="btn btn-primary" data-act="enter">Go inside</button>${rental && rental.type === 'rent' ? '<button class="btn btn-ghost" data-act="leave">Move out</button>' : ''}` : `
        <button class="btn btn-primary" data-act="rent" ${status !== 'Available' ? 'disabled' : ''}>Rent</button>
        <button class="btn btn-sun" data-act="buy" ${status !== 'Available' ? 'disabled' : ''}>Buy</button>`}
        ${big ? '' : '<button class="btn btn-ghost" data-act="go">Visit</button>'}
      </div>
    </div></article>`);
  el.querySelector('.card-art').append(thumb(o, big ? 120 : 84));
  const on = (k, fn) => { const b = el.querySelector(`[data-act=${k}]`); if (b) b.onclick = fn; };
  on('rent', () => propertyAction(o, 'rent'));
  on('buy', () => propertyAction(o, 'buy'));
  on('enter', () => { closeSheet(); queueAction(actionsFor('myhome')[0], { o }); });
  on('leave', () => { delete S.progress.homes[o.id]; saveProgress(); toast(`You moved out of ${o.name}.`); S.sheet === 'homes' ? showHomes() : showHome(o); });
  on('go', () => { closeSheet(); visitThing(o); });
  return el;
}
async function showHomes(filter = 'all') {
  const body = openSheet('homes', C.meta.name + ' homes', 'Find your place', '<div class="loading-text">Checking which homes are free…</div>', { tab: 'homes' });
  if (!localHomes()) await loadProperties();
  if (S.sheet !== 'homes') return;
  body.innerHTML = '';
  const tabs = h(`<div class="filter-row" role="tablist">${[['all', 'All'], ['house', 'Houses'], ['apartment', 'Apartments'], ['villa', 'Villas']].map(([k, l]) => `<button class="filter ${k === filter ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>`);
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => showHomes(b.dataset.f));
  body.append(tabs);
  const mineElsewhere = Object.entries(S.progress.homes).filter(([, x]) => x.city !== C.id);
  if (mineElsewhere.length) body.append(h(`<div class="notice"><b>Your other homes</b><span>${mineElsewhere.map(([, x]) => `${esc(x.name)} in ${esc(cityMeta(x.city).name)}`).join(' · ')}</span></div>`));
  body.append(h(`<p class="lead">Rent a home in any town to sleep, cook and relax there. Rent is paid each morning with coins. These homes are in your own world, so other players never take them.</p>`));
  const homes = world.objects.filter(o => o.home && (filter === 'all' || o.kind === filter));
  for (const o of homes) body.append(homeCard(o));
}
function showHome(o) { if (!localHomes()) loadProperties().then(() => { if (S.sheet === 'home:' + o.id) { const b = $('sheet-body'); b.innerHTML = ''; b.append(homeCard(o, true)); } }); openSheet('home:' + o.id, 'Home', o.name, homeCard(o, true), { tab: 'homes' }); }
async function propertyAction(o, action) {
  if (localHomes()) {
    const cost = action === 'buy' ? o.price : o.rent;
    if (S.coins < cost) { toast(`You need ✦ ${cost} to ${action} ${o.name}.`); return; }
    if (Object.values(S.progress.homes).filter(x => x.type === 'rent').length >= 3 && action === 'rent') { toast('You can rent up to 3 homes. Move out of one first.'); return; }
    setCoins(S.coins - cost, true);
    S.progress.homes[o.id] = { city: C.id, type: action === 'buy' ? 'own' : 'rent', name: o.name, rent: o.rent };
    S.progress.rentDay = Math.floor(S.progress.clock / 1440);
    saveProgress(); player.say('🏡'); SND.sfx('unlock');
    toast(action === 'buy' ? `${o.name} is yours! Tap it to go inside.` : `You rented ${o.name}. Tap it to go inside.`);
    checkAchievements();
    if (S.sheet === 'homes') showHomes(); else showHome(o);
    return;
  }
  try {
    const d = await request('/api/properties/' + encodeURIComponent(o.id) + '/' + action, 'POST', {});
    if (d.world) setCoins(d.world.coins, true);
    toast(d.message || (action === 'buy' ? 'Home bought!' : 'Home rented!'));
    player.say('🏡');
    await loadProperties();
    if (S.sheet === 'homes') showHomes(); else showHome(o);
  } catch (e) { toast(e.message); }
}
// Rent comes out each morning; if you can't pay, you move out (gently).
function chargeRent() {
  const today2 = Math.floor(S.progress.clock / 1440);
  const days = Math.max(0, today2 - (S.progress.rentDay || today2));
  S.progress.rentDay = today2;
  if (!days) return;
  for (const [id, x] of Object.entries(S.progress.homes)) {
    if (x.type !== 'rent') continue;
    const due = (x.rent || 10) * days;
    if (S.coins >= due) { setCoins(S.coins - due, true); toastQuiet(`Rent paid for ${x.name}: ✦ ${due}`); }
    else { delete S.progress.homes[id]; toast(`Not enough coins for rent, so you moved out of ${x.name}. You can rent again any time.`); }
  }
  saveProgress();
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
  const body = openSheet('places', 'Around ' + C.meta.name, 'Places to visit', null, { tab: 'places' });
  const groups = {};
  for (const v of C.venues) (groups[C.districtAt(v.i + v.w / 2, v.j + v.d / 2)] ||= []).push(v);
  const more = h(`<button class="island-cta"><span>🗺️</span><b>Island map</b><small>Take the bus to other towns</small></button>`); more.onclick = () => showIsland();
  body.append(more);
  for (const [d, list] of Object.entries(groups)) {
    body.append(h(`<h4 class="group-title"><i style="background:${C.districts[d].color}"></i>${esc(C.districts[d].name)}</h4>`));
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
  for (const n of cityNpcs) {
    const f = friendship(n.name), wants = ITEMS[n.data.wants];
    const el = h(`<article class="card friend-card"><div class="card-art round"></div><div class="card-main"><div class="card-top"><h3>${esc(n.name)}</h3>${hearts(f.hearts)}</div><p class="card-sub">${esc(friendLevel(f.hearts || 0))} · ${n.traits.map(t => TRAITS[t]?.icon || '').join(' ')} · loves ${wants.icon}</p><p class="card-sub doing">${esc(n.doing || 'Out for a walk')}</p><div class="card-actions"><button class="btn btn-small btn-ghost">Find ${esc(n.name)}</button></div></div></article>`);
    el.querySelector('.card-art').append(portrait(n.species, n.outfit, 60));
    el.querySelector('button').onclick = () => { closeSheet(); goMeet(n); };
    body.append(el);
  }
}
function showNeighbour(n) {
  const f = friendship(n.name), wants = n.data.wants, haveWant = S.progress.inventory[wants] || 0, met = f.day === today();
  const el = h(`<div class="neighbour">
    <div class="neighbour-hero"><div class="portrait-wrap"></div><div class="bubble"><p>“${esc(n.data.line)}”</p></div></div>
    <div class="friend-row"><span>${esc(friendLevel(f.hearts || 0))}</span>${hearts(f.hearts)}</div>
    ${(() => { const rq = requestOpen(n); return rq ? `<div class="notice"><b>${esc(n.name)} would love ${rq.n} ${ITEMS[rq.item].icon} ${esc(itemName(rq.item, rq.n))} today</b><span>You have ${have(rq.item)}. Reward: ✦ ${rq.coins} and a heart.</span></div>` : ''; })()}
    <div class="trait-row">${n.traits.map(t => `<span class="chip">${TRAITS[t]?.icon || ''} ${esc(t)}</span>`).join('')}<span class="chip chip-sun">${moodLabel(mood(n.needs))} mood</span><span class="chip">📍 ${esc(n.doing || 'Out for a walk')}</span></div>
    ${(f.mem || []).length ? `<h4 class="group-title">Things ${esc(n.name)} remembers</h4><ul class="log">${f.mem.map(m => `<li><b>${esc(m.text)}</b><span>Day ${m.day}</span></li>`).join('')}</ul>` : ''}
    <div class="actions-col">
      <button class="btn btn-primary btn-wide" data-a="hello" ${met ? 'disabled' : ''}>${met ? 'You said hello today ✓' : 'Say hello'}</button>
      <button class="btn btn-sun btn-wide" data-a="give" ${haveWant < 1 || f.gift === today() ? 'disabled' : ''}>${f.gift === today() ? 'Gift given today ✓' : `Give 1 ${ITEMS[wants].icon} ${itemName(wants, 1)} · +10 ✦`}</button>
      ${haveWant < 1 && f.gift !== today() ? `<p class="hint-text">${esc(n.name)} would love a ${itemName(wants, 1)}. ${wants === 'fish' ? 'Try fishing at the marina.' : wants === 'berries' ? 'The café gives berries.' : wants === 'flowers' ? 'The library and clinic give flowers.' : 'Make one at the community centre.'}</p>` : ''}
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
    bump(n.name, c => { c.gift = today(); c.hearts = Math.min(5, (c.hearts || 0) + 1); addMemory(n.name, `You gave me a ${ITEMS[wants].icon} ${itemName(wants, 1)}`, c); });
    n.say('😊', 3); setCoins(S.coins + 10, true); S.progress.daily[today() + ':gift'] = 1; saveProgress(); checkGoals(); showNeighbour(n);
  };
  openSheet('neighbour:' + n.name, A.SPECIES[n.species].label + ' · neighbour', n.name, el, { tab: 'friends' });
}
function checkGoals() { checkQuests(); }
function showJournal() {
  const inv = S.progress.inventory;
  const el = h(`<div class="journal">
    <div class="bag">${Object.entries(ITEMS).filter(([k]) => (inv[k] || 0) > 0).map(([k, it]) => `<div class="bag-item ${it.cat === 'seed' ? 'seed' : ''}"><span>${it.icon}</span><b>${inv[k] || 0}</b><small>${esc(it.many)}</small></div>`).join('') || '<p class="lead">Your bag is empty.</p>'}</div>
    ${guideHtml()}
    <h4 class="group-title">Today’s quests <small>+20 ✦ each · ${L.SEASONS[L.seasonOf(gameDay())].icon} ${L.SEASONS[L.seasonOf(gameDay())].name}, ${L.WEATHER[weatherNow()].name.toLowerCase()}</small></h4>
    ${questState().map(g => { const c = Math.max(0, g.have); return `<div class="goal ${g.done || c >= g.n ? 'met' : ''}"><div class="goal-top"><span>${esc(g.text)}</span><b>${c}/${g.n}</b></div><div class="bar"><i style="width:${c / g.n * 100}%"></i></div></div>`; }).join('')}
    ${requestsHtml()}
    ${collectionHtml()}
    <h4 class="group-title">Skills</h4>
    <div class="skills">${SKILLS.map(sk => { const s2 = S.progress.skills[sk.k]; const pct = s2.lv >= SKILL_MAX ? 100 : Math.round(s2.xp / xpForLevel(s2.lv) * 100); return `<div class="skill" title="${esc(sk.perk)}"><span class="skill-icon">${sk.icon}</span><div class="need-main"><div class="need-top"><b>${esc(sk.label)}</b><span>Level ${s2.lv}</span></div><div class="need-bar"><i style="width:${pct}%;background:var(--sky)"></i></div><small>${esc(sk.perk)}</small></div></div>`; }).join('')}</div>
    <h4 class="group-title">Careers <small>one shift a day, 7 AM–6 PM</small></h4>
    ${careerCards()}
    <h4 class="group-title">Emoji collection <small>${unlockedSet(S.progress).size} of ${new Set([...ALL_EMOJIS, ...Object.values(SIGNATURE)]).size}</small></h4>
    <div class="stickers">${STARTER.map(e => `<span class="sticker" title="Starter">${e}</span>`).join('')}${ACHIEVEMENTS.map(a => { const got = S.progress.achievements.includes(a.id); return a.emojis.map(e => `<span class="sticker ${got ? '' : 'locked'}" title="${esc(got ? a.label : 'Locked: ' + a.label)}">${got ? e : '🔒'}</span>`).join(''); }).join('')}${Object.entries(SIGNATURE).map(([nm, e]) => { const got = (S.progress.friends[nm]?.hearts || 0) >= 3; return `<span class="sticker ${got ? '' : 'locked'}" title="${esc(got ? nm + '’s emoji' : 'Reach 3 hearts with ' + nm)}">${got ? e : '🔒'}</span>`; }).join('')}</div>
    <h4 class="group-title">Next to unlock</h4>
    <ul class="log">${ACHIEVEMENTS.filter(a => !S.progress.achievements.includes(a.id)).slice(0, 4).map(a => `<li><b>${esc(a.label)}</b><span>${a.emojis.join(' ')}</span></li>`).join('') || '<li><b>You’ve unlocked them all!</b><span>🏆</span></li>'}</ul>
    <h4 class="group-title">Recently</h4>
    ${S.progress.done.length ? '<ul class="log">' + S.progress.done.slice(0, 6).map(d => `<li><b>${esc(d.what)}</b><span>${esc(d.place)}</span></li>`).join('') + '</ul>' : '<p class="lead">Nothing yet. Visit a place and try its activity to start your journal.</p>'}
  </div>`);
  const shopBtn = h(`<button class="island-cta"><span>🛍️</span><b>Coin shop</b><small>Emoji packs and town passes</small></button>`); shopBtn.onclick = () => showShop();
  el.querySelector('.stickers').after(shopBtn);
  openSheet('journal', 'Your journal', 'Today in ' + C.meta.name, el, { tab: 'journal' });
}
function careerCards() {
  const ids = Object.keys(CAREERS).filter(id => S.progress.jobs[id].level > 0 || S.progress.jobs[id].good > 0 || careerOf(id).city === C.id || id === 'tram');
  return ids.map(id => {
    const car = careerOf(id), j = S.progress.jobs[id], r = car.ladder[j.level], next = car.ladder[j.level + 1];
    return `<div class="career"><span class="career-icon">${r.icon}</span><div><b>${esc(r.title)}</b><small>${r.pay} ✦ a shift at ${esc(car.place)}. ${next ? `Next: ${esc(next.title)} after ${(skillLv('logic') >= 3 ? 2 : 3) - j.good} more good shift(s).` : 'Top of the ladder!'}</small></div></div>`;
  }).join('');
}
function showInfo(icon, title, text) {
  openSheet('info', 'Landmark', title, h(`<div class="info"><div class="emoji-art">${icon}</div><p class="card-text">${esc(text)}</p></div>`), { compact: true, tab: 'explore' });
}
function showDistricts() {
  const body = openSheet('districts', C.meta.name, 'Getting around', null, { tab: 'explore' });
  const more = h(`<button class="island-cta"><span>🗺️</span><b>Island map</b><small>Take the bus to other towns</small></button>`); more.onclick = () => showIsland();
  body.append(more);
  body.append(h(`<h4 class="group-title">Tram stops in ${esc(C.meta.name)}</h4>`));
  for (const [k, d] of Object.entries(C.districts)) {
    const here = C.districtAt(player.x, player.y) === k;
    const el = h(`<button class="district-row ${here ? 'here' : ''}"><i style="background:${d.color}"></i><span><b>${esc(d.name)}</b><small>${esc(d.blurb)}</small></span><em>${here ? 'You’re here' : 'Take the tram'}</em></button>`);
    el.onclick = () => { if (here) { closeSheet(); return; } travel(k); };
    body.append(el);
  }
}
function travel(k) {
  closeSheet();
  const fade = $('fade'); fade.classList.add('on');
  setTimeout(() => {
    cancelActions();
    const sp = C.districts[k].spawn, at = nearestWalkable(cityWorld, sp[0], sp[1]) || sp; setScene('city', at[0] + 0.5, at[1] + 0.5);
    fade.classList.remove('on'); toast(`Welcome to ${C.districts[k].name}`); player.say('🚋', 1.6);
  }, S.settings.reduced ? 50 : 420);
}

// ---------- the island road: towns, passports, the bus and the coin shop ----------
function taskProgress(t, st = statsView()) { return Math.min(t.n, st[t.k] || 0); }
function cityTasksDone(id, st = statsView()) { const m = cityMeta(id); return (m.tasks || []).every(t => taskProgress(t, st) >= t.n); }
function cityOpen(id) { return id === 'willowvale' || id === 'maple' || !!S.progress.unlocked[id] || !!S.progress.visited[id] || cityTasksDone(id); }
function islandMapSvg() {
  const st = statsView();
  const pos = id => cityMeta(id).pos;
  const roads = ROUTES.map(([a, b]) => { const [x1, y1] = pos(a), [x2, y2] = pos(b); const open = cityOpen(a) && cityOpen(b); return `<path d="M${x1} ${y1} Q ${(x1 + x2) / 2 + (y2 - y1) * 0.12} ${(y1 + y2) / 2 - (x2 - x1) * 0.12} ${x2} ${y2}" class="iroad ${open ? 'open' : ''}"/>`; }).join('');
  const isles = CITY_LIST.map(c => {
    const [x, y] = c.pos, here = c.id === C.id, open = cityOpen(c.id);
    return `<g class="isle ${here ? 'here' : ''} ${open ? 'open' : 'locked'}" data-city="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}${open ? '' : ' (locked)'}">
      <ellipse cx="${x}" cy="${y + 1.5}" rx="11" ry="6.5" class="isle-sand"/><ellipse cx="${x}" cy="${y}" rx="9.5" ry="5.6" fill="${open ? c.color : '#B9C4CF'}" class="isle-land"/>
      <text x="${x}" y="${y + 1.8}" text-anchor="middle" class="isle-icon">${open ? c.icon : '🔒'}</text>
      <text x="${x}" y="${y + 11.5}" text-anchor="middle" class="isle-name">${esc(c.name)}</text>
      ${here ? `<circle cx="${x + 8}" cy="${y - 5}" r="2.6" class="isle-pin"/>` : ''}</g>`;
  }).join('');
  return `<svg class="island-map" viewBox="0 0 100 100" role="img" aria-label="Map of the island towns"><rect width="100" height="100" rx="6" class="isea"/>${[...Array(14)].map((_, k) => `<path d="M${(k * 37) % 96 + 2} ${(k * 23) % 90 + 6} q2 -1.5 4 0" class="wave"/>`).join('')}${roads}${isles}</svg>`;
}
function showIsland(focus) {
  const st = statsView();
  const body = openSheet('island', 'The island road', 'Travel the island', null, { tab: 'explore' });
  const map = h(`<div class="island-wrap">${islandMapSvg()}</div>`);
  body.append(map);
  body.append(h(`<p class="lead">Every town has its own neighbours, jobs and emojis. Finish a town’s passport to open its road.</p>`));
  const cards = {};
  for (const c of CITY_LIST) {
    const here = c.id === C.id, open = cityOpen(c.id), fare = Math.max(c.fare, C.meta.fare);
    const tasks = c.tasks || [];
    const el = h(`<article class="card town-card ${here ? 'here' : ''} ${open ? '' : 'locked'}" style="--town:${c.color}">
      <div class="town-head"><span class="town-icon">${c.icon}</span><div><h3>${esc(c.name)}</h3><p class="card-sub">${esc(c.tagline)}</p></div>
      <span class="chip ${here ? 'chip-mine' : open ? 'chip-ok' : 'chip-off'}">${here ? 'You’re here' : open ? (S.progress.visited[c.id] ? 'Visited' : 'Open') : 'Locked'}</span></div>
      ${!open && tasks.length ? `<ul class="passport">${tasks.map(t => { const v = taskProgress(t, st), ok = v >= t.n; return `<li class="${ok ? 'ok' : ''}"><i>${ok ? '✓' : ''}</i><span>${esc(t.label)}</span><b>${v}/${t.n}</b></li>`; }).join('')}</ul>` : ''}
      <div class="card-actions">
        ${here ? '' : open ? `<button class="btn btn-primary" data-a="go">🚌 Ride there · ✦ ${fare}</button>` : `<button class="btn btn-sun" data-a="skip">Open now for ✦ ${c.skip}</button>`}
      </div></article>`);
    const go = el.querySelector('[data-a=go]'); if (go) go.onclick = () => travelTo(c.id);
    const skip = el.querySelector('[data-a=skip]');
    if (skip) skip.onclick = () => {
      if (S.coins < c.skip) { toast(`You need ✦ ${c.skip}. Keep playing to earn coins, or finish the passport.`); return; }
      if (!skip.dataset.sure) { skip.dataset.sure = 1; skip.textContent = `Tap again to spend ✦ ${c.skip}`; return; }
      setCoins(S.coins - c.skip, true); S.progress.unlocked[c.id] = 1; saveProgress(); SND.sfx('unlock');
      celebrations.push({ title: 'Road open!', emojis: [c.icon, '🚌'], label: `The road to ${c.name} is open.` }); nextCelebration();
      showIsland(c.id);
    };
    cards[c.id] = el; body.append(el);
  }
  map.querySelectorAll('.isle').forEach(g => { g.onclick = () => cards[g.dataset.city]?.scrollIntoView({ behavior: S.settings.reduced ? 'auto' : 'smooth', block: 'center' }); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') g.onclick(); }; });
  if (focus && cards[focus]) setTimeout(() => cards[focus].scrollIntoView({ block: 'center' }), 60);
  // a road that just opened by finishing its passport gets a little party
  for (const c of CITY_LIST) if (c.tasks?.length && !S.progress.unlocked[c.id] && !S.progress.visited[c.id] && cityTasksDone(c.id, st) && !S.progress.daily['road:' + c.id]) { S.progress.daily['road:' + c.id] = 1; celebrations.push({ title: 'Road open!', emojis: [c.icon, '🚌'], label: `You finished the ${c.name} passport!` }); nextCelebration(); }
}
function travelTo(id) {
  const m = cityMeta(id);
  if (id === C.id) { closeSheet(); return; }
  if (!cityOpen(id)) { showIsland(id); return; }
  const fare = Math.max(m.fare, C.meta.fare);
  if (S.coins < fare) { toast(`The bus costs ✦ ${fare}. Earn a few coins first.`); return; }
  closeSheet(); cancelActions(); closePie();
  if (fare) setCoins(S.coins - fare, true);
  const ride = $('ride'); $('ride-to').textContent = m.name; $('ride-from').textContent = C.meta.name; $('ride-icon').textContent = m.icon;
  ride.style.setProperty('--town', m.color);
  ride.classList.remove('hidden'); ride.classList.remove('go'); void ride.offsetWidth; ride.classList.add('go');
  SND.sfx('door');
  setTimeout(() => {
    useCity(id);
    const first = !S.progress.visited[id];
    S.progress.visited[id] = (S.progress.visited[id] || 0) + 1;
    setScene('city', C.stop.stand[0], C.stop.stand[1] + 1);
    player.face(player.x + 1, player.y + 1);
    bumpStat('trips');
    if (first && CITY_PACKS[id] && !S.progress.packs.includes(id)) { S.progress.packs.push(id); celebrations.push({ title: `Welcome to ${m.name}!`, emojis: CITY_PACKS[id].emojis, label: 'New emojis unlocked for your first visit.' }); }
    saveProgress(); checkAchievements();
  }, S.settings.reduced ? 150 : 1300);
  setTimeout(() => { ride.classList.add('hidden'); ride.classList.remove('go'); toast(`Welcome to ${m.name}!`); player.say(m.icon, 2); nextCelebration(); }, S.settings.reduced ? 300 : 2200);
}
function showShop() {
  const body = openSheet('shop', 'Spend your coins', 'Coin shop', null, { tab: 'journal' });
  body.append(h(`<div class="notice calm"><b>Coins only</b><span>Everything here is bought with coins you earn by playing. There is no real money in Willowvale.</span></div>`));
  body.append(h(`<h4 class="group-title">Emoji packs</h4>`));
  for (const [id, pk] of Object.entries(CITY_PACKS)) {
    const have = S.progress.packs.includes(id);
    const el = h(`<article class="card shop-card"><div class="shop-emojis">${pk.emojis.join(' ')}</div><div class="card-main"><div class="card-top"><h3>${esc(pk.name)}</h3>${have ? '<span class="chip chip-mine">Yours</span>' : `<span class="chip chip-sun">✦ ${pk.price}</span>`}</div><p class="card-sub">${have ? 'Ready to use in emoji chat.' : `Free when you first visit ${esc(cityMeta(id).name)}.`}</p>${have ? '' : `<button class="btn btn-sun btn-small">Buy for ✦ ${pk.price}</button>`}</div></article>`);
    const b = el.querySelector('button');
    if (b) b.onclick = () => {
      if (S.coins < pk.price) { toast(`You need ✦ ${pk.price}.`); return; }
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = `Tap again to spend ✦ ${pk.price}`; return; }
      setCoins(S.coins - pk.price, true); S.progress.packs.push(id); saveProgress(); SND.sfx('unlock');
      celebrations.push({ title: 'New emojis!', emojis: pk.emojis, label: `${pk.name} added to your chat.` }); nextCelebration(); showShop();
    };
    body.append(el);
  }
  body.append(h(`<h4 class="group-title">Town passes</h4>`));
  const locked = CITY_LIST.filter(c => !cityOpen(c.id));
  if (!locked.length) body.append(h(`<p class="lead">Every town is open. Happy travels!</p>`));
  for (const c of locked) {
    const el = h(`<article class="card shop-card"><div class="shop-emojis">${c.icon}</div><div class="card-main"><div class="card-top"><h3>${esc(c.name)} pass</h3><span class="chip chip-sun">✦ ${c.skip}</span></div><p class="card-sub">Opens the road now, or finish its passport for free.</p><button class="btn btn-ghost btn-small">See passport</button></div></article>`);
    el.querySelector('button').onclick = () => showIsland(c.id);
    body.append(el);
  }
  body.append(h(`<h4 class="group-title">Homes in other towns</h4>`));
  const hb = h(`<article class="card shop-card"><div class="shop-emojis">🔑</div><div class="card-main"><div class="card-top"><h3>Rent a home</h3></div><p class="card-sub">Every town has homes to rent by the day. Visit a town and open Homes.</p><button class="btn btn-ghost btn-small">Homes in ${esc(C.meta.name)}</button></div></article>`);
  hb.querySelector('button').onclick = () => showHomes();
  body.append(hb);
}

// ---------- profile, account & settings ----------
function avatarEditor(state, onChange) {
  const el = h(`<div class="editor"><div class="species-row" role="radiogroup" aria-label="Animal"></div><div class="outfit-row" role="radiogroup" aria-label="Outfit"></div></div>`);
  const sr = el.querySelector('.species-row'), or = el.querySelector('.outfit-row');
  for (const [k, s] of Object.entries(A.SPECIES)) {
    const b = h(`<button class="species ${state.species === k ? 'on' : ''}" role="radio" aria-checked="${state.species === k}" aria-label="${s.label}"><span>${s.label}</span></button>`);
    b.prepend(portrait(k, state.look, 48));
    b.onclick = () => { state.species = k; SND.sfx('tap'); onChange(); };
    sr.append(b);
  }
  A.OUTFITS.forEach((o, k) => {
    const on = state.preset === k;
    const b = h(`<button class="swatch ${on ? 'on' : ''}" role="radio" aria-checked="${on}" aria-label="Starter outfit ${k + 1}" style="--a:${o.topColor};--b:${o.accColor}"></button>`);
    b.onclick = () => { state.preset = k; state.look = { ...o }; SND.sfx('tap'); onChange(); };
    or.append(b);
  });
  const dice = h('<button class="swatch dice" aria-label="Surprise me: a random look">🎲</button>');
  dice.onclick = () => { state.preset = -1; state.look = A.randomLook(Math.floor(Math.random() * 1e6)); SND.sfx('pop'); onChange(); };
  or.append(dice);
  return el;
}
function applyProfile() {
  if (!S.profile.look) S.profile.look = A.normLook(S.profile.outfit ?? 0);
  player.species = S.profile.species; player.outfit = S.profile.look;
  $('player-name').textContent = S.user ? S.user.username : S.profile.name;
  A.drawPortrait($('hud-avatar'), S.profile.species, S.profile.look, { size: 40 });
  store.set('willowvale_player_v2', S.profile);
  if (typeof socket !== 'undefined' && socket && socket.connected) socket.emit('p:look', { species: S.profile.species, look: S.profile.look });
}
function showProfile(message) {
  const state = { ...S.profile };
  const el = h(`<div class="profile">
    ${message ? `<div class="notice"><b>${esc(message)}</b></div>` : ''}
    <div class="profile-hero"><div class="portrait-wrap"></div><label class="field"><span>Your name in town</span><input id="profile-name" maxlength="14" value="${esc(state.name)}" autocomplete="off"></label></div>
    <div class="editor-slot"></div>
    <button class="btn btn-sun btn-wide" id="open-wardrobe">Open the wardrobe</button>
    <section class="account"></section></div>`);
  const redraw = () => {
    el.querySelector('.portrait-wrap').innerHTML = ''; el.querySelector('.portrait-wrap').append(portrait(state.species, state.look, 96, { full: true, t: time }));
    const slot = el.querySelector('.editor-slot'); slot.innerHTML = ''; slot.append(avatarEditor(state, () => { redraw(); save(); }));
  };
  const save = () => { state.name = cleanName(el.querySelector('#profile-name').value) || state.name; S.profile = { ...S.profile, ...state }; applyProfile(); };
  el.querySelector('#profile-name').addEventListener('input', e => { const c = cleanName(e.target.value); if (c !== e.target.value.trim()) e.target.value = c; });
  el.querySelector('#profile-name').addEventListener('change', save);
  el.querySelector('#open-wardrobe').onclick = () => showWardrobe();
  redraw();
  const acc = el.querySelector('.account');
  if (S.token) renderAccount(acc);
  else if (RD) {
    acc.innerHTML = `<h4 class="group-title">Save your game</h4><p class="lead">Log in to Reddit and your town saves to your account, so you can carry on from any device.</p><button class="btn btn-sun" id="rd-login">Log in to Reddit</button>`;
    acc.querySelector('#rd-login').onclick = () => RD.login();
  } else {
    acc.innerHTML = `<h4 class="group-title">Save your game to the cloud</h4>
      <p class="lead">With an account your game saves online, so you can carry on from another phone or computer. Use a nickname, never your real name. No email needed.</p>
      <label class="field"><span>Nickname</span><input id="auth-username" autocomplete="username" maxlength="20" placeholder="3–20 letters, numbers or _"></label>
      <label class="field"><span>Password</span><input id="auth-password" type="password" autocomplete="current-password" placeholder="8 or more characters"></label>
      <label class="check"><input type="checkbox" id="auth-show"> Show password</label>
      <p class="form-error" id="auth-error" role="alert"></p>
      <div class="row2"><button class="btn btn-primary" id="signup-button">Create account</button><button class="btn btn-ghost" id="login-button">Log in</button></div>
      <p class="fine">Other players will see your nickname. Pick something kind, and keep your password secret.</p>`;
    acc.querySelector('#signup-button').onclick = () => auth('register');
    acc.querySelector('#login-button').onclick = () => auth('login');
    acc.querySelector('#auth-show').onchange = e => { $('auth-password').type = e.target.checked ? 'text' : 'password'; };
    acc.querySelector('#auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') auth('login'); });
  }
  openSheet('profile', 'You', 'Your character', el, { tab: 'explore' });
}
let authBusy = false;
async function auth(type) {
  if (authBusy) return; // a double tap must not send two requests
  const u = $('auth-username').value.trim(), p = $('auth-password').value, err = $('auth-error');
  err.textContent = '';
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) { err.textContent = 'Nicknames are 3–20 letters, numbers or underscores, with no spaces.'; return; }
  if (p.length < 8) { err.textContent = 'Passwords need at least 8 characters.'; return; }
  const btns = ['signup-button', 'login-button'].map(id => document.getElementById(id)).filter(Boolean);
  const btn = document.getElementById(type === 'register' ? 'signup-button' : 'login-button'), label = btn ? btn.textContent : '';
  authBusy = true; btns.forEach(b => { b.disabled = true; }); if (btn) btn.textContent = type === 'register' ? 'Creating…' : 'Logging in…';
  const slow = setTimeout(() => { if (authBusy) err.textContent = 'The town server is waking up. This can take up to a minute the first time…'; }, 4000);
  try {
    const d = await request('/api/auth/' + type, 'POST', { username: u, password: p });
    S.token = d.token; try { localStorage.setItem('willowvale_token', S.token); } catch { /* ignore */ }
    S.user = d.user; if (S.profile) applyProfile(); connect();
    toast(type === 'register' ? `Welcome to Willowvale, ${u}! Your game now saves to the cloud.` : `Welcome back, ${u}!`);
    closeSheet(); cloudAfterLogin();
  } catch (e) {
    err.textContent = /fetch|network|load failed/i.test(e.message) ? 'Can’t reach the town server. Check your internet and try again.' : e.message;
  } finally {
    clearTimeout(slow); authBusy = false; btns.forEach(b => { b.disabled = false; }); if (btn) btn.textContent = label;
  }
}
// ---------- cloud saves ----------
function storeCloud() { store.set('willowvale_cloud_v1', { version: CLOUD.version, user: CLOUD.user, savedAt: CLOUD.savedAt }); }
const saveBlob = () => ({ progress: { ...S.progress, coins: S.coins }, profile: S.profile });
const agoText = t => { const m = Math.round((Date.now() - t) / 60000); return !t ? 'not yet' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
function cloudStatusText() {
  return { saving: 'Saving to the cloud…', saved: `☁️ Saved to the cloud ${agoText(CLOUD.savedAt)}`, offline: 'You’re offline. Your game will save to the cloud when you’re back.', conflict: 'Waiting for you to choose which save to keep.', off: 'Cloud saves are off.' }[CLOUD.state] || '';
}
function renderAccount(acc) {
  acc.innerHTML = `<h4 class="group-title">Account</h4>
    <p class="lead">Signed in as <b>${esc(S.user?.username || CLOUD.user || 'player')}</b>.</p>
    <div class="notice calm"><b id="cloud-status">${esc(cloudStatusText())}</b><span>Your character, coins, homes, garden and friends are all in your save.</span></div>
    <div class="row2"><button class="btn btn-sun" id="cloud-now">Save now</button><button class="btn btn-ghost" id="logout-button">Log out</button></div>
    <details class="danger"><summary>Delete my account</summary><p class="lead">This removes your account and cloud save for good. Your game stays on this device.</p>
      <label class="field"><span>Type your password to confirm</span><input id="del-password" type="password" autocomplete="current-password"></label>
      <p class="form-error" id="del-error" role="alert"></p><button class="btn btn-ghost" id="del-button">Delete account</button></details>`;
  if (RD) { acc.querySelector('.row2 #logout-button').remove(); acc.querySelector('details.danger').remove(); acc.querySelector('.lead').innerHTML = `Saving to your Reddit account, <b>u/${esc(S.user?.username || RD.user?.username || '')}</b>.`; }
  acc.querySelector('#cloud-now').onclick = async () => { CLOUD.dirty = true; await cloudPush().catch(() => {}); renderAccount(acc); };
  if (!RD) acc.querySelector('#logout-button').onclick = async () => { await logout(); showProfile(); };
  if (!RD) acc.querySelector('#del-button').onclick = async () => {
    try { await request('/api/account', 'DELETE', { password: acc.querySelector('#del-password').value }); await logout(); toast('Your account and cloud save were deleted.'); showProfile(); }
    catch (e) { acc.querySelector('#del-error').textContent = e.message; }
  };
}
async function cloudAfterLogin() {
  if (!S.token) return;
  try {
    const r = await request('/api/save');
    const sameUser = CLOUD.user === S.user?.username;
    if (!r.data) { CLOUD.version = 0; CLOUD.user = S.user?.username; CLOUD.ready = true; CLOUD.dirty = true; await cloudPush(); return; }
    if (sameUser && CLOUD.version === r.version) { CLOUD.ready = true; CLOUD.state = 'saved'; if (CLOUD.dirty) cloudPush(); return; }
    const fresh = (S.progress.clock || 0) < 900 && !Object.keys(S.progress.places || {}).length;
    if (fresh || (sameUser && !CLOUD.dirty)) { applyCloud(r.data, r.version); return; }
    chooseSave(r);
  } catch (e) { CLOUD.state = 'offline'; }
}
function applyCloud(data, version) {
  RESETTING = true;
  store.set('willowvale_progress_v2', data.progress); if (data.profile) store.set('willowvale_player_v2', data.profile);
  CLOUD.version = version; CLOUD.user = S.user?.username; CLOUD.savedAt = Date.now(); storeCloud();
  toast('Loading your cloud save…'); setTimeout(() => location.reload(), 500);
}
function chooseSave(r) {
  if (!r || !r.data) { CLOUD.version = (r && r.version) || 0; CLOUD.ready = true; CLOUD.dirty = true; CLOUD.state = 'offline'; return; }
  CLOUD.state = 'conflict';
  const cp = r.data.progress || {}, cday = dayOf(cp.clock || 0), lday = dayOf(S.progress.clock || 0);
  const el = h(`<div class="choose-save"><p class="lead">There’s a save in the cloud and a different one on this device. Which one do you want to keep playing?</p>
    <button class="save-pick" data-k="cloud"><span>☁️</span><b>The cloud save</b><small>Day ${cday} · ✦ ${cp.coins ?? 0} · saved ${r.updatedAt ? new Date(r.updatedAt).toLocaleString() : 'earlier'}</small></button>
    <button class="save-pick" data-k="device"><span>📱</span><b>This device</b><small>Day ${lday} · ✦ ${S.coins} · playing now</small></button>
    <p class="hint-text">The other save will be replaced.</p></div>`);
  el.querySelector('[data-k=cloud]').onclick = () => applyCloud(r.data, r.version);
  el.querySelector('[data-k=device]').onclick = async () => { CLOUD.version = r.version; CLOUD.user = S.user?.username; CLOUD.ready = true; CLOUD.dirty = true; closeSheet(); await cloudPush(); toast('This device’s game is now your cloud save.'); };
  openSheet('choose-save', 'Two saves found', 'Which game is yours?', el, { tab: 'explore' });
}
let pushing = null;
async function cloudPush() {
  if (!S.token || !CLOUD.ready || CLOUD.state === 'conflict') return;
  if (pushing) return pushing;
  CLOUD.state = 'saving'; const wasDirty = CLOUD.dirty; CLOUD.dirty = false;
  pushing = (async () => {
    try {
      const r = await fetch(API_BASE + '/api/save', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.token }, body: JSON.stringify({ data: saveBlob(), baseVersion: CLOUD.version }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409) { chooseSave(d); return; }
      if (!r.ok) throw new Error(d.error || 'save failed');
      CLOUD.version = d.version; CLOUD.user = S.user?.username; CLOUD.savedAt = Date.now(); CLOUD.state = 'saved'; storeCloud();
    } catch { CLOUD.dirty = CLOUD.dirty || wasDirty; CLOUD.state = 'offline'; }
    finally { pushing = null; const st = document.getElementById('cloud-status'); if (st) st.textContent = cloudStatusText(); }
  })();
  return pushing;
}
setInterval(() => {
  if (!S.token) return;
  if (CLOUD.state === 'conflict' && S.sheet !== 'choose-save') { CLOUD.state = 'offline'; cloudAfterLogin(); return; }
  if (CLOUD.ready && CLOUD.dirty) cloudPush();
}, 20000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S.token && CLOUD.ready && CLOUD.dirty) cloudPush(); });
window.addEventListener('online', () => { if (S.token) (CLOUD.ready ? cloudPush() : cloudAfterLogin()); });

async function logout() {
  if (CLOUD.dirty && S.token) await cloudPush().catch(() => {});
  S.token = ''; S.user = null; try { localStorage.removeItem('willowvale_token'); } catch { /* ignore */ }
  S.online = 'guest'; $('online-dot').className = 'online-dot'; setTimeout(connect, 0);
  Object.assign(CLOUD, { version: 0, user: null, state: 'off', ready: false }); storeCloud();
  applyProfile(); toast('Logged out. Your game is still on this device.');
}
function showSettings() {
  const el = h(`<div class="settings">
    <label class="switch"><input type="checkbox" id="set-labels" ${S.settings.labels ? 'checked' : ''}><span class="track"></span><span>Show place names</span></label>
    <label class="switch"><input type="checkbox" id="set-reduced" ${S.settings.reduced ? 'checked' : ''}><span class="track"></span><span>Reduce motion</span></label>
    <label class="switch"><input type="checkbox" id="set-music" ${S.settings.music ? 'checked' : ''}><span class="track"></span><span>Music</span></label>
    <label class="switch"><input type="checkbox" id="set-sfx" ${S.settings.sfx ? 'checked' : ''}><span class="track"></span><span>Sound effects</span></label>
    <label class="slider"><span>Music volume</span><input type="range" id="set-mvol" min="0" max="100" value="${Math.round((S.settings.musicVol ?? 1) * 100)}"></label>
    <label class="slider"><span>Sound volume</span><input type="range" id="set-svol" min="0" max="100" value="${Math.round((S.settings.sfxVol ?? 1) * 100)}"></label>
    <label class="switch"><input type="checkbox" id="set-freewill" ${S.settings.freewill ? 'checked' : ''}><span class="track"></span><span>Free will: your character looks after themselves when you stop tapping</span></label>
    <h4 class="group-title">How to play</h4>
    <ul class="tips"><li><b>Walk</b> Use the stick, tap the ground, or WASD / arrow keys.</li><li><b>Visit</b> Tap a building to walk to its door.</li><li><b>Meet</b> Tap a neighbour to say hello and help them out.</li><li><b>Look around</b> Drag to pan, pinch or scroll to zoom.</li></ul>
    <h4 class="group-title">For grown-ups</h4>
    <ul class="tips"><li><b>Chat</b> Players talk only with emojis. There is no typing, so nobody can send words, links or personal details.</li><li><b>Names</b> Town names allow letters only. Accounts use a nickname, never a real name.</li><li><b>Money</b> Coins are earned in the game. There are no purchases with real money.</li><li><b>Saving</b> As a guest, progress stays on this device only.</li></ul></div>`);
  el.querySelector('#set-labels').onchange = e => { S.settings.labels = e.target.checked; saveSettings(); };
  el.querySelector('#set-reduced').onchange = e => { S.settings.reduced = e.target.checked; saveSettings(); };
  el.querySelector('#set-music').onchange = e => { S.settings.music = e.target.checked; SND.setPrefs({ music: e.target.checked }); saveSettings(); };
  el.querySelector('#set-sfx').onchange = e => { S.settings.sfx = e.target.checked; SND.setPrefs({ sfx: e.target.checked }); saveSettings(); };
  el.querySelector('#set-mvol').oninput = e => { S.settings.musicVol = e.target.value / 100; SND.setPrefs({ musicVol: S.settings.musicVol }); saveSettings(); };
  el.querySelector('#set-svol').oninput = e => { S.settings.sfxVol = e.target.value / 100; SND.setPrefs({ sfxVol: S.settings.sfxVol }); saveSettings(); };
  el.querySelector('#set-freewill').onchange = e => { S.settings.freewill = e.target.checked; saveSettings(); };
  el.prepend(h(`<div class="pause-actions"><button class="btn btn-primary btn-wide btn-big" id="resume-button">Resume</button><button class="btn btn-ghost btn-wide" id="pause-profile">Character &amp; account</button></div>`));
  el.querySelector('#resume-button').onclick = closeSheet;
  el.querySelector('#pause-profile').onclick = () => showProfile();
  el.querySelector('.tips').insertAdjacentHTML('beforeend', '<li><b>Controls</b> Stick to move, hand button to talk or go inside, shoe to run, camera to centre and zoom.</li><li><b>Keyboard</b> WASD to move, Shift or R to run, E or Space to interact, C for camera, P to pause.</li>');
  const adm = h(`<button class="btn btn-ghost btn-wide" id="admin-open">${ADMIN.on ? '🛠️ Admin panel' : '🔐 Admin sign-in (grown-ups)'}</button>`);
  adm.onclick = () => (ADMIN.on ? showAdmin() : showAdminLogin());
  el.append(adm);
  openSheet('pause', 'Paused', 'Willowvale', el, { tab: 'explore' });
}

// ---------- admin mode (for the game's owner: test every town and feature) ----------
// The key is checked by the server (ADMIN_KEY), so it never lives in the app.
const ADMIN = { on: false, token: safeGet('willowvale_admin') || '' };
if (ADMIN.token) fetch(API_BASE + '/api/admin/check', { headers: { Authorization: 'Bearer ' + ADMIN.token } }).then(r => r.json()).then(d => { ADMIN.on = !!d.ok; if (!d.ok) { ADMIN.token = ''; safeSet('willowvale_admin', ''); } document.body.classList.toggle('is-admin', ADMIN.on); }).catch(() => {});
function showAdminLogin() {
  const el = h(`<form class="admin-login"><p class="lead">For the game’s owner. Enter the admin key to open every town and tool.</p>
    <label class="field"><span>Admin key</span><input id="admin-key" type="password" autocomplete="off" required></label>
    <p class="hint-text" id="admin-msg"></p><button class="btn btn-primary btn-wide" type="submit">Open admin panel</button></form>`);
  el.onsubmit = async e => {
    e.preventDefault();
    $('admin-msg').textContent = 'Checking…';
    try {
      const res = await fetch(API_BASE + '/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: el.querySelector('#admin-key').value }) });
      const d = await res.json();
      if (!res.ok) { $('admin-msg').textContent = d.error || 'That did not work.'; return; }
      ADMIN.on = true; ADMIN.token = d.token; safeSet('willowvale_admin', d.token); document.body.classList.add('is-admin');
      SND.sfx('unlock'); showAdmin();
    } catch { $('admin-msg').textContent = 'Could not reach the server. Check your connection.'; }
  };
  openSheet('admin-login', 'Grown-ups only', 'Admin sign-in', el, { tab: 'explore' });
}
function adminDo(label, fn) { fn(); saveProgress(); toast('Admin: ' + label); }
function showAdmin() {
  if (!ADMIN.on) { showAdminLogin(); return; }
  const st = statsView();
  const towns = CITY_LIST.map(c => `<button class="admin-town ${c.id === C.id ? 'here' : ''}" data-town="${c.id}" style="--town:${c.color}"><span>${c.icon}</span><b>${esc(c.name)}</b><small>${c.id === C.id ? 'Here' : cityOpen(c.id) ? 'Open' : 'Locked'}</small></button>`).join('');
  const people = [...cityNpcs].map(n => `<li><b>${esc(n.name)}</b><span>${esc(n.doing || '')}</span><button class="btn btn-ghost btn-small" data-meet="${esc(n.name)}">Go to</button></li>`).join('');
  const el = h(`<div class="admin">
    <div class="notice"><b>Admin mode is on</b><span>Changes only affect this device’s game. Day ${dayOf(S.progress.clock)}, ${clockText(S.progress.clock)} · ✦ ${S.coins} · ${st.cities} of 7 towns visited</span></div>
    <h4 class="group-title">Jump to any town (free)</h4><div class="admin-towns">${towns}</div>
    <h4 class="group-title">Unlock</h4>
    <div class="admin-grid">
      <button class="btn btn-sun" data-a="coins">+1,000 coins</button>
      <button class="btn btn-sun" data-a="towns">Open all towns</button>
      <button class="btn btn-sun" data-a="emojis">All emojis</button>
      <button class="btn btn-sun" data-a="skills">Max skills</button>
      <button class="btn btn-sun" data-a="careers">Top of every career</button>
      <button class="btn btn-sun" data-a="friends">Best friends with everyone here</button>
      <button class="btn btn-sun" data-a="needs">Fill all needs</button>
      <button class="btn btn-sun" data-a="items">10 of every item</button>
    </div>
    <h4 class="group-title">Time</h4>
    <div class="admin-grid">${[['Morning', 7], ['Noon', 12], ['Evening', 18], ['Night', 22]].map(([l, hr]) => `<button class="btn btn-ghost" data-hour="${hr}">${l}</button>`).join('')}<button class="btn btn-ghost" data-a="day">Next day</button><button class="btn btn-ghost" data-a="weekday">Next weekday 9 AM</button></div>
    <h4 class="group-title">Look around</h4>
    <div class="admin-grid"><button class="btn btn-ghost" data-a="overview">Whole-town view</button><button class="btn btn-ghost" data-a="centre">Back to me</button><button class="btn btn-ghost" data-a="labels">${S.settings.labels ? 'Hide' : 'Show'} name tags</button><button class="btn btn-ghost" data-a="freewill">Free will ${S.settings.freewill ? 'off' : 'on'}</button></div>
    <h4 class="group-title">Neighbours in ${esc(C.meta.name)} right now</h4>
    <ul class="log admin-people">${people}</ul>
    <h4 class="group-title">Danger zone</h4>
    <div class="admin-grid"><button class="btn btn-ghost" data-a="reset">Reset all progress</button><button class="btn btn-ghost" data-a="exit">Sign out of admin</button></div>
  </div>`);
  const A2 = {
    coins: () => adminDo('+1,000 coins', () => setCoins(S.coins + 1000, true)),
    towns: () => adminDo('every town is open', () => { for (const c of CITY_LIST) S.progress.unlocked[c.id] = 1; }),
    emojis: () => adminDo('every emoji unlocked', () => { for (const a of ACHIEVEMENTS) if (!S.progress.achievements.includes(a.id)) S.progress.achievements.push(a.id); for (const id of Object.keys(CITY_PACKS)) if (!S.progress.packs.includes(id)) S.progress.packs.push(id); }),
    skills: () => adminDo('skills at level 10', () => { for (const sk of SKILLS) S.progress.skills[sk.k] = { lv: SKILL_MAX, xp: 0 }; }),
    careers: () => adminDo('top of every career', () => { for (const id of Object.keys(CAREERS)) S.progress.jobs[id] = { level: CAREERS[id].ladder.length - 1, good: 0 }; }),
    friends: () => adminDo(`best friends in ${C.meta.name}`, () => { for (const n of cityNpcs) { const f = friendship(n.name); f.hearts = 5; if (!f.mem || !f.mem.length) addMemory(n.name, 'We became best friends!', f); S.progress.friends[n.name] = f; } }),
    needs: () => adminDo('all needs full', () => { for (const nd of NEEDS) S.progress.needs[nd.k] = 100; }),
    items: () => adminDo('10 of every item', () => { for (const k of Object.keys(ITEMS)) S.progress.inventory[k] = (S.progress.inventory[k] || 0) + 10; }),
    day: () => adminDo('next day', () => { S.progress.clock = (Math.floor(S.progress.clock / 1440) + 1) * 1440 + 7 * 60; }),
    weekday: () => adminDo('next weekday, 9 AM', () => { let d = Math.floor(S.progress.clock / 1440) + 1; while ((d + 1) % 7 === 6 || (d + 1) % 7 === 0) d++; S.progress.clock = d * 1440 + 9 * 60; }),
    overview: () => { closeSheet(); cam.free = true; $('cam-button').classList.add('free'); const c2 = A.P(22, 22, 0); cam.x = c2[0]; cam.y = c2[1]; cam.zoom = mobile() ? 0.14 : 0.24; cam.manual = true; toast('Drag to look around. Tap the camera button to come back.'); },
    centre: () => { closeSheet(); cam.free = false; cam.manual = false; cam.zoom = mobile() ? 0.56 : 0.72; $('cam-button').classList.remove('free'); },
    labels: () => { S.settings.labels = !S.settings.labels; saveSettings(); showAdmin(); },
    freewill: () => { S.settings.freewill = !S.settings.freewill; saveSettings(); showAdmin(); },
    reset: e => { const b = e.currentTarget; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again to erase everything'; return; } RESETTING = true; try { for (const k of ['willowvale_progress_v2', 'willowvale_progress_v1', 'willowvale_player_v2']) localStorage.removeItem(k); } catch { /* ignore */ } location.reload(); },
    exit: () => { ADMIN.on = false; ADMIN.token = ''; safeSet('willowvale_admin', ''); document.body.classList.remove('is-admin'); closeSheet(); toast('Signed out of admin mode.'); },
  };
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = e => { A2[b.dataset.a](e); if (!['overview', 'centre', 'labels', 'freewill', 'reset', 'exit'].includes(b.dataset.a) && S.sheet === 'admin') showAdmin(); });
  el.querySelectorAll('[data-hour]').forEach(b => b.onclick = () => { adminDo(b.textContent.toLowerCase(), () => { const day = Math.floor(S.progress.clock / 1440); S.progress.clock = day * 1440 + (+b.dataset.hour) * 60; }); showAdmin(); });
  el.querySelectorAll('[data-town]').forEach(b => b.onclick = () => { const id = b.dataset.town; if (id === C.id) return; S.progress.unlocked[id] = 1; const keep = S.coins; travelTo(id); setCoins(keep); });
  el.querySelectorAll('[data-meet]').forEach(b => b.onclick = () => { const n = cityNpcs.find(x => x.name === b.dataset.meet); if (!n) return; closeSheet(); if (world.interior) { leaveHome(); setTimeout(() => setScene('city', n.x + 1, n.y + 1), 700); } else setScene('city', n.x + 1, n.y + 1); });
  openSheet('admin', 'Admin', 'Admin panel', el, { tab: 'explore' });
}
if (/[?&]admin\b/.test(location.search)) setTimeout(() => { $('onboarding').classList.contains('hidden') ? (ADMIN.on ? showAdmin() : showAdminLogin()) : null; }, 1500);

// ---------- network ----------
async function request(path, method = 'GET', body) {
  const res = await fetch(API_BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({ error: 'The town server didn’t answer. Check your connection and try again.' }));
  if (!res.ok) throw Error(data.error || 'Request failed');
  return data;
}
var socket = null; // var: useCity runs before this line on start-up
function loadIo() {
  if (typeof window.io === 'function') return Promise.resolve(true);
  return new Promise(r => { const s = document.createElement('script'); s.src = API_BASE + '/socket.io/socket.io.js'; s.onload = () => r(true); s.onerror = () => r(false); document.head.append(s); });
}
// Everyone joins their town's shared streets, signed in or not (signed-in players show their nickname).
async function connect() {
  if (RD) { S.online = 'guest'; return; } // no shared streets inside Reddit yet
  if (!(await loadIo())) return;
  if (socket) { socket.removeAllListeners(); socket.disconnect(); }
  peers.clear();
  socket = window.io(API_BASE || undefined, { auth: S.token ? { token: S.token } : {}, transports: ['websocket', 'polling'] });
  socket.on('connect', () => { S.online = 'live'; $('online-dot').className = 'online-dot live'; joinTown(); });
  socket.on('disconnect', () => { S.online = 'offline'; $('online-dot').className = 'online-dot'; peers.clear(); TOWN.count = 1; });
  socket.on('connect_error', () => { S.online = 'offline'; $('online-dot').className = 'online-dot'; });
  socket.on('town:presence', d => { TOWN.count = d.count; $('online-dot').title = d.count + ' player' + (d.count === 1 ? '' : 's') + ' in town'; });
  socket.on('town:error', d => toast(d.message));
  socket.on('p:list', list => { peers.clear(); for (const d of list) addPeer(d, true); });
  socket.on('p:join', d => addPeer(d));
  socket.on('p:leave', d => { const p = peers.get(d.id); if (p) peers.delete(d.id); });
  socket.on('p:state', d => { const p = peers.get(d.id); if (!p) return; p.tx = d.x; p.ty = d.y; p.scene = d.scene; p.remoteMoving = d.moving; p.seen = performance.now(); });
  socket.on('p:look', d => { const p = peers.get(d.id); if (!p) return; p.species = A.SPECIES[d.species] ? d.species : 'fox'; p.outfit = A.normLook(d.look || {}); });
  socket.on('p:emote', d => {
    const p = peers.get(d.id); if (!p) return;
    p.say(d.e[0], 3); p.wave = d.e.includes('👋') ? 0.9 : 0; p.seen = performance.now();
    const log = peerLogs.get(p.id) || []; log.push({ me: false, e: d.e }); peerLogs.set(p.id, log.slice(-30));
    if (S.sheet === 'peer:' + p.id) renderPeerLog(p);
    else if (d.to === socket.id) { toast(`${p.name} ${d.e.join(' ')}`); SND.sfx('chat'); }
  });
}
const TOWN = { count: 1, sent: { x: 0, y: 0, scene: '', t: 0 } };
function joinTown() {
  if (!socket || !socket.connected) return;
  peers.clear();
  socket.emit('town:join', { townId: C ? C.id : 'willowvale', species: S.profile ? S.profile.species : 'fox', look: S.profile ? S.profile.look : {}, x: player.x, y: player.y, scene: myScene() });
  TOWN.sent = { x: player.x, y: player.y, scene: myScene(), t: performance.now() };
}

// ---------- other players ----------
const peers = new Map(), peerLogs = new Map();
const myScene = () => sceneName === 'city' ? 'city' : 'away';
function addPeer(d, quiet) {
  const p = new Walker(d.x, d.y, A.SPECIES[d.species] ? d.species : 'fox', A.normLook(d.look || {}), { name: d.name, seed: hashStr(d.id) % 97, speed: 4 });
  Object.assign(p, { peer: true, id: d.id, tx: d.x, ty: d.y, scene: d.scene, remoteMoving: d.moving, seen: performance.now() });
  peers.set(d.id, p);
  if (!quiet && d.scene === 'city' && sceneName === 'city') toast(`👋 ${d.name} arrived in ${C ? C.meta.name : 'town'}`);
}
const shownPeers = () => sceneName === 'city' ? [...peers.values()].filter(p => p.scene === 'city') : [];
function tickPeers(dt) {
  const now = performance.now();
  for (const [id, p] of peers) {
    if (now - p.seen > 45000) { peers.delete(id); continue; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d > 6) { p.x = p.tx; p.y = p.ty; }
    else if (d > 0.01) { const k = Math.min(1, dt * 7); p.x += dx * k; p.y += dy * k; if (d > 0.04) p.face(p.tx, p.ty); }
    p.moving = d > 0.04 || (p.remoteMoving && d > 0.01);
    if (p.moving) p.walk += Math.max(d, 0.05) * 9;
    if (p.emote) { p.emoteLife -= dt; if (p.emoteLife <= 0) p.emote = null; }
    if (p.wave > 0) p.wave -= dt;
    p.tick(dt);
  }
  // send my position a few times a second while it changes, and a heartbeat otherwise
  if (!socket || !socket.connected) return;
  const s = TOWN.sent, sc = myScene(), moved = Math.hypot(player.x - s.x, player.y - s.y) > 0.04;
  if ((moved || sc !== s.scene || player.moving !== s.moving) && now - s.t > 140 || now - s.t > 4000) {
    socket.emit('p:state', { x: +player.x.toFixed(2), y: +player.y.toFixed(2), scene: sc, moving: player.moving });
    TOWN.sent = { x: player.x, y: player.y, scene: sc, moving: player.moving, t: now };
  }
}
function drawPeerNames(z) {
  const list = shownPeers(); if (!list.length) return;
  ctx.save();
  ctx.font = `800 ${Math.round(Math.max(11, 12 * Math.min(1.3, z * 1.3)))}px "Baloo 2", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of list) {
    const [sx, sy] = toScreen(p.x, p.y); if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
    const y = sy - 92 * z - (p.emote ? 30 * z : 0), w = ctx.measureText(p.name).width + 16;
    ctx.fillStyle = 'rgba(38,57,90,.82)'; roundRectPath(sx - w / 2, y - 10, w, 20, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(p.name, sx, y + 1);
  }
  ctx.restore();
}
function roundRectPath(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function sendEmote(e, to) {
  player.say(e[0], 2.4); SND.sfx('chat');
  if (to) { to.face(player.x, player.y); player.face(to.x, to.y); const log = peerLogs.get(to.id) || []; log.push({ me: true, e }); peerLogs.set(to.id, log.slice(-30)); }
  if (socket && socket.connected) socket.emit('p:emote', { e, to: to ? to.id : null });
  S.progress.needs.social = Math.min(100, S.progress.needs.social + 3);
}
function renderPeerLog(p) {
  const el = document.getElementById('pchat-log'); if (!el) return;
  const log = peerLogs.get(p.id) || [];
  el.innerHTML = log.length ? log.map(m => `<div class="bubble-row ${m.me ? 'me' : ''}"><span class="ebubble">${m.e.join(' ')}</span></div>`).join('') : '<p class="fine">Say hello with 👋</p>';
  el.scrollTop = el.scrollHeight;
}
function showPeerChat(p) {
  const unlocked = unlockedSet(S.progress);
  let draft = [];
  const el = h(`<div class="echat">
    <div class="echat-who"><div class="portrait-wrap"></div><p class="lead"><b>${esc(p.name)}</b> is another player in ${esc(C ? C.meta.name : 'town')}. Send up to three emojis.</p></div>
    <div class="echat-log" id="pchat-log" aria-live="polite"></div>
    <div class="echat-compose"><div class="echat-draft" id="pchat-draft" aria-label="Your message"></div><button class="btn btn-small btn-ghost" id="pchat-clear">Clear</button><button class="btn btn-primary" id="pchat-send" disabled>Send</button></div>
    <div class="echat-grid" id="pchat-grid"></div>
    <p class="fine">Players can only send emojis to each other, never words.</p></div>`);
  el.querySelector('.portrait-wrap').append(portrait(p.species, p.outfit, 64, { full: true, t: time }));
  const draftEl = el.querySelector('#pchat-draft'), sendBtn = el.querySelector('#pchat-send');
  const renderDraft = () => { draftEl.textContent = draft.join(' ') || '…'; sendBtn.disabled = !draft.length; };
  for (const e of [...STARTER, ...ACHIEVEMENTS.flatMap(a => a.emojis), ...Object.values(SIGNATURE)]) {
    if (!unlocked.has(e)) continue;
    const b = h(`<button class="ekey" aria-label="${e}">${e}</button>`);
    b.onclick = () => { if (draft.length < 3) { draft.push(e); SND.sfx('tap'); renderDraft(); } };
    el.querySelector('#pchat-grid').append(b);
  }
  el.querySelector('#pchat-clear').onclick = () => { draft = []; renderDraft(); };
  sendBtn.onclick = () => { if (!draft.length) return; if (!peers.has(p.id)) { toast(`${p.name} has left town.`); return; } sendEmote(draft.slice(), p); draft = []; renderDraft(); renderPeerLog(p); };
  openSheet('peer:' + p.id, 'Emoji chat', p.name, el, { tab: 'friends' });
  renderPeerLog(p); renderDraft();
}
async function restoreSession() {
  if (!S.token) { connect(); return; }
  try { const d = await request('/api/me'); S.user = d.user; if (S.profile) applyProfile(); connect(); cloudAfterLogin(); }
  catch (e) { if (/sign in again|not found/i.test(e.message)) { S.token = ''; try { localStorage.removeItem('willowvale_token'); } catch { /* ignore */ } } else { CLOUD.state = 'offline'; } connect(); }
}

// ---------- career ----------
const careerOf = id => CAREERS[id] || CAREERS.tram;
const rankOf = id => careerOf(id).ladder[S.progress.jobs[id]?.level || 0];
function jobBlocked() {
  const h = hourOf(S.progress.clock);
  if (h < 7 || h >= 18) return 'Shifts run from 7 AM to 6 PM. Come back in the morning.';
  if (S.progress.lastWorkDay === dayOf(S.progress.clock)) return 'You’ve already worked today. Have some fun!';
  return null;
}
function finishShift(id, startMood = mood(S.progress.needs)) {
  const job = S.progress.jobs[id], car = careerOf(id), rank = car.ladder[job.level];
  S.progress.lastWorkDay = dayOf(S.progress.clock);
  setCoins(S.coins + rank.pay, true);
  const good = startMood >= 45;
  if (good) job.good++;
  const needed = skillLv('logic') >= 3 ? 2 : 3;
  let label = good ? `Great shift! ${job.good} of ${needed} toward a promotion.` : 'A tiring shift. Arrive happier to impress your boss.';
  if (job.good >= needed && job.level < car.ladder.length - 1) {
    job.level++; job.good = 0;
    const nr = car.ladder[job.level];
    celebrations.push({ title: 'Promoted!', emojis: [nr.icon], label: `You’re now a ${nr.title}. Pay is ${nr.pay} ✦ a shift.` });
    label = 'You got promoted!';
  }
  celebrations.unshift({ title: 'Payslip', emojis: ['💰'], label: `+${rank.pay} ✦ as ${rank.title}. ${label}` });
  saveProgress(); nextCelebration(); checkAchievements();
}

// ---------- skills ----------
function addXP(k, amt) {
  const sk = S.progress.skills[k]; if (!sk || sk.lv >= SKILL_MAX) return;
  sk.xp += amt;
  while (sk.lv < SKILL_MAX && sk.xp >= xpForLevel(sk.lv)) {
    sk.xp -= xpForLevel(sk.lv); sk.lv++;
    const info = SKILLS.find(x => x.k === k);
    celebrations.push({ title: 'Skill up!', emojis: [info.icon], label: `${info.label} is now level ${sk.lv}` });
    if (!$('unlock').classList.contains('hidden')) {} else setTimeout(nextCelebration, 0);
    checkAchievements();
  }
  saveProgress();
}

// ---------- achievements & unlockable emojis ----------
function bumpStat(k, n = 1) { S.progress.stats[k] = (S.progress.stats[k] || 0) + n; saveProgress(); }
function statsView() {
  const st = { ...S.progress.stats }, fr = Object.values(S.progress.friends || {});
  st.friends = fr.filter(f => (f.hearts || 0) >= 2).length; st.bestFriends = fr.filter(f => (f.hearts || 0) >= 5).length;
  st.coins = S.coins; st.day = dayOf(S.progress.clock); st.places = Object.keys(S.progress.places || {}).length;
  for (const sk of SKILLS) st[sk.k] = skillLv(sk.k);
  st.jobLevel = Math.max(...Object.values(S.progress.jobs).map(j => j.level));
  st.found = Object.keys(S.progress.found).length; st.decor = S.progress.decor.length; st.restored = S.progress.restore.stage;
  st.cities = Object.keys(S.progress.visited).length; st.achv = S.progress.achievements.length;
  st.rentals = Object.values(S.progress.homes).filter(x => x.city !== 'willowvale').length;
  for (const id of Object.keys(S.progress.visited)) st['visited:' + id] = 1;
  return st;
}
const celebrations = [];
function checkAchievements() {
  const st = statsView(), got = S.progress.achievements;
  for (const a of ACHIEVEMENTS) if (!got.includes(a.id) && a.test(st)) { got.push(a.id); celebrations.push({ title: 'New emojis unlocked!', emojis: a.emojis, label: a.label }); }
  for (const [nm, e] of Object.entries(SIGNATURE)) { const k = 'sig:' + nm; if (!got.includes(k) && (S.progress.friends[nm]?.hearts || 0) >= 3) { got.push(k); celebrations.push({ emojis: [e], label: `${nm} shared their own emoji with you` }); } }
  saveProgress();
  if (celebrations.length && $('unlock').classList.contains('hidden')) nextCelebration();
}
function nextCelebration() {
  if (!$('unlock').classList.contains('hidden')) return;
  const c = celebrations.shift(); if (!c) return;
  $('unlock-title').textContent = c.title || 'New emojis unlocked!';
  $('unlock-emojis').textContent = c.emojis.join(' '); $('unlock-label').textContent = c.label;
  $('unlock').classList.remove('hidden'); SND.sfx('unlock'); player.say(c.emojis[0], 2.5);
  setTimeout(() => { $('unlock').classList.add('hidden'); setTimeout(nextCelebration, 400); }, 3200);
}

// ---------- emoji chat ----------
const chatLogs = new Map();
function meetThen(n, fn) {
  n.busy = 10; n.path = [];
  if (near(n.x, n.y, 2.2)) { n.face(player.x, player.y); player.face(n.x, n.y); fn(); return; }
  const ni = Math.floor(n.x), nj = Math.floor(n.y);
  const side = [[ni + 1, nj - 1], [ni - 1, nj + 1], [ni + 1, nj], [ni, nj + 1]].find(([a, b]) => world.walkable(a, b)) || [ni, nj];
  walkTo(side[0] + 0.5, side[1] + 0.5, () => { n.face(player.x, player.y); player.face(n.x, n.y); fn(); });
}
function showEmojiChat(n) {
  const log = chatLogs.get(n.name) || []; chatLogs.set(n.name, log);
  const unlocked = unlockedSet(S.progress);
  let draft = [];
  const el = h(`<div class="echat">
    <div class="echat-who"><div class="portrait-wrap"></div><p class="lead">${esc(n.name)} loves ${esc(ITEMS[n.data.wants].icon)} and chats in emojis. Pick up to three and send.</p></div>
    <div class="echat-log" id="echat-log" aria-live="polite"></div>
    <div class="echat-compose"><div class="echat-draft" id="echat-draft" aria-label="Your message"></div><button class="btn btn-small btn-ghost" id="echat-clear">Clear</button><button class="btn btn-primary" id="echat-send" disabled>Send</button></div>
    <div class="echat-grid" id="echat-grid"></div>
    <p class="fine">Emoji chat only, no typing. Unlock more emojis in your Journal.</p></div>`);
  el.querySelector('.portrait-wrap').append(portrait(n.species, n.outfit, 64, { full: true, t: time }));
  const logEl = el.querySelector('#echat-log'), draftEl = el.querySelector('#echat-draft'), sendBtn = el.querySelector('#echat-send');
  const renderLog = () => { logEl.innerHTML = log.length ? log.map(m => `<div class="bubble-row ${m.me ? 'me' : ''}"><span class="ebubble">${m.e.join(' ')}</span></div>`).join('') : '<p class="fine">Say hello with 👋</p>'; logEl.scrollTop = logEl.scrollHeight; };
  const renderDraft = () => { draftEl.textContent = draft.join(' ') || '…'; sendBtn.disabled = !draft.length; };
  const grid = el.querySelector('#echat-grid');
  const all = [...STARTER, ...ACHIEVEMENTS.flatMap(a => a.emojis), ...Object.values(SIGNATURE)];
  for (const e of all) {
    const ok = unlocked.has(e);
    const b = h(`<button class="ekey ${ok ? '' : 'locked'}" ${ok ? '' : 'disabled'} aria-label="${ok ? e : 'Locked emoji'}">${ok ? e : '🔒'}</button>`);
    if (ok) b.onclick = () => { if (draft.length < 3) { draft.push(e); SND.sfx('tap'); renderDraft(); } };
    grid.append(b);
  }
  el.querySelector('#echat-clear').onclick = () => { draft = []; renderDraft(); };
  sendBtn.onclick = () => {
    if (!draft.length) return;
    const msg = draft.slice(); draft = []; renderDraft();
    log.push({ me: true, e: msg }); renderLog(); player.say(msg[0], 2); SND.sfx('chat');
    n.busy = 12; n.face(player.x, player.y);
    S.progress.needs.social = Math.min(100, S.progress.needs.social + 5);
    bumpStat('chats');
    if (friendship(n.name).day !== today()) befriend(n, 'chat');
    befriend(n, 'emoji');
    setTimeout(() => {
      const r = replyTo(msg, n.name); log.push({ me: false, e: r });
      if (S.sheet === 'echat:' + n.name) renderLog();
      n.say(r[0], 2.4); n.wave = 0.8; SND.sfx('chat'); checkAchievements();
    }, 900);
  };
  renderLog(); renderDraft();
  openSheet('echat:' + n.name, 'Emoji chat', n.name, el, { tab: 'friends' });
}

// ---------- wardrobe ----------
function showWardrobe() {
  const prof = S.profile;
  let occasion = 'everyday', slot = 'top', facing = 'front', changed = false;
  const el = h(`<div class="wardrobe">
    <div class="wr-stage"><canvas id="wr-preview" class="wr-preview"></canvas><button class="btn btn-small btn-ghost" id="wr-turn">Turn around</button></div>
    <div class="filter-row" id="wr-occ"></div>
    <div class="filter-row" id="wr-slots"></div>
    <div class="wr-items" id="wr-items"></div>
    <div id="wr-colors"></div>
  </div>`);
  const cv = el.querySelector('#wr-preview');
  const editing = () => occasion === 'everyday' ? prof.look : (prof.sleepLook ||= { topColor: '#B9A8EC', top2: '#FFFFFF', bottomColor: '#B9A8EC', shoeColor: '#F7B6C6' });
  const previewLook = () => occasion === 'everyday' ? prof.look : A.occasionLook(prof.look, 'sleep', { sleep: prof.sleepLook });
  const anim = () => { if (S.sheet !== 'wardrobe') return; A.drawPortrait(cv, prof.species, previewLook(), { size: 168, full: true, t: time, dir: facing }); requestAnimationFrame(anim); };
  const save = () => { if (!changed) { changed = true; bumpStat('outfits'); checkAchievements(); } S.profile = prof; applyProfile(); };
  const render = () => {
    const occ = el.querySelector('#wr-occ'); occ.innerHTML = '';
    for (const [k, lbl] of [['everyday', 'Everyday'], ['sleep', 'Pyjamas']]) { const b = h(`<button class="filter ${occasion === k ? 'on' : ''}">${lbl}</button>`); b.onclick = () => { occasion = k; slot = k === 'sleep' ? 'pj' : 'top'; render(); }; occ.append(b); }
    const slots = el.querySelector('#wr-slots'); slots.innerHTML = '';
    const keys = occasion === 'sleep' ? [['pj', 'Pyjamas'], ['pjshoes', 'Slippers']] : Object.entries(A.WARDROBE).map(([k, v]) => [k, v.label]);
    for (const [k, lbl] of keys) { const b = h(`<button class="filter ${slot === k ? 'on' : ''}">${esc(lbl)}</button>`); b.onclick = () => { slot = k; render(); }; slots.append(b); }
    const items = el.querySelector('#wr-items'); items.innerHTML = '';
    const colors = el.querySelector('#wr-colors'); colors.innerHTML = '';
    const look = editing();
    const swatchRow = (label, key, palette) => {
      const row = h(`<div class="wr-color-row"><small>${esc(label)}</small><div class="wr-swatches"></div></div>`);
      for (const c of palette) { const b = h(`<button class="cswatch ${look[key] === c ? 'on' : ''}" style="--c:${c}" aria-label="${esc(label)} ${c}"></button>`); b.onclick = () => { look[key] = c; SND.sfx('tap'); save(); render(); }; row.querySelector('.wr-swatches').append(b); }
      colors.append(row);
    };
    if (occasion === 'sleep') {
      if (slot === 'pj') { swatchRow('Pyjama colour', 'topColor', A.PALETTE); swatchRow('Spots', 'top2', A.PALETTE); look.bottomColor = look.topColor; }
      else swatchRow('Slipper colour', 'shoeColor', A.PALETTE);
      return;
    }
    const W = A.WARDROBE[slot];
    for (const it of W.items) {
      const key = slot + ':' + it.id, owned = !it.price || S.progress.owned.includes(key), on = look[slot] === it.id;
      const b = h(`<button class="wr-item ${on ? 'on' : ''} ${owned ? '' : 'locked'}"><span>${esc(it.label)}</span>${owned ? '' : `<em>✦ ${it.price}</em>`}</button>`);
      b.onclick = () => {
        if (!owned) {
          if (S.coins < it.price) { toast(`You need ✦ ${it.price} for the ${it.label.toLowerCase()}. Earn coins at work or at places in town.`); return; }
          setCoins(S.coins - it.price, true); S.progress.owned.push(key); saveProgress(); toast(`Bought: ${it.label}`); SND.sfx('coin');
        }
        look[slot] = it.id; SND.sfx('tap'); save(); render();
      };
      items.append(b);
    }
    if (W.color) swatchRow('Colour', W.color, W.palette || A.PALETTE);
    if (W.color2 && ['stripes', 'overalls', 'pyjamas'].includes(look.top)) swatchRow(look.top === 'overalls' ? 'Shirt under' : 'Stripes', W.color2, A.PALETTE);
  };
  el.querySelector('#wr-turn').onclick = () => { facing = facing === 'front' ? 'back' : 'front'; SND.sfx('tap'); };
  render();
  openSheet('wardrobe', 'Your wardrobe', 'What to wear', el, { tab: 'explore' });
  anim();
}

// ---------- free will ----------
let idle = 0;
function autonomy(dt) {
  if (!S.settings.freewill || act || queue.length || player.moving || joy.vx || joy.vy || keys.size || S.sheet || pieTarget || player.shake > 0) { idle = 0; return; }
  idle += dt;
  if (idle < 30) return; // long enough that looking around or chatting is never interrupted
  idle = 0;
  const N2 = S.progress.needs;
  if (Math.min(...NEEDS.map(nd => N2[nd.k])) > 55) return;
  let best = null;
  const consider = (def, target, dist) => {
    if (def.special || def.job || def.pose === 'jog' || (def.coins < 0 && S.coins < -def.coins)) return;
    const gain = {};
    for (const st of (def.steps || [def])) for (const [k, v] of Object.entries(st.gain || {})) gain[k] = (gain[k] || 0) + v;
    let sc = 0;
    for (const [k, v] of Object.entries(gain)) sc += v * Math.pow((100 - N2[k]) / 100, 2) * 2;
    sc /= 1 + dist / 10;
    if (!best || sc > best.sc) best = { sc, def, target };
  };
  for (const t of things) {
    if (!t.interactive || !t.o) continue;
    const key = kindKey(t.o); if (!key) continue;
    const [ax, ay] = approachOf(t.o), d = Math.hypot(ax - player.x, ay - player.y);
    for (const def of actionsFor(key)) consider(def, { o: t.o }, d);
  }
  for (const f of flats) if (f.d.kind === 'bench') for (const def of actionsFor('bench')) consider(def, { o: f.d }, Math.hypot(f.x - player.x, f.y - player.y));
  for (const nn of npcs) if (npcVisible(nn) && !(nn.task && nn.task.kind === 'sleep')) for (const def of actionsFor('neighbour')) if (!def.hearts && !def.needSkill) consider(def, { npc: nn }, Math.hypot(nn.x - player.x, nn.y - player.y));
  if (best && best.sc > 4) { toastQuiet(`${S.profile.name} decided to ${best.def.label.toLowerCase()}.`); queueAction(best.def, best.target); }
}

// ---------- chrome wiring ----------
window.addEventListener('pointerdown', () => SND.unlock(), { capture: true });
window.addEventListener('keydown', () => SND.unlock(), { capture: true });
document.querySelectorAll('.dock-item').forEach(b => b.onclick = () => {
  const m = b.dataset.mode;
  closePie();
  if (S.sheet && document.querySelector('.dock-item.active') === b && m !== 'explore') { closeSheet(); return; }
  ({ explore: closeSheet, homes: () => showHomes(), places: showPlaces, friends: showFriends, journal: showJournal })[m]();
});
$('profile-button').onclick = () => (S.sheet === 'needs' ? closeSheet() : showNeeds());
$('radar-button').onclick = showDistricts;
$('pause-button').onclick = () => (S.sheet === 'pause' ? closeSheet() : showSettings());
$('act-button').onclick = () => (player.boat ? castLine() : interactNearby());
$('boat-exit').onclick = () => endBoat();
$('decor-button').onclick = () => (DECOR.on ? endDecor() : startDecor());
$('speed-button').onclick = cycleSpeed;
$('run-button').onclick = toggleRun;
$('cam-button').onclick = cameraButton;
function toggleRun() { S.run = !S.run; $('run-button').setAttribute('aria-pressed', String(S.run)); toastQuiet(S.run ? 'Running' : 'Walking'); }
// Camera: first press brings the view back to you; after that it steps through three zoom levels.
function cameraButton() {
  if (cam.free) { cam.free = false; $('cam-button').classList.remove('free'); return; }
  const levels = mobile() ? [0.4, 0.56, 0.8] : [0.45, 0.72, 1.0];
  const cur = cam.tz || cam.zoom, k = levels.findIndex(l => l > cur + 0.02);
  cam.tz = levels[k === -1 ? 0 : k]; cam.manual = true;
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
let radarMap = null;
function buildRadarMap() {
  const c = document.createElement('canvas'), w = N * A.TW * RS, h = N * A.TH * RS;
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  const g = c.getContext('2d'), ox = w / 2;
  const col = { 9: '#E2B47E', 10: '#FFFFFF', 11: '#D9CFF5', 12: '#D6EEF7', [T.SAND]: '#F3DFAE', [T.GRASS]: '#8FD06F', [T.PATH]: '#FFF3D6', [T.PLAZA]: '#FFFFFF', [T.PARK]: '#A3DB83', [T.POND]: '#7FD0EA', [T.DOCK]: '#D9A56B', [T.MEADOW]: '#9AD77D' };
  const dia = (i, j, w2 = 1, d2 = 1, fill) => {
    const p = (x, y) => { const [a, b] = A.P(x, y); return [a * RS + ox, b * RS]; };
    g.beginPath(); g.moveTo(...p(i, j)); g.lineTo(...p(i + w2, j)); g.lineTo(...p(i + w2, j + d2)); g.lineTo(...p(i, j + d2)); g.closePath(); g.fillStyle = fill; g.fill();
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const t = world.get(i, j); if (t !== T.SEA) { const sk = world.skin?.[t]; dia(i, j, 1.04, 1.04, sk ? CA.SKIN_RADAR[sk] : col[t]); } }
  for (const o of world.objects) if (!o.flat) dia(o.i, o.j, o.w, o.d, o.kind === 'venue' ? A.lighten(o.color, 0.1) : o.kind === 'myhome' ? '#F2A93B' : o.home ? '#B9C6D6' : '#C9D3DE');
  return { c, ox };
}
radarMap = buildRadarMap();
function drawRadar() {
  const cv = $('radar'), css = cv.clientWidth || 96, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(css * dpr)) { cv.width = cv.height = Math.round(css * dpr); }
  const g = cv.getContext('2d'), size = css, k = 0.5 * (size / 96) * 1.15;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#5BC0EB'; g.fillRect(0, 0, size, size);
  const [px, py] = A.P(player.x, player.y);
  const toR = (x, y) => { const [a, b] = A.P(x, y); return [size / 2 + (a - px) * RS * k, size / 2 + (b - py) * RS * k]; };
  g.drawImage(radarMap.c, size / 2 - (px * RS + radarMap.ox) * k, size / 2 - py * RS * k, radarMap.c.width * k, radarMap.c.height * k);
  if (!world.interior) for (const v of C.venues) { const [x, y] = toR(v.i + v.w / 2, v.j + v.d / 2); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); g.fillStyle = v.color; g.beginPath(); g.arc(x, y, 2.9, 0, 7); g.fill(); }
  g.fillStyle = '#26395A';
  for (const n of npcs) { if (!npcVisible(n)) continue; const [x, y] = toR(n.x, n.y); g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
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
  const state = { species: 'fox', look: { ...A.OUTFITS[0] }, preset: 0, name: names[Math.floor(Math.random() * names.length)] };
  $('name-input').value = state.name;
  $('name-input').addEventListener('input', e => { const c = cleanName(e.target.value); if (c !== e.target.value.trim()) e.target.value = c; });
  const draw = () => {
    A.drawPortrait($('onboard-avatar'), state.species, state.look, { size: 132, full: true, t: time, wave: true });
    const slot = $('editor-slot'); slot.innerHTML = ''; slot.append(avatarEditor(state, draw));
  };
  draw();
  const tick = () => { if ($('onboarding').classList.contains('hidden')) return; A.drawPortrait($('onboard-avatar'), state.species, state.look, { size: 132, full: true, t: time, wave: (time % 4) < 1.2 }); requestAnimationFrame(tick); };
  tick();
  const begin = then => {
    state.name = cleanName($('name-input').value) || state.name;
    S.profile = { name: state.name, species: state.species, look: state.look }; applyProfile();
    SND.unlock(); SND.sfx('unlock');
    $('onboarding').classList.add('hidden'); document.body.classList.remove('onboarding-open');
    setScene('home', ...homeWorld.insideDoor);
    player.wave = 1.6; player.say('👋');
    $('hint').classList.remove('hidden'); setTimeout(hideHint, 9000);
    if (then) then();
  };
  $('start-button').onclick = () => begin();
  $('signin-link').onclick = () => begin(() => showProfile());
}

applyProfileSafe();
function applyProfileSafe() {
  if (S.profile) { applyProfile(); $('onboarding').classList.add('hidden'); setScene('home', ...homeWorld.insideDoor); $('hint').classList.remove('hidden'); setTimeout(hideHint, 7000); }
  else { S.profile = { species: 'fox', look: { ...A.OUTFITS[0] }, name: 'Guest' }; document.body.classList.add('onboarding-open'); startOnboarding(); }
}
setCoins(S.coins);
restoreSession();
requestAnimationFrame(t => { t0 = t; requestAnimationFrame(frame); });
$('loading').classList.add('done');
setTimeout(() => $('loading').remove(), 700);

// Small read-only hook for automated play-testing.
window.__willowvale = { state: S, quests: () => questState(), checkQuests: () => checkQuests(), open: k => ({ homes: showHomes, places: showPlaces, friends: showFriends, journal: showJournal, profile: showProfile, shop: showShop, island: showIsland, market: showMarket, craft: showCraft, restore: showRestore, settings: showSettings, wardrobe: showWardrobe, needs: showNeeds, districts: showDistricts, adminLogin: showAdminLogin, venue: () => showVenue(C.venues[0]), home: () => showHome(cityWorld.objects.find(o => o.home)), neighbour: () => showNeighbour(cityNpcs.find(n => !n.generic)), chat: () => showEmojiChat(cityNpcs.find(n => !n.generic)) })[k](),
  pieList: () => { const out = [], seen = new Set(); for (const t of things) { const o = t.o; if (!t.interactive || !o) continue; const key = o.type || o.kind; if (seen.has(key)) continue; seen.add(key); out.push(key); } for (const n of npcs) if (npcVisible(n) && !seen.has('npc')) { seen.add('npc'); out.push('npc'); } return out; },
  pieFor: key => { closeSheet(); if (key === 'npc') { const n = npcs.find(n => npcVisible(n)); if (n) showPie({ npc: n }, W / 2, H / 2); return !!n; } const t = things.find(t => t.interactive && t.o && (t.o.type || t.o.kind) === key); if (t) showPie({ o: t.o }, W / 2, H / 2); return !!t; }, cancel: () => cancelActions(), peers: () => shownPeers().map(p => ({ name: p.name, x: +p.x.toFixed(2), y: +p.y.toFixed(2), emote: p.emote || null })), allPeers: () => [...peers.values()].map(p => ({ name: p.name, scene: p.scene })), emoteTo: e => sendEmote(e, [...peers.values()][0]), screenOf: (x, y, z = 0) => toScreen(x, y, z), scene: () => sceneName, current: () => (act ? act.item.label + ':' + act.phase : null), player: () => ({ x: player.x, y: player.y, pose: player.pose, dir: player.dir }), furniture: type => { const t = things.find(x => x.o && x.o.type === type); return t ? t.o : null; }, run: (type, label) => { const t = things.find(x => x.o && (x.o.type === type || x.o.kind === type || x.o.id === type)) || flats.map(f => ({ o: f.obj })).find(x => x.o && x.o.id === type); const def = t && actionsFor(kindKey(t.o)).find(d => d.label === label); if (def) queueAction(def, { o: t.o }); return !!def; }, npcNear: () => { const n = npcs.slice().sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0]; return n ? n.name : null; }, leave: () => leaveHome(), npcs: () => cityNpcs.map(n => ({ name: n.name, doing: n.doing, task: n.task && n.task.kind, inside: n.pose === 'inside', mood: Math.round(mood(n.needs)) })), skills: () => JSON.stringify(S.progress.skills), job: () => JSON.stringify(S.progress.jobs), setClock: m => { S.progress.clock = m; }, showNeighbour: name => showNeighbour(cityNpcs.find(x => x.name === name)), city: () => C.id, enterVenue: id => enterVenue(C.venues.find(v => v.id === id)), npcs2: () => npcs.map(n => n.name + (n.pose ? ':' + n.pose : '')).join(','), runFurn: type => { const t = things.find(x => x.o && x.o.type === type); if (!t) return false; const d = actionsFor(kindKey(t.o))[0]; queueAction(d, { o: t.o }); return d.label; }, boat: () => startBoat(), profile: () => showProfile(), zoomAt: (x, y, zz) => { cam.manual = true; cam.free = true; const q = A.P(x, y, 0); cam.x = q[0]; cam.y = q[1]; cam.zoom = zz; }, plot: (k, opt) => { const f = flats.find(x => x.furn && x.furn.type === 'plot' && x.furn.plot === k); if (!f) return false; const o2 = plotOptions(f.furn)[opt]; if (o2 && !o2.disabled) { o2.run(); return o2.label; } return o2 && o2.label + ' (disabled)'; }, pickups: () => livePickups().length, grabNearest: () => { const p2 = nearestPickup(player.x, player.y, 40); if (p2) collectPickup(p2); return p2 && p2.item; }, sheet: k => ({ market: showMarket, craft: showCraft, restore: showRestore, journal: showJournal })[k](), closeSheet: () => closeSheet(), goGarden: () => { const g = CITIES.willowvale.garden; setScene('city', g.stand[0], g.stand[1] + 1); }, noSprite: () => things.filter(t => !t.sprite && !t.live).map(t => t.o.kind + ':' + (t.o.style || t.o.lm || t.o.type || '')), homesList: () => world.objects.filter(o => o.home).map(o => [o.name, o.i, o.j, o.style || o.kind]), cab: g => { const t = things.find(x => x.o && x.o.type === 'arcadecab' && x.o.game === g); queueAction({ id: 'play', special: 'game', coins: -1, label: 'Play' }, { o: t.o }); }, runCab: () => { const t = things.find(x => x.o && x.o.type === 'arcadecab'); if (!t) return false; queueAction({ id: 'play', special: 'game', coins: -1, label: 'Play' }, { o: t.o }); }, teleport: (x, y) => setScene('city', x, y), venues: () => C.venues.map(v => [v.id, v.i, v.j]), travel: id => travelTo(id), island: () => showIsland(), shop: () => showShop(), unlockAll: () => { for (const c of CITY_LIST) S.progress.unlocked[c.id] = 1; }, coins: n => setCoins(n), homes: () => showHomes(), chat: name => { const n = npcs.find(x => x.name === name); if (n) meetThen(n, () => showEmojiChat(n)); } };
