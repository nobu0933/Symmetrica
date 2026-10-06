import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/game/stages.js';
import { makeStageTargets, makeTargets, requiredPlacementCount } from '../src/game/gameEngine.js';
import { clearStageCompletion, freshStageState, hasClearedOperation, isEveryStageComplete, isWorldComplete, isWorldUnlocked, normalizeProgressRecord, restoreStageState, shouldOpenStageSelectionAtStartup, shouldShowStageNumber, snapshotStageState } from '../src/game/progressState.js';

test('the first p1 attempt uses a triangle until placement or reset', () => {
  const stage = STAGES[0];
  const fresh = restoreStageState(stage, null);
  assert.equal(fresh.type, 'triangle');
  assert.equal(fresh.firstAttempt, true);
  const waiting = restoreStageState(stage, normalizeProgressRecord(stage, snapshotStageState(fresh)));
  assert.equal(waiting.type, 'triangle');
  assert.equal(waiting.firstAttempt, true);

  const oldUnplaced = { ...snapshotStageState(fresh), type: 'six' };
  delete oldUnplaced.firstAttempt;
  assert.equal(restoreStageState(stage, normalizeProgressRecord(stage, oldUnplaced)).type, 'triangle');

  waiting.firstAttempt = false;
  const retried = restoreStageState(stage, normalizeProgressRecord(stage, snapshotStageState(waiting)));
  assert.equal(retried.firstAttempt, false);
  assert.equal(restoreStageState(STAGES[1], null).firstAttempt, false);
});

test('stages 2 and 3 open with a triangle, but a reset returns to random shapes', () => {
  for (const stage of STAGES.slice(1, 3)) {
    const first = restoreStageState(stage, null);
    assert.equal(first.type, 'triangle');
    assert.equal(first.shapes[0].type, 'triangle');
    assert.equal(first.firstAttempt, false);
    assert.equal(first.openingTriangle, true);
    assert.equal(restoreStageState(stage, snapshotStageState(first)).type, 'triangle');
    const reset = restoreStageState(stage, snapshotStageState(freshStageState(stage, first)));
    assert.notEqual(reset.type, 'triangle');
    assert.equal(reset.openingTriangle, false);
    const oldUnplaced = { ...snapshotStageState(first), type: 'six', shapes: [{ ...first.shapes[0], type: 'six' }] };
    delete oldUnplaced.openingTriangle;
    const migrated = restoreStageState(stage, normalizeProgressRecord(stage, oldUnplaced));
    assert.equal(migrated.type, 'triangle');
    assert.equal(migrated.shapes[0].type, 'triangle');
  }
});

test('a saved stage 1 clear opens the first-world selection at startup', () => {
  assert.equal(shouldOpenStageSelectionAtStartup(STAGES, {}), false);
  assert.equal(shouldOpenStageSelectionAtStartup(STAGES, { [STAGES[0].key]: { completed: false } }), false);
  assert.equal(shouldOpenStageSelectionAtStartup(STAGES, { [STAGES[0].key]: { completed: true } }), true);
});

test('pre-placement cursor and a partial solution survive a round trip', () => {
  const stage = STAGES[1];
  const fresh = restoreStageState(stage, null);
  const beforePlacement = restoreStageState(stage, snapshotStageState(fresh));
  assert.deepEqual(beforePlacement.cursor, fresh.cursor);
  assert.equal(beforePlacement.placed.length, 0);
  assert.equal(beforePlacement.mode, 'play');

  const initial = { x: 263, y: 271, angle: 90, flipped: false };
  fresh.placed.push(initial);
  fresh.targets = makeTargets(stage, initial);
  fresh.cursor = { angle: 180, flipped: true };
  const restored = restoreStageState(stage, snapshotStageState(fresh));
  assert.deepEqual(restored.placed, [initial]);
  assert.deepEqual(restored.cursor, fresh.cursor);
  assert.deepEqual(restored.targets, fresh.targets);
});

test('double stage keeps both different figures, the initial pair and active cursor across reload', () => {
  const stage = { ...STAGES[1], doubleMode: true };
  const fresh = restoreStageState(stage, null);
  assert.notEqual(fresh.shapes[0].type, fresh.shapes[1].type);
  const first = { x: 263, y: 271, angle: 0, flipped: false, shapeIndex: 0 };
  fresh.placed.push(first);
  let restored = restoreStageState(stage, normalizeProgressRecord(stage, snapshotStageState(fresh)));
  assert.deepEqual(restored.targets, []);
  assert.equal(restored.placed.length, 1);
  const second = { x: 281, y: 289, angle: 90, flipped: true, shapeIndex: 1 };
  restored.placed.push(second);
  restored.targets = makeStageTargets(stage, restored.placed);
  restored.activeShape = 1;
  restored.cursors[1].angle = 180;
  const saved = normalizeProgressRecord(stage, snapshotStageState(restored));
  const reopened = restoreStageState(stage, saved);
  assert.equal(reopened.activeShape, 1);
  assert.equal(reopened.cursors[1].angle, 180);
  assert.deepEqual(reopened.targets, restored.targets);
  assert.deepEqual(reopened.placed, [first, second]);
  assert.equal(normalizeProgressRecord(STAGES[1], snapshotStageState(restored)), null);
});

test('operation guidance ends only after a stage using that operation has been cleared', () => {
  const stages = [
    { key: '1-1', group: 'p1', doubleMode: false, allowRotate: false, allowFlip: false },
    { key: '1-2', group: 'pm', doubleMode: false, allowRotate: false, allowFlip: true },
    { key: '1-3', group: 'p2', doubleMode: false, allowRotate: true, allowFlip: false },
    { key: '3-1', group: 'p1', doubleMode: true, allowRotate: false, allowFlip: false },
    { key: '3-2', group: 'pm', doubleMode: true, allowRotate: false, allowFlip: true },
  ];
  const records = { '1-1': { completed: true }, '3-1': { completed: true } };
  for (const operation of ['rotate', 'flip', 'change']) {
    assert.equal(hasClearedOperation(stages, records, operation), false);
  }
  records['1-2'] = { completed: true };
  assert.equal(hasClearedOperation(stages, records, 'flip'), true);
  assert.equal(hasClearedOperation(stages, records, 'rotate'), false);
  records['1-3'] = { completed: true };
  assert.equal(hasClearedOperation(stages, records, 'rotate'), true);
  records['3-2'] = { completed: true };
  assert.equal(hasClearedOperation(stages, records, 'change'), true);
  delete records['3-2'];
  assert.equal(hasClearedOperation(stages, records, 'change'), false);
});

test('debug completion erase preserves the pattern and later worlds while relocking the next world', () => {
  const stage = STAGES[29]; // 2-13
  const initial = { x: 263, y: 271, angle: 0, flipped: false, shapeIndex: 0 };
  const pattern = [initial, ...makeTargets(stage, initial)];
  const records = Object.fromEntries(STAGES.map((item) => [item.key, { completed: true }]));
  const solved = {
    ...snapshotStageState(restoreStageState(stage, null)),
    completed: true, editing: false, clearSymbolsVisible: true,
    completedAt: 123, placed: pattern,
  };
  records[stage.key] = clearStageCompletion(solved);
  assert.equal(records[stage.key].completed, false);
  assert.equal(records[stage.key].editing, true);
  assert.equal(records[stage.key].clearSymbolsVisible, false);
  assert.deepEqual(records[stage.key].placed, pattern);
  assert.equal(isWorldComplete(STAGES, records, 1), false);
  assert.equal(isWorldUnlocked(STAGES, records, 2), false);
  assert.equal(records[STAGES[34].key].completed, true);
  const reopened = restoreStageState(stage, normalizeProgressRecord(stage, records[stage.key]));
  assert.equal(reopened.mode, 'play');
  assert.deepEqual(reopened.placed, pattern);
  records[stage.key].completed = true;
  assert.equal(isWorldUnlocked(STAGES, records, 2), true);
});

test('the title crown requires completion of every registered stage', () => {
  const records = Object.fromEntries(STAGES.map((stage) => [stage.key, { completed: true }]));
  assert.equal(isEveryStageComplete(STAGES, records), true);
  records[STAGES[4].key] = clearStageCompletion(records[STAGES[4].key]);
  assert.equal(isEveryStageComplete(STAGES, records), false);
  assert.equal(isEveryStageComplete([], records), false);
});

test('older overfilled progress is trimmed to the stage placement limit', () => {
  const stage = STAGES[1];
  const fresh = restoreStageState(stage, null);
  const initial = { x: 263, y: 271, angle: 0, flipped: false };
  fresh.placed = [initial, ...makeTargets(stage, initial), { x: 299, y: 299, angle: 0, flipped: false }];
  const normalized = normalizeProgressRecord(stage, snapshotStageState(fresh));
  assert.equal(normalized.placed.length, requiredPlacementCount(stage));
});

test('a completed stage retains completion after reset but discards its old pattern', () => {
  const stage = STAGES[1];
  const completedAt = 123456789;
  const reset = {
    ...restoreStageState(stage, null), completed: true, completedAt,
    mode: 'play', placed: [], targets: [],
  };
  const snapshot = snapshotStageState(reset);
  assert.equal(snapshot.completed, true);
  assert.equal(snapshot.editing, true);
  assert.deepEqual(snapshot.placed, []);
  const restored = restoreStageState(stage, snapshot);
  assert.equal(restored.completed, true);
  assert.equal(restored.mode, 'play');
  assert.equal(restored.completedAt, completedAt);
  assert.deepEqual(restored.placed, []);
});

test('clear-only symmetry symbols survive reopening but disappear after reset', () => {
  const stage = STAGES.find((item) => item.clearSymbols.length > 0);
  const initial = { x: 263, y: 271, angle: 0, flipped: false };
  const completed = {
    ...restoreStageState(stage, null), mode: 'view', completed: true,
    clearSymbolsVisible: true, placed: [initial, ...makeTargets(stage, initial)],
  };
  const stored = snapshotStageState(completed);
  const reopened = restoreStageState(stage, normalizeProgressRecord(stage, stored));
  assert.equal(reopened.clearSymbolsVisible, true);
  assert.equal(reopened.mode, 'view');

  const oldStored = { ...stored };
  delete oldStored.clearSymbolsVisible;
  assert.equal(normalizeProgressRecord(stage, oldStored).clearSymbolsVisible, true);

  const reset = { ...reopened, mode: 'play', placed: [], targets: [], clearSymbolsVisible: false };
  const afterReset = restoreStageState(stage, normalizeProgressRecord(stage, snapshotStageState(reset)));
  assert.equal(afterReset.completed, true);
  assert.equal(afterReset.clearSymbolsVisible, false);
});

test('legacy completion records migrate into view mode', () => {
  const stage = STAGES[0];
  const initial = { x: 260, y: 280, angle: 0, flipped: false };
  const oldRecord = {
    group: stage.group, type: 'triangle', color: '#eb856f', size: 90,
    placed: [initial], completedAt: 42,
  };
  const normalized = normalizeProgressRecord(stage, oldRecord, true);
  assert.equal(normalized.completed, true);
  assert.deepEqual(normalized.cursor, { angle: 0, flipped: false });
  assert.equal(restoreStageState(stage, normalized).mode, 'view');
});

test('unplaced stages show a number regardless of completion status', () => {
  assert.equal(shouldShowStageNumber(null), true);
  assert.equal(shouldShowStageNumber({ completed: false, placed: [] }), true);
  assert.equal(shouldShowStageNumber({ completed: true, placed: [] }), true);
  assert.equal(shouldShowStageNumber({ completed: false, placed: [{ x: 1 }] }), false);
  assert.equal(shouldShowStageNumber({ completed: true, placed: [{ x: 1 }] }), false);
});
