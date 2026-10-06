import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStages, STAGES, STAGE_WORLDS } from '../src/game/stages.js';
import { isWorldComplete, isWorldUnlocked, unlockedStageCount } from '../src/game/progressState.js';
import { SymmetryConfig } from '../src/game/symmetryConfig.js';
import {
  MAX_SHAPES, addPlacement, isComplete, isPlacementCorrect, makeRandomShape, makeStageTargets, makeTargets, placementOutcome, reflectCursorVertically, requiredPlacementCount,
  samePlacement, snapPlacement,
} from '../src/game/gameEngine.js';

test('configured worlds contain 17 stages each with consecutive display numbers', () => {
  assert.equal(STAGES.length, STAGE_WORLDS.length * 17);
  assert.ok(STAGE_WORLDS.every((world) => world.stages.length === 17));
  assert.deepEqual(STAGES.map((stage) => stage.number), Array.from({ length: STAGES.length }, (_, index) => index + 1));
  assert.equal(STAGES[17].key, '2-1');
  assert.equal(STAGES[17].theme.background, STAGE_WORLDS[1].theme.background);
  assert.notStrictEqual(STAGE_WORLDS[0].stages[0], STAGE_WORLDS[1].stages[0]);
  for (const stage of STAGES) {
    assert.equal(stage.key, `${stage.world}-${stage.level}`);
    const config = SymmetryConfig[stage.group];
    assert.ok(config, stage.group);
    for (const id of stage.symbols) {
      assert.ok(config.rotations?.[id] || config.lines?.[id], `${stage.group}: ${id}`);
    }
    for (const id of stage.clearSymbols) {
      assert.ok(config.rotations?.[id] || config.lines?.[id], `${stage.group}: clear ${id}`);
      assert.equal(stage.symbols.includes(id), false);
    }
  }
});

test('third world defaults to double and fourth to blind without overriding explicit stage choices', () => {
  assert.ok(STAGES.filter((stage) => stage.world === 3).every((stage) => stage.doubleMode && !stage.blindMode));
  assert.ok(STAGES.filter((stage) => stage.world === 4).every((stage) => !stage.doubleMode && stage.blindMode));
  const worlds = structuredClone(STAGE_WORLDS.slice(0, 3));
  worlds[2].stages[0].doubleMode = false;
  worlds[2].stages[0].blindMode = true;
  const changed = buildStages(worlds)[34];
  assert.equal(changed.doubleMode, false);
  assert.equal(changed.blindMode, true);
});

test('second world unlocks only after all first-world stages are cleared', () => {
  const records = Object.fromEntries(STAGES.slice(0, 16).map((stage) => [stage.key, { completed: true }]));
  assert.equal(isWorldComplete(STAGES, records, 0), false);
  assert.equal(isWorldUnlocked(STAGES, records, 1), false);
  assert.equal(unlockedStageCount(STAGES, records), 17);
  records[STAGES[16].key] = { completed: true };
  assert.equal(isWorldComplete(STAGES, records, 0), true);
  assert.equal(isWorldUnlocked(STAGES, records, 1), true);
  assert.equal(unlockedStageCount(STAGES, records), 34);
  assert.equal(isWorldUnlocked(STAGES, records, 2), false);
});

test('additional worlds receive consecutive IDs and unlock one completed world at a time', () => {
  const worlds = structuredClone(STAGE_WORLDS.slice(0, 2));
  worlds.push({ ...structuredClone(worlds[1]), id: 3 });
  worlds.push({ ...structuredClone(worlds[1]), id: 4 });
  worlds[2].theme.symbolColor = '#123456';
  worlds[2].theme.clearColor = '#abcdef';
  const stages = buildStages(worlds);
  assert.equal(stages.length, 68);
  assert.deepEqual([stages[34].key, stages[34].number, stages[51].key, stages[51].number], ['3-1', 35, '4-1', 52]);
  assert.equal(stages[34].symbolColor, '#123456');
  assert.equal(stages[50].clearColor, '#abcdef');
  const records = {};
  assert.equal(unlockedStageCount(stages, records), 17);
  for (let worldIndex = 0; worldIndex < 3; worldIndex++) {
    for (const stage of stages.filter((item) => item.worldIndex === worldIndex)) records[stage.key] = { completed: true };
    assert.equal(unlockedStageCount(stages, records), (worldIndex + 2) * 17);
  }
});

test('stage settings constrain initial angles and size; figure color follows world theme', () => {
  const stage = { ...STAGES[1], initialAngles: [180], sizeMin: 0.45, sizeMax: 0.45 };
  const shape = makeRandomShape(stage, () => 0.25);
  assert.equal(shape.angle, 180);
  assert.equal(shape.size, 90);
  assert.equal(shape.color, '#f0f2f5');
});

test('flip reflects the current orientation across the vertical screen axis', () => {
  for (const angle of [0, 60, 90, 120, 180, 270, 300]) {
    for (const flipped of [false, true]) {
      const cursor = { angle, flipped };
      const reflected = reflectCursorVertically(cursor);
      assert.deepEqual(reflected, { angle: (360 - angle) % 360, flipped: !flipped });
      assert.deepEqual(reflectCursorVertically(reflected), cursor);
    }
  }
});

test('every stage produces a solvable orbit at a regular point', () => {
  for (const stage of STAGES) {
    const initials = [{ x: 263, y: 271, angle: 0, flipped: false, shapeIndex: 0 }];
    if (stage.doubleMode) initials.push({ x: 283, y: 291, angle: 0, flipped: false, shapeIndex: 1 });
    const targets = makeStageTargets(stage, initials);
    assert.ok(targets.length + initials.length <= MAX_SHAPES, stage.group);
    assert.equal(new Set(targets.map((item) => `${item.x.toFixed(3)}:${item.y.toFixed(3)}:${item.angle}:${item.flipped}:${item.shapeIndex}`)).size, targets.length, stage.group);
    assert.equal(isComplete([...initials, ...targets], targets, stage), true, stage.group);
  }
});

test('double mode requires two distinct shape orbits and preserves shape-specific snapping', () => {
  const stage = { ...STAGES[1], doubleMode: true };
  const initials = [
    { x: 263, y: 271, angle: 0, flipped: false, shapeIndex: 0 },
    { x: 263, y: 271, angle: 0, flipped: false, shapeIndex: 1 },
  ];
  assert.equal(requiredPlacementCount(stage), requiredPlacementCount(STAGES[1]) * 2);
  assert.equal(samePlacement(initials[0], initials[1], stage.hex), false);
  assert.equal(placementOutcome(initials.slice(0, 1), [], stage), 'incomplete');
  const targets = makeStageTargets(stage, initials);
  assert.equal(targets.length, makeTargets(stage, initials[0]).length * 2);
  assert.equal(isComplete([...initials, ...targets], targets, stage), true);
  const nearOther = { ...initials[1], x: initials[1].x + 3 };
  assert.ok(samePlacement(snapPlacement(nearOther, targets, initials, stage), initials[1], stage.hex));
  const onlyOtherType = snapPlacement({ ...nearOther, shapeIndex: 0 }, [], [initials[1]], stage);
  assert.equal(onlyOtherType.x, nearOther.x);
});

test('p1 completes with its first placement', () => {
  const initial = { x: 259, y: 291, angle: 90, flipped: true };
  const targets = makeTargets(STAGES[0], initial);
  assert.equal(targets.length, 0);
  assert.equal(isComplete([initial], targets, STAGES[0]), true);
  assert.equal(requiredPlacementCount(STAGES[0]), 1);
});

test('a full but incorrect pattern signals the gauge without clearing', () => {
  const stage = STAGES[1];
  const initial = { x: 263, y: 271, angle: 0, flipped: false };
  const targets = makeTargets(stage, initial);
  assert.equal(placementOutcome([initial], targets, stage), 'incomplete');
  assert.equal(placementOutcome([initial, ...targets], targets, stage), 'complete');
  const wrong = { ...initial, x: initial.x + 29, y: initial.y + 32 };
  assert.equal(placementOutcome([initial, wrong], targets, stage), 'overfilled');
  assert.equal(placementOutcome([initial, ...targets, wrong], targets, stage), 'overfilled');
});

test('each gauge segment reflects whether its placement matches a target', () => {
  const stage = STAGES[1];
  const initial = { x: 263, y: 271, angle: 0, flipped: false };
  const targets = makeTargets(stage, initial);
  const wrong = { ...targets[0], x: targets[0].x + 24 };
  assert.equal(isPlacementCorrect([initial], 0, targets, stage), true);
  assert.equal(isPlacementCorrect([initial, targets[0]], 1, targets, stage), true);
  assert.equal(isPlacementCorrect([initial, wrong], 1, targets, stage), false);
  assert.equal(isPlacementCorrect([initial, targets[0]], 2, targets, stage), false);
});

test('placing the initial shape on symmetry marks does not shorten an orbit', () => {
  for (const stage of STAGES) {
    const regular = makeTargets(stage, { x: 263, y: 271, angle: 0, flipped: false });
    for (const [x, y] of [[200, 200], [300, 200], [300, 300]]) {
      const special = makeTargets(stage, { x, y, angle: 0, flipped: false });
      assert.equal(special.length, regular.length, `${stage.group} at ${x},${y}`);
    }
  }
});

test('snap requires a matching orientation and respects lattice translations', () => {
  const stage = STAGES[1];
  const target = { x: 260, y: 270, angle: 180, flipped: false };
  const raw = { x: 463, y: 272, angle: 180, flipped: false };
  const snapped = snapPlacement(raw, [target], [], stage);
  assert.equal(samePlacement(snapped, target, false), true);
  const wrong = snapPlacement({ ...raw, flipped: true }, [target], [], stage);
  assert.deepEqual(wrong, { ...raw, flipped: true });
});

test('snap also targets an already placed tile, then duplicate placement is skipped', () => {
  const stage = STAGES[1];
  const initial = { x: 260, y: 270, angle: 0, flipped: false };
  const target = { x: 330, y: 320, angle: 180, flipped: false };
  const placed = [initial, target];
  const nearTarget = { x: 333, y: 322, angle: 180, flipped: false };
  const snapped = snapPlacement(nearTarget, [target], placed, stage);
  assert.equal(samePlacement(snapped, target, stage.hex), true);
  assert.equal(addPlacement({ stage, placed, targets: [target] }, snapped), 'duplicate');
  assert.deepEqual(snapPlacement({ ...nearTarget, flipped: true }, [target], placed, stage), { ...nearTarget, flipped: true });

  const nearInitial = { x: 263, y: 272, angle: 0, flipped: false };
  assert.equal(samePlacement(snapPlacement(nearInitial, [target], placed, stage), initial, stage.hex), true);
});

test('duplicate clicks are ignored before the stage-specific placement limit', () => {
  const initial = { x: 250, y: 250, angle: 0, flipped: false };
  const stage = STAGES[1];
  const state = { stage, placed: [initial], targets: makeTargets(stage, initial) };
  assert.equal(addPlacement(state, { ...initial, x: 450 }), 'duplicate');
  assert.equal(state.placed.length, 1);
  const limit = state.targets.length + 1;
  for (let index = 1; index < limit; index++) {
    assert.equal(addPlacement(state, { x: 250 + index * 7, y: 251, angle: 0, flipped: false }), 'added');
  }
  assert.equal(state.placed.length, limit);
  assert.equal(addPlacement(state, { x: 299, y: 250, angle: 0, flipped: false }), 'stage-limit');
  assert.equal(addPlacement(state, { ...initial, x: 450 }), 'duplicate');
  assert.equal(state.placed.length, limit);
});

test('random initial orientation uses lattice rotation steps', () => {
  for (const stage of STAGES) {
    const shape = makeRandomShape(stage, () => 0.33);
    assert.equal(shape.angle % (stage.hex ? 60 : 90), 0);
    assert.ok(shape.size >= 200 * stage.sizeMin && shape.size <= 200 * stage.sizeMax);
  }
});

test('reset draw changes shape and visible size while preserving world color', () => {
  const stage = STAGES[2];
  const first = makeRandomShape(stage, () => 0.33);
  const second = makeRandomShape(stage, () => 0.33, first);
  assert.notEqual(second.type, first.type);
  assert.equal(second.color, first.color);
  assert.ok(Math.abs(second.size - first.size) >= 2);
  assert.ok(second.size >= 80 && second.size <= 100);
});
