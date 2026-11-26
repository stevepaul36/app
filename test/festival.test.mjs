import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as FE from '../public/js/festival.js';

const names = ['Pip', 'Bo', 'Mabel', 'Juniper'];
const monday = 20416; // 2025-11-24 was a Monday (day numbers count from 1 Jan 1970)

test('festival weeks run Monday to Sunday', () => {
  assert.equal(FE.weekOf(monday), FE.weekOf(monday + 6));
  assert.equal(FE.weekOf(monday + 7), FE.weekOf(monday) + 1);
  assert.equal(FE.daysLeft(monday), 6);
  assert.equal(FE.daysLeft(monday + 6), 0);
});

test('the goal grows with last week’s lanterns, never below the minimum', () => {
  assert.equal(FE.goalAfter(0), FE.MIN_GOAL);
  assert.equal(FE.goalAfter(100), 120);
  assert.equal(FE.goalAfter(33) % 5, 0);
});

test('one lantern a day, only after the errands, and neighbours add theirs', () => {
  const P = {};
  assert.equal(FE.localState(P, monday, names, false).canRelease, false);
  assert.match(FE.releaseLocal(P, monday, 'rose', '🌸', false).msg, /errands first/);
  const before = FE.localState(P, monday, names, true);
  assert.ok(before.canRelease);
  assert.ok(before.total >= 3 && before.total <= 5); // the neighbours' lanterns on day one
  assert.ok(FE.releaseLocal(P, monday, 'rose', '🌸', true).ok);
  assert.match(FE.releaseLocal(P, monday, 'rose', '🌸', true).msg, /tomorrow/);
  const after = FE.localState(P, monday, names, true);
  assert.equal(after.total, before.total + 1);
  assert.equal(after.mine, 1);
  assert.ok(after.released && !after.canRelease);
  assert.deepEqual(after.lanterns.find(l => l.you), { name: 'You', color: 'rose', symbol: '🌸', you: true });
  // bad picks are ignored, the last good pick stays
  FE.releaseLocal(P, monday + 1, 'nope', 'x', true);
  assert.equal(P.festival.color, 'rose');
});

test('a week of lanterns with the neighbours lights the festival, and Monday starts a new one', () => {
  const P = {};
  for (let d = monday; d < monday + 7; d++) FE.releaseLocal(P, d, 'gold', '⭐', true);
  const end = FE.localState(P, monday + 6, names, true);
  assert.equal(end.mine, 7);
  assert.ok(end.lit, `${end.total} of ${end.goal}`);
  const next = FE.localState(P, monday + 7, names, true);
  assert.equal(next.mine, 0);
  assert.ok(!next.lit);
});
