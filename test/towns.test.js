'use strict';
// Shared towns: players see each other, only emojis cross the wire, and towns are kept apart.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { io } = require('socket.io-client');
const wait = ms => new Promise(r => setTimeout(r, ms));
let child, base;
before(async () => {
  const port = 31000 + Math.floor(Math.random() * 18000); base = 'http://127.0.0.1:' + port;
  let logs = '';
  child = spawn(process.execPath, ['server.js'], { env: { ...process.env, NODE_ENV: 'test', PORT: String(port), JWT_SECRET: 'test-secret-that-is-long-enough-for-towns-tests-1234567', MONGODB_URI: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => { logs += b; }); child.stderr.on('data', b => { logs += b; });
  // A busy build machine can take a while to start the server, so allow up to 45 seconds.
  for (let i = 0; i < 180; i++) {
    if (child.exitCode !== null) throw new Error('server exited: ' + logs);
    try { await fetch(base + '/healthz', { signal: AbortSignal.timeout(1000) }); return; } catch { await wait(250); }
  }
  throw new Error('server did not start: ' + logs);
});
after(() => child.kill());
const join = async (town, extra = {}) => {
  const s = io(base, { transports: ['websocket'], forceNew: true });
  const got = { list: null, joins: [], states: [], emotes: [], leaves: [] };
  s.on('p:list', l => { got.list = l; }); s.on('p:join', d => got.joins.push(d)); s.on('p:state', d => got.states.push(d)); s.on('p:emote', d => got.emotes.push(d)); s.on('p:leave', d => got.leaves.push(d));
  await new Promise(r => s.on('connect', r));
  s.emit('town:join', { townId: town, species: 'bunny', look: { top: 'tee', topColor: '#ff0000', evil: { nested: true } }, x: 10, y: 12, scene: 'city', ...extra });
  await wait(150);
  return { s, got };
};

test('players in the same town see each other; other towns stay separate', async () => {
  const a = await join('willowvale'), b = await join('willowvale'), c = await join('sakura');
  assert.equal(a.got.list.length, 0); assert.equal(b.got.list.length, 1);
  assert.equal(b.got.list[0].name, 'Visitor'); assert.equal(b.got.list[0].species, 'bunny');
  assert.deepEqual(b.got.list[0].look, { top: 'tee', topColor: '#ff0000' }, 'nested or odd look fields are dropped');
  assert.equal(a.got.joins.length, 1); assert.equal(c.got.list.length, 0); assert.equal(c.got.joins.length, 0);
  b.s.emit('p:state', { x: 14.5, y: 9, scene: 'city', moving: true }); await wait(150);
  assert.equal(a.got.states.at(-1).x, 14.5); assert.equal(c.got.states.length, 0);
  b.s.emit('p:state', { x: 1e9, y: -4, scene: 'city' }); await wait(150);
  assert.equal(a.got.states.at(-1).x, 14.5, 'positions off the map are ignored');
  b.s.disconnect(); await wait(200);
  assert.equal(a.got.leaves.length, 1);
  a.s.disconnect(); c.s.disconnect();
});

test('only emojis can be sent between players', async () => {
  const a = await join('maple'), b = await join('maple');
  b.s.emit('p:emote', { e: ['👋', '😊'] }); await wait(150);
  assert.deepEqual(a.got.emotes.at(-1).e, ['👋', '😊']);
  for (const bad of [['hello'], ['hi 👋'], ['👋', 'x'], ['👋', '👋', '👋', '👋'], 'lol', [{}], ['<b>']]) { await wait(950); b.s.emit('p:emote', { e: bad }); }
  await wait(200);
  assert.equal(a.got.emotes.length, 1, 'no text, markup or long messages get through');
  a.s.disconnect(); b.s.disconnect();
});
