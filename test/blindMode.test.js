import test from 'node:test';
import assert from 'node:assert/strict';
import { blindPlacementAlpha } from '../src/ui/blindMode.js';

test('blind mode retains the first placement, fades later ones, and reveals them on completion', () => {
  const data = { stage: { blindMode: true }, mode: 'play', completed: false,
    placed: [{}, { placedAt: 1000 }, { placedAt: 1200 }] };
  assert.equal(blindPlacementAlpha(data, 0, 2000), 1);
  assert.equal(blindPlacementAlpha(data, 1, 1250), .5);
  assert.equal(blindPlacementAlpha(data, 1, 1500), 0);
  assert.equal(blindPlacementAlpha(data, 2, 1500), .4);
  data.mode = 'view';
  assert.equal(blindPlacementAlpha(data, 1, 5000), 1);
  data.mode = 'play'; data.completed = true; data.editing = true;
  assert.equal(blindPlacementAlpha(data, 1, 5000), 0);
});
