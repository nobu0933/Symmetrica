import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EARLY_ICON_DELAY_MS, FINAL_ICON_HOP_MS, FINAL_ICON_LANDING_MS, FINAL_ICON_PAUSE_MS, NEXT_WORLD_BUTTON_DELAY_MS, NEXT_WORLD_BUTTON_LANDING_MS, NEXT_WORLD_LANDING_GAP_MS, PENULTIMATE_ICON_PAUSE_MS, TURN_ICON_DELAY_MS, unlockStepDelay } from '../src/ui/unlockAnimation.js';

test('world-completion highlights slow toward the final central icon', () => {
  const delays = Array.from({ length: 16 }, (_, index) => unlockStepDelay(index + 1, 17));
  assert.deepEqual(delays.slice(0, 12), [90, 90, 90, 90, 140, 90, 90, 90, 140, 90, 90, 90]);
  assert.ok(delays.slice(12).every((delay, index) => delay > delays[index + 11]));
  assert.ok(delays[12] > TURN_ICON_DELAY_MS);
  assert.ok(delays[13] > delays[12]);
  assert.equal(delays[14], 800);
  assert.equal(delays[15], 1000);
  assert.equal(PENULTIMATE_ICON_PAUSE_MS, 800);
  assert.equal(EARLY_ICON_DELAY_MS, 90);
  assert.equal(TURN_ICON_DELAY_MS, 140);
  assert.equal(FINAL_ICON_PAUSE_MS, 1000);
  assert.equal(FINAL_ICON_HOP_MS, 1000);
  assert.equal(NEXT_WORLD_LANDING_GAP_MS, 800);
  assert.equal(NEXT_WORLD_BUTTON_DELAY_MS + NEXT_WORLD_BUTTON_LANDING_MS - FINAL_ICON_LANDING_MS, 800);
});

test('pre-rendered world-unlock cue follows the current icon rhythm', () => {
  const readDuration = (name) => {
    const wav = readFileSync(new URL(`../sounds/${name}`, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    return (wav.length - 44) / 2 / wav.readUInt32LE(24);
  };
  const arrivalsDuration = readDuration('put5-arrivals.wav');
  const unlockDuration = readDuration('put5-unlock.wav');
  const finalIconStart = Array.from({ length: 16 }, (_, index) => unlockStepDelay(index + 1, 17))
    .reduce((sum, delay) => sum + delay, 0) / 1000;
  const sourceTail = arrivalsDuration - 0.74;
  assert.ok(Math.abs(unlockDuration - (finalIconStart + FINAL_ICON_LANDING_MS / 1000 + sourceTail)) < 0.01);
});
