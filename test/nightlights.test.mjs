import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CITY_LIST } from '../public/js/cities.js';
import * as NL from '../public/js/nightlights.js';

test('every town has its own kind of floating night light', () => {
  const kinds = CITY_LIST.map(c => NL.floaterFor(c.id).kind);
  assert.equal(new Set(kinds).size, CITY_LIST.length, kinds.join());
  for (const c of CITY_LIST) assert.match(NL.floaterFor(c.id).line, /\w/);
});

test('floating lights stay near you and stay put in the world as you walk', () => {
  for (const kind of ['firefly', 'skylantern', 'petal', 'diya']) {
    for (let n = 0; n < 30; n++) {
      const [x, y, h] = NL.floaterPos(n, 12.5, [20, 20], kind);
      assert.ok(Math.abs(x - 20) <= NL.SPAN / 2 + 2 && Math.abs(y - 20) <= NL.SPAN / 2 + 2);
      assert.ok(h > 0);
    }
  }
  // a light well inside the window is at the same spot whether you stand here or a step away
  const a = NL.floaterPos(3, 5, [20, 20], 'firefly'), b = NL.floaterPos(3, 5, [21, 20], 'firefly');
  if (Math.abs(a[0] - 20) < NL.SPAN / 2 - 2) assert.deepEqual(a, b);
});
