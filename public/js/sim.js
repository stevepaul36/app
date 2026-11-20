// Life-sim rules: needs, the clock and what every object lets you do.

export const NEEDS = [
  { k: 'hunger', label: 'Hunger', icon: '🍽️', decay: 5.5, low: 'You’re getting hungry.', fix: 'Fridge or stove at home, or the café.' },
  { k: 'energy', label: 'Energy', icon: '⚡', decay: 4.2, low: 'You’re feeling sleepy.', fix: 'Sleep in your bed or nap on the sofa.' },
  { k: 'fun', label: 'Fun', icon: '🎈', decay: 4.6, low: 'You’re bored.', fix: 'TV, computer, radio, the theatre or the Sunwheel.' },
  { k: 'social', label: 'Social', icon: '💬', decay: 3.6, low: 'You’re feeling lonely.', fix: 'Chat with a neighbour in town.' },
  { k: 'hygiene', label: 'Hygiene', icon: '🫧', decay: 3.2, low: 'You could use a wash.', fix: 'Shower or sink at home.' },
  { k: 'comfort', label: 'Comfort', icon: '🛋️', decay: 3.8, low: 'Your paws are tired.', fix: 'Sit on the sofa, an armchair or a bench.' },
];
export const freshNeeds = () => ({ hunger: 62, energy: 80, fun: 55, social: 50, hygiene: 75, comfort: 70 });

// Average of all needs, weighted toward whichever is lowest, like a mood.
export function mood(n) {
  const vals = NEEDS.map(x => n[x.k]), avg = vals.reduce((a, b) => a + b, 0) / vals.length, min = Math.min(...vals);
  return Math.round(avg * 0.6 + min * 0.4);
}
export function moodLabel(m) { return m >= 75 ? 'Great' : m >= 55 ? 'Good' : m >= 35 ? 'Okay' : m >= 18 ? 'Uncomfortable' : 'Miserable'; }
export function moodColor(m) { return m >= 75 ? '#3FA86A' : m >= 55 ? '#8BC34A' : m >= 35 ? '#FFC83D' : m >= 18 ? '#F2A93B' : '#F0587A'; }
export function needColor(v) { return v >= 60 ? '#3FA86A' : v >= 35 ? '#FFC83D' : '#F0587A'; }

// Game clock: minutes since day 1, 00:00. At 1x, two game minutes pass every real second.
export const SPEEDS = [1, 2, 3];
export const GAME_MIN_PER_SEC = 2;
export const clockText = m => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${(h + 11) % 12 + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
export const dayOf = m => Math.floor(m / 1440) + 1;
export const hourOf = m => (m / 60) % 24;

// Light over the scene by time of day: [r, g, b, alpha]
export function skyTint(hour) {
  const stops = [[0, [24, 34, 80, 0.42]], [5, [24, 34, 80, 0.4]], [6.5, [255, 160, 140, 0.16]], [8, [255, 230, 190, 0.0]], [16.5, [255, 230, 190, 0.0]], [18.5, [255, 150, 70, 0.16]], [20, [70, 60, 140, 0.28]], [21.5, [24, 34, 80, 0.4]], [24, [24, 34, 80, 0.42]]];
  for (let k = 0; k < stops.length - 1; k++) {
    const [h0, a] = stops[k], [h1, b] = stops[k + 1];
    if (hour >= h0 && hour <= h1) { const t = (hour - h0) / (h1 - h0); return a.map((v, q) => v + (b[q] - v) * t); }
  }
  return [0, 0, 0, 0];
}
export const isNight = hour => hour >= 20.5 || hour < 6;

// What each kind of thing offers. mins are game minutes; gain is spread across the action.
// steps let one choice use several objects (cook at the stove, then eat at the table).
export const ACTIONS = {
  bed: [
    { id: 'sleep', label: 'Sleep', icon: '😴', mins: 420, pose: 'sleep', outfit: 'sleep', blanket: '#7FB8E6', loop: 'snore', start: 'yawn', stat: 'sleeps', gain: { energy: 95, comfort: 30 }, slow: { hunger: 0.4, fun: 0.3, social: 0.3, hygiene: 0.5 }, fast: 10, emotes: ['💤', '🌙', '💭'] },
    { id: 'nap', label: 'Nap', icon: '🛌', mins: 90, pose: 'sleep', blanket: '#7FB8E6', loop: 'snore', start: 'yawn', gain: { energy: 28, comfort: 15 }, fast: 4, emotes: ['💤'] },
  ],
  bookshelf: [{ id: 'read', label: 'Read a book', icon: '📖', stat: 'reads', steps: [
    { obj: 'bookshelf', mins: 3, pose: 'stand', arms: 'hold', emotes: ['🔎'] },
    { obj: 'armchair', mins: 45, pose: 'sit', arms: 'read', prop: 'book', tick: 'page', skill: 'logic', gain: { fun: 32, comfort: 10 }, emotes: ['📖', '🤔', '😮'] },
  ] }],
  shower: [{ id: 'shower', label: 'Take a shower', icon: '🚿', mins: 20, pose: 'shower', outfit: 'towel', arms: 'scrub', prop: 'sponge', loop: 'water', faceFront: true, after: 'shake', stat: 'showers', gain: { hygiene: 90, comfort: 8 }, emotes: ['🫧', '🎵', '🎶'] }],
  wardrobe: [{ id: 'dress', label: 'Change outfit', icon: '👗', special: 'wardrobe' }],
  sink: [
    { id: 'wash', label: 'Wash up', icon: '🧼', mins: 8, pose: 'stand', arms: 'scrub', prop: 'sponge', loop: 'water', gain: { hygiene: 25 }, emotes: ['🫧'] },
    { id: 'mirror', label: 'Practise a speech', icon: '🪞', mins: 15, pose: 'stand', skill: 'charisma', gain: { social: 10, fun: 4 }, emotes: ['💬', '😄'] },
  ],
  fridge: [
    { id: 'snack', label: 'Grab a snack', icon: '🥪', steps: [
      { obj: 'fridge', mins: 3, pose: 'stand', arms: 'hold', emotes: ['🥪'] },
      { obj: 'chair', mins: 12, pose: 'sit', arms: 'eat', prop: 'fork', gain: { hunger: 30 }, emotes: ['🥪', '😋'] },
    ] },
    { id: 'cook', label: 'Cook a meal', icon: '🍳', stat: 'meals', steps: [
      { obj: 'fridge', mins: 5, pose: 'stand', arms: 'hold', emotes: ['🥕'] },
      { obj: 'counter', mins: 10, pose: 'stand', arms: 'chop', prop: 'knife', tick: 'chop', skill: 'cooking', emotes: ['🔪', '🥕'] },
      { obj: 'stove', mins: 25, pose: 'stand', arms: 'stir', prop: 'bowl', loop: 'sizzle', skill: 'cooking', burnable: true, gain: { fun: 5 }, emotes: ['🍳', '🔥', '🍳'] },
      { obj: 'chair', mins: 25, pose: 'sit', arms: 'eat', prop: 'fork', meal: true, gain: { hunger: 78, comfort: 10 }, emotes: ['🍲', '😋'] },
    ] },
  ],
  stove: [{ ref: 'fridge', id: 'cook' }],
  table: [{ ref: 'fridge', id: 'cook' }],
  chair: [{ id: 'sit', label: 'Sit down', icon: '🪑', mins: 20, pose: 'sit', gain: { comfort: 25 }, emotes: ['😌'] }],
  radio: [{ id: 'dance', label: 'Dance to the radio', icon: '💃', mins: 30, pose: 'dance', stat: 'dances', skill: 'fitness', gain: { fun: 36, social: 4 }, cost: { energy: 8, hygiene: 6 }, emotes: ['🎵', '🎶', '✨'] }],
  tv: [{ ref: 'sofa', id: 'tv' }],
  sofa: [
    { id: 'tv', label: 'Watch TV', icon: '📺', mins: 60, pose: 'sit', arms: 'remote', prop: 'remote', loop: 'tv', stat: 'tv', gain: { fun: 50, comfort: 25 }, emotes: ['📺', '😂', '😮', '🍿'], tv: true },
    { id: 'sit', label: 'Sit and relax', icon: '🛋️', mins: 30, pose: 'sit', gain: { comfort: 45 }, emotes: ['😌'] },
    { id: 'nap', label: 'Nap', icon: '💤', mins: 90, pose: 'sleep', blanket: '#F7B6C6', loop: 'snore', start: 'yawn', gain: { energy: 24, comfort: 20 }, fast: 4, emotes: ['💤'] },
  ],
  armchair: [
    { id: 'sit', label: 'Sit and relax', icon: '🛋️', mins: 30, pose: 'sit', gain: { comfort: 40 }, emotes: ['😌', '☕'] },
    { ref: 'bookshelf', id: 'read' },
  ],
  desk: [
    { id: 'games', label: 'Play computer games', icon: '🎮', mins: 60, pose: 'sit', arms: 'type', tick: 'type', skill: 'logic', gain: { fun: 55 }, cost: { comfort: 4 }, emotes: ['🎮', '😆', '🏆'] },
    { id: 'chat', label: 'Video call a friend', icon: '💻', mins: 40, pose: 'sit', arms: 'type', tick: 'type', skill: 'charisma', gain: { social: 28 }, emotes: ['💬', '😊', '👋'] },
  ],
  plant: [{ id: 'water', label: 'Water the plant', icon: '🪴', mins: 5, pose: 'stand', gain: { fun: 4 }, emotes: ['💧'] }],
  door: [{ id: 'leave', label: 'Go to town', icon: '🏘️', special: 'leave' }],
  mailbox: [{ id: 'mail', label: 'Check the mail', icon: '✉️', mins: 3, pose: 'stand', gain: { fun: 3 }, emotes: ['✉️'], special: 'mail' }],

  // Town
  myhome: [{ id: 'enter', label: 'Go inside', icon: '🏡', special: 'enter' }],
  bench: [{ id: 'sit', label: 'Sit for a while', icon: '🪑', mins: 25, pose: 'sit', gain: { comfort: 32, fun: 4 }, emotes: ['☀️', '😌'] }],
  fountain: [{ id: 'wish', label: 'Toss a coin & wish', icon: '🪙', mins: 5, pose: 'stand', gain: { fun: 12 }, coins: -1, emotes: ['✨'] }],
  cafe: [
    { id: 'eat', label: 'Eat a pastry', icon: '🥐', mins: 25, pose: 'inside', gain: { hunger: 48, social: 8 }, coins: -6, emotes: ['🥐', '😋'] },
    { id: 'tea', label: 'Have tea', icon: '🍵', mins: 20, pose: 'inside', gain: { energy: 12, fun: 8, social: 6 }, coins: -3, emotes: ['🍵'] },
  ],
  market: [{ id: 'browse', label: 'Browse the stalls', icon: '🧺', mins: 25, pose: 'inside', gain: { fun: 14, social: 6 }, emotes: ['🍎', '🧺'] }],
  community: [{ id: 'craft', label: 'Join a workshop', icon: '🎨', mins: 45, pose: 'inside', skill: 'creativity', gain: { fun: 30, social: 18 }, emotes: ['🎨', '✂️'] }],
  theatre: [{ id: 'show', label: 'Watch a show', icon: '🎭', mins: 90, pose: 'inside', skill: 'creativity', gain: { fun: 70, social: 10 }, coins: -8, fast: 3, emotes: ['🎭', '👏', '😂'] }],
  library: [{ id: 'read', label: 'Read quietly', icon: '📚', mins: 45, pose: 'inside', skill: 'logic', gain: { fun: 30, comfort: 10 }, emotes: ['📚', '🤓'] }],
  station: [{ id: 'work', label: 'Work a shift', icon: '💼', career: 'tram', mins: 240, pose: 'inside', stat: 'works', job: true, gain: {}, cost: { energy: 22, fun: 18, hygiene: 10 }, fast: 8, emotes: ['💼', '🚋'] }],
  marina: [{ id: 'fish', label: 'Go fishing', icon: '🎣', mins: 40, pose: 'stand', stat: 'fish', arms: 'hold', gain: { fun: 26, comfort: 6 }, emotes: ['🎣', '🌊', '🐟'] }],
  clinic: [{ id: 'freshen', label: 'Freshen up', icon: '🧼', mins: 15, pose: 'inside', gain: { hygiene: 45, comfort: 10 }, emotes: ['🧼'] }],
  sunwheel: [{ id: 'ride', label: 'Ride the Sunwheel', icon: '🎡', mins: 20, pose: 'inside', stat: 'rides', gain: { fun: 34 }, coins: -2, emotes: ['🎡', '😆'] }],
  windmill: [{ id: 'admire', label: 'Admire the view', icon: '🌾', mins: 10, pose: 'stand', gain: { fun: 8, comfort: 6 }, emotes: ['😊'] }],
  // The island road and the new towns
  busstop: [{ id: 'travel', label: 'Take the island bus', icon: '🚌', special: 'travel' }],
  admire: [{ id: 'admire', label: 'Admire it', icon: '😍', mins: 10, pose: 'stand', gain: { fun: 10, comfort: 6 }, emotes: ['😍', '✨', '📸'] }],
  bandstand: [{ id: 'show', label: 'Listen to the band', icon: '🎺', mins: 30, pose: 'stand', gain: { fun: 28, social: 8 }, emotes: ['🎺', '🎶', '👏'] }],
  bigtree: [
    { id: 'sit', label: 'Picnic under the blossoms', icon: '🧺', mins: 30, pose: 'stand', gain: { comfort: 24, fun: 16, hunger: 10 }, emotes: ['🌸', '🍙', '😌'] },
    { id: 'admire', label: 'Catch falling petals', icon: '🌸', mins: 10, pose: 'stand', gain: { fun: 14 }, emotes: ['🌸', '😆'] },
  ],
  rangoli: [{ id: 'craft', label: 'Draw a rangoli', icon: '🌺', mins: 30, pose: 'stand', skill: 'creativity', stat: 'rangoli', gain: { fun: 28, social: 6 }, emotes: ['🌺', '🎨', '✨'] }],
  school: [
    { id: 'read', label: 'Study in the library', icon: '📖', mins: 45, pose: 'inside', skill: 'logic', stat: 'reads', gain: { fun: 16, social: 8 }, emotes: ['📖', '✏️'] },
    { id: 'work', label: 'Work a shift', icon: '🍎', career: 'teacher', job: true, mins: 240, pose: 'inside', stat: 'works', skill: 'charisma', gain: { social: 20 }, cost: { energy: 22, fun: 12, hygiene: 8 }, fast: 8, emotes: ['🍎', '✏️', '🔔'] },
  ],
  track: [{ id: 'jog', label: 'Go for a jog', icon: '🏃', mins: 30, pose: 'jog', skill: 'fitness', stat: 'jogs', gain: { fun: 18 }, cost: { energy: 12, hygiene: 14 }, emotes: ['🏃', '💦', '💪'] }],
  pool: [{ id: 'swim', label: 'Go for a swim', icon: '🏊', mins: 30, pose: 'inside', skill: 'fitness', stat: 'swims', gain: { fun: 30, hygiene: 20 }, cost: { energy: 10 }, coins: -2, emotes: ['🏊', '💦', '😆'] }],
  cornershop: [{ id: 'eat', label: 'Buy a snack', icon: '🍪', mins: 10, pose: 'inside', gain: { hunger: 28, fun: 4 }, coins: -3, emotes: ['🍪', '😋'] }],
  office: [
    { id: 'games', label: 'Test new games', icon: '🎮', mins: 40, pose: 'inside', skill: 'logic', gain: { fun: 40 }, emotes: ['🎮', '🤔', '🏆'] },
    { id: 'work', label: 'Work a shift', icon: '💻', career: 'tech', job: true, mins: 240, pose: 'inside', stat: 'works', skill: 'logic', gain: {}, cost: { energy: 24, fun: 14, comfort: 8 }, fast: 8, emotes: ['💻', '⌨️', '🚀'] },
  ],
  arcade: [{ id: 'ride', label: 'Play arcade games', icon: '🕹️', mins: 40, pose: 'inside', skill: 'logic', stat: 'arcade', gain: { fun: 50 }, coins: -4, emotes: ['🕹️', '😆', '🏆'] }],
  mall: [
    { id: 'browse', label: 'Window shopping', icon: '🛍️', mins: 30, pose: 'inside', gain: { fun: 20, social: 10 }, emotes: ['🛍️', '👀'] },
    { id: 'eat', label: 'Food court lunch', icon: '🍔', mins: 25, pose: 'inside', gain: { hunger: 55, social: 6 }, coins: -6, emotes: ['🍔', '😋'] },
  ],
  cinema: [{ id: 'show', label: 'Watch a movie', icon: '🎬', mins: 90, pose: 'inside', stat: 'movies', gain: { fun: 68, comfort: 12 }, coins: -7, fast: 3, emotes: ['🎬', '🍿', '😂', '😮'] }],
  monorail: [{ id: 'ride', label: 'Ride the monorail', icon: '🚝', mins: 20, pose: 'inside', stat: 'rides', gain: { fun: 32 }, coins: -2, emotes: ['🚝', '😆', '🏙️'] }],
  gym: [{ id: 'workout', label: 'Work out', icon: '🏋️', mins: 40, pose: 'inside', skill: 'fitness', gain: { fun: 14, comfort: 6 }, cost: { energy: 16, hygiene: 18 }, emotes: ['🏋️', '💪', '💦'] }],
  observatory: [{ id: 'read', label: 'Stargaze', icon: '🔭', mins: 45, pose: 'inside', skill: 'logic', stat: 'reads', gain: { fun: 32, comfort: 8 }, emotes: ['🔭', '⭐', '🪐'] }],
  lab: [
    { id: 'experiment', label: 'Try an experiment', icon: '🧪', mins: 40, pose: 'inside', skill: 'logic', gain: { fun: 34 }, emotes: ['🧪', '💥', '🤓'] },
    { id: 'work', label: 'Work a shift', icon: '🔬', career: 'science', job: true, mins: 240, pose: 'inside', stat: 'works', skill: 'logic', gain: {}, cost: { energy: 22, fun: 12, hygiene: 10 }, fast: 8, emotes: ['🔬', '🧪', '💡'] },
  ],
  museum: [{ id: 'read', label: 'Explore the exhibits', icon: '🤖', mins: 45, pose: 'inside', skill: 'logic', stat: 'reads', gain: { fun: 36, social: 6 }, coins: -2, emotes: ['🤖', '🦖', '🪐'] }],
  greenhouse: [{ id: 'sit', label: 'Tend the plants', icon: '🌿', mins: 30, pose: 'inside', skill: 'creativity', gain: { comfort: 26, fun: 14 }, emotes: ['🌿', '🌵', '💧'] }],
  teahouse: [
    { id: 'tea', label: 'Sip jasmine tea', icon: '🍵', mins: 20, pose: 'inside', gain: { energy: 14, fun: 8, social: 8 }, coins: -3, emotes: ['🍵', '😌'] },
    { id: 'eat', label: 'Share dim sum', icon: '🥟', mins: 30, pose: 'inside', gain: { hunger: 56, social: 12 }, coins: -6, emotes: ['🥟', '😋'] },
  ],
  noodles: [{ id: 'eat', label: 'Slurp noodles', icon: '🍜', mins: 25, pose: 'inside', gain: { hunger: 58 }, coins: -5, emotes: ['🍜', '😋'] }],
  kitchen: [
    { id: 'cookclass', label: 'Dumpling class', icon: '🥟', mins: 40, pose: 'inside', skill: 'cooking', gain: { fun: 22, hunger: 20, social: 10 }, coins: -4, emotes: ['🥟', '👩‍🍳'] },
    { id: 'work', label: 'Work a shift', icon: '🥟', career: 'chef', job: true, mins: 240, pose: 'inside', stat: 'works', skill: 'cooking', gain: { hunger: 10 }, cost: { energy: 22, fun: 12, hygiene: 14 }, fast: 8, emotes: ['🥟', '🔥', '🍳'] },
  ],
  pagoda: [{ id: 'admire', label: 'Climb for the view', icon: '🏯', mins: 15, pose: 'inside', gain: { fun: 18, comfort: 8 }, cost: { energy: 4 }, emotes: ['🏯', '😍'] }],
  nightmarket: [
    { id: 'browse', label: 'Browse the stalls', icon: '🧧', mins: 25, pose: 'stand', gain: { fun: 18, social: 8 }, emotes: ['🧧', '🪁', '🎎'] },
    { id: 'eat', label: 'Grab a bao bun', icon: '🥟', mins: 10, pose: 'stand', gain: { hunger: 30 }, coins: -3, emotes: ['🥟', '😋'] },
  ],
  garden: [
    { id: 'sit', label: 'Rest in the garden', icon: '🌳', mins: 30, pose: 'stand', gain: { comfort: 34, fun: 6 }, emotes: ['😌', '🦋', '🌸'] },
    { id: 'wish', label: 'Make a wish', icon: '🪙', mins: 5, pose: 'stand', gain: { fun: 12 }, coins: -1, emotes: ['✨'] },
  ],
  shrinegarden: [
    { id: 'wish', label: 'Ring the bell & wish', icon: '🔔', mins: 5, pose: 'stand', gain: { fun: 12, comfort: 6 }, coins: -1, emotes: ['🔔', '✨'] },
    { id: 'sit', label: 'Walk the garden', icon: '🍃', mins: 25, pose: 'stand', gain: { comfort: 32, fun: 6 }, emotes: ['🍃', '🌸', '😌'] },
  ],
  onsen: [{ id: 'freshen', label: 'Soak in the hot spring', icon: '♨️', mins: 40, pose: 'inside', stat: 'soaks', gain: { hygiene: 70, comfort: 34, energy: 10 }, coins: -4, emotes: ['♨️', '😌', '🫧'] }],
  ramen: [
    { id: 'eat', label: 'Eat ramen', icon: '🍜', mins: 25, pose: 'inside', gain: { hunger: 62 }, coins: -5, emotes: ['🍜', '😋'] },
    { id: 'work', label: 'Work a shift', icon: '🍥', career: 'ramen', job: true, mins: 240, pose: 'inside', stat: 'works', skill: 'cooking', gain: { hunger: 10 }, cost: { energy: 22, fun: 12, hygiene: 14 }, fast: 8, emotes: ['🍜', '🥢', '🔥'] },
  ],
  dojo: [{ id: 'workout', label: 'Practise at the dojo', icon: '🥋', mins: 40, pose: 'inside', skill: 'fitness', gain: { fun: 20, comfort: 4 }, cost: { energy: 14, hygiene: 12 }, emotes: ['🥋', '💪', '🙇'] }],
  koi: [{ id: 'fish', label: 'Feed the koi', icon: '🎏', mins: 15, pose: 'stand', gain: { fun: 18, comfort: 10 }, emotes: ['🎏', '🐟', '😊'] }],
  bazaar: [
    { id: 'browse', label: 'Browse the bazaar', icon: '🧺', mins: 30, pose: 'stand', gain: { fun: 22, social: 10 }, emotes: ['🧺', '🌶️', '🪁'] },
    { id: 'work', label: 'Work a shift', icon: '🧺', career: 'trader', job: true, mins: 240, pose: 'stand', stat: 'works', skill: 'charisma', gain: { social: 20 }, cost: { energy: 22, fun: 10, hygiene: 10 }, fast: 8, emotes: ['🧺', '🪙', '😊'] },
  ],
  chai: [{ id: 'tea', label: 'Have masala chai', icon: '🫖', mins: 15, pose: 'stand', gain: { energy: 16, social: 10 }, coins: -2, emotes: ['🫖', '😌'] }],
  sweets: [{ id: 'eat', label: 'Eat sweets', icon: '🍬', mins: 15, pose: 'inside', gain: { hunger: 32, fun: 12 }, coins: -4, emotes: ['🍬', '😋', '🤩'] }],
  neighbour: [
    { id: 'chat', label: 'Chat', icon: '💬', mins: 25, pose: 'chat', skill: 'charisma', gain: { social: 30, fun: 6 }, emotes: ['💬', '😄', '🌼', '☀️', '🎵'], friend: 'chat' },
    { id: 'story', label: 'Tell a story', icon: '📖', mins: 20, pose: 'chat', skill: 'charisma', needSkill: { charisma: 2 }, gain: { social: 26, fun: 12 }, emotes: ['📖', '😮', '🐉', '👏'], friend: 'story' },
    { id: 'joke', label: 'Tell a joke', icon: '😂', mins: 10, pose: 'chat', start: 'laugh', skill: 'charisma', gain: { social: 15, fun: 10 }, emotes: ['😂', '🤣'], friend: 'joke' },
    { id: 'hug', label: 'Hug', icon: '🤗', mins: 5, pose: 'chat', gain: { social: 22, comfort: 6 }, emotes: ['🤗', '💛'], friend: 'hug', hearts: 2 },
  ],
};
export function actionsFor(kind) {
  return (ACTIONS[kind] || []).map(a => a.ref ? ACTIONS[a.ref].find(x => x.id === a.id) : a).filter(Boolean);
}

// ---------- Phase 2: traits, skills, career ----------
// Traits change which actions a neighbour picks (weights multiply the score of matching action ids).
export const TRAITS = {
  'Foodie': { icon: '🍰', likes: { eat: 1.8, tea: 1.4, browse: 1.3 } },
  'Bookworm': { icon: '📚', likes: { read: 1.9, experiment: 1.4 } },
  'Night Owl': { icon: '🦉', sleep: [1, 9] },
  'Early Bird': { icon: '🐦', sleep: [21, 5] },
  'Neat': { icon: '🧼', likes: { freshen: 1.8 }, decay: { hygiene: 1.4 } },
  'Social Butterfly': { icon: '🦋', likes: { chat: 1.8 }, decay: { social: 1.3 } },
  'Shy': { icon: '🙈', likes: { chat: 0.5, read: 1.3 } },
  'Athletic': { icon: '🏃', speed: 1.25, likes: { admire: 1.4, workout: 1.9, jog: 1.8, swim: 1.6 } },
  'Artist': { icon: '🎨', likes: { craft: 1.9, show: 1.3 } },
  'Music Lover': { icon: '🎵', likes: { show: 1.8 } },
  'Outdoorsy': { icon: '🌳', likes: { sit: 1.5, fish: 1.7, wish: 1.4, admire: 1.6 } },
  'Playful': { icon: '🎈', likes: { ride: 1.9, wish: 1.4 } },
};
export const SKILLS = [
  { k: 'cooking', label: 'Cooking', icon: '🍳', perk: 'Tastier meals, and no more burnt food from level 2' },
  { k: 'fitness', label: 'Fitness', icon: '🏃', perk: 'Walk faster and get tired more slowly' },
  { k: 'creativity', label: 'Creativity', icon: '🎨', perk: 'Workshops pay you for what you make' },
  { k: 'charisma', label: 'Charisma', icon: '🗣️', perk: 'Tell stories at level 2; friendships grow faster at level 3' },
  { k: 'logic', label: 'Logic', icon: '🧠', perk: 'Promotions come sooner at level 3' },
];
export const SKILL_MAX = 10;
export const xpForLevel = lv => 20 + lv * 12; // XP needed to go from lv to lv + 1
export const CAREER = [
  { title: 'Ticket helper', pay: 40, icon: '🎫' },
  { title: 'Conductor', pay: 55, icon: '🧢' },
  { title: 'Tram driver', pay: 75, icon: '🚋' },
  { title: 'Station master', pay: 100, icon: '🎖️' },
];
// Every town has its own job ladder. A shift a day, 7 AM to 6 PM.
export const CAREERS = {
  tram: { place: 'Willowvale Tram Station', city: 'willowvale', ladder: CAREER },
  teacher: { place: 'Maple Row School', city: 'maple', ladder: [{ title: 'Classroom helper', pay: 45, icon: '🍎' }, { title: 'Teacher', pay: 60, icon: '📝' }, { title: 'Head of year', pay: 80, icon: '🏫' }, { title: 'Head teacher', pay: 105, icon: '🎓' }] },
  tech: { place: 'Pixel Works, Skyhaven', city: 'skyhaven', ladder: [{ title: 'Junior coder', pay: 55, icon: '💻' }, { title: 'App maker', pay: 75, icon: '📱' }, { title: 'Lead engineer', pay: 100, icon: '🚀' }, { title: 'Chief inventor', pay: 135, icon: '🏆' }] },
  science: { place: 'Bright Ideas Lab, Lumen Labs', city: 'lumen', ladder: [{ title: 'Lab assistant', pay: 55, icon: '🧪' }, { title: 'Researcher', pay: 75, icon: '🔬' }, { title: 'Professor', pay: 100, icon: '💡' }, { title: 'Chief scientist', pay: 135, icon: '🌌' }] },
  chef: { place: 'Dumpling Kitchen, Lantern Quarter', city: 'lantern', ladder: [{ title: 'Dumpling folder', pay: 50, icon: '🥟' }, { title: 'Line cook', pay: 65, icon: '🍳' }, { title: 'Head chef', pay: 90, icon: '🔥' }, { title: 'Master chef', pay: 120, icon: '🏮' }] },
  ramen: { place: 'Hilltop Ramen, Sakura Hill', city: 'sakura', ladder: [{ title: 'Noodle maker', pay: 50, icon: '🍜' }, { title: 'Broth cook', pay: 65, icon: '🥢' }, { title: 'Ramen chef', pay: 90, icon: '🍥' }, { title: 'Ramen master', pay: 120, icon: '🌸' }] },
  trader: { place: 'Grand Bazaar, Marigold Bazaar', city: 'marigold', ladder: [{ title: 'Stall helper', pay: 50, icon: '🧺' }, { title: 'Spice trader', pay: 65, icon: '🌶️' }, { title: 'Shopkeeper', pay: 90, icon: '🏪' }, { title: 'Bazaar elder', pay: 120, icon: '🪔' }] },
};
export const FRIEND_LEVELS = [[0, 'Stranger'], [1, 'Acquaintance'], [3, 'Friend'], [5, 'Best friend']];
export const friendLevel = h => FRIEND_LEVELS.filter(([n]) => h >= n).pop()[1];
