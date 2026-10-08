import test from 'node:test';
import assert from 'node:assert/strict';
import { BLIND_FADE_MS, blindPlacementAlpha, blindThumbnailAlpha } from '../src/ui/blindMode.js';
import { stageModeFromRecord } from '../src/game/progressState.js';

test('blind mode retains the first placement, fades later ones, and reveals them on completion', () => {
  const data = { stage: { blindMode: true }, mode: 'play', completed: false,
    placed: [{}, { placedAt: 1000 }, { placedAt: 1200 }] };
  assert.equal(blindPlacementAlpha(data, 0, 2000), 1);
  assert.equal(blindPlacementAlpha(data, 1, 1000 + BLIND_FADE_MS / 2), .5);
  assert.equal(blindPlacementAlpha(data, 1, 1000 + BLIND_FADE_MS), 0);
  assert.ok(Math.abs(blindPlacementAlpha(data, 2, 1500) - (1 - 300 / BLIND_FADE_MS)) < 1e-10);
  data.mode = 'view';
  assert.equal(blindPlacementAlpha(data, 1, 5000), 1);
  data.mode = 'play'; data.completed = true;
  assert.equal(blindPlacementAlpha(data, 1, 5000), 0);
  assert.ok(blindPlacementAlpha(data, 1, 1250) > 0);
});

test('a cleared blind-stage thumbnail shows every shape until reset starts a new attempt', () => {
  const record = { completed: true, editing: false };
  const data = {
    stage: { blindMode: true },
    mode: stageModeFromRecord(record),
    placed: [{}, { placedAt: 1000 }],
  };
  assert.equal(blindThumbnailAlpha(data, 0), 1);
  assert.equal(blindThumbnailAlpha(data, 1), 1);

  record.editing = true;
  data.mode = stageModeFromRecord(record);
  assert.equal(blindThumbnailAlpha(data, 0), 1);
  assert.equal(blindThumbnailAlpha(data, 1), 0);
  assert.equal(blindPlacementAlpha(data, 1, 1250), 1 - 250 / BLIND_FADE_MS);

  record.completed = false;
  data.mode = stageModeFromRecord(record);
  assert.equal(blindThumbnailAlpha(data, 1), 0);
  data.stage.blindMode = false;
  assert.equal(blindThumbnailAlpha(data, 1), 1);
});
