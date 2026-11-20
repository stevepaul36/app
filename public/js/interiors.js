// Inside views for the places you visit: cafés, shops, the arcade, restaurants, libraries, cinemas,
// gyms and offices. Each is a small room on the same grid the town uses, with walls on tile edges,
// furniture you can use, a spot behind the counter for whoever works there, and seats for customers.
import { N, T } from './world.js';
import { HT, O } from './home.js';

// Which inside view each place uses (by its action set).
export const KIT_OF = {
  cafe: 'cafe', market: 'shop', cornershop: 'shop', mall: 'shop', arcade: 'arcade',
  noodles: 'restaurant', ramen: 'restaurant', teahouse: 'restaurant', kitchen: 'restaurant', sweets: 'restaurant',
  library: 'library', school: 'library', museum: 'museum', theatre: 'cinema', cinema: 'cinema',
  gym: 'gym', dojo: 'gym', office: 'office', lab: 'lab', community: 'workshop',
};
export const STAFF_TITLE = { cafe: 'Barista', shop: 'Shopkeeper', arcade: 'Arcade host', restaurant: 'Chef', library: 'Librarian', museum: 'Guide', cinema: 'Usher', gym: 'Coach', office: 'Team lead', lab: 'Scientist', workshop: 'Teacher' };
// Arcade games: the cabinets you can actually play.
export const GAMES = { stars: { name: 'Star Catcher', color: '#5BC0EB', icon: '⭐' }, hop: { name: 'Bunny Hop', color: '#7CE07A', icon: '🐰' } };

export function buildInterior(venue, kit, acts) {
  const W = 10, D = 8;
  const tiles = new Uint8Array(N * N), blocked = new Uint8Array(N * N);
  const idx = (i, j) => j * N + i, inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
  const get = (i, j) => (inb(i, j) ? tiles[idx(i, j)] : T.SEA);
  const L = (i, j) => [O[0] + i, O[1] + j];
  const floor = { cafe: HT.WOOD, shop: HT.TILE, arcade: HT.CARPET, restaurant: HT.WOOD, library: HT.WOOD, museum: HT.TILE, cinema: HT.CARPET, gym: HT.TILE, office: HT.TILE, lab: HT.TILE, workshop: HT.WOOD }[kit] || HT.WOOD;
  // pavement outside, the room inside
  for (let j = -3; j <= D + 4; j++) for (let i = -3; i <= W + 3; i++) { const [a, b] = L(i, j); tiles[idx(a, b)] = T.PLAZA; if (i < 0 || j < 0 || i > W + 1 || j > D + 3) blocked[idx(a, b)] = 1; }
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const [a, b] = L(i, j); tiles[idx(a, b)] = floor; }
  const doorK = 8;
  for (let j = D; j <= D + 3; j++) { const [a, b] = L(doorK, j); tiles[idx(a, b)] = T.PATH; }

  const walls = [];
  const run = (axis, at, from, to, kind, opts = {}) => { for (let k = from; k < to; k++) if (!(opts.gaps || []).includes(k)) walls.push({ axis, at, k, kind, win: (opts.windows || []).includes(k), room: kit }); };
  const backWin = kit === 'cinema' ? [] : kit === 'arcade' ? [] : [6, 8];
  run('i', 0, 0, W, 'back', { windows: backWin });
  run('j', 0, 0, D, 'back', { windows: kit === 'cinema' || kit === 'arcade' ? [] : [2, 6] });
  run('i', D, 0, W, 'front', { gaps: [doorK] });
  run('j', W, 0, D, 'front');
  const edgeSet = new Set();
  const block = (a, b, c, d) => { edgeSet.add(`${a},${b},${c},${d}`); edgeSet.add(`${c},${d},${a},${b}`); };
  for (const w of walls) {
    if (w.axis === 'i') { const [a, b] = L(w.k, w.at - 1), [c, d] = L(w.k, w.at); block(a, b, c, d); }
    else { const [a, b] = L(w.at - 1, w.k), [c, d] = L(w.at, w.k); block(a, b, c, d); }
  }

  const F = [];
  const add = (type, i, j, w, d, name, extra = {}) => {
    const [a, b] = L(i, j);
    const f = { kind: 'furn', type, i: a, j: b, w, d, name, venue: venue.id, ...extra };
    for (const k of ['use', 'stand', 'look']) if (extra[k]) f[k] = L(...extra[k]);
    F.push(f); return f;
  };
  const staff = [];
  const seats = [];
  const seat = f => { seats.push(f); return f; };
  // a round table with two chairs, left and right
  const tableSet = (i, j, only) => {
    add('cafetable', i, j, 1, 1, 'Table', { decor: true });
    seat(add('cafechair', i - 1, j, 1, 1, 'Chair', { use: [i - 0.45, j + 0.5], stand: [i - 0.5, j + 1.5], look: [i + 0.5, j + 0.5], facing: 'i', acts, only }));
    seat(add('cafechair', i + 1, j, 1, 1, 'Chair', { use: [i + 1.45, j + 0.5], stand: [i + 1.5, j + 1.5], look: [i + 0.5, j + 0.5], facing: '-i', acts, only }));
  };
  const food = ['eat', 'tea', 'sit'];

  if (kit === 'cafe') {
    add('barcounter', 1, 2, 3, 1, 'Counter', { stand: [2.5, 3.5], look: [2.5, 2.2], acts, machine: true });
    staff.push([2.5, 1.4]);
    add('pastrycase', 4, 2, 1, 1, 'Pastry case', { decor: true });
    add('menuboard', 2, 0, 2, 1, 'Menu', { decor: true });
    add('plant', 0, 0, 1, 1, 'Plant', { decor: true, variant: 1 });
    tableSet(2, 5, food); tableSet(6, 3, food); tableSet(6, 6, food);
    add('plant', 9, 0, 1, 1, 'Plant', { decor: true, variant: 2 });
  } else if (kit === 'shop') {
    for (let k = 0; k < 6; k++) add('shelf', 1 + k, 0, 1, 1, 'Shelves', { stand: [1.5 + k, 1.5], look: [1.5 + k, 0.3], acts: 'shelf', variant: k });
    add('shelf2', 2, 3, 3, 1, 'Display', { stand: [3.5, 4.5], look: [3.5, 3.4], acts: 'shelf', variant: 2 });
    add('shelf2', 2, 5, 3, 1, 'Display', { stand: [3.5, 6.5], look: [3.5, 5.4], acts: 'shelf', variant: 4 });
    add('till', 7, 3, 2, 1, 'Counter', { stand: [7.5, 4.5], look: [7.5, 3.2], acts });
    staff.push([7.8, 2.2]);
    add('plant', 9, 0, 1, 1, 'Plant', { decor: true });
  } else if (kit === 'arcade') {
    const games = ['stars', 'hop', 'stars', 'hop'];
    games.forEach((g, k) => add('arcadecab', 1 + k * 1.5 | 0, 0, 1, 1, GAMES[g].name, { stand: [1.5 + (k * 1.5 | 0), 1.5], look: [1.5 + (k * 1.5 | 0), 0.3], game: g, acts: 'cabinet' }));
    add('arcadecab', 0, 3, 1, 1, GAMES.stars.name, { stand: [1.5, 3.5], look: [0.3, 3.5], game: 'stars', side: true, acts: 'cabinet' });
    add('arcadecab', 0, 5, 1, 1, GAMES.hop.name, { stand: [1.5, 5.5], look: [0.3, 5.5], game: 'hop', side: true, acts: 'cabinet' });
    add('claw', 7, 0, 1, 1, 'Claw machine', { stand: [7.5, 1.5], look: [7.5, 0.3], acts: 'claw' });
    add('prizes', 6, 4, 2, 1, 'Prize counter', { stand: [6.5, 5.5], look: [6.5, 4.2], acts: 'prizes' });
    staff.push([7, 3.4]);
    add('stool', 4, 4, 1, 1, 'Stool', { decor: true });
  } else if (kit === 'restaurant') {
    add('stove', 1, 0, 1, 1, 'Stove', { decor: true });
    add('stove', 3, 0, 1, 1, 'Stove', { decor: true });
    add('counter', 2, 0, 1, 1, 'Counter', { decor: true, fruit: true });
    add('counter', 4, 0, 1, 1, 'Counter', { decor: true });
    add('barcounter', 1, 2, 5, 1, 'Counter', { stand: [3.5, 3.5], look: [3.5, 2.2], acts, steam: true });
    staff.push([3.5, 1.3]);
    for (let k = 0; k < 4; k++) seat(add('stool', 1.5 + k * 1.2 | 0, 3, 1, 1, 'Stool', { use: [1.5 + (1.5 + k * 1.2 | 0) - 1, 3.4], stand: [1.5 + (1.5 + k * 1.2 | 0) - 1, 4.5], look: [1.5 + (1.5 + k * 1.2 | 0) - 1, 2.4], acts, only: food, walkIn: true }));
    tableSet(7, 3, food); tableSet(3, 6, food);
    add('plant', 9, 0, 1, 1, 'Plant', { decor: true, variant: 2 });
  } else if (kit === 'library' || kit === 'museum') {
    for (let k = 0; k < 5; k++) add('bookshelf', 1 + k, 0, 1, 1, 'Bookshelf', { stand: [1.5 + k, 1.5], look: [1.5 + k, 0.2], acts });
    if (kit === 'museum') {
      ['robot', 'dino', 'planet'].forEach((v, k) => add('exhibit', 2 + k * 2, 3, 1, 1, ['Friendly robot', 'Dinosaur bones', 'Model planets'][k], { stand: [2.5 + k * 2, 4.5], look: [2.5 + k * 2, 3.5], variant: v, acts }));
      tableSet(3, 6, ['read', 'sit']);
    } else { tableSet(2, 4, ['read', 'sit']); tableSet(6, 4, ['read', 'sit']); tableSet(3, 6, ['read', 'sit']); }
    add('till', 7, 1, 2, 1, 'Desk', { decor: true, books: true });
    staff.push([8, 0.6]);
  } else if (kit === 'cinema') {
    add('screen', 2, 0, 6, 1, 'Screen', { decor: true });
    for (const j of [3, 5]) for (let i = 2; i < 8; i++) seat(add('seat', i, j, 1, 1, 'Seat', { use: [i + 0.5, j + 0.45], stand: [i + 0.5, j + 1.5], look: [i + 0.5, 0], facing: '-j', acts, walkIn: true }));
    add('popcorn', 0, 6, 1, 1, 'Popcorn', { stand: [1.5, 6.5], look: [0.3, 6.5], acts: 'popcorn' });
    staff.push([0.6, 5.2]);
  } else if (kit === 'gym') {
    add('treadmill', 1, 0, 1, 2, 'Treadmill', { use: [1.5, 1.1], stand: [2.5, 1.5], look: [1.5, 0], acts, walkIn: true });
    add('treadmill', 3, 0, 1, 2, 'Treadmill', { use: [3.5, 1.1], stand: [4.5, 1.5], look: [3.5, 0], acts, walkIn: true });
    add('weights', 6, 0, 2, 1, 'Weights', { stand: [6.5, 1.5], look: [6.5, 0.3], acts });
    add('mat', 2, 4, 3, 2, 'Mat', { flat: true, stand: [3.5, 5], acts });
    staff.push([7, 4]);
    add('plant', 9, 0, 1, 1, 'Plant', { decor: true, variant: 2 });
  } else { // office, lab, workshop
    const desk = kit === 'lab' ? 'labbench' : kit === 'workshop' ? 'crafttable' : 'officedesk';
    for (const [i, j] of [[2, 2], [5, 2], [2, 5], [5, 5]]) {
      add(desk, i, j, 2, 1, kit === 'lab' ? 'Lab bench' : kit === 'workshop' ? 'Craft table' : 'Desk', { stand: [i + 0.5, j + 1.5], look: [i + 0.5, j + 0.3], acts });
      seats.push({ use: L(i + 0.5, j + 1.35), look: L(i + 0.5, j), virtual: true });
    }
    add('plant', 0, 0, 1, 1, 'Plant', { decor: true, variant: 1 });
    add('bookshelf', 8, 0, 1, 1, 'Shelf', { decor: true });
    staff.push([8.5, 3]);
  }
  add('doormat', doorK, D - 1, 1, 1, 'Way out', { flat: true, stand: [doorK + 0.5, D - 0.5], door: true });
  for (const f of F) {
    if (f.flat || f.walkIn) continue;
    for (let j = f.j; j < f.j + Math.ceil(f.d); j++) for (let i = f.i; i < f.i + Math.ceil(f.w); i++) blocked[idx(i, j)] = 1;
  }
  const deco = [[-2, 2, 'round'], [W + 1, 1, 'round'], [-2, D + 1, 'round'], [W + 1, D + 2, 'round']].map(([i, j, tree], k) => { const [a, b] = L(i, j); blocked[idx(a, b)] = 1; return { kind: 'tree', tree, i: a, j: b, w: 1, d: 1, seed: k * 13, ox: 0, oy: 0 }; });
  const walkable = (i, j) => inb(i, j) && tiles[idx(i, j)] !== T.SEA && !blocked[idx(i, j)];
  return {
    interior: true, venueRoom: true, kit, venue, tiles, blocked, idx, get, inb, walkable,
    isRoad: (i, j) => get(i, j) === T.PATH,
    edge: (a, b, c, d) => edgeSet.has(`${a},${b},${c},${d}`),
    objects: F, decor: deco, boats: [], walls,
    insideDoor: [O[0] + doorK + 0.5, O[1] + D - 1.4], outsideDoor: [O[0] + doorK + 0.5, O[1] + D + 1.5],
    staffSpots: staff.map(([i, j]) => L(i, j)), seats, roomSize: [W, D],
  };
}
