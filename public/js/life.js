// Everyday life on the island: what you can collect, grow and make, what neighbours ask for,
// the weather and seasons, and the three daily quests. Pure data and logic, so it's easy to test.

// ---------- items ----------
// cat: what kind of thing it is (for the bag, the collection book and the market). price: what the market pays.
export const ITEMS = {
  berries: { icon: '🫐', one: 'berry', many: 'berries', cat: 'food', price: 3 },
  fish: { icon: '🐟', one: 'fish', many: 'fish', cat: 'food', price: 5 },
  flowers: { icon: '🌼', one: 'flower', many: 'flowers', cat: 'nature', price: 2 },
  crafts: { icon: '🎁', one: 'keepsake', many: 'keepsakes', cat: 'made', price: 6 },
  wood: { icon: '🪵', one: 'stick', many: 'sticks', cat: 'material', price: 1 },
  stone: { icon: '🪨', one: 'stone', many: 'stones', cat: 'material', price: 1 },
  shell: { icon: '🐚', one: 'shell', many: 'shells', cat: 'material', price: 2 },
  feather: { icon: '🪶', one: 'feather', many: 'feathers', cat: 'material', price: 3 },
  // seeds
  seed_carrot: { icon: '🥕', one: 'carrot seed packet', many: 'carrot seed packets', cat: 'seed', crop: 'carrot', cost: 4 },
  seed_tulip: { icon: '🌷', one: 'tulip bulb', many: 'tulip bulbs', cat: 'seed', crop: 'tulip', cost: 4 },
  seed_tomato: { icon: '🍅', one: 'tomato seed packet', many: 'tomato seed packets', cat: 'seed', crop: 'tomato', cost: 6 },
  seed_sunflower: { icon: '🌻', one: 'sunflower seed packet', many: 'sunflower seed packets', cat: 'seed', crop: 'sunflower', cost: 6 },
  seed_strawberry: { icon: '🍓', one: 'strawberry seed packet', many: 'strawberry seed packets', cat: 'seed', crop: 'strawberry', cost: 9 },
  seed_pumpkin: { icon: '🎃', one: 'pumpkin seed packet', many: 'pumpkin seed packets', cat: 'seed', crop: 'pumpkin', cost: 12 },
  // crops
  carrot: { icon: '🥕', one: 'carrot', many: 'carrots', cat: 'crop', price: 6 },
  tulip: { icon: '🌷', one: 'tulip', many: 'tulips', cat: 'crop', price: 6 },
  tomato: { icon: '🍅', one: 'tomato', many: 'tomatoes', cat: 'crop', price: 8 },
  sunflower: { icon: '🌻', one: 'sunflower', many: 'sunflowers', cat: 'crop', price: 8 },
  strawberry: { icon: '🍓', one: 'strawberry', many: 'strawberries', cat: 'crop', price: 11 },
  pumpkin: { icon: '🎃', one: 'pumpkin', many: 'pumpkins', cat: 'crop', price: 18 },
  // bugs
  butterfly: { icon: '🦋', one: 'butterfly', many: 'butterflies', cat: 'bug', price: 6 },
  ladybug: { icon: '🐞', one: 'ladybug', many: 'ladybugs', cat: 'bug', price: 5 },
  bee: { icon: '🐝', one: 'bee', many: 'bees', cat: 'bug', price: 7 },
  beetle: { icon: '🪲', one: 'beetle', many: 'beetles', cat: 'bug', price: 8 },
  cricket: { icon: '🦗', one: 'cricket', many: 'crickets', cat: 'bug', price: 6 },
  firefly: { icon: '✨', one: 'firefly', many: 'fireflies', cat: 'bug', price: 10 },
  snail: { icon: '🐌', one: 'snail', many: 'snails', cat: 'bug', price: 5 },
  // things you make (gifts, treats and furniture for your home)
  bouquet: { icon: '💐', one: 'bouquet', many: 'bouquets', cat: 'made', price: 16 },
  jam: { icon: '🍯', one: 'jar of jam', many: 'jars of jam', cat: 'made', price: 20 },
  pie: { icon: '🥧', one: 'pie', many: 'pies', cat: 'made', price: 34 },
  salad: { icon: '🥗', one: 'salad', many: 'salads', cat: 'made', price: 22 },
  kite: { icon: '🪁', one: 'kite', many: 'kites', cat: 'made', price: 18 },
  necklace: { icon: '📿', one: 'shell necklace', many: 'shell necklaces', cat: 'made', price: 18 },
  plantpot: { icon: '🪴', one: 'potted plant', many: 'potted plants', cat: 'decor', price: 10 },
  lamp: { icon: '💡', one: 'lamp', many: 'lamps', cat: 'decor', price: 14 },
  stool: { icon: '🪑', one: 'stool', many: 'stools', cat: 'decor', price: 8 },
  bookstack: { icon: '📚', one: 'book pile', many: 'book piles', cat: 'decor', price: 10 },
  teddy: { icon: '🧸', one: 'teddy bear', many: 'teddy bears', cat: 'decor', price: 16 },
  aquarium: { icon: '🐠', one: 'fish tank', many: 'fish tanks', cat: 'decor', price: 30 },
  vase: { icon: '🏺', one: 'flower vase', many: 'flower vases', cat: 'decor', price: 14 },
  jackolantern: { icon: '🎃', one: 'pumpkin lantern', many: 'pumpkin lanterns', cat: 'decor', price: 24 },
  rug: { icon: '🟫', one: 'round rug', many: 'round rugs', cat: 'decor', price: 12 },
  shellchime: { icon: '🎐', one: 'shell wind chime', many: 'shell wind chimes', cat: 'decor', price: 14 },
  cot: { icon: '👶', one: 'baby cot', many: 'baby cots', cat: 'decor', price: 22 },
  beanbag: { icon: '🫘', one: 'beanbag', many: 'beanbags', cat: 'decor', price: 12 },
  piano: { icon: '🎹', one: 'piano', many: 'pianos', cat: 'decor', price: 60 },
  fireplace: { icon: '🔥', one: 'fireplace', many: 'fireplaces', cat: 'decor', price: 45 },
  grandclock: { icon: '🕰️', one: 'grandfather clock', many: 'grandfather clocks', cat: 'decor', price: 35 },
  toybox: { icon: '🧩', one: 'toy box', many: 'toy boxes', cat: 'decor', price: 14 },
  tallshelf: { icon: '📖', one: 'bookcase', many: 'bookcases', cat: 'decor', price: 24 },
  cosychair: { icon: '🛋️', one: 'cosy chair', many: 'cosy chairs', cat: 'decor', price: 20 },
  sidetable: { icon: '☕', one: 'side table', many: 'side tables', cat: 'decor', price: 12 },
  easel: { icon: '🎨', one: 'painting easel', many: 'painting easels', cat: 'decor', price: 18 },
};
export const itemName = (k, n) => (n === 1 ? ITEMS[k].one : ITEMS[k].many);
export const CATS = { crop: 'Crops', bug: 'Bugs', fish: 'Fish', material: 'Materials', nature: 'Nature', made: 'Made by you', decor: 'Furniture', food: 'Food', seed: 'Seeds' };
export const sellable = k => ITEMS[k] && ITEMS[k].price && ITEMS[k].cat !== 'seed';

// ---------- crops ----------
// grow: game minutes of watered time to be ready. yield: how many you pick.
export const CROPS = {
  tulip: { grow: 360, yield: [2, 3], season: [0], color: '#F0587A' },
  carrot: { grow: 480, yield: [2, 4], color: '#F28C28' },
  sunflower: { grow: 600, yield: [1, 2], season: [1], color: '#FFC83D' },
  tomato: { grow: 720, yield: [2, 4], season: [1], color: '#E8333B' },
  strawberry: { grow: 900, yield: [2, 3], season: [0, 1], color: '#E8333B' },
  pumpkin: { grow: 1440, yield: [1, 2], season: [2], color: '#F28C28' },
};
// A plot: { crop, grown (minutes of watered growth), wetUntil (game minute), at (last tick) }
export function growPlot(plot, now, raining = false) {
  if (!plot || !plot.crop) return plot;
  const from = plot.at ?? now;
  if (raining) plot.wetUntil = Math.max(plot.wetUntil || 0, now + 120);
  const wetEnd = Math.min(now, plot.wetUntil || 0);
  if (wetEnd > from) plot.grown = Math.min(CROPS[plot.crop].grow, (plot.grown || 0) + (wetEnd - from));
  plot.at = now;
  return plot;
}
export const plotStage = p => (!p || !p.crop ? 'empty' : p.grown >= CROPS[p.crop].grow ? 'ready' : p.grown > CROPS[p.crop].grow * 0.5 ? 'growing' : p.grown > 0 ? 'sprout' : 'seed');
export const plotWet = (p, now) => !!p && (p.wetUntil || 0) > now;
// in-season crops grow a little faster (a bonus on the harvest instead, so it stays simple)
export const harvestCount = (p, season, rnd = Math.random) => { const c = CROPS[p.crop]; const n = c.yield[0] + Math.floor(rnd() * (c.yield[1] - c.yield[0] + 1)); return n + (c.season && c.season.includes(season) ? 1 : 0); };

// ---------- crafting ----------
// teach: a neighbour who teaches the recipe once you're friends (3 hearts). skill: who gets XP.
export const RECIPES = [
  { id: 'bouquet', needs: { flowers: 3, tulip: 1 }, skill: 'creativity' },
  { id: 'plantpot', needs: { stone: 2, flowers: 1 }, skill: 'creativity' },
  { id: 'stool', needs: { wood: 4 }, skill: 'creativity' },
  { id: 'kite', needs: { wood: 2, feather: 2 }, skill: 'creativity', teach: 'Dot' },
  { id: 'necklace', needs: { shell: 4 }, skill: 'creativity', teach: 'Nori' },
  { id: 'shellchime', needs: { shell: 3, wood: 1 }, skill: 'creativity', teach: 'Hazel' },
  { id: 'jam', needs: { strawberry: 2, berries: 2 }, skill: 'cooking', teach: 'Marlow' },
  { id: 'salad', needs: { tomato: 2, carrot: 1 }, skill: 'cooking' },
  { id: 'pie', needs: { pumpkin: 1, berries: 2 }, skill: 'cooking', teach: 'Biscuit' },
  { id: 'lamp', needs: { wood: 3, firefly: 1 }, skill: 'creativity', teach: 'Wren' },
  { id: 'bookstack', needs: { wood: 2, crafts: 1 }, skill: 'logic', teach: 'Tumble' },
  { id: 'teddy', needs: { crafts: 2, flowers: 2 }, skill: 'creativity', teach: 'Clover' },
  { id: 'vase', needs: { stone: 3, sunflower: 1 }, skill: 'creativity' },
  { id: 'aquarium', needs: { stone: 4, fish: 2, shell: 2 }, skill: 'logic', teach: 'Sable' },
  { id: 'jackolantern', needs: { pumpkin: 1, firefly: 1 }, skill: 'creativity', teach: 'Bramble' },
  { id: 'rug', needs: { flowers: 2, crafts: 1, wood: 1 }, skill: 'creativity', teach: 'Pip' },
];
export const canCraft = (r, inv) => Object.entries(r.needs).every(([k, n]) => (inv[k] || 0) >= n);
export function craft(r, inv) { if (!canCraft(r, inv)) return false; for (const [k, n] of Object.entries(r.needs)) inv[k] -= n; inv[r.id] = (inv[r.id] || 0) + 1; return true; }
export const recipeKnown = (r, friends) => !r.teach || ((friends[r.teach] || {}).hearts || 0) >= 3;

// ---------- gathering ----------
// Where things turn up: sand, grass by trees, grass in the open. Bugs move about; fireflies only come out at night.
export const PICKUPS = {
  sand: [['shell', 6], ['stone', 2], ['feather', 1]],
  tree: [['wood', 6], ['feather', 1], ['snail', 1]],
  grass: [['flowers', 4], ['stone', 3], ['wood', 2]],
};
export const BUGS = { day: [['butterfly', 5], ['ladybug', 4], ['bee', 3], ['beetle', 2], ['cricket', 2], ['snail', 1]], night: [['firefly', 5], ['cricket', 3], ['beetle', 2]] };
export function pickWeighted(list, rnd = Math.random) { let r = rnd() * list.reduce((a, [, w]) => a + w, 0); for (const [k, w] of list) { r -= w; if (r <= 0) return k; } return list[0][0]; }
export function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- weather & seasons ----------
export const SEASONS = [
  { name: 'Spring', icon: '🌸' }, { name: 'Summer', icon: '☀️' }, { name: 'Autumn', icon: '🍂' }, { name: 'Winter', icon: '❄️' },
];
export const seasonOf = day => Math.floor((Math.max(1, day) - 1) / 7) % 4;
// A well-mixed hash so neighbouring days don't get look-alike weather (the plain generator's first
// value barely changes from one day to the next, which made the first days of every game rainy).
export function hash32(n) {
  let x = (n | 0) ^ 0x9E3779B9;
  x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B); x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function rawWeather(day) {
  const r = hash32(day * 7919 + 17), s = seasonOf(day);
  if (s === 3) return r < 0.3 ? 'snow' : r < 0.55 ? 'cloudy' : 'sunny';
  if (r < (s === 0 ? 0.24 : s === 2 ? 0.22 : 0.14)) return 'rain';
  return r < 0.5 ? 'cloudy' : 'sunny';
}
// The same day always has the same weather. A new game starts with two sunny days, and rain or snow
// never lasts more than two days in a row.
export function weatherOf(day) {
  if (day <= 2) return 'sunny';
  const w = rawWeather(day);
  if ((w === 'rain' || w === 'snow') && rawWeather(day - 1) === w && rawWeather(day - 2) === w) return 'cloudy';
  return w;
}
// Rain and snow come in a spell of a few hours; the rest of that day is cloudy.
export function showerOf(day) {
  const h = hash32(day * 104729 + 3);
  const start = (6 + Math.floor(h * 11)) * 60, length = (3 + Math.floor(hash32(day * 31 + 7) * 4)) * 60;
  return { start, end: start + length };
}
export function weatherAt(day, minute) {
  const w = weatherOf(day);
  if (w !== 'rain' && w !== 'snow') return w;
  const { start, end } = showerOf(day), m = ((minute % 1440) + 1440) % 1440;
  return m >= start && m < end ? w : 'cloudy';
}
export const WEATHER = { sunny: { icon: '☀️', name: 'Sunny' }, cloudy: { icon: '⛅', name: 'Cloudy' }, rain: { icon: '🌧️', name: 'Rainy' }, snow: { icon: '🌨️', name: 'Snowy' } };

// ---------- neighbour requests ----------
const ASKS = [['carrot', 2], ['tulip', 2], ['tomato', 2], ['sunflower', 1], ['strawberry', 2], ['shell', 3], ['wood', 4], ['stone', 3], ['flowers', 3], ['fish', 1], ['butterfly', 1], ['ladybug', 1], ['bouquet', 1], ['jam', 1], ['kite', 1], ['necklace', 1], ['berries', 3], ['feather', 2]];
// About a third of neighbours want something each day. Same answer all day.
export function requestFor(name, day) {
  let h = day * 31; for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const r = seeded(h);
  if (r() > 0.36) return null;
  const [item, n] = ASKS[Math.floor(r() * ASKS.length)];
  const value = (ITEMS[item].price || 4) * n;
  return { item, n, coins: Math.round(value * 1.6 + 6) };
}

// ---------- daily quests ----------
export const QUESTS = [
  { id: 'harvest', text: 'Harvest a crop', stat: 'harvests', n: 1 },
  { id: 'water', text: 'Water your garden', stat: 'waters', n: 1 },
  { id: 'bug', text: 'Catch 2 bugs', stat: 'bugs', n: 2 },
  { id: 'gather', text: 'Gather 5 things outdoors', stat: 'gathers', n: 5 },
  { id: 'craft', text: 'Make something at a workbench', stat: 'crafted', n: 1 },
  { id: 'deliver', text: 'Help a neighbour with a request', stat: 'delivered', n: 1 },
  { id: 'fish', text: 'Catch a fish from a boat', stat: 'fish', n: 1 },
  { id: 'meal', text: 'Cook a meal', stat: 'meals', n: 1 },
  { id: 'hello', text: 'Say hello to 3 neighbours', stat: 'hellos', n: 3 },
  { id: 'game', text: 'Play an arcade game', stat: 'games', n: 1 },
  { id: 'sell', text: 'Sell something at a market', stat: 'sold', n: 1 },
  { id: 'place', text: 'Visit 2 different places', stat: 'visits', n: 2 },
];
export function questsFor(day) {
  const r = seeded(day * 7919 + 11), pool = QUESTS.slice(), out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

// ---------- the Old Garden (a Willowvale community project) ----------
export const RESTORE = [
  { title: 'Clear the weeds', needs: { wood: 6, stone: 4 }, text: 'Clear the brambles and stack the old stones.' },
  { title: 'Lay the paths', needs: { stone: 10, shell: 4 }, text: 'Pave winding paths and edge them with shells.' },
  { title: 'Plant the beds', needs: { flowers: 8, tulip: 3, sunflower: 2 }, text: 'Fill the beds with flowers so butterflies come back.' },
  { title: 'Build the gazebo', needs: { wood: 12, crafts: 2, firefly: 1 }, text: 'Raise a little gazebo with a firefly lamp.' },
];
