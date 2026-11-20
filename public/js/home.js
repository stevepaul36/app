// Your cottage, inside. A 12 x 10 room plan with a bedroom, bathroom, kitchen and living room,
// placed in the middle of the same grid size the town uses so the engine treats it like any scene.
import { N, T } from './world.js';

export const HT = { WOOD: 9, TILE: 10, CARPET: 11, BATH: 12 };
export const O = [16, 16];
export const ROOM = { w: 12, d: 10 };

export function buildHome() {
  const tiles = new Uint8Array(N * N), blocked = new Uint8Array(N * N);
  const idx = (i, j) => j * N + i, inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
  const get = (i, j) => (inb(i, j) ? tiles[idx(i, j)] : T.SEA);
  const L = (i, j) => [O[0] + i, O[1] + j];

  // Garden all round, then the house floor.
  for (let j = -4; j <= 15; j++) for (let i = -4; i <= 16; i++) { const [a, b] = L(i, j); tiles[idx(a, b)] = T.GRASS; if (i < 0 || j < 0 || i > 15 || j > 14) blocked[idx(a, b)] = 1; }
  for (let j = 0; j < ROOM.d; j++) for (let i = 0; i < ROOM.w; i++) {
    let t = HT.WOOD;
    if (i <= 4 && j <= 4) t = HT.CARPET;
    else if (i <= 3 && j >= 5) t = HT.BATH;
    else if (i >= 7 && j <= 3) t = HT.TILE;
    const [a, b] = L(i, j); tiles[idx(a, b)] = t;
  }
  for (let j = 10; j <= 14; j++) { const [a, b] = L(9, j); tiles[idx(a, b)] = T.PATH; }
  for (let i = 9; i <= 15; i++) { const [a, b] = L(i, 14); tiles[idx(a, b)] = T.PATH; }

  // Walls live on tile edges. axis 'i' runs along i on the line j = at; axis 'j' runs along j on the line i = at.
  const walls = [];
  const run = (axis, at, from, to, kind, opts = {}) => { for (let k = from; k < to; k++) if (!(opts.gaps || []).includes(k)) walls.push({ axis, at, k, kind, win: (opts.windows || []).includes(k), room: opts.room ? opts.room(k) : null }); };
  const roomOf = (i, j) => (i <= 4 && j <= 4 ? 'bed' : i <= 3 && j >= 5 ? 'bath' : i >= 7 && j <= 3 ? 'kitchen' : 'living');
  run('i', 0, 0, ROOM.w, 'back', { windows: [2, 6, 9], room: k => roomOf(k, 0) });
  run('j', 0, 0, ROOM.d, 'back', { windows: [2, 7], room: k => roomOf(0, k) });
  run('i', ROOM.d, 0, ROOM.w, 'front', { gaps: [9] });
  run('j', ROOM.w, 0, ROOM.d, 'front');
  run('j', 5, 0, 5, 'part', { gaps: [3] });       // bedroom | living
  run('i', 5, 0, 5, 'part');                      // bedroom / bathroom + living
  run('j', 4, 5, ROOM.d, 'part', { gaps: [6] });  // bathroom | living
  const edgeSet = new Set();
  const block = (a, b, c, d) => { edgeSet.add(`${a},${b},${c},${d}`); edgeSet.add(`${c},${d},${a},${b}`); };
  for (const w of walls) {
    if (w.axis === 'i') { const [a, b] = L(w.k, w.at - 1), [c, d] = L(w.k, w.at); block(a, b, c, d); }
    else { const [a, b] = L(w.at - 1, w.k), [c, d] = L(w.at, w.k); block(a, b, c, d); }
  }

  // Furniture. use = where you sit, lie or stand to use it; stand = where you walk to first.
  const F = [];
  const add = (kind, i, j, w, d, name, extra = {}) => { const [a, b] = L(i, j); const f = { kind: 'furn', type: kind, i: a, j: b, w, d, name, ...extra }; if (extra.use) f.use = L(...extra.use); if (extra.stand) f.stand = L(...extra.stand); if (extra.look) f.look = L(...extra.look); F.push(f); return f; };
  add('nightstand', 0, 0, 1, 1, 'Nightstand', { lamp: true, decor: true });
  add('bed', 1, 0, 2, 3, 'Cosy bed', { use: [2, 1.45], stand: [3.5, 1.5] });
  add('bookshelf', 4, 0, 1, 1, 'Bookshelf', { stand: [4.5, 1.5], look: [4.5, 0.2] });
  add('shower', 0, 5, 1, 1, 'Shower', { use: [0.5, 5.55], stand: [1.5, 5.5], walkIn: true });
  add('sink', 0, 7, 1, 1, 'Sink & mirror', { stand: [1.5, 7.5], look: [0.2, 7.5] });
  add('plant', 3, 9, 1, 1, 'Fern', { stand: [2.5, 8.5], look: [3.5, 9.5] });
  add('plant', 5, 0, 1, 1, 'Monstera', { stand: [5.5, 1.5], look: [5.5, 0.4], variant: 1 });
  add('radio', 6, 0, 1, 1, 'Radio', { stand: [6.5, 1.5], look: [6.5, 0.4] });
  add('fridge', 7, 0, 1, 1, 'Fridge', { stand: [7.5, 1.5], look: [7.5, 0.3] });
  add('counter', 8, 0, 1, 1, 'Counter', { decor: true });
  add('stove', 9, 0, 1, 1, 'Stove', { stand: [9.5, 1.5], look: [9.5, 0.3] });
  add('kitchensink', 10, 0, 1, 1, 'Kitchen sink', { decor: true });
  add('counter', 11, 0, 1, 1, 'Counter', { decor: true, fruit: true });
  add('table', 8, 2, 2, 1, 'Kitchen table', { stand: [8.5, 3.5] });
  add('chair', 7, 2, 1, 1, 'Chair', { use: [7.55, 2.5], stand: [7.5, 3.5], look: [8.5, 2.5], facing: 'i' });
  add('chair', 10, 2, 1, 1, 'Chair', { use: [10.45, 2.5], stand: [10.5, 3.5], look: [9.5, 2.5], facing: '-i' });
  add('tv', 8, 4, 2, 1, 'Television', { stand: [8.5, 6.5] });
  add('rug', 7, 5, 3, 2, 'Rug', { flat: true });
  add('sofa', 7, 7, 3, 1, 'Sofa', { use: [8.5, 7.42], stand: [8.5, 6.5], look: [8.5, 4.5], facing: '-j' });
  add('armchair', 5, 8, 1, 1, 'Armchair', { use: [5.42, 8.5], stand: [6.5, 8.5], look: [7.5, 8.5], facing: 'i' });
  add('desk', 11, 5, 1, 2, 'Computer desk', { use: [10.55, 5.5], stand: [10.5, 6.6], look: [11.5, 5.5], facing: 'i' });
  add('floorlamp', 11, 8, 1, 1, 'Floor lamp', { lamp: true, decor: true });
  add('plant', 11, 9, 1, 1, 'Palm', { stand: [10.5, 9.5], look: [11.5, 9.5], variant: 2 });
  add('bathrug', 1, 8, 2, 1, 'Bath mat', { flat: true });
  add('doormat', 9, 9, 1, 1, 'Front door', { flat: true, stand: [9.5, 9.5], door: true });
  add('mailbox', 11, 12, 1, 1, 'Mailbox', { stand: [10.5, 12.5], look: [11.5, 12.5] });
  for (const f of F) {
    if (f.flat || f.walkIn) continue;
    for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) blocked[idx(i, j)] = 1;
  }
  const garden = [[13, 2, 'round'], [14, 6, 'blossom'], [13, 11, 'round'], [2, 12, 'pine'], [6, 13, 'round'], [15, 13, 'palm']].map(([i, j, tree], k) => { const [a, b] = L(i, j); blocked[idx(a, b)] = 1; return { kind: 'tree', tree, i: a, j: b, w: 1, d: 1, seed: k * 31, ox: 0, oy: 0 }; });
  const flowers = [[10, 11], [8, 11], [12, 13], [3, 11], [14, 9], [13, 4]].map(([i, j], k) => { const [a, b] = L(i, j); return { kind: 'flowers', i: a, j: b, w: 1, d: 1, seed: k * 7 + 3 }; });

  const walkable = (i, j) => inb(i, j) && tiles[idx(i, j)] !== T.SEA && !blocked[idx(i, j)];
  return {
    interior: true, tiles, blocked, idx, get, inb, walkable,
    isRoad: (i, j) => get(i, j) === T.PATH,
    edge: (a, b, c, d) => edgeSet.has(`${a},${b},${c},${d}`),
    objects: F, decor: [...garden, ...flowers], boats: [], walls,
    insideDoor: [O[0] + 9.5, O[1] + 8.6], outsideDoor: [O[0] + 9.5, O[1] + 11.5],
  };
}
