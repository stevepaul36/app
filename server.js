'use strict';
// Willowvale server: serves the game, keeps accounts and cloud saves in MongoDB, and shows who's online.
// With no MONGODB_URI the game still runs; accounts stay switched off so nobody loses progress.
const express = require('express'), http = require('http'), crypto = require('crypto'), cors = require('cors'), helmet = require('helmet');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { rateLimit } = require('express-rate-limit'), { MongoClient } = require('mongodb'), { Server } = require('socket.io');

const app = express(), server = http.createServer(app), production = process.env.NODE_ENV === 'production';
if (production && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw Error('Set JWT_SECRET to at least 32 random characters.');
const secret = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const isLocalWebViewOrigin = origin => { try { const u = new URL(origin); return u.hostname === 'localhost' && ['http:', 'https:', 'capacitor:'].includes(u.protocol); } catch { return false; } };
const corsOptions = { origin: (origin, cb) => (!origin || !allowed.length || allowed.includes(origin) || isLocalWebViewOrigin(origin) ? cb(null, true) : cb(Error('Origin not allowed'))), methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] };

app.set('trust proxy', 1); app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors(corsOptions));
app.use('/api/save', express.json({ limit: '600kb' }));
app.use(express.json({ limit: '24kb' }));
app.use(express.static('public', { maxAge: 0, setHeaders: (res, path) => { if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); } }));
app.use('/api/auth', rateLimit({ windowMs: 900000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/save', rateLimit({ windowMs: 60000, limit: 30, standardHeaders: true, legacyHeaders: false }));
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
function cleanSave(body) {
  const data = body && body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const p = data.progress;
  if (!p || typeof p !== 'object') return null;
  const coins = Number(p.coins);
  if (!Number.isFinite(coins) || coins < 0 || coins > 10000000) return null;
  return { data, coins: Math.floor(coins), day: Math.max(1, Math.floor((Number(p.clock) || 0) / 1440) + 1) };
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
app.post('/api/auth/register', requireStore, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim(), password = String(req.body.password || '');
    if (!NICK.test(username)) return res.status(400).json({ error: 'Nickname must be 3–20 letters, numbers or underscores.' });
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

// ---------- who's online (presence only; no chat, no shared economy) ----------
const presence = new Map();
io.use(async (s, next) => {
  if (!db) return next(Error('Accounts are switched off.'));
  try { const c = jwt.verify((s.handshake.auth && s.handshake.auth.token) || '', secret, { issuer: 'willowvale' }); const u = await players.findOne({ _id: c.sub }, { projection: { username: 1 } }); if (!u) return next(Error('Account not found.')); s.data.user = { id: u._id, username: u.username }; next(); }
  catch { next(Error('Sign in to see who’s online.')); }
});
io.on('connection', s => {
  s.on('town:join', p => {
    const tid = String((p && p.townId) || 'willowvale').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'willowvale';
    if (s.data.townId) { s.leave(s.data.townId); const old = presence.get(s.data.townId); if (old) { old.delete(s.id); io.to(s.data.townId).emit('town:presence', { count: old.size }); } }
    s.data.townId = tid; s.join(tid);
    if (!presence.has(tid)) presence.set(tid, new Set());
    presence.get(tid).add(s.id);
    io.to(tid).emit('town:presence', { count: presence.get(tid).size });
  });
  s.on('disconnect', () => { const tid = s.data.townId, set = presence.get(tid); if (set) { set.delete(s.id); io.to(tid).emit('town:presence', { count: set.size }); if (!set.size) presence.delete(tid); } });
});

app.use((e, _q, res, _n) => { console.error(e.message); if (!res.headersSent) res.status(e.message === 'Origin not allowed' ? 403 : e.type === 'entity.too.large' ? 413 : 500).json({ error: e.message === 'Origin not allowed' ? 'Origin not allowed.' : 'Something went wrong. Please try again.' }); });
const port = Number(process.env.PORT) || 3000;
initDb().catch(e => console.error('MongoDB connection failed, accounts are off:', e.message)).finally(() => server.listen(port, '0.0.0.0', () => console.log('Willowvale listening on ' + port)));
module.exports = { app, server, cleanSave };
