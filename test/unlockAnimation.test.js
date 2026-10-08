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

test('pre-rendered pon cue follows color changes except for the final landing', () => {
  const wav = readFileSync(new URL('../sounds/pon-unlock.wav', import.meta.url));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  const sampleRate = wav.readUInt32LE(24);
  const duration = (wav.length - 44) / 2 / sampleRate;
  const finalIconStart = Array.from({ length: 16 }, (_, index) => unlockStepDelay(index + 1, 17))
    .reduce((sum, delay) => sum + delay, 0) / 1000;
  const energyAt = (seconds) => {
    const first = Math.floor(seconds * sampleRate);
    const count = Math.floor(sampleRate * 0.02);
    let sum = 0;
    for (let index = first; index < first + count; index++) {
      sum += Math.abs(wav.readInt16LE(44 + index * 2));
    }
    return sum / count;
  };
  const finalLanding = finalIconStart + FINAL_ICON_LANDING_MS / 1000;
  assert.ok(duration > finalLanding + 0.1 && duration < finalLanding + 0.5);
  assert.ok(energyAt(0.01) > 1000);
  assert.ok(energyAt(finalIconStart - 0.1) < 100);
  assert.ok(energyAt(finalIconStart + 0.01) < 100);
  assert.ok(energyAt(finalLanding - 0.1) < 100);
  assert.ok(energyAt(finalLanding + 0.01) > 1000);
});

test('next-world button pon matches the final icon pitch', () => {
  const unlock = readFileSync(new URL('../sounds/pon-unlock.wav', import.meta.url));
  const button = readFileSync(new URL('../sounds/pon-next-world.wav', import.meta.url));
  assert.equal(button.toString('ascii', 0, 4), 'RIFF');
  assert.equal(button.readUInt32LE(24), unlock.readUInt32LE(24));
  const finalStartMs = FINAL_ICON_LANDING_MS + Array.from({ length: 16 }, (_, index) =>
    unlockStepDelay(index + 1, 17)).reduce((sum, delay) => sum + delay, 0);
  const offset = Math.round(finalStartMs * button.readUInt32LE(24) / 1000);
  const sampleCount = Math.min(5000, (button.length - 44) / 2);
  let dot = 0;
  let iconPower = 0;
  let buttonPower = 0;
  for (let index = 0; index < sampleCount; index++) {
    const iconSample = unlock.readInt16LE(44 + (offset + index) * 2);
    const buttonSample = button.readInt16LE(44 + index * 2);
    dot += iconSample * buttonSample;
    iconPower += iconSample ** 2;
    buttonPower += buttonSample ** 2;
  }
  assert.ok(dot / Math.sqrt(iconPower * buttonPower) > 0.999);
});
