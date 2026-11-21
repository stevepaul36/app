'use strict';
// Child-safety and abuse checks found in the full-game test pass (Nov 2026).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { niceNick, cleanLook } = require('../server.js');

test('nickname filter refuses rude names, including look-alike digits and stretched letters', () => {
  for (const n of ['Kill', 'k1ll', 'KILLER_7', 'sexy_fox', 'fox_sex', 'Stupid', 'admin', 'sh1t', 'fuuuck', 'b1tch_99', 'Moderator1', 'dumb_bunny', 'Willowvale2'])
    assert.equal(niceNick(n), false, n);
});
test('nickname filter lets ordinary names through', () => {
  for (const n of ['whatever123', 'Skills4u', 'Sussex_kid', 'Dickens', 'chateau', 'Fox_Rider', 'Hatem', 'cocktail', 'Bubble_tea', 'Moonbeam'])
    assert.equal(niceNick(n), true, n);
});
test('a look carries only ids and colours, never words', () => {
  assert.deepEqual(cleanLook({ hat: 'red_cap', top: '#2E9BD6', note: 'I am Bob from 5th grade', sz: 3 }), { hat: 'red_cap', top: '#2E9BD6', sz: 3 });
});
test('broken JSON gets a 400, not a server error', async () => {
  const { app } = require('../server.js');
  const srv = app.listen(0); const port = srv.address().port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad json' });
    assert.equal(r.status, 400);
  } finally { srv.close(); }
});
