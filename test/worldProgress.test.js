import test from 'node:test';
import assert from 'node:assert/strict';
import { worldProgressStatus } from '../src/ui/worldProgress.js';

test('world dots appear with the first unlock and track configured worlds', () => {
  const worlds = Array.from({ length: 4 }, (_, index) => ({ id: index + 1 }));
  const stages = worlds.map((world, worldIndex) => ({ key: `${world.id}-1`, worldIndex }));
  const records = { '1-1': { completed: true } };
  const seen = new Set();
  const status = (currentIndex, options) =>
    worldProgressStatus(worlds, stages, records, seen, currentIndex, options);

  assert.equal(status(0).visible, false);
  assert.deepEqual(status(0).dots.map((dot) => dot.unlocked), [true, false, false, false]);

  const firstReveal = status(0, { revealWorldIndex: 1, forceVisible: true });
  assert.equal(firstReveal.visible, true);
  assert.deepEqual(firstReveal.dots.map((dot) => dot.unlocked), [true, true, false, false]);
  assert.equal(firstReveal.dots[0].current, true);
  assert.equal(firstReveal.placeholderVisible, false);

  seen.add(2);
  assert.equal(status(1).visible, true);
  assert.equal(status(1).dots[1].current, true);
  assert.equal(status(1).placeholderVisible, true);
  assert.equal(status(1).nextButtonVisible, false);

  records['2-1'] = { completed: true };
  assert.deepEqual(status(1, { revealWorldIndex: 2 }).dots.map((dot) => dot.unlocked),
    [true, true, true, false]);
  seen.add(3);
  assert.equal(status(1).nextButtonVisible, true);
  assert.equal(status(1).placeholderVisible, false);
  assert.equal(status(2).placeholderVisible, true);
  assert.equal(status(3).placeholderVisible, false);

  records['2-1'].completed = false;
  assert.equal(status(1).dots[2].unlocked, false);
  assert.equal(status(1).placeholderVisible, true);

  worlds.push({ id: 5 });
  stages.push({ key: '5-1', worldIndex: 4 });
  assert.equal(status(0).dots.length, 5);
});

test('a single registered world receives its dot at final completion', () => {
  const worlds = [{ id: 1 }];
  const stages = [{ key: '1-1', worldIndex: 0 }];
  const records = { '1-1': { completed: true } };
  assert.equal(worldProgressStatus(worlds, stages, records, new Set(), 0).visible, false);
  assert.equal(worldProgressStatus(worlds, stages, records, new Set(), 0,
    { forceVisible: true }).visible, true);
  assert.equal(worldProgressStatus(worlds, stages, records, new Set(), 0,
    { finalSeen: true }).visible, true);
});
