import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOLLOW, stepLead, followTarget, followZoom } from '../public/js/followcam.js';

const W = 1200, H = 800, Z = 1;

test('follow camera: walking swings the view ahead in the walking direction', () => {
  let lead = [0, 0];
  for (let k = 0; k < 120; k++) lead = stepLead(lead, 100, 0, 1 / 60, W, H, Z, true);
  assert.ok(lead[0] > 60, `lead.x ${lead[0]}`);
  assert.ok(Math.abs(lead[1]) < 1e-9);
});

test('follow camera: look-ahead is capped so you never leave the screen', () => {
  let lead = [0, 0];
  for (let k = 0; k < 600; k++) lead = stepLead(lead, 5000, 5000, 1 / 60, W, H, Z, true);
  const cap = (Math.min(W, H) * FOLLOW.maxLead) / Z;
  assert.ok(Math.hypot(...lead) <= cap + 1e-6);
  assert.ok(Math.hypot(...lead) > cap * 0.95);
});

test('follow camera: stopping drifts the view back to you', () => {
  let lead = [200, -100];
  for (let k = 0; k < 600; k++) lead = stepLead(lead, 0, 0, 1 / 60, W, H, Z, false);
  assert.ok(Math.hypot(...lead) < 1);
});

test('follow camera: the player sits below centre, and zoom is closer than normal', () => {
  const [cx, cy] = followTarget(500, 500, [0, 0], H, Z);
  assert.equal(cx, 500);
  assert.ok(cy < 500); // camera centre above the player = player low on screen
  assert.ok(followTarget(500, 500, [0, 0], H, Z, true)[1] > cy); // phones lift less (controls at the bottom)
  assert.ok(followZoom(true) > 0.56 && followZoom(false) > 0.72);
});
