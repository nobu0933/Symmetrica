import { SymmetryGroups } from './symmetryGroups.js';
import { STAGES } from './stages.js';
import { SHAPE_TYPES } from './shapes.js';

export const CELL = 200;
export const OFFSET = 200;
export const MAX_SHAPES = 30;
export const SNAP_DISTANCE = CELL * 0.075;

const mod = (value, size) => ((value % size) + size) % size;
const wrap = (value, offset, size) => offset + mod(value - offset, size);

export function canonicalPosition(x, y, hex = false) {
  if (!hex) return { x: wrap(x, OFFSET, CELL), y: wrap(y, OFFSET, CELL) };
  const height = CELL * Math.sqrt(3) / 2;
  const v = (y - OFFSET) / height;
  const u = (x - OFFSET - v * CELL / 2) / CELL;
  return { x: OFFSET + mod(u, 1) * CELL + mod(v, 1) * CELL / 2, y: OFFSET + mod(v, 1) * height };
}

function wrapHex(x, y, offsetX, offsetY, size) {
  const height = size * Math.sqrt(3) / 2;
  const v = (y - offsetY) / height;
  const u = (x - offsetX - v * size / 2) / size;
  return { x: offsetX + mod(u, 1) * size + mod(v, 1) * size / 2, y: offsetY + mod(v, 1) * height };
}

export function periodicDelta(a, b, hex = false) {
  let best = { x: Infinity, y: Infinity, distance: Infinity };
  const height = CELL * Math.sqrt(3) / 2;
  for (let u = -4; u <= 4; u++) {
    for (let v = -4; v <= 4; v++) {
      const x = a.x - b.x - u * CELL - (hex ? v * CELL / 2 : 0);
      const y = a.y - b.y - v * (hex ? height : CELL);
      const distance = Math.hypot(x, y);
      if (distance < best.distance) best = { x, y, distance };
    }
  }
  return best;
}

export function samePlacement(a, b, hex, tolerance = 0.6) {
  return (a.shapeIndex ?? 0) === (b.shapeIndex ?? 0) && a.angle === b.angle && a.flipped === b.flipped &&
    periodicDelta(a, b, hex).distance <= tolerance;
}

// Drawing applies rotation after the optional local reflection. Reflecting the
// visible tile around the screen's vertical axis therefore negates its angle.
export function reflectCursorVertically(cursor) {
  return { angle: (360 - cursor.angle) % 360, flipped: !cursor.flipped };
}

export function makeRandomShape(stage, random = Math.random, previous = null) {
  const step = stage.hex ? 60 : 90;
  const allowedAngles = stage.initialAngles?.filter((angle) =>
    Number.isInteger(angle) && angle >= 0 && angle < 360 && angle % step === 0) || [];
  const angles = allowedAngles.length ? allowedAngles : Array.from({ length: 360 / step }, (_, index) => index * step);
  const types = previous ? SHAPE_TYPES.filter((type) => type !== previous.type) : SHAPE_TYPES;
  const minSize = CELL * stage.sizeMin;
  const sizeRange = CELL * (stage.sizeMax - stage.sizeMin);
  let size = minSize + random() * sizeRange;
  if (previous && sizeRange > 0 && Math.abs(size - previous.size) < Math.min(2, sizeRange / 4)) {
    size = minSize + ((size - minSize + sizeRange / 2) % sizeRange);
  }
  return {
    type: types[Math.floor(random() * types.length)],
    color: stage.theme?.foreground || '#f0f2f5',
    size,
    angle: angles[Math.floor(random() * angles.length)],
    flipped: random() >= 0.5,
  };
}

export function requiredPlacementCount(stage) {
  return (stage.doubleMode ? 2 : 1) *
    (1 + makeTargets(stage, { x: 263, y: 271, angle: 0, flipped: false }).length);
}

export function makeTargets(stage, initial) {
  const group = SymmetryGroups[stage.group];
  const raw = group.getCorrectShapes(initial, OFFSET, OFFSET, CELL, wrap, wrapHex);
  const targets = [];
  for (const shape of raw) {
    const position = canonicalPosition(shape.x, shape.y, stage.hex);
    const candidate = { ...shape, ...position, angle: mod(shape.angle, 360), shapeIndex: initial.shapeIndex ?? 0 };
    if (!targets.some((placed) => samePlacement(placed, candidate, stage.hex))) targets.push(candidate);
  }
  // Original group generators mark the initial shape, except for a few legacy
  // variants. The initial input is always the first orbit member logically.
  const initialIndex = targets.findIndex((target) => samePlacement(target, initial, stage.hex));
  if (initialIndex >= 0) targets.splice(initialIndex, 1);
  return targets;
}

export function makeStageTargets(stage, placed) {
  const initialCount = stage.doubleMode ? 2 : 1;
  if (placed.length < initialCount) return [];
  return placed.slice(0, initialCount).flatMap((initial) => makeTargets(stage, initial));
}

export function snapPlacement(raw, targets, placed, stage) {
  let best = SNAP_DISTANCE;
  let snapped = { ...raw };
  for (const target of [...targets, ...placed]) {
    if ((raw.shapeIndex ?? 0) !== (target.shapeIndex ?? 0) || raw.angle !== target.angle || raw.flipped !== target.flipped) continue;
    const delta = periodicDelta(raw, target, stage.hex);
    if (delta.distance < best) {
      best = delta.distance;
      snapped = { ...raw, x: raw.x - delta.x, y: raw.y - delta.y };
    }
  }
  return snapped;
}

export function isComplete(placed, targets, stage) {
  const initialCount = stage.doubleMode ? 2 : 1;
  if (placed.length < initialCount) return false;
  const additions = placed.slice(initialCount);
  return additions.length === targets.length &&
    additions.every((item) => targets.some((target) => samePlacement(item, target, stage.hex)));
}

export function isPlacementCorrect(placed, index, targets, stage) {
  if (index < 0 || index >= placed.length) return false;
  if (index < (stage.doubleMode ? 2 : 1)) return true;
  return targets.some((target) => samePlacement(placed[index], target, stage.hex));
}

export function placementOutcome(placed, targets, stage) {
  const initialCount = stage.doubleMode ? 2 : 1;
  if (placed.length > 0 && isComplete(placed, targets, stage)) return 'complete';
  return placed.length >= initialCount && placed.length >= targets.length + initialCount ? 'overfilled' : 'incomplete';
}

export function addPlacement(state, placement) {
  if (state.placed.some((shape) => samePlacement(shape, placement, state.stage.hex))) return 'duplicate';
  const initialCount = state.stage.doubleMode ? 2 : 1;
  const stageLimit = state.placed.length >= initialCount
    ? (state.targets?.length ?? requiredPlacementCount(state.stage) - initialCount) + initialCount
    : requiredPlacementCount(state.stage);
  if (state.placed.length >= MAX_SHAPES) return 'limit';
  if (state.placed.length >= stageLimit) return 'stage-limit';
  state.placed.push(placement);
  return 'added';
}

export function stageAt(index) {
  return STAGES[index];
}
