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
    { obj: 'armchair', mins: 45, pose: 'sit', arms: 'read', prop: 'book', tick: 'page', gain: { fun: 32, comfort: 10 }, emotes: ['📖', '🤔', '😮'] },
  ] }],
  shower: [{ id: 'shower', label: 'Take a shower', icon: '🚿', mins: 20, pose: 'shower', outfit: 'towel', arms: 'scrub', prop: 'sponge', loop: 'water', faceFront: true, after: 'shake', stat: 'showers', gain: { hygiene: 90, comfort: 8 }, emotes: ['🫧', '🎵', '🎶'] }],
  wardrobe: [{ id: 'dress', label: 'Change outfit', icon: '👗', special: 'wardrobe' }],
  sink: [
    { id: 'wash', label: 'Wash up', icon: '🧼', mins: 8, pose: 'stand', arms: 'scrub', prop: 'sponge', loop: 'water', gain: { hygiene: 25 }, emotes: ['🫧'] },
    { id: 'mirror', label: 'Practise a speech', icon: '🪞', mins: 15, pose: 'stand', gain: { social: 10, fun: 4 }, emotes: ['💬', '😄'] },
  ],
  fridge: [
    { id: 'snack', label: 'Grab a snack', icon: '🥪', steps: [
      { obj: 'fridge', mins: 3, pose: 'stand', arms: 'hold', emotes: ['🥪'] },
      { obj: 'chair', mins: 12, pose: 'sit', arms: 'eat', prop: 'fork', gain: { hunger: 30 }, emotes: ['🥪', '😋'] },
    ] },
    { id: 'cook', label: 'Cook a meal', icon: '🍳', stat: 'meals', steps: [
      { obj: 'fridge', mins: 5, pose: 'stand', arms: 'hold', emotes: ['🥕'] },
      { obj: 'counter', mins: 10, pose: 'stand', arms: 'chop', prop: 'knife', tick: 'chop', emotes: ['🔪', '🥕'] },
      { obj: 'stove', mins: 25, pose: 'stand', arms: 'stir', prop: 'bowl', loop: 'sizzle', gain: { fun: 5 }, emotes: ['🍳', '🔥', '🍳'] },
      { obj: 'chair', mins: 25, pose: 'sit', arms: 'eat', prop: 'fork', gain: { hunger: 78, comfort: 10 }, emotes: ['🍲', '😋'] },
    ] },
  ],
  stove: [{ ref: 'fridge', id: 'cook' }],
  table: [{ ref: 'fridge', id: 'cook' }],
  chair: [{ id: 'sit', label: 'Sit down', icon: '🪑', mins: 20, pose: 'sit', gain: { comfort: 25 }, emotes: ['😌'] }],
  radio: [{ id: 'dance', label: 'Dance to the radio', icon: '💃', mins: 30, pose: 'dance', stat: 'dances', gain: { fun: 36, social: 4 }, cost: { energy: 8, hygiene: 6 }, emotes: ['🎵', '🎶', '✨'] }],
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
    { id: 'games', label: 'Play computer games', icon: '🎮', mins: 60, pose: 'sit', arms: 'type', tick: 'type', gain: { fun: 55 }, cost: { comfort: 4 }, emotes: ['🎮', '😆', '🏆'] },
    { id: 'chat', label: 'Video call a friend', icon: '💻', mins: 40, pose: 'sit', arms: 'type', tick: 'type', gain: { social: 28 }, emotes: ['💬', '😊', '👋'] },
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
  community: [{ id: 'craft', label: 'Join a workshop', icon: '🎨', mins: 45, pose: 'inside', gain: { fun: 30, social: 18 }, emotes: ['🎨', '✂️'] }],
  theatre: [{ id: 'show', label: 'Watch a show', icon: '🎭', mins: 90, pose: 'inside', gain: { fun: 70, social: 10 }, coins: -8, fast: 3, emotes: ['🎭', '👏', '😂'] }],
  library: [{ id: 'read', label: 'Read quietly', icon: '📚', mins: 45, pose: 'inside', gain: { fun: 30, comfort: 10 }, emotes: ['📚', '🤓'] }],
  station: [{ id: 'work', label: 'Work a shift (+40 ✦)', icon: '💼', mins: 240, pose: 'inside', stat: 'works', gain: {}, cost: { energy: 22, fun: 18, hygiene: 10 }, coins: 40, fast: 8, emotes: ['💼', '🚋'] }],
  marina: [{ id: 'fish', label: 'Go fishing', icon: '🎣', mins: 40, pose: 'stand', stat: 'fish', arms: 'hold', gain: { fun: 26, comfort: 6 }, emotes: ['🎣', '🌊', '🐟'] }],
  clinic: [{ id: 'freshen', label: 'Freshen up', icon: '🧼', mins: 15, pose: 'inside', gain: { hygiene: 45, comfort: 10 }, emotes: ['🧼'] }],
  sunwheel: [{ id: 'ride', label: 'Ride the Sunwheel', icon: '🎡', mins: 20, pose: 'inside', stat: 'rides', gain: { fun: 34 }, coins: -2, emotes: ['🎡', '😆'] }],
  windmill: [{ id: 'admire', label: 'Admire the view', icon: '🌾', mins: 10, pose: 'stand', gain: { fun: 8, comfort: 6 }, emotes: ['😊'] }],
  neighbour: [
    { id: 'chat', label: 'Chat', icon: '💬', mins: 25, pose: 'chat', gain: { social: 30, fun: 6 }, emotes: ['💬', '😄', '🌼', '☀️', '🎵'], friend: 'chat' },
    { id: 'joke', label: 'Tell a joke', icon: '😂', mins: 10, pose: 'chat', start: 'laugh', gain: { social: 15, fun: 10 }, emotes: ['😂', '🤣'], friend: 'joke' },
    { id: 'hug', label: 'Hug', icon: '🤗', mins: 5, pose: 'chat', gain: { social: 22, comfort: 6 }, emotes: ['🤗', '💛'], friend: 'hug', hearts: 2 },
  ],
};
export function actionsFor(kind) {
  return (ACTIONS[kind] || []).map(a => a.ref ? ACTIONS[a.ref].find(x => x.id === a.id) : a).filter(Boolean);
}
