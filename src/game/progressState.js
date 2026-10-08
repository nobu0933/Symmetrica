import { ShapeDefs } from './shapes.js';
import { makeRandomShape, makeStageTargets, requiredPlacementCount } from './gameEngine.js';

const validPlacement = (item) => item && Number.isFinite(item.x) && Number.isFinite(item.y) &&
  Number.isFinite(item.angle) && typeof item.flipped === 'boolean' &&
  (item.placedAt == null || Number.isFinite(item.placedAt));

const validShape = (shape) => shape && ShapeDefs[shape.type] && /^#[0-9a-f]{6}$/i.test(shape.color) &&
  Number.isFinite(shape.size) && shape.size >= 10 && shape.size <= 200;
const validCursor = (cursor) => cursor && Number.isFinite(cursor.angle) && typeof cursor.flipped === 'boolean';

export function freshStageState(stage, previous = null) {
  const firstAttempt = !previous && stage.key === '1-1';
  const openingTriangle = !previous && ['1-2', '1-3'].includes(stage.key);
  const first = makeRandomShape(stage, Math.random, previous?.shapes?.[0] || previous);
  if (firstAttempt || openingTriangle) first.type = 'triangle';
  const second = stage.doubleMode ? makeRandomShape(stage, Math.random, first) : null;
  const shapes = [{ type: first.type, color: first.color, size: first.size }];
  if (second) shapes.push({ type: second.type, color: second.color, size: second.size });
  const cursors = [{ angle: first.angle, flipped: first.flipped }];
  if (second) cursors.push({ angle: second.angle, flipped: second.flipped });
  return {
    stage, mode: 'play', completed: previous?.completed === true, firstAttempt, openingTriangle,
    clearSymbolsVisible: false, completedAt: previous?.completedAt || null,
    type: shapes[0].type, color: shapes[0].color, size: shapes[0].size,
    shapes, cursors, activeShape: 0, cursor: cursors[0], placed: [], targets: [],
  };
}

export function normalizeProgressRecord(stage, value, legacy = false) {
  if (!value || value.group !== stage.group || !Array.isArray(value.placed) ||
    value.placed.length > 30 || (legacy && value.placed.length === 0) ||
    !value.placed.every(validPlacement) ||
    Boolean(value.doubleMode) !== Boolean(stage.doubleMode) ||
    !validShape(value)) return null;
  const shapes = stage.doubleMode ? value.shapes : [value.shapes?.[0] || { type: value.type, color: value.color, size: value.size }];
  if (!Array.isArray(shapes) || shapes.length !== (stage.doubleMode ? 2 : 1) ||
    !shapes.every(validShape) || (stage.doubleMode && shapes[0].type === shapes[1].type) ||
    value.placed.some((item, index) => !Number.isInteger(item.shapeIndex ?? 0) ||
      (item.shapeIndex ?? 0) >= shapes.length || (item.shapeIndex ?? 0) < 0 ||
      (stage.doubleMode && index < 2 && (item.shapeIndex ?? 0) !== index))) return null;
  const fallback = value.placed[0] || { angle: 0, flipped: false };
  const cursor = value.cursor || fallback;
  const cursors = stage.doubleMode ? value.cursors : [cursor];
  if (!Array.isArray(cursors) || cursors.length !== shapes.length || !cursors.every(validCursor)) return null;
  const activeShape = stage.doubleMode ? value.activeShape : 0;
  if (!Number.isInteger(activeShape) || activeShape < 0 || activeShape >= shapes.length) return null;
  const completed = legacy ? true : value.completed === true;
  const editing = legacy ? false : value.editing === true;
  const firstAttempt = !legacy && stage.key === '1-1' && value.firstAttempt !== false && value.placed.length === 0 && !completed;
  const openingTriangle = !legacy && ['1-2', '1-3'].includes(stage.key) &&
    value.placed.length === 0 && !completed && value.openingTriangle !== false;
  const normalizedShapes = shapes.map((shape) => ({ ...shape }));
  if (firstAttempt || openingTriangle) normalizedShapes[0].type = 'triangle';
  return {
    group: stage.group,
    completed,
    editing,
    clearSymbolsVisible: completed && value.placed.length > 0 &&
      (value.clearSymbolsVisible === true || (value.clearSymbolsVisible == null && !editing)),
    firstAttempt,
    openingTriangle,
    type: firstAttempt || openingTriangle ? 'triangle' : value.type,
    color: value.color,
    size: value.size,
    placed: value.placed.slice(0, requiredPlacementCount(stage)).map((item) => ({ ...item })),
    cursor: { angle: cursor.angle, flipped: cursor.flipped },
    shapes: normalizedShapes,
    cursors: cursors.map((item) => ({ angle: item.angle, flipped: item.flipped })),
    activeShape,
    doubleMode: Boolean(stage.doubleMode),
    completedAt: value.completedAt || null,
  };
}

export function restoreStageState(stage, record) {
  if (!record) {
    return freshStageState(stage);
  }
  const placed = record.placed.map((item) => ({ ...item }));
  return {
    stage,
    mode: stageModeFromRecord(record),
    completed: record.completed,
    clearSymbolsVisible: record.clearSymbolsVisible === true,
    firstAttempt: record.firstAttempt === true,
    openingTriangle: record.openingTriangle === true,
    type: record.firstAttempt || record.openingTriangle ? 'triangle' : record.type,
    color: record.color,
    size: record.size,
    placed,
    targets: makeStageTargets(stage, placed),
    shapes: record.shapes?.map((shape, index) => ({ ...shape,
      type: index === 0 && (record.firstAttempt || record.openingTriangle) ? 'triangle' : shape.type,
    })) || [{ type: record.firstAttempt || record.openingTriangle ? 'triangle' : record.type, color: record.color, size: record.size }],
    cursors: record.cursors?.map((item) => ({ ...item })) || [{ ...record.cursor }],
    activeShape: record.activeShape ?? 0,
    cursor: { ...record.cursor },
    completedAt: record.completedAt,
  };
}

export function stageModeFromRecord(record) {
  return record?.completed && !record.editing ? 'view' : 'play';
}

export function snapshotStageState(state) {
  return {
    group: state.stage.group,
    completed: state.completed,
    clearSymbolsVisible: state.clearSymbolsVisible === true,
    firstAttempt: state.firstAttempt === true,
    openingTriangle: state.openingTriangle === true,
    editing: state.mode === 'play',
    type: state.type,
    color: state.color,
    size: state.size,
    placed: state.placed.map((item) => ({ ...item })),
    cursor: { ...(state.stage.doubleMode ? state.cursors[0] : state.cursor) },
    shapes: state.shapes.map((shape) => ({ ...shape })),
    cursors: (state.stage.doubleMode ? state.cursors : [state.cursor]).map((item) => ({ ...item })),
    activeShape: state.activeShape,
    doubleMode: Boolean(state.stage.doubleMode),
    completedAt: state.completedAt || null,
  };
}

export function shouldShowStageNumber(record) {
  return !record?.placed?.length;
}

export function shouldOpenStageSelectionAtStartup(stages, records) {
  return Boolean(stages[0] && records[stages[0].key]?.completed === true);
}

export function clearStageCompletion(record) {
  if (!record?.completed) return record;
  return {
    ...record,
    completed: false,
    editing: true,
    clearSymbolsVisible: false,
    completedAt: null,
  };
}

export function isWorldComplete(stages, records, worldIndex) {
  const members = stages.filter((stage) => stage.worldIndex === worldIndex);
  return members.length > 0 && members.every((stage) => records[stage.key]?.completed === true);
}

export function isEveryStageComplete(stages, records) {
  return stages.length > 0 && stages.every((stage) => records[stage.key]?.completed === true);
}

export function isWorldUnlocked(stages, records, worldIndex) {
  if (worldIndex === 0) return true;
  return Array.from({ length: worldIndex }, (_, index) => index)
    .every((index) => isWorldComplete(stages, records, index));
}

export function unlockedStageCount(stages, records) {
  return stages.filter((stage) => isWorldUnlocked(stages, records, stage.worldIndex)).length;
}

export function hasClearedOperation(stages, records, operation) {
  const enabled = {
    rotate: (stage) => stage.allowRotate,
    flip: (stage) => stage.allowFlip,
    change: (stage) => stage.doubleMode && stage.group !== 'p1',
  }[operation];
  return Boolean(enabled && stages.some((stage) => enabled(stage) && records[stage.key]?.completed === true));
}
