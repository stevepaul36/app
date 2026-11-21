import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, CROPS, RECIPES, growPlot, plotStage, craft, canCraft, recipeKnown, weatherOf, weatherAt, showerOf, seasonOf, requestFor, questsFor, RESTORE, harvestCount } from '../public/js/life.js';

test('every recipe, crop and restoration step uses real items', () => {
  for (const r of RECIPES) { assert.ok(ITEMS[r.id], r.id); for (const k of Object.keys(r.needs)) assert.ok(ITEMS[k], k); }
  for (const c of Object.keys(CROPS)) assert.ok(ITEMS[c] && ITEMS['seed_' + c], c);
  for (const s of RESTORE) for (const k of Object.keys(s.needs)) assert.ok(ITEMS[k], k);
});

test('crops only grow while watered', () => {
  const p = { crop: 'carrot', grown: 0, at: 0, wetUntil: 0 };
  growPlot(p, 600); assert.equal(p.grown, 0); assert.equal(plotStage(p), 'seed');
  p.wetUntil = 600 + 1440; growPlot(p, 600 + 200); assert.equal(p.grown, 200); assert.equal(plotStage(p), 'sprout');
  growPlot(p, 600 + 5000); assert.equal(p.grown, CROPS.carrot.grow); assert.equal(plotStage(p), 'ready');
  assert.ok(harvestCount(p, 3, () => 0) >= CROPS.carrot.yield[0]);
});

test('rain waters the garden', () => {
  const p = { crop: 'tulip', grown: 0, at: 0, wetUntil: 0 };
  growPlot(p, 10, true); growPlot(p, 100); assert.equal(p.grown, 100);
});

test('crafting uses up ingredients only when you have them all', () => {
  const inv = { wood: 3 }; const stool = RECIPES.find(r => r.id === 'stool');
  assert.equal(canCraft(stool, inv), false); assert.equal(craft(stool, inv), false); assert.equal(inv.wood, 3);
  inv.wood = 5; assert.equal(craft(stool, inv), true); assert.equal(inv.wood, 1); assert.equal(inv.stool, 1);
  const kite = RECIPES.find(r => r.id === 'kite');
  assert.equal(recipeKnown(kite, {}), false); assert.equal(recipeKnown(kite, { Dot: { hearts: 3 } }), true);
});

test('weather, requests and quests are the same all day', () => {
  for (let d = 1; d < 60; d++) { assert.equal(weatherOf(d), weatherOf(d)); assert.ok(['sunny', 'cloudy', 'rain', 'snow'].includes(weatherOf(d))); if (seasonOf(d) !== 3) assert.notEqual(weatherOf(d), 'snow'); }
  assert.deepEqual(requestFor('Pip', 5), requestFor('Pip', 5));
  const q = questsFor(9); assert.equal(q.length, 3); assert.equal(new Set(q.map(x => x.id)).size, 3);
  let asks = 0; for (let d = 1; d < 40; d++) if (requestFor('Marlow', d)) asks++; assert.ok(asks > 4 && asks < 30);
});

test('weather: sunny start, no long wet streaks, rain comes in showers', () => {
  assert.equal(weatherOf(1), 'sunny'); assert.equal(weatherOf(2), 'sunny');
  let wet = 0, kinds = new Set();
  for (let d = 1; d <= 400; d++) {
    const w = weatherOf(d); kinds.add(w);
    if (w === 'rain') wet++;
    if (d > 2 && (w === 'rain' || w === 'snow')) assert.ok(!(weatherOf(d - 1) === w && weatherOf(d - 2) === w), 'three wet days in a row at day ' + d);
    if (w === 'rain' || w === 'snow') {
      const { start, end } = showerOf(d);
      assert.ok(end - start >= 180 && end - start <= 360);
      assert.equal(weatherAt(d, start - 1), 'cloudy'); assert.equal(weatherAt(d, start + 10), w); assert.equal(weatherAt(d, end), 'cloudy');
    } else assert.equal(weatherAt(d, 720), w);
  }
  assert.ok(wet / 400 < 0.25, 'too much rain: ' + wet);
  assert.ok(kinds.has('sunny') && kinds.has('cloudy') && kinds.has('rain') && kinds.has('snow'));
});
