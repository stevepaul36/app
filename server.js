'use strict';
// Willowvale server: serves the game, keeps accounts and cloud saves in MongoDB, and shows who's online.
// With no MONGODB_URI the game still runs; accounts stay switched off so nobody loses progress.
const express = require('express'), http = require('http'), crypto = require('crypto'), cors = require('cors'), helmet = require('helmet');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { rateLimit } = require('express-rate-limit'), { MongoClient } = require('mongodb'), { Server } = require('socket.io');

const app = express(), server = http.createServer(app), production = process.env.NODE_ENV === 'production';
if (production && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw Error('Set JWT_SECRET to at least 32 random characters.');
const secret = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
// Which websites may call the API. In production an empty ALLOWED_ORIGINS no longer means "anyone":
// it falls back to this service's own address (Render sets RENDER_EXTERNAL_URL). The Android app's
// local web view (http(s)://localhost, capacitor://localhost) is always allowed.
const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
let allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (!allowed.length && isProd) allowed = [process.env.RENDER_EXTERNAL_URL || 'https://willowvale-animal-town.onrender.com'];
const isLocalWebViewOrigin = origin => { try { const u = new URL(origin); return u.hostname === 'localhost' && ['http:', 'https:', 'capacitor:'].includes(u.protocol); } catch { return false; } };
const corsOptions = { origin: (origin, cb) => (!origin || !allowed.length || allowed.includes(origin) || isLocalWebViewOrigin(origin) ? cb(null, true) : cb(Error('Origin not allowed'))), methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] };

app.set('trust proxy', 1); app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors(corsOptions));
app.use('/api/save', express.json({ limit: '600kb' }));
app.use(express.json({ limit: '24kb' }));
app.use(express.static('public', { maxAge: 0, setHeaders: (res, path) => { if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); } }));
app.use('/api/auth', rateLimit({ windowMs: 900000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Please wait 15 minutes and try again.' } }));
app.use('/api/save', rateLimit({ windowMs: 60000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Saving too often. Your game will save again in a minute.' } }));
const io = new Server(server, { cors: corsOptions, maxHttpBufferSize: 100000, pingInterval: 25000, pingTimeout: 20000 });

// ---------- storage ----------
let db = null, players = null, saves = null;
async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.warn('MONGODB_URI missing: accounts and cloud saves are switched off (guest play still works).'); return; }
  const client = uri.startsWith('memory://') ? new (require('./lib/memdb').MemoryClient)() : new MongoClient(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 });
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'willowvale');
  players = db.collection('players'); saves = db.collection('saves');
  await players.createIndex({ usernameLower: 1 }, { unique: true });
  console.log('MongoDB connected');
  process.on('SIGTERM', async () => { server.close(); await client.close(); process.exit(0); });
}
const requireStore = (_req, res, next) => (db ? next() : res.status(503).json({ error: 'Accounts aren’t switched on for this town yet. You can keep playing as a guest; your progress stays on this device.' }));

const tokenFor = u => jwt.sign({ sub: u._id, username: u.username }, secret, { expiresIn: '30d', issuer: 'willowvale' });
function claims(req) { const h = req.headers.authorization || ''; if (!h.startsWith('Bearer ')) return null; try { return jwt.verify(h.slice(7), secret, { issuer: 'willowvale' }); } catch { return null; } }
async function currentUser(req) { const c = claims(req); if (!c) return null; return players.findOne({ _id: c.sub }, { projection: { passwordHash: 0 } }); }
const publicUser = u => ({ id: u._id, username: u.username });
async function saveMeta(id) { const s = await saves.findOne({ _id: id }, { projection: { data: 0 } }); return s ? { version: s.version, updatedAt: s.updatedAt, day: s.day, coins: s.coins } : null; }

// A save is the player's own game state. Keep it a plain object of a sensible size with a sensible wallet.
// Saves belong to one player's own world, so the server checks their shape rather than replaying every
// coin. That is fine while nothing in a save affects other players; anything shared (trading, rankings)
// must be checked on the server instead.
const SAVE_SCHEMA = 1;
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
// Walk the save: plain JSON only, sane sizes, and no keys MongoDB would treat as operators or paths.
function saneJson(v, depth = 0, budget = { n: 0 }) {
  if (++budget.n > 20000 || depth > 8) return false;
  if (v === null || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.length <= 500;
  if (Array.isArray(v)) return v.length <= 2000 && v.every(x => saneJson(x, depth + 1, budget));
  if (isPlain(v)) return Object.keys(v).every(k => k.length <= 80 && !k.startsWith('$') && !k.includes('.') && saneJson(v[k], depth + 1, budget));
  return false;
}
// Bring older saves up to date. Version 1 is the first cloud format, so there is nothing to change yet.
function migrateSave(data) { return { ...data, schema: SAVE_SCHEMA }; }
function cleanSave(body) {
  const data = body && body.data;
  if (!isPlain(data) || !isPlain(data.progress)) return null;
  if (Object.keys(data).some(k => !['progress', 'profile', 'schema'].includes(k))) return null;
  if (data.profile != null && !isPlain(data.profile)) return null;
  if (data.schema != null && (!Number.isInteger(data.schema) || data.schema < 1 || data.schema > SAVE_SCHEMA)) return null;
  if (!saneJson(data)) return null;
  const p = data.progress;
  const coins = Number(p.coins);
  if (!Number.isFinite(coins) || coins < 0 || coins > 10000000) return null;
  if (p.clock != null && (typeof p.clock !== 'number' || p.clock < 0)) return null;
  return { data: migrateSave(data), coins: Math.floor(coins), day: Math.max(1, Math.floor((Number(p.clock) || 0) / 1440) + 1) };
}

// ---------- routes ----------
app.get('/healthz', async (_q, res) => {
  if (!db) return res.json({ ok: true, service: 'willowvale', database: 'not-configured', accounts: false });
  try { await db.command({ ping: 1 }); res.json({ ok: true, service: 'willowvale', database: 'connected', accounts: true }); }
  catch { res.status(503).json({ ok: false, service: 'willowvale', database: 'unavailable' }); }
});

const adminLimiter = rateLimit({ windowMs: 900000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Wait 15 minutes.' } });
app.post('/api/admin/verify', adminLimiter, (req, res) => {
  const want = process.env.ADMIN_KEY || '';
  if (want.length < 12) return res.status(404).json({ error: 'Admin mode is not set up on this server.' });
  const a = crypto.createHash('sha256').update(String(req.body.key || '')).digest(), b = crypto.createHash('sha256').update(want).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'That admin key is not right.' });
  res.json({ ok: true, token: jwt.sign({ role: 'admin' }, secret, { expiresIn: '12h', issuer: 'willowvale-admin' }) });
});
app.get('/api/admin/check', (req, res) => { const h = req.headers.authorization || ''; try { const c = jwt.verify(h.slice(7), secret, { issuer: 'willowvale-admin' }); res.json({ ok: c.role === 'admin' }); } catch { res.status(401).json({ ok: false }); } });

const NICK = /^[a-zA-Z0-9_]{3,20}$/;
// Nicknames are shown to other players, so a few obviously unkind words are refused.
// Words refused anywhere inside a nickname: no ordinary word contains these.
const RUDE = ['fuck', 'shit', 'bitch', 'cunt', 'pussy', 'nigg', 'slut', 'whore', 'nazi', 'porn', 'moderator', 'willowvale'];
// Short words that also hide inside harmless ones (Dickens, Sussex, skills, whatever) are refused only
// as a whole word: the entire nickname, or a part split off by _ or a digit.
const RUDE_WORDS = ['dick', 'fag', 'rape', 'sex', 'sexy', 'kill', 'killer', 'stupid', 'idiot', 'hate', 'admin', 'dumb', 'ugly', 'loser'];
const niceNick = n => {
  // Read the nickname both ways a "1" can stand for a letter (i or l), with other look-alike digits swapped in.
  const views = ['i', 'l'].map(one => n.toLowerCase().replace(/[0-9]/g, m => ({ 0: 'o', 1: one, 3: 'e', 4: 'a', 5: 's', 7: 't' })[m] ?? '_'));
  return !views.some(v => {
    const flat = v.replace(/_/g, '');
    const squeezed = flat.replace(/(.)\1+/g, '$1'); // fuuuck -> fuck
    if (RUDE.some(w => flat.includes(w) || squeezed.includes(w))) return true;
    return [flat, ...v.split(/_+/)].some(p => RUDE_WORDS.includes(p));
  });
};
app.post('/api/auth/register', requireStore, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim(), password = String(req.body.password || '');
    if (!NICK.test(username)) return res.status(400).json({ error: 'Nickname must be 3–20 letters, numbers or underscores.' });
    if (!niceNick(username)) return res.status(400).json({ error: 'Please pick a different nickname. Other players will see it.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters.' });
    const u = { _id: crypto.randomUUID(), username, usernameLower: username.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), createdAt: new Date() };
    try { await players.insertOne(u); } catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'That nickname is already taken.' }); throw e; }
    res.status(201).json({ token: tokenFor(u), user: publicUser(u), save: null });
  } catch (e) { next(e); }
});
app.post('/api/auth/login', requireStore, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim(), password = String(req.body.password || '');
    const u = await players.findOne({ usernameLower: username.toLowerCase() });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) return res.status(401).json({ error: 'Nickname or password is incorrect.' });
    res.json({ token: tokenFor(u), user: publicUser(u), save: await saveMeta(u._id) });
  } catch (e) { next(e); }
});
app.get('/api/me', requireStore, async (req, res, next) => {
  try { const u = await currentUser(req); if (!u) return res.status(401).json({ error: 'Please sign in again.' }); res.json({ user: publicUser(u), save: await saveMeta(u._id) }); } catch (e) { next(e); }
});

// Cloud save: one save per account. A write must name the version it was based on, so two devices
// can't silently overwrite each other; the loser gets the newer save back and the player chooses.
app.get('/api/save', requireStore, async (req, res, next) => {
  try { const u = await currentUser(req); if (!u) return res.status(401).json({ error: 'Please sign in again.' }); const s = await saves.findOne({ _id: u._id }); res.json(s ? { data: s.data, version: s.version, updatedAt: s.updatedAt } : { data: null, version: 0 }); } catch (e) { next(e); }
});
app.put('/api/save', requireStore, async (req, res, next) => {
  try {
    const u = await currentUser(req); if (!u) return res.status(401).json({ error: 'Please sign in again.' });
    const clean = cleanSave(req.body); if (!clean) return res.status(400).json({ error: 'That save doesn’t look right.' });
    const base = Math.max(0, Math.floor(Number(req.body.baseVersion) || 0)), now = new Date();
    const filter = base === 0 ? { _id: u._id, version: { $exists: false } } : { _id: u._id, version: base };
    let r;
    if (base === 0) {
      try { await saves.insertOne({ _id: u._id, ...clean, version: 1, updatedAt: now }); r = { version: 1 }; }
      catch (e) { if (e.code !== 11000) throw e; r = null; }
    } else {
      const upd = await saves.findOneAndUpdate(filter, { $set: { ...clean, updatedAt: now }, $inc: { version: 1 } }, { returnDocument: 'after', projection: { version: 1 } });
      r = upd ? { version: upd.version } : null;
    }
    if (!r) { const s = await saves.findOne({ _id: u._id }); return res.status(409).json({ error: 'A newer save exists.', data: s && s.data, version: s ? s.version : 0, updatedAt: s && s.updatedAt }); }
    res.json({ ok: true, version: r.version, updatedAt: now });
  } catch (e) { next(e); }
});
// Delete everything about an account (asked for by players or parents).
app.delete('/api/account', requireStore, async (req, res, next) => {
  try {
    const c = claims(req); if (!c) return res.status(401).json({ error: 'Please sign in again.' });
    const u = await players.findOne({ _id: c.sub }); if (!u) return res.status(404).json({ error: 'Account not found.' });
    if (!(await bcrypt.compare(String(req.body.password || ''), u.passwordHash))) return res.status(401).json({ error: 'That password is not right.' });
    await saves.deleteOne({ _id: u._id }); await players.deleteOne({ _id: u._id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- shared towns ----------
// Players in the same town see each other walk around and can send emoji bubbles. Homes, coins and
// progress stay in each player's own save. Children's game rules: no typed text ever crosses the
// wire — only positions, looks and emojis — and names are server-assigned (account nickname or
// "Visitor"). Guests can join too, so towns feel alive without an account.
const towns = new Map(); // townId -> Map(socketId -> peer)
const cleanTown = t => String(t || 'willowvale').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'willowvale';
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|⃣|\p{Emoji_Modifier}|‍(?:\p{Extended_Pictographic}|\p{Regional_Indicator})|\p{Regional_Indicator})*$/u;
const cleanEmojis = e => Array.isArray(e) && e.length >= 1 && e.length <= 3 && e.every(x => typeof x === 'string' && x.length <= 14 && EMOJI.test(x)) ? e.slice() : null;
const SPECIES = /^[a-z]{2,16}$/;
function cleanLook(look) {
  if (!isPlain(look) || JSON.stringify(look).length > 800 || !saneJson(look)) return {};
  const out = {};
  for (const [k, v] of Object.entries(look)) if (/^[a-zA-Z0-9_]{1,24}$/.test(k) && (typeof v === 'string' ? v.length <= 24 && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z0-9_-]*)$/.test(v) : typeof v === 'number' && Number.isFinite(v))) out[k] = v;
  return out;
}
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const peerView = (id, p) => ({ id, name: p.name, species: p.species, look: p.look, x: p.x, y: p.y, scene: p.scene, moving: p.moving });
function leaveTown(s) {
  const tid = s.data.townId; if (!tid) return;
  const room = towns.get(tid); s.leave(tid); s.data.townId = null;
  if (room) { room.delete(s.id); s.to(tid).emit('p:leave', { id: s.id }); io.to(tid).emit('town:presence', { count: room.size }); if (!room.size) towns.delete(tid); }
}
io.use(async (s, next) => {
  s.data.user = null;
  const token = s.handshake.auth && s.handshake.auth.token;
  if (token && db) {
    try { const c = jwt.verify(token, secret, { issuer: 'willowvale' }); const u = await players.findOne({ _id: c.sub }, { projection: { username: 1 } }); if (u) s.data.user = { id: u._id, username: u.username }; }
    catch { /* expired or bad token: join as a visitor */ }
  }
  next();
});
io.on('connection', s => {
  let lastState = 0, lastEmote = 0, burst = 0, lastJoin = 0, lastLook = 0, joins = 0, joinWindow = 0, lookTimer = null;
  s.on('town:join', p => {
    p = isPlain(p) ? p : {};
    // Changing town always goes through; re-joining the same town is limited, and so is a burst of joins.
    const tid = cleanTown(p.townId), now = Date.now();
    if (now - joinWindow > 10000) { joinWindow = now; joins = 0; }
    if (++joins > 12 || (tid === s.data.townId && now - lastJoin < 1500)) return;
    lastJoin = now;
    leaveTown(s);
    const peer = { name: s.data.user ? s.data.user.username : 'Visitor', species: SPECIES.test(p.species) ? p.species : 'fox', look: cleanLook(p.look), x: num(p.x, 0, 200) ? p.x : 0, y: num(p.y, 0, 200) ? p.y : 0, scene: p.scene === 'city' ? 'city' : 'away', moving: false };
    if (!towns.has(tid)) towns.set(tid, new Map());
    const room = towns.get(tid);
    if (room.size >= 40) { s.emit('town:error', { message: 'This town is very busy right now. You can still play; other players will show up when it is quieter.' }); return; }
    s.emit('p:list', [...room].map(([id, q]) => peerView(id, q)));
    room.set(s.id, peer); s.data.townId = tid; s.join(tid);
    s.to(tid).emit('p:join', peerView(s.id, peer));
    io.to(tid).emit('town:presence', { count: room.size });
  });
  s.on('p:state', p => {
    const room = towns.get(s.data.townId), me = room && room.get(s.id); if (!me || !isPlain(p)) return;
    const now = Date.now(); if (now - lastState < 60) return; lastState = now;
    if (num(p.x, 0, 200) && num(p.y, 0, 200)) { me.x = p.x; me.y = p.y; }
    me.scene = p.scene === 'city' ? 'city' : 'away'; me.moving = !!p.moving;
    s.to(s.data.townId).volatile.emit('p:state', { id: s.id, x: me.x, y: me.y, scene: me.scene, moving: me.moving });
  });
  s.on('p:look', p => {
    const room = towns.get(s.data.townId), me = room && room.get(s.id); if (!me || !isPlain(p)) return;
    if (SPECIES.test(p.species)) me.species = p.species; me.look = cleanLook(p.look);
    // Send at most one look change a second; quick changes in the wardrobe still end on the last one.
    const send = () => { lookTimer = null; lastLook = Date.now(); const r = towns.get(s.data.townId), m = r && r.get(s.id); if (m) s.to(s.data.townId).emit('p:look', { id: s.id, species: m.species, look: m.look }); };
    const wait = 1000 - (Date.now() - lastLook);
    if (wait <= 0) send(); else if (!lookTimer) lookTimer = setTimeout(send, wait);
  });
  s.on('p:emote', p => {
    const room = towns.get(s.data.townId), me = room && room.get(s.id); if (!me || !isPlain(p)) return;
    const e = cleanEmojis(p.e); if (!e) return;
    const now = Date.now(); burst = now - lastEmote > 8000 ? 0 : burst + 1; if (now - lastEmote < 900 || burst > 6) return; lastEmote = now;
    const to = typeof p.to === 'string' && room.has(p.to) ? p.to : null;
    s.to(s.data.townId).emit('p:emote', { id: s.id, e, to });
  });
  s.on('disconnect', () => { clearTimeout(lookTimer); leaveTown(s); });
});

app.use((e, _q, res, _n) => { console.error(e.message); if (!res.headersSent) res.status(e.message === 'Origin not allowed' ? 403 : e.type === 'entity.too.large' ? 413 : e.type === 'entity.parse.failed' ? 400 : 500).json({ error: e.message === 'Origin not allowed' ? 'Origin not allowed.' : 'Something went wrong. Please try again.' }); });
const port = Number(process.env.PORT) || 3000;
if (require.main === module) initDb().catch(e => console.error('MongoDB connection failed, accounts are off:', e.message)).finally(() => server.listen(port, '0.0.0.0', () => console.log('Willowvale listening on ' + port)));
module.exports = { app, server, cleanSave, niceNick, cleanLook };
