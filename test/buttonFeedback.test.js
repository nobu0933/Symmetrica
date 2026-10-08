import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTROL_PRESS_MS, createButtonPressFeedback } from '../src/ui/buttonFeedback.js';

test('control inversion briefly appears and restarts on repeated presses', () => {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const classes = new Set();
  const button = {
    offsetWidth: 92,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
  };
  const flash = createButtonPressFeedback({
    setTimer: (callback, delay) => {
      const id = nextId++;
      timers.set(id, { at: now + delay, callback });
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

  flash(button);
  assert.equal(classes.has('press-flash'), true);
  advance(CONTROL_PRESS_MS / 2);
  flash(button);
  advance(CONTROL_PRESS_MS / 2);
  assert.equal(classes.has('press-flash'), true);
  advance(CONTROL_PRESS_MS / 2);
  assert.equal(classes.has('press-flash'), false);
});
