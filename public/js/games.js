// Real mini-games, played in an overlay: two arcade games and the fishing game you play from a boat.
// Everything is drawn on a canvas with simple shapes and emojis; touch, mouse and keyboard all work.

let root = null, cv = null, g = null, raf = 0, keys = {}, pointer = { down: false, x: 0, y: 0 };
const GW = 360, GH = 520;

function ensure() {
  if (root) return;
  root = document.createElement('div');
  root.className = 'game-overlay hidden';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="Mini-game">
    <div class="game-top"><b id="game-title"></b><span id="game-score"></span><button id="game-quit" class="sheet-close" aria-label="Stop playing">×</button></div>
    <canvas id="game-canvas" width="${GW * 2}" height="${GH * 2}"></canvas>
    <div class="game-hint" id="game-hint"></div></div>`;
  document.body.append(root);
  cv = root.querySelector('#game-canvas'); g = cv.getContext('2d'); g.scale(2, 2);
  const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [((t.clientX - r.left) / r.width) * GW, ((t.clientY - r.top) / r.height) * GH]; };
  cv.addEventListener('pointerdown', e => { pointer.down = true; [pointer.x, pointer.y] = pos(e); pointer.tap = true; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { [pointer.x, pointer.y] = pos(e); });
  cv.addEventListener('pointerup', () => { pointer.down = false; });
  cv.addEventListener('pointercancel', () => { pointer.down = false; });
  window.addEventListener('keydown', e => { if (!root.classList.contains('hidden')) { keys[e.key] = true; if ([' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); keys.tap = true; } } });
  window.addEventListener('keyup', e => { keys[e.key] = false; });
}
function open(title, hint) {
  ensure();
  root.querySelector('#game-title').textContent = title;
  root.querySelector('#game-hint').textContent = hint;
  root.classList.remove('hidden');
  keys = {}; pointer = { down: false, x: GW / 2, y: GH / 2 };
}
function close() { cancelAnimationFrame(raf); root.classList.add('hidden'); }
function score(t) { root.querySelector('#game-score').textContent = t; }
function emoji(e, x, y, size) { g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); }
function rr(x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); }
function banner(lines, sub) {
  g.fillStyle = 'rgba(20,24,52,.72)'; g.fillRect(0, 0, GW, GH);
  rr(30, GH / 2 - 90, GW - 60, 180, 22, '#FFFFFF');
  g.fillStyle = '#26395A'; g.textAlign = 'center'; g.font = '800 26px "Baloo 2", sans-serif'; g.fillText(lines[0], GW / 2, GH / 2 - 40);
  g.font = '700 17px Nunito, sans-serif'; (lines.slice(1)).forEach((l, k) => g.fillText(l, GW / 2, GH / 2 - 6 + k * 24));
  if (sub) { g.fillStyle = '#3FA86A'; g.font = '800 16px Nunito, sans-serif'; g.fillText(sub, GW / 2, GH / 2 + 66); }
}
function loop(step) {
  let last = performance.now();
  const f = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (step(dt) !== false) raf = requestAnimationFrame(f); };
  raf = requestAnimationFrame(f);
}
function endScreen(title, lines, done, result) {
  let t = 0;
  const snap = g.getImageData(0, 0, cv.width, cv.height);
  loop(dt => {
    t += dt; g.putImageData(snap, 0, 0); banner([title, ...lines], t > 0.8 ? 'Tap to continue' : '');
    if (t > 0.8 && (pointer.tap || keys.tap)) { close(); done(result); return false; }
    pointer.tap = false; keys.tap = false;
  });
}
function wireQuit(done, getResult) {
  root.querySelector('#game-quit').onclick = () => { close(); done({ ...getResult(), quit: true }); };
}

// ---------- Star Catcher: slide the basket, catch stars, dodge rain clouds ----------
function stars(done, best) {
  open('Star Catcher', 'Drag or use ← → to move. Catch ⭐, dodge 🌧️.');
  let x = GW / 2, sc = 0, hearts = 3, t = 0, spawn = 0, items = [], over = false, flash = 0;
  const sky = g.createLinearGradient(0, 0, 0, GH); sky.addColorStop(0, '#1F2A5A'); sky.addColorStop(1, '#5A4FB0');
  const bg = Array.from({ length: 40 }, () => [Math.random() * GW, Math.random() * GH, Math.random() * 1.6 + 0.4]);
  wireQuit(done, () => ({ score: sc }));
  loop(dt => {
    if (over) return false;
    t += dt; spawn -= dt; flash = Math.max(0, flash - dt);
    const speed = 1 + t / 30;
    if (pointer.down) x += (pointer.x - x) * Math.min(1, dt * 14);
    if (keys.ArrowLeft || keys.a) x -= 300 * dt; if (keys.ArrowRight || keys.d) x += 300 * dt;
    x = Math.max(30, Math.min(GW - 30, x));
    if (spawn <= 0) { spawn = Math.max(0.28, 0.8 - t / 80); const r = Math.random(); items.push({ x: 24 + Math.random() * (GW - 48), y: -20, v: (110 + Math.random() * 60) * speed, kind: r < 0.62 ? 'star' : r < 0.72 ? 'big' : 'rain' }); }
    for (const it of items) it.y += it.v * dt;
    for (const it of items) if (!it.done && it.y > GH - 92 && it.y < GH - 50 && Math.abs(it.x - x) < 36) { it.done = true; if (it.kind === 'rain') { hearts--; flash = 0.4; } else sc += it.kind === 'big' ? 3 : 1; }
    items = items.filter(it => !it.done && it.y < GH + 30);
    // draw
    g.fillStyle = sky; g.fillRect(0, 0, GW, GH);
    for (const [bx, by, br] of bg) { g.fillStyle = `rgba(255,255,255,${0.4 + 0.3 * Math.sin(t * 2 + bx)})`; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); }
    g.fillStyle = '#3FA86A'; g.fillRect(0, GH - 40, GW, 40); g.fillStyle = '#4FBF6E'; g.fillRect(0, GH - 40, GW, 6);
    for (const it of items) emoji(it.kind === 'rain' ? '🌧️' : it.kind === 'big' ? '🌟' : '⭐', it.x, it.y, it.kind === 'big' ? 34 : 28);
    emoji('🧺', x, GH - 66, 54);
    if (flash > 0) { g.fillStyle = `rgba(240,88,122,${flash})`; g.fillRect(0, 0, GW, GH); }
    score(`⭐ ${sc}   ${'❤️'.repeat(Math.max(0, hearts))}`);
    if (hearts <= 0 || t > 60) { over = true; endScreen(hearts <= 0 ? 'Out of hearts!' : 'Time’s up!', [`You caught ${sc} stars`, sc > best ? 'New high score! 🏆' : `Best: ${Math.max(best, sc)}`], done, { score: sc }); return false; }
    pointer.tap = false; keys.tap = false;
  });
}

// ---------- Bunny Hop: tap to jump the fences, grab carrots ----------
function hop(done, best) {
  open('Bunny Hop', 'Tap, click or press Space to jump.');
  let y = 0, vy = 0, sc = 0, dist = 0, t = 0, obs = [], spawn = 1.2, over = false;
  const G0 = GH - 90;
  wireQuit(done, () => ({ score: sc }));
  loop(dt => {
    if (over) return false;
    t += dt; const speed = 220 + t * 6; dist += speed * dt;
    if ((pointer.tap || keys.tap) && y === 0) { vy = 560; }
    pointer.tap = false; keys.tap = false;
    vy -= 1500 * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = Math.max(0, vy);
    spawn -= dt;
    if (spawn <= 0) { spawn = 0.9 + Math.random() * 0.9 - Math.min(0.4, t / 120); const carrot = Math.random() < 0.35; obs.push({ x: GW + 30, kind: carrot ? 'carrot' : 'fence', h: carrot ? 70 + Math.random() * 60 : 0 }); }
    for (const o of obs) o.x -= speed * dt;
    const bx = 80, by = G0 - y;
    for (const o of obs) {
      if (o.done) continue;
      if (o.kind === 'fence' && Math.abs(o.x - bx) < 26 && y < 34) { over = true; }
      if (o.kind === 'carrot' && Math.abs(o.x - bx) < 26 && Math.abs((G0 - o.h) - by) < 34) { o.done = true; sc += 3; }
      if (o.kind === 'fence' && o.x < bx - 26 && !o.passed) { o.passed = true; sc += 1; }
    }
    obs = obs.filter(o => o.x > -40 && !o.done);
    // draw
    const sky = g.createLinearGradient(0, 0, 0, GH); sky.addColorStop(0, '#8FD8F5'); sky.addColorStop(1, '#E6F7FF'); g.fillStyle = sky; g.fillRect(0, 0, GW, GH);
    g.fillStyle = '#FFFFFF'; for (let k = 0; k < 4; k++) { const cx = ((k * 140 - dist * 0.2) % (GW + 160) + GW + 160) % (GW + 160) - 80; g.beginPath(); g.ellipse(cx, 90 + k * 30, 40, 14, 0, 0, 7); g.fill(); }
    g.fillStyle = '#8FD06F'; for (let k = 0; k < 3; k++) { const hx = ((k * 200 - dist * 0.4) % (GW + 300) + GW + 300) % (GW + 300) - 150; g.beginPath(); g.ellipse(hx, G0 + 10, 130, 60, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#5FB14A'; g.fillRect(0, G0 + 18, GW, GH - G0); g.fillStyle = '#C98A4B'; g.fillRect(0, G0 + 18, GW, 6);
    for (const o of obs) {
      if (o.kind === 'fence') { g.fillStyle = '#FFF4E0'; g.strokeStyle = '#C9B795'; g.lineWidth = 2; for (const dx of [-12, 0, 12]) { g.fillRect(o.x + dx - 3, G0 - 14, 6, 34); g.strokeRect(o.x + dx - 3, G0 - 14, 6, 34); } g.fillRect(o.x - 18, G0 - 6, 36, 5); g.fillRect(o.x - 18, G0 + 6, 36, 5); }
      else emoji('🥕', o.x, G0 - o.h, 28);
    }
    g.save(); g.translate(bx, by); if (y > 0) g.rotate(-0.15); emoji('🐰', 0, 0, 46); g.restore();
    score(`🥕 ${sc}`);
    if (over) { endScreen('Bonk!', [`You scored ${sc}`, sc > best ? 'New high score! 🏆' : `Best: ${Math.max(best, sc)}`], done, { score: sc }); return false; }
  });
}

// ---------- Fishing: wait for a bite, tap fast, then keep the fish in the green zone ----------
export const FISH = [
  { name: 'Minnow', icon: '🐟', w: 30, diff: 0.5, coins: 3 },
  { name: 'Sardine', icon: '🐟', w: 24, diff: 0.7, coins: 4 },
  { name: 'Snapper', icon: '🐠', w: 18, diff: 0.9, coins: 7 },
  { name: 'Pufferfish', icon: '🐡', w: 12, diff: 1.1, coins: 10 },
  { name: 'Squid', icon: '🦑', w: 8, diff: 1.25, coins: 14 },
  { name: 'Octopus', icon: '🐙', w: 5, diff: 1.4, coins: 18 },
  { name: 'Golden fish', icon: '✨', w: 3, diff: 1.6, coins: 30 },
];
function pickFish(skill) {
  const pool = FISH.map(f => ({ ...f, w: f.w * (f.diff > 1 ? 1 + skill * 0.15 : 1) }));
  let r = Math.random() * pool.reduce((a, f) => a + f.w, 0);
  for (const f of pool) { r -= f.w; if (r <= 0) return f; }
  return pool[0];
}
function fish(done, skill = 0) {
  open('Fishing', 'Wait for the splash, then tap! Hold to lift the green bar over the fish.');
  let phase = 'wait', t = 0, biteAt = 1.6 + Math.random() * 3.4, catchP = 0.35, zone = 0.3, zv = 0, fy = 0.5, fv = 0, ft = 0, over = false;
  const f = pickFish(skill);
  const zoneH = 0.26 + skill * 0.012;
  wireQuit(done, () => ({ caught: null }));
  loop(dt => {
    if (over) return false;
    t += dt;
    const water = g.createLinearGradient(0, 0, 0, GH); water.addColorStop(0, '#8FD8F5'); water.addColorStop(0.32, '#5BC0EB'); water.addColorStop(1, '#2E6FA8');
    g.fillStyle = water; g.fillRect(0, 0, GW, GH);
    g.fillStyle = '#FFFFFF55'; for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse((k * 53 + t * 20) % (GW + 40) - 20, 180 + (k % 4) * 70, 22, 4, 0, 0, 7); g.fill(); }
    if (phase === 'wait' || phase === 'bite') {
      const bob = Math.sin(t * 3) * 3, bx = GW / 2, byy = 200 + bob + (phase === 'bite' ? 10 : 0);
      g.strokeStyle = '#26395A'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(GW - 30, 30); g.quadraticCurveTo(GW / 2 + 60, 60, bx, byy - 10); g.stroke();
      g.fillStyle = '#F0587A'; g.beginPath(); g.arc(bx, byy - 6, 9, Math.PI, 0); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(bx, byy - 6, 9, 0, Math.PI); g.fill();
      g.strokeStyle = '#FFFFFFaa'; g.beginPath(); g.ellipse(bx, byy + 4, 18 + Math.sin(t * 4) * 3, 4, 0, 0, 7); g.stroke();
      if (phase === 'wait') { emoji('🎣', GW - 36, 34, 38); g.fillStyle = '#26395A'; g.font = '800 20px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillText('Waiting for a bite…', GW / 2, 330); if (pointer.tap || keys.tap) { biteAt += 1; } if (t >= biteAt) { phase = 'bite'; t = 0; navigator.vibrate?.(80); } }
      else { emoji('❗', GW / 2, 140, 48); g.fillStyle = '#FFFFFF'; g.font = '800 26px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillText('TAP NOW!', GW / 2, 330); if (pointer.tap || keys.tap) { phase = 'reel'; t = 0; } else if (t > 1.1) { over = true; endScreen('It got away…', ['Tap faster when you see ❗'], done, { caught: null }); return false; } }
      pointer.tap = false; keys.tap = false; score(''); return;
    }
    // reel
    const lift = pointer.down || keys[' '] || keys.ArrowUp;
    zv += (lift ? 2.6 : -2.2) * dt; zv *= 0.9; zone = Math.max(0, Math.min(1 - zoneH, zone + zv * dt * 3));
    ft -= dt; if (ft <= 0) { ft = 0.4 + Math.random() * (1.2 / f.diff); fv = (Math.random() - 0.5) * 1.6 * f.diff; }
    fy = Math.max(0.02, Math.min(0.98, fy + fv * dt)); if (fy <= 0.02 || fy >= 0.98) fv = -fv;
    const inZone = fy >= zone && fy <= zone + zoneH;
    catchP = Math.max(0, Math.min(1, catchP + (inZone ? 0.32 : -0.22 * f.diff) * dt));
    const bx = 120, by = 60, bh = GH - 140, bw = 54;
    rr(bx - 6, by - 6, bw + 12, bh + 12, 16, '#26395A');
    rr(bx, by, bw, bh, 12, '#3A6FA8');
    rr(bx + 2, by + bh * (1 - zone - zoneH), bw - 4, bh * zoneH, 10, inZone ? '#7CE07A' : '#B6F0B0');
    emoji(f.diff > 1.3 ? f.icon : '🐟', bx + bw / 2, by + bh * (1 - fy), 30);
    rr(bx + bw + 24, by, 18, bh, 9, '#26395A');
    rr(bx + bw + 26, by + bh * (1 - catchP), 14, bh * catchP, 7, catchP > 0.66 ? '#7CE07A' : catchP > 0.33 ? '#FFC83D' : '#F0587A');
    g.fillStyle = '#FFFFFF'; g.font = '800 16px Nunito, sans-serif'; g.textAlign = 'left'; g.fillText(lift ? 'Reeling!' : 'Hold to reel', 24, GH - 40);
    score(`${Math.round(catchP * 100)}%`);
    pointer.tap = false; keys.tap = false;
    if (catchP >= 1) { over = true; endScreen(`You caught a ${f.name}!`, [`${f.icon}  worth ✦ ${f.coins}`], done, { caught: f }); return false; }
    if (catchP <= 0) { over = true; endScreen('The line snapped!', ['Keep the green bar on the fish.'], done, { caught: null }); return false; }
  });
}

export const GAME = {
  play(id, done, best = 0) { (id === 'hop' ? hop : stars)(done, best); },
  fish(done, skill) { fish(done, skill); },
  isOpen: () => !!root && !root.classList.contains('hidden'),
};
