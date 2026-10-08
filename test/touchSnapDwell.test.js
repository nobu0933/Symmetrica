import test from 'node:test';
import assert from 'node:assert/strict';
import { createTouchSnapDwell, TOUCH_SNAP_DWELL_MS } from '../src/ui/touchSnapDwell.js';

test('mobile snap must remain at the same visual position for 100ms', () => {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const ready = [];
  const dwell = createTouchSnapDwell((item) => ready.push(item), {
    setTimer: (callback, delay) => {
      const id = nextId++;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (duration) => {
    now += duration;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(id); timer.callback(); }
    }
  };
  const state = {};
  const snap = { x: 200, y: 300, angle: 90, flipped: false, shapeIndex: 0 };

  dwell.observe(snap, state, 2);
  advance(50);
  dwell.observe({ ...snap, x: 200.2 }, state, 2);
  advance(TOUCH_SNAP_DWELL_MS / 2 - 1);
  assert.equal(ready.length, 0);
  advance(1);
  assert.equal(ready.length, 1);

  dwell.observe(snap, state, 2);
  advance(70);
  dwell.observe({ ...snap, x: 400 }, state, 2);
  advance(30);
  assert.equal(ready.length, 1);
  dwell.observe(null, state, 2);
  advance(TOUCH_SNAP_DWELL_MS);
  assert.equal(ready.length, 1);

  dwell.observe(snap, state, 2);
  advance(40);
  dwell.observe(snap, state, 3);
  advance(60);
  assert.equal(ready.length, 1);
  advance(40);
  assert.equal(ready.length, 2);
});
