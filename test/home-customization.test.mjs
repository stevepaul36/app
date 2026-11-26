import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHome, HOME_LAYOUTS, GARDEN_LAYOUTS } from '../public/js/home.js';

test('home designer provides multiple room plans and garden layouts', () => {
  assert.deepEqual(HOME_LAYOUTS.map(x => x.id), ['classic', 'open', 'studio', 'loft']);
  assert.deepEqual(GARDEN_LAYOUTS.map(x => x.id), ['mixed', 'rows', 'orchard']);
  const classic = buildHome('classic');
  const open = buildHome('open');
  const studio = buildHome('studio');
  const loft = buildHome('loft');
  const innerWalls = world => world.walls.filter(x => x.kind === 'part').length;
  assert.ok(innerWalls(classic) > innerWalls(open));
  assert.equal(innerWalls(open), 0);
  assert.ok(innerWalls(studio) > innerWalls(open));
  assert.notEqual(innerWalls(loft), innerWalls(classic));
});

test('each garden layout has six uniquely indexed non-overlapping crop beds', () => {
  const positions = {};
  for (const layout of GARDEN_LAYOUTS) {
    const home = buildHome('classic', layout.id);
    const plots = home.objects.filter(x => x.type === 'plot');
    assert.equal(plots.length, 6);
    assert.deepEqual(plots.map(x => x.plot).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
    const keys = plots.map(x => x.i + ',' + x.j);
    assert.equal(new Set(keys).size, 6);
    positions[layout.id] = keys.sort();
  }
  assert.notDeepEqual(positions.mixed, positions.rows);
  assert.notDeepEqual(positions.rows, positions.orchard);
});

test('invalid room and garden styles fall back to the default plan', () => {
  const fallback = buildHome('unknown', 'unknown');
  const classic = buildHome('classic', 'mixed');
  assert.deepEqual(fallback.walls, classic.walls);
  assert.deepEqual(
    fallback.objects.filter(x => x.type === 'plot').map(x => [x.i, x.j]),
    classic.objects.filter(x => x.type === 'plot').map(x => [x.i, x.j]),
  );
});
