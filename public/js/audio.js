// Sound effects and music made live with Web Audio, so there are no audio files to download.
// Browsers only allow sound after the player has touched the screen, so unlock() runs on the first tap.
let ac = null, master = null, musicBus = null, sfxBus = null;
const state = { music: true, sfx: true, scene: 'home', night: false };
const loops = new Map();

export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = state.music ? 0.22 : 0; musicBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = state.sfx ? 0.6 : 0; sfxBus.connect(master);
  startMusic();
}
export function setPrefs({ music, sfx }) {
  if (music !== undefined) state.music = music;
  if (sfx !== undefined) state.sfx = sfx;
  if (!ac) return;
  musicBus.gain.setTargetAtTime(state.music ? 0.22 : 0, ac.currentTime, 0.3);
  sfxBus.gain.setTargetAtTime(state.sfx ? 0.6 : 0, ac.currentTime, 0.05);
}
export function setScene(scene, night) { state.scene = scene; state.night = !!night; }

function tone(freq, start, dur, { type = 'sine', vol = 0.3, bus = sfxBus, attack = 0.005, release = 0.12, slide = 0 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), start + dur);
  g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur + release);
  o.connect(g); g.connect(bus); o.start(start); o.stop(start + dur + release + 0.02);
}
let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  return noiseBuf;
}
function burst(start, dur, { freq = 1200, q = 1, vol = 0.2, type = 'bandpass' } = {}) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(start, Math.random()); s.stop(start + dur + 0.05);
}

const SFX = {
  tap: n => tone(880, n, 0.04, { type: 'triangle', vol: 0.18 }),
  open: n => { tone(523, n, 0.06, { type: 'triangle', vol: 0.18 }); tone(784, n + 0.06, 0.08, { type: 'triangle', vol: 0.16 }); },
  close: n => { tone(784, n, 0.05, { type: 'triangle', vol: 0.14 }); tone(523, n + 0.05, 0.07, { type: 'triangle', vol: 0.12 }); },
  coin: n => { tone(1319, n, 0.06, { type: 'square', vol: 0.08 }); tone(1760, n + 0.07, 0.16, { type: 'square', vol: 0.08 }); },
  pop: n => tone(500, n, 0.08, { type: 'sine', vol: 0.3, slide: 2.2 }),
  step: n => burst(n, 0.05, { freq: 500, q: 0.8, vol: 0.05 }),
  door: n => { tone(110, n, 0.12, { type: 'sine', vol: 0.4 }); burst(n, 0.08, { freq: 300, vol: 0.12 }); },
  unlock: n => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, n + k * 0.08, 0.18, { type: 'triangle', vol: 0.2 })),
  done: n => { tone(659, n, 0.08, { type: 'triangle', vol: 0.2 }); tone(988, n + 0.09, 0.2, { type: 'triangle', vol: 0.2 }); },
  splash: n => burst(n, 0.4, { freq: 2200, q: 0.6, vol: 0.18 }),
  chop: n => burst(n, 0.04, { freq: 2600, q: 3, vol: 0.2 }),
  yawn: n => tone(330, n, 0.6, { type: 'sine', vol: 0.12, slide: 0.6, attack: 0.15 }),
  laugh: n => [0, 1, 2].forEach(k => tone(600 - k * 40, n + k * 0.11, 0.07, { type: 'triangle', vol: 0.12 })),
  chat: n => { const base = 420 + Math.random() * 200; [0, 1, 2, 3].forEach(k => tone(base * (1 + ((k * 3) % 4) * 0.12), n + k * 0.07, 0.05, { type: 'sine', vol: 0.1 })); },
  page: n => burst(n, 0.12, { freq: 4000, q: 0.5, vol: 0.06, type: 'highpass' }),
  type: n => [0, 1, 2].forEach(k => burst(n + k * 0.06, 0.02, { freq: 3500, q: 2, vol: 0.06 })),
};
export function sfx(name) {
  if (!ac || !state.sfx || !SFX[name]) return;
  SFX[name](ac.currentTime + 0.005);
}

// Looping ambience while an action runs: water, sizzle, a TV murmur, snoring.
const LOOPS = {
  water: { freq: 2400, q: 0.5, vol: 0.12, type: 'bandpass' },
  sizzle: { freq: 5200, q: 0.8, vol: 0.06, type: 'highpass' },
  tv: { freq: 900, q: 4, vol: 0.04, type: 'bandpass', wobble: 6 },
  snore: { freq: 220, q: 2, vol: 0.08, type: 'lowpass', wobble: 0.35 },
};
export function startLoop(name) {
  if (!ac || loops.has(name) || !LOOPS[name]) return;
  const L = LOOPS[name], s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise(); s.loop = true; f.type = L.type; f.frequency.value = L.freq; f.Q.value = L.q;
  g.gain.value = 0; g.gain.setTargetAtTime(L.vol, ac.currentTime, 0.2);
  let lfo = null;
  if (L.wobble) { lfo = ac.createOscillator(); const lg = ac.createGain(); lfo.frequency.value = L.wobble; lg.gain.value = L.vol * 0.8; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
  loops.set(name, { s, g, lfo });
}
export function stopLoops() {
  if (!ac) return;
  for (const [, l] of loops) { l.g.gain.setTargetAtTime(0, ac.currentTime, 0.15); l.s.stop(ac.currentTime + 0.6); if (l.lfo) l.lfo.stop(ac.currentTime + 0.6); }
  loops.clear();
}

// Gentle music: a soft pad and a pentatonic tune that wanders, different chords at home, in town and at night.
const CHORDS = {
  home: [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]],
  city: [[293.7, 370, 440], [246.9, 293.7, 370], [196, 246.9, 293.7], [220, 277.2, 329.6]],
  night: [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 233.1, 293.7], [164.8, 196, 246.9]],
};
const SCALE = { home: [523.3, 587.3, 659.3, 784, 880], city: [587.3, 659.3, 740, 880, 987.8], night: [440, 523.3, 587.3, 659.3, 784] };
let musicTimer = null, beat = 0, nextAt = 0;
function startMusic() {
  nextAt = ac.currentTime + 0.3;
  musicTimer = setInterval(() => {
    while (nextAt < ac.currentTime + 0.4) {
      const key = state.night ? 'night' : state.scene === 'home' ? 'home' : 'city';
      const spb = state.night ? 0.62 : 0.48;
      const bar = Math.floor(beat / 8) % 4, chord = CHORDS[key][bar];
      if (beat % 8 === 0) chord.forEach(f => tone(f / 2, nextAt, spb * 7, { type: 'sine', vol: 0.05, bus: musicBus, attack: 0.6, release: 1.2 }));
      if (beat % 2 === 0) tone(chord[(beat / 2) % 3] / 2, nextAt, spb * 0.9, { type: 'triangle', vol: 0.05, bus: musicBus, attack: 0.02 });
      const r = Math.sin(beat * 12.9898) * 43758.5453 % 1;
      if (Math.abs(r) > (state.night ? 0.6 : 0.35)) { const sc = SCALE[key]; tone(sc[Math.floor(Math.abs(r) * 97) % sc.length], nextAt, spb * 0.8, { type: 'triangle', vol: 0.06, bus: musicBus, attack: 0.01, release: 0.4 }); }
      beat++; nextAt += spb;
    }
  }, 120);
}
