// Willowvale city layout: an island of four districts on a 44 x 44 isometric grid.
// i runs toward the bottom-right of the screen, j toward the bottom-left.
export const N = 44;
export const T = { SEA: 0, SAND: 1, GRASS: 2, PATH: 3, PLAZA: 4, PARK: 5, POND: 6, DOCK: 7, MEADOW: 8 };
const WALKABLE = new Set([T.SAND, T.GRASS, T.PATH, T.PLAZA, T.PARK, T.DOCK, T.MEADOW]);
const SOFT = new Set([T.GRASS, T.PARK, T.MEADOW, T.SAND]);

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const DISTRICTS = {
  park: { name: 'Willow Park', blurb: 'Leafy lanes, cottages and the lily pond.', color: '#3FA86A', spawn: [10, 15] },
  downtown: { name: 'Old Town', blurb: 'The café, market hall and theatre.', color: '#F0587A', spawn: [22, 15] },
  waterfront: { name: 'Bluewater Quay', blurb: 'Boardwalk, marina and the Sunwheel.', color: '#2E9BD6', spawn: [33, 29] },
  hills: { name: 'Fernhill Heights', blurb: 'Pine woods, meadows and the old windmill.', color: '#C98A1E', spawn: [15, 33] },
};
export function districtAt(x, y) {
  if (x < 21 && y < 21) return 'park';
  if (x >= 21 && y < 21) return 'downtown';
  if (x >= 21 && y >= 21) return 'waterfront';
  return 'hills';
}

// Homes keep the server's property IDs so renting and buying still work.
export const HOMES = [
  { id: 'home-1', name: 'Mosslight Cottage', kind: 'house', price: 250, rent: 12, description: 'A cosy starter home beside Willow Park', i: 12, j: 5, w: 2, d: 2, look: 0 },
  { id: 'home-2', name: 'The Sunbeam House', kind: 'house', price: 325, rent: 16, description: 'A bright little home with a garden', i: 15, j: 5, w: 2, d: 2, look: 1 },
  { id: 'home-3', name: 'Fern & Finch Home', kind: 'house', price: 400, rent: 20, description: 'A leafy home in a quiet neighbourhood', i: 18, j: 5, w: 2, d: 2, look: 2 },
  { id: 'home-4', name: 'Maple Corner', kind: 'house', price: 475, rent: 24, description: 'A cheerful corner home near the shops', i: 5, j: 12, w: 2, d: 2, look: 3 },
  { id: 'home-5', name: 'Clover House', kind: 'house', price: 550, rent: 28, description: 'A roomy home close to the central plaza', i: 5, j: 16, w: 2, d: 2, look: 4 },
  { id: 'home-6', name: 'Juniper Apartments', kind: 'apartment', price: 420, rent: 20, description: 'A modern apartment near city life', i: 30, j: 24, w: 2, d: 2, look: 0 },
  { id: 'home-7', name: 'The Fern House', kind: 'apartment', price: 530, rent: 25, description: 'An airy apartment with park views', i: 24, j: 28, w: 2, d: 3, look: 1 },
  { id: 'home-8', name: 'Willow Lofts', kind: 'apartment', price: 640, rent: 30, description: 'A stylish loft near Old Town', i: 28, j: 28, w: 3, d: 2, look: 2 },
  { id: 'home-9', name: 'Bluebell Residences', kind: 'apartment', price: 750, rent: 36, description: 'A waterside residence with room to grow', i: 23, j: 35, w: 3, d: 2, look: 3 },
  { id: 'home-10', name: 'Acorn Court', kind: 'apartment', price: 850, rent: 42, description: 'A premium city apartment near the plaza', i: 35, j: 22, w: 2, d: 3, look: 4 },
  { id: 'home-11', name: 'Marina View Villa', kind: 'villa', price: 1100, rent: 55, description: 'A spacious home by Bluewater Quay', i: 27, j: 38, w: 3, d: 2, look: 0 },
  { id: 'home-12', name: 'Fernhill Garden Villa', kind: 'villa', price: 1350, rent: 68, description: 'A private garden home in the hills', i: 16, j: 28, w: 3, d: 3, look: 1 },
];

export const VENUES = [
  { id: 'cafe', name: 'The Little Acorn Café', type: 'Café', icon: '☕', i: 24, j: 11, w: 3, d: 3, color: '#F0587A',
    desc: 'Berry tea, warm pastries and the friendliest regulars in town.',
    activity: { title: 'Berry break', verb: 'Sipping tea', story: 'You shared berry tea with the regulars and packed a fresh berry for later.', reward: 'berries', amount: 1, coins: 3 } },
  { id: 'market', name: 'Willowvale Market Hall', type: 'Market', icon: '🧺', i: 28, j: 11, w: 4, d: 3, color: '#F2A93B',
    desc: 'Stalls of fruit, flowers and crafts. Bring things to sell.',
    activity: { title: 'Market day', verb: 'Trading', story: 'You sold a basket at the stalls and the keeper paid you in coins.', reward: 'coins', amount: 0, coins: 8 } },
  { id: 'community', name: 'Pawprint Community Centre', type: 'Community', icon: '🎨', i: 24, j: 16, w: 3, d: 3, color: '#8E7CE0',
    desc: 'Workshops, town meetings and a very messy craft table.',
    activity: { title: 'Craft a keepsake', verb: 'Crafting', story: 'You made a tiny keepsake for the town noticeboard.', reward: 'crafts', amount: 1, coins: 5 } },
  { id: 'theatre', name: 'The Lantern Theatre', type: 'Theatre', icon: '🎭', i: 29, j: 16, w: 4, d: 3, color: '#D9485F',
    desc: 'Shows, open-mic nights and a stage anyone can try.',
    activity: { title: 'Take the stage', verb: 'Performing', story: 'The audience stamped their paws for your song.', reward: 'coins', amount: 0, coins: 7 } },
  { id: 'library', name: 'Fernhill Library', type: 'Library', icon: '📚', i: 12, j: 12, w: 3, d: 3, color: '#2F6F8F',
    desc: 'Quiet corners, old maps and stories about the island.',
    activity: { title: 'Story hour', verb: 'Reading', story: 'You found an old story about the island and a pressed-flower bookmark.', reward: 'flowers', amount: 1, coins: 4 } },
  { id: 'station', name: 'Willowvale Tram Station', type: 'Station', icon: '🚋', i: 26, j: 24, w: 3, d: 3, color: '#2E9BD6',
    desc: 'Trams to every district. Hop on to travel fast.',
    activity: { title: 'Ride the tram', verb: 'Riding', story: 'You rode the loop and got a stamp for your travel card.', reward: 'coins', amount: 0, coins: 4 } },
  { id: 'marina', name: 'Bluewater Marina', type: 'Marina', icon: '⛵', i: 35, j: 35, w: 3, d: 2, color: '#1F8FB8',
    desc: 'Boats, gulls and the best fishing spot on the island.',
    activity: { title: 'Fishing time', verb: 'Fishing', story: 'A little silver fish! It went straight into your bag.', reward: 'fish', amount: 1, coins: 6 } },
  { id: 'clinic', name: 'Paws & Whiskers Clinic', type: 'Clinic', icon: '🩺', i: 12, j: 24, w: 3, d: 3, color: '#3FA86A',
    desc: 'Where the island looks after its residents.',
    activity: { title: 'Help a neighbour', verb: 'Packing', story: 'You packed care parcels and the nurse gave you a flower.', reward: 'flowers', amount: 1, coins: 5 } },
];

// Purely decorative shopfronts that make Old Town feel lived in.
const SHOPS = [
  { i: 24, j: 5, w: 2, d: 2, label: 'Bakery', color: '#F2A93B', icon: '🥐' },
  { i: 27, j: 5, w: 3, d: 2, label: 'Florist', color: '#F0587A', icon: '🌷' },
  { i: 31, j: 6, w: 2, d: 2, label: 'Books', color: '#2F6F8F', icon: '📖' },
  { i: 6, j: 25, w: 2, d: 2, label: 'Cottage', color: '#C98A1E', icon: '' },
];

export const NEIGHBOURS = [
  { name: 'Pip', species: 'bunny', outfit: 1, home: [16, 9], line: 'The lily pond is extra sparkly today.', wants: 'flowers' },
  { name: 'Marlow', species: 'bear', outfit: 3, home: [27, 9], line: 'I bake the honey buns at the bakery. Try one!', wants: 'berries' },
  { name: 'Juniper', species: 'fox', outfit: 0, home: [23, 20], line: 'I run the morning tram. Mind the doors!', wants: 'crafts' },
  { name: 'Biscuit', species: 'cat', outfit: 2, home: [19, 23], line: 'The fountain coins are wishes. Do not take them.', wants: 'fish' },
  { name: 'Nori', species: 'otter', outfit: 4, home: [34, 31], line: 'Gulls stole my sandwich again.', wants: 'fish' },
  { name: 'Wren', species: 'raccoon', outfit: 5, home: [30, 21], line: 'Have you seen the theatre posters? I drew them.', wants: 'flowers' },
  { name: 'Clover', species: 'sheep', outfit: 6, home: [8, 30], line: 'The windmill squeaks when it is about to rain.', wants: 'berries' },
  { name: 'Hazel', species: 'deer', outfit: 2, home: [14, 31], line: 'Fernhill has the best sunsets. Stay a while.', wants: 'crafts' },
  { name: 'Tumble', species: 'bear', outfit: 5, home: [11, 20], line: 'Library is open late tonight. Shh.', wants: 'berries' },
  { name: 'Sable', species: 'cat', outfit: 4, home: [31, 13], line: 'The market keeper owes me two apples.', wants: 'flowers' },
  { name: 'Dot', species: 'bunny', outfit: 6, home: [30, 33], line: 'I rode the Sunwheel eleven times today.', wants: 'crafts' },
  { name: 'Bramble', species: 'fox', outfit: 3, home: [7, 14], line: 'My garden peas are finally sprouting!', wants: 'fish' },
];

export function buildWorld() {
  const tiles = new Uint8Array(N * N);
  const blocked = new Uint8Array(N * N);
  const idx = (i, j) => j * N + i;
  const inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
  const get = (i, j) => (inb(i, j) ? tiles[idx(i, j)] : T.SEA);
  const set = (i, j, t) => { if (inb(i, j)) tiles[idx(i, j)] = t; };
  const c = (N - 1) / 2, R = 20.4;

  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = Math.abs(i - c) / R, dy = Math.abs(j - c) / R;
    const wob = Math.sin(i * 0.7 + 1) * 0.022 + Math.cos(j * 0.6) * 0.022;
    const d = Math.pow(dx ** 4 + dy ** 4, 0.25) + wob;
    set(i, j, d < 0.9 ? T.GRASS : d < 1 ? T.SAND : T.SEA);
  }
  // The quay inlet bites into the south-east of the island.
  for (let j = 27; j <= 33; j++) for (let i = 37; i < N; i++) set(i, j, T.SEA);
  for (let j = 28; j <= 32; j++) set(36, j, T.SEA);
  // Beaches wrap every shore.
  const shore = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (get(i, j) !== T.GRASS) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => get(i + a, j + b) === T.SEA)) shore.push([i, j]);
  }
  for (const [i, j] of shore) set(i, j, T.SAND);

  const r = rng(7);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (get(i, j) !== T.GRASS) continue;
    if (i >= 11 && i <= 20 && j >= 11 && j <= 20) set(i, j, T.PARK);
    else if (districtAt(i, j) === 'hills' && r() < 0.32) set(i, j, T.MEADOW);
  }
  for (let j = 14; j <= 17; j++) for (let i = 15; i <= 19; i++) if (!((i === 15 || i === 19) && (j === 14 || j === 17))) set(i, j, T.POND);

  // Avenues, ring lanes and the town square.
  const pave = (i, j) => { if (SOFT.has(get(i, j))) set(i, j, T.PATH); };
  for (let k = 0; k < N; k++) { pave(21, k); pave(22, k); pave(k, 21); pave(k, 22); }
  for (let k = 10; k <= 33; k++) { pave(10, k); pave(33, k); pave(k, 10); pave(k, 33); }
  for (let j = 19; j <= 24; j++) for (let i = 19; i <= 24; i++) set(i, j, T.PLAZA);
  // Boardwalk and pier.
  for (let j = 24; j <= 36; j++) if (get(34, j) !== T.SEA) set(34, j, T.DOCK);
  for (let i = 35; i <= 40; i++) set(i, 30, T.DOCK);
  for (let i = 35; i <= 36; i++) { set(i, 27, T.DOCK); set(i, 33, T.DOCK); }

  const objects = [];
  const footprint = (o, flag = 1) => { for (let j = o.j; j < o.j + o.d; j++) for (let i = o.i; i < o.i + o.w; i++) blocked[idx(i, j)] = flag; };

  const walkable = (i, j) => inb(i, j) && WALKABLE.has(tiles[idx(i, j)]) && !blocked[idx(i, j)];
  const isRoad = (i, j) => { const t = get(i, j); return t === T.PATH || t === T.PLAZA || t === T.DOCK; };
  function routeToRoad(si, sj) {
    const prev = new Map(), q = [[si, sj]], key = (i, j) => i + ',' + j;
    prev.set(key(si, sj), null);
    while (q.length) {
      const [i, j] = q.shift();
      if (isRoad(i, j)) {
        const route = []; let k = key(i, j);
        while (k) { route.push(k.split(',').map(Number)); k = prev.get(k); }
        return route;
      }
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + a, nj = j + b, nk = key(ni, nj);
        if (prev.has(nk) || !walkable(ni, nj)) continue;
        prev.set(nk, key(i, j)); q.push([ni, nj]);
      }
    }
    return null;
  }

  function place(o) {
    footprint(o);
    // Doors go on a face the camera can see (+i or +j); pick the one nearest a road.
    const faces = [
      { face: 'j', tile: [o.i + Math.floor((o.w - 1) / 2), o.j + o.d] },
      { face: 'i', tile: [o.i + o.w, o.j + Math.floor((o.d - 1) / 2)] },
    ];
    // Prefer the face with open ground in front of it so the door (and you, standing at it) stay visible.
    const clearance = f => { const [di, dj] = f.face === 'j' ? [0, 1] : [1, 0]; let n = 0; for (let k = 0; k < 3; k++) { const [a, b] = [f.tile[0] + di * k, f.tile[1] + dj * k]; if (!inb(a, b) || blocked[idx(a, b)] || get(a, b) === T.SEA) break; n++; } return n; };
    let best = null;
    for (const f of faces) {
      if (!walkable(...f.tile)) continue;
      const route = routeToRoad(...f.tile);
      if (!route) continue;
      const score = Math.min(clearance(f), 2) * 100 - route.length + (f.face === 'j' ? 1 : 0);
      if (!best || score > best.score) best = { ...f, route, score };
    }
    if (best) {
      o.door = best.face; o.doorTile = best.tile;
      for (const [i, j] of best.route) if (SOFT.has(get(i, j))) set(i, j, T.PATH);
    } else { o.door = 'j'; o.doorTile = faces[0].tile; }
    objects.push(o);
    return o;
  }

  const fountain = { kind: 'fountain', i: 21, j: 21, w: 2, d: 2 };
  footprint(fountain); objects.push(fountain);
  const clock = { kind: 'clock', i: 19, j: 19, w: 1, d: 1, name: 'Town Clock' }; footprint(clock); objects.push(clock);
  const board = { kind: 'board', i: 24, j: 23, w: 1, d: 1, name: 'Property board' }; footprint(board); objects.push(board);
  board.doorTile = [24, 24];
  for (const v of VENUES) place(Object.assign(v, { kind: 'venue' }));
  for (const h of HOMES) place(Object.assign(h, { kind: h.kind === 'apartment' ? 'apartment' : h.kind === 'villa' ? 'villa' : 'house', home: true }));
  for (const s of SHOPS) place(Object.assign(s, { kind: 'shop' }));
  const wheel = { kind: 'sunwheel', i: 31, j: 35, w: 2, d: 2, name: 'The Sunwheel' }; footprint(wheel); objects.push(wheel);
  const mill = { kind: 'windmill', i: 5, j: 30, w: 2, d: 2, name: 'Fernhill Windmill' }; footprint(mill); objects.push(mill);

  // Keep the space in front of every door clear of trees.
  const reserved = new Uint8Array(N * N);
  for (const o of objects) {
    for (let j = o.j - 1; j <= o.j + o.d + 1; j++) for (let i = o.i - 1; i <= o.i + o.w + 1; i++) if (inb(i, j)) reserved[idx(i, j)] = 1;
  }

  const decor = [];
  const rd = rng(42);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = get(i, j);
    if (blocked[idx(i, j)] || reserved[idx(i, j)]) continue;
    const dist = districtAt(i, j);
    const nearRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => isRoad(i + a, j + b));
    let treeChance = 0, kinds = ['round'];
    if (t === T.PARK) { treeChance = 0.26; kinds = ['round', 'round', 'blossom', 'willow']; }
    else if (t === T.GRASS || t === T.MEADOW) {
      if (dist === 'hills') { treeChance = t === T.MEADOW ? 0.08 : 0.42; kinds = ['pine', 'pine', 'round']; }
      else if (dist === 'park') { treeChance = 0.3; kinds = ['round', 'blossom', 'pine']; }
      else if (dist === 'downtown') { treeChance = 0.14; kinds = ['round', 'blossom']; }
      else { treeChance = 0.12; kinds = ['palm', 'round']; }
    } else if (t === T.SAND) { treeChance = 0.07; kinds = ['palm']; }
    if (nearRoad && t !== T.SAND) treeChance *= 0.45;
    const roll = rd();
    if (roll < treeChance) {
      const kind = kinds[Math.floor(rd() * kinds.length)];
      decor.push({ kind: 'tree', tree: kind, i, j, w: 1, d: 1, seed: Math.floor(rd() * 1000), ox: (rd() - 0.5) * 0.3, oy: (rd() - 0.5) * 0.3 });
      blocked[idx(i, j)] = 1;
    } else if ((t === T.PARK || t === T.MEADOW || t === T.GRASS) && rd() < (t === T.MEADOW ? 0.4 : 0.12)) {
      decor.push({ kind: rd() < 0.75 ? 'flowers' : 'bush', i, j, w: 1, d: 1, seed: Math.floor(rd() * 1000), ox: (rd() - 0.5) * 0.4, oy: (rd() - 0.5) * 0.4 });
    }
  }
  // Lamps along the avenues, benches by the pond and square.
  for (let k = 4; k < N - 4; k += 4) {
    for (const [i, j] of [[20, k], [23, k], [k, 20], [k, 23]]) {
      if (!walkable(i, j) || reserved[idx(i, j)] || get(i, j) === T.PLAZA) continue;
      decor.push({ kind: 'lamp', i, j, w: 1, d: 1, seed: k });
    }
  }
  for (const [i, j, f] of [[14, 15, 'i'], [17, 18, 'j'], [20, 14, 'j'], [19, 24, 'i'], [24, 20, 'j'], [13, 18, 'i']]) {
    if (walkable(i, j)) decor.push({ kind: 'bench', i, j, w: 1, d: 1, face: f });
  }

  // Boats float in the sea and the inlet.
  const boats = [];
  const rb = rng(9);
  const boatSpots = [[39, 28.6], [40, 31.6], [42, 29], [6, 2], [1.5, 20], [41, 10], [20, 42.5], [2, 37]];
  for (const [i, j] of boatSpots) if (get(Math.floor(i), Math.floor(j)) === T.SEA) boats.push({ kind: 'boat', x: i, y: j, seed: Math.floor(rb() * 100), sail: rb() < 0.6 });

  return {
    tiles, blocked, objects, decor, boats, idx, get, inb,
    walkable: (i, j) => walkable(i, j),
    isRoad,
  };
}

// A* over the tile grid with 8-way moves that never cut corners.
export function findPath(world, sx, sy, tx, ty) {
  const { idx } = world;
  const start = [Math.floor(sx), Math.floor(sy)];
  let goal = [Math.floor(tx), Math.floor(ty)];
  if (!world.walkable(...goal)) goal = nearestWalkable(world, ...goal);
  if (!goal) return null;
  if (!world.walkable(...start)) { const s = nearestWalkable(world, ...start); if (!s) return null; start[0] = s[0]; start[1] = s[1]; }
  const open = [[start[0], start[1]]], g = new Map(), f = new Map(), came = new Map();
  const k = (i, j) => idx(i, j);
  const h = (i, j) => { const dx = Math.abs(i - goal[0]), dy = Math.abs(j - goal[1]); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  g.set(k(...start), 0); f.set(k(...start), h(...start));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let guard = 0;
  while (open.length && guard++ < 6000) {
    let bi = 0;
    for (let n = 1; n < open.length; n++) if (f.get(k(...open[n])) < f.get(k(...open[bi]))) bi = n;
    const [ci, cj] = open.splice(bi, 1)[0];
    if (ci === goal[0] && cj === goal[1]) {
      const path = [[ci, cj]]; let cur = k(ci, cj);
      while (came.has(cur)) { cur = came.get(cur); path.unshift([cur % N, Math.floor(cur / N)]); }
      return path.map(([i, j]) => [i + 0.5, j + 0.5]);
    }
    for (const [a, b] of dirs) {
      const ni = ci + a, nj = cj + b;
      if (!world.walkable(ni, nj)) continue;
      if (a && b && (!world.walkable(ci + a, cj) || !world.walkable(ci, cj + b))) continue;
      const cost = g.get(k(ci, cj)) + (a && b ? 1.41 : 1);
      const nk = k(ni, nj);
      if (cost < (g.has(nk) ? g.get(nk) : Infinity)) {
        came.set(nk, k(ci, cj)); g.set(nk, cost); f.set(nk, cost + h(ni, nj));
        if (!open.some(([oi, oj]) => oi === ni && oj === nj)) open.push([ni, nj]);
      }
    }
  }
  return null;
}

export function nearestWalkable(world, i, j) {
  for (let r = 0; r < 8; r++) {
    let best = null, bd = Infinity;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (world.walkable(i + di, j + dj)) { const d = di * di + dj * dj; if (d < bd) { bd = d; best = [i + di, j + dj]; } }
    }
    if (best) return best;
  }
  return null;
}
