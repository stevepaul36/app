// Moving the furniture your home came with. Moves are saved per home and layout as
// { 'type:n': [di, dj, flip] }: how far a piece moved from where it started, and whether it's turned.
// A move is only allowed when the piece fits, stays in the same part of the home (indoors or the
// garden), and everything you could walk up to before is still reachable.

const FIXED = new Set(['plot', 'doormat', 'mailbox']);
/** Can this piece be picked up and moved? Doors, crop beds and rugs stay put. */
export const movable = f => f && f.kind === 'furn' && !FIXED.has(f.type) && !f.flat && !f.door && f.decorIdx === undefined;
/** A stable name for a piece: its type and which one of that type it is. */
export function keyOf(objects, f) { let n = 0; for (const o of objects) { if (o === f) return `${f.type}:${n}`; if (o.type === f.type) n++; } return null; }

const tiles = f => { const out = []; for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) out.push([i, j]); return out; };
const blocks = f => !f.flat && !f.walkIn;
function setBlocked(world, f, v) { if (blocks(f)) for (const [i, j] of tiles(f)) world.blocked[world.idx(i, j)] = v; }
function shift(f, di, dj) {
  f.i += di; f.j += dj;
  for (const k of ['use', 'stand', 'look']) if (f[k]) f[k] = [f[k][0] + di, f[k][1] + dj];
}

/** Put saved moves into a freshly built home. */
export function applyMoves(world, moves) {
  for (const f of world.objects) { f.i0 = f.i; f.j0 = f.j; }
  if (!moves) return;
  const keys = world.objects.map(f => keyOf(world.objects, f));
  world.objects.forEach((f, n) => {
    const m = moves[keys[n]];
    if (!m || !movable(f)) return;
    setBlocked(world, f, 0); shift(f, m[0], m[1]); f.flip = !!m[2]; setBlocked(world, f, 1);
  });
}

/** Which tiles you can walk to from the front door (inside and out), respecting walls. */
export function reachable(world) {
  const seen = new Set(), q = [];
  for (const [x, y] of [world.insideDoor, world.outsideDoor]) { const i = Math.floor(x), j = Math.floor(y); if (world.walkable(i, j)) { seen.add(world.idx(i, j)); q.push([i, j]); } }
  while (q.length) {
    const [i, j] = q.pop();
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      const k = world.idx(a, b);
      if (seen.has(k) || !world.walkable(a, b) || (world.edge && world.edge(i, j, a, b))) continue;
      seen.add(k); q.push([a, b]);
    }
  }
  return seen;
}
const standOk = (world, seen, f) => { if (!f.stand) return true; const i = Math.floor(f.stand[0]), j = Math.floor(f.stand[1]); return seen.has(world.idx(i, j)); };

/**
 * Try moving piece f to have its corner at (i, j). zone(i, j) tells which part of the home a tile is in
 * ('in' or 'out'); busy(i, j) says if something else (placed decor, the door step) is there.
 * On success the world is updated and the new offset from start is returned.
 */
export function tryMove(world, f, i, j, { zone, busy = () => false, start = [f.i0 ?? f.i, f.j0 ?? f.j] }) {
  const di = i - f.i, dj = j - f.j;
  if (!di && !dj) return { ok: false, msg: 'It’s already there.' };
  const z = zone(f.i, f.j), target = tiles({ ...f, i, j });
  setBlocked(world, f, 0);
  const fail = msg => { setBlocked(world, f, 1); return { ok: false, msg }; };
  for (const [a, b] of target) {
    if (!world.inb(a, b) || zone(a, b) !== z) return fail(z === 'in' ? 'Keep it inside the house.' : 'Keep it in your garden.');
    if (!world.walkable(a, b) || busy(a, b)) return fail('Something’s in the way there.');
  }
  if (world.edge) for (const [a, b] of target) for (const [c, d] of [[a + 1, b], [a, b + 1]]) if (target.some(([x, y]) => x === c && y === d) && world.edge(a, b, c, d)) return fail('It won’t fit across a wall.');
  // everything you could reach before must still be reachable afterwards
  setBlocked(world, f, 1);
  const before = reachable(world), wasOk = world.objects.filter(o => o.stand && standOk(world, before, o));
  setBlocked(world, f, 0); shift(f, di, dj); setBlocked(world, f, 1);
  const after = reachable(world);
  const stuck = wasOk.find(o => !standOk(world, after, o));
  if (stuck || (f.stand && !standOk(world, after, f))) {
    setBlocked(world, f, 0); shift(f, -di, -dj); setBlocked(world, f, 1);
    return { ok: false, msg: stuck && stuck !== f ? `That would block the way to the ${stuck.name.toLowerCase()}.` : 'You couldn’t reach it there.' };
  }
  return { ok: true, offset: [f.i - start[0], f.j - start[1]] };
}
