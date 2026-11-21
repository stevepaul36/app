'use strict';
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const wait = ms => new Promise(r => setTimeout(r, ms));

function startServer(env) {
  const port = 31000 + Math.floor(Math.random() * 18000), base = 'http://127.0.0.1:' + port;
  let logs = '';
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, NODE_ENV: 'test', PORT: String(port), JWT_SECRET: 'test-secret-that-is-long-enough-for-smoke-tests-123456', MONGODB_URI: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => { logs += b; }); child.stderr.on('data', b => { logs += b; });
  const ready = (async () => { for (let i = 0; i < 60; i++) { if (child.exitCode !== null) throw new Error('Server exited. ' + logs); try { await fetch(base + '/healthz', { signal: AbortSignal.timeout(500) }); return; } catch { /* not yet */ } await wait(250); } throw new Error('Server did not start. ' + logs); })();
  return { child, base, ready };
}
const json = (base, path, method = 'GET', body, token) => fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });

describe('guest mode (no database)', () => {
  let srv;
  before(async () => { srv = startServer({}); await srv.ready; });
  after(() => srv.child.kill('SIGTERM'));
  test('health is fine and says accounts are off', async () => {
    const r = await fetch(srv.base + '/healthz'); assert.equal(r.status, 200);
    const b = await r.json(); assert.equal(b.database, 'not-configured'); assert.equal(b.accounts, false);
  });
  test('registration is politely switched off', async () => {
    const r = await json(srv.base, '/api/auth/register', 'POST', { username: 'WillowTester', password: 'test-password-123' });
    assert.equal(r.status, 503); assert.match((await r.json()).error, /switched on/);
  });
});

describe('accounts and cloud saves', () => {
  let srv;
  before(async () => { srv = startServer({ MONGODB_URI: 'memory://test' }); await srv.ready; });
  after(() => srv.child.kill('SIGTERM'));
  const save = (coins, clock = 0) => ({ data: { progress: { coins, clock }, profile: { name: 'Pip' } } });
  test('register, save, load, conflict, delete', async () => {
    let r = await json(srv.base, '/api/auth/register', 'POST', { username: 'Bunny_1', password: 'carrots-1234' });
    assert.equal(r.status, 201); const { token } = await r.json();
    r = await json(srv.base, '/api/auth/register', 'POST', { username: 'bunny_1', password: 'carrots-1234' }); assert.equal(r.status, 409);
    r = await json(srv.base, '/api/save', 'GET', null, token); assert.deepEqual(await r.json(), { data: null, version: 0 });
    r = await json(srv.base, '/api/save', 'PUT', { ...save(50), baseVersion: 0 }, token); assert.equal(r.status, 200); assert.equal((await r.json()).version, 1);
    r = await json(srv.base, '/api/save', 'PUT', { ...save(80, 3000), baseVersion: 1 }, token); assert.equal((await r.json()).version, 2);
    // an old device tries to write over the newer save
    r = await json(srv.base, '/api/save', 'PUT', { ...save(10), baseVersion: 1 }, token); assert.equal(r.status, 409);
    const c = await r.json(); assert.equal(c.version, 2); assert.equal(c.data.progress.coins, 80);
    r = await json(srv.base, '/api/save', 'PUT', { data: { progress: { coins: -5 } }, baseVersion: 2 }, token); assert.equal(r.status, 400);
    r = await json(srv.base, '/api/auth/login', 'POST', { username: 'BUNNY_1', password: 'carrots-1234' }); assert.equal(r.status, 200);
    const login = await r.json(); assert.equal(login.save.version, 2); assert.equal(login.save.coins, 80); assert.equal(login.save.day, 3);
    r = await json(srv.base, '/api/auth/login', 'POST', { username: 'Bunny_1', password: 'wrong-password' }); assert.equal(r.status, 401);
    r = await json(srv.base, '/api/account', 'DELETE', { password: 'nope-nope' }, token); assert.equal(r.status, 401);
    r = await json(srv.base, '/api/account', 'DELETE', { password: 'carrots-1234' }, token); assert.equal(r.status, 200);
    r = await json(srv.base, '/api/me', 'GET', null, token); assert.equal(r.status, 401);
  });
});

describe('Save checks', () => {
  const { cleanSave } = require('../server.js');
  const good = { progress: { coins: 50, clock: 3000, homes: { a: 1 } }, profile: { name: 'Rowan' } };
  test('accepts a normal save and stamps the format version', () => {
    const r = cleanSave({ data: good });
    assert.equal(r.coins, 50); assert.equal(r.day, 3); assert.equal(r.data.schema, 1);
  });
  test('rejects saves that are not plain game data', () => {
    assert.equal(cleanSave({ data: { ...good, admin: true } }), null);
    assert.equal(cleanSave({ data: { progress: { coins: 5, $where: 'x' } } }), null);
    assert.equal(cleanSave({ data: { progress: { coins: 5, 'a.b': 1 } } }), null);
    assert.equal(cleanSave({ data: { progress: { coins: 5, note: 'x'.repeat(501) } } }), null);
    assert.equal(cleanSave({ data: { progress: { coins: 5, clock: -1 } } }), null);
    assert.equal(cleanSave({ data: { ...good, schema: 99 } }), null);
    let deep = {}; const root = deep; for (let k = 0; k < 12; k++) { deep.x = {}; deep = deep.x; }
    assert.equal(cleanSave({ data: { progress: { coins: 5, root } } }), null);
  });
});
