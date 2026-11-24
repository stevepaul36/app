import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as TL from '../public/js/townlife.js';
import { buildWorld, rng } from '../public/js/world.js';
import { buildCity } from '../public/js/cities.js';

const r0 = () => 0;

test('news: witnesses remember, repeats on one day merge, old news fades', () => {
  let news = TL.addNews([], { t: 'fish', item: 'Golden Koi' }, 5, ['Pip', 'Marlow']);
  news = TL.addNews(news, { t: 'fish', item: 'Golden Koi' }, 5, ['Wren']);
  assert.equal(news.length, 1);
  assert.deepEqual(news[0].knows, ['Pip', 'Marlow', 'Wren']);
  news = TL.addNews(news, { t: 'craft', item: 'lantern' }, 5 + TL.NEWS_KEEP_DAYS + 1, []);
  assert.equal(news.length, 1, 'week-old news is forgotten');
  assert.equal(news[0].t, 'craft');
});

test('gossip: news spreads to neighbours who did not see it, never back to the person it was about', () => {
  const news = TL.addNews([], { t: 'gift', who: 'Pip', item: 'flower' }, 1, ['Pip']);
  assert.deepEqual(TL.gossip(news, 'Pip', 'Marlow', r0).map(p => p.listener), ['Marlow']);
  assert.equal(news[0].from.Marlow, 'Pip');
  // Marlow passes it on, but not back to Pip
  assert.deepEqual(TL.gossip(news, 'Marlow', 'Pip', r0), []);
  TL.gossip(news, 'Marlow', 'Wren', r0);
  assert.equal(news[0].from.Wren, 'Marlow');
});

test('greeting: first-hand news first, then gossip, each said once, then small talk', () => {
  let news = TL.addNews([], { t: 'gift', who: 'Pip', item: 'flower' }, 1, ['Pip']);
  news = TL.addNews(news, { t: 'fish', item: 'Golden Koi' }, 1, ['Marlow']);
  TL.gossip(news, 'Marlow', 'Pip', r0);
  const a = TL.greetingFor('Pip', [], news, { hour: 12 }, r0);
  assert.match(a.text, /flower/);
  const b = TL.greetingFor('Pip', [], news, { hour: 12 }, r0);
  assert.match(b.text, /Marlow.*Golden Koi/);
  const c = TL.greetingFor('Pip', ['Bookworm'], news, { hour: 12 }, r0);
  assert.equal(c.icon, '💬');
  assert.ok(c.text.length > 3);
});

test('greeting text never has unfilled {placeholders}', () => {
  for (const [t, def] of Object.entries(TL.NEWS)) {
    for (let k = 0; k < 6; k++) {
      let news = TL.addNews([], { t, who: 'Hazel', item: 'thing' }, 1, ['Hazel', 'Pip']);
      const r = () => k / 6;
      for (const name of ['Hazel', 'Pip']) assert.doesNotMatch(TL.greetingFor(name, ['Shy'], news, {}, r).text, /[{}]/, `${t}`);
      news = TL.addNews([], { t, item: 'thing' }, 1, ['Pip']);
      TL.gossip(news, 'Pip', 'Wren', () => 0);
      assert.doesNotMatch(TL.greetingFor('Wren', [], news, {}, r).text, /[{}]/);
      assert.doesNotMatch(TL.knownBy(news, 'Wren').map(x => x.text).join(' '), /[{}]/);
    }
    assert.ok(def.did && def.saw.length && def.heard.length);
  }
});

for (const [id, make] of [['willowvale', () => buildWorld()], ['sakura', () => buildCity('sakura')]]) {
  test(`${id}: the land grows on open grass, the same way for everyone, up to a limit`, () => {
    const wd = make(), g1 = TL.freshGrowth(1), g2 = TL.freshGrowth(1);
    const seeded = d => rng(1234 + d * 977);
    TL.growTown(g1, wd, 4, seeded); TL.growTown(g2, wd, 4, seeded);
    assert.deepEqual(g1.sprouts, g2.sprouts, 'same seed, same town');
    assert.ok(g1.sprouts.length > 0 && g1.sprouts.length <= 3 * TL.GROW_PER_DAY);
    for (const [i, j] of g1.sprouts) {
      assert.ok(wd.walkable(i, j) && !wd.isRoad(i, j), 'on open ground');
      assert.ok(!wd.decor.some(d => d.i === i && d.j === j), 'not on top of other decor');
    }
    TL.growTown(g1, wd, 400, seeded);
    assert.ok(g1.sprouts.length <= TL.GROW_MAX);
    assert.equal(g1.day, 400);
  });
}

test('worn paths: footsteps wear grass, then fade when nobody walks', () => {
  const wd = buildWorld(), g = TL.freshGrowth(1);
  let spot = null;
  for (let j = 0; j < 44 && !spot; j++) for (let i = 0; i < 44 && !spot; i++) if (wd.get(i, j) === 2 && !wd.isRoad(i, j)) spot = [i, j];
  for (let k = 0; k < 20; k++) TL.stepOn(g, wd, ...spot);
  assert.equal(g.worn[spot.join(',')], 20);
  TL.growTown(g, wd, 8, d => rng(d));
  assert.ok((g.worn[spot.join(',')] || 0) < 20);
});

test('community plantings: the same spots for every player, growing with the count', () => {
  const wd = buildWorld(), seeded = d => rng(99 + d);
  const five = TL.communityPlants(wd, 5, seeded), ten = TL.communityPlants(wd, 10, seeded);
  assert.equal(five.length, 5);
  assert.deepEqual(ten.slice(0, 5), five);
  assert.ok(TL.communityPlants(wd, 1000, seeded).length <= 60);
});
