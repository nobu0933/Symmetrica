import test from 'node:test';
import assert from 'node:assert/strict';
import { clampBoardPoint } from '../src/ui/previewPointer.js';

test('a preview leaving the board stays at the nearest edge', () => {
  assert.deepEqual(clampBoardPoint({ x: 624, y: 315 }), { x: 600, y: 315 });
  assert.deepEqual(clampBoardPoint({ x: -20, y: 642 }), { x: 0, y: 600 });
  assert.deepEqual(clampBoardPoint({ x: 240, y: 180 }), { x: 240, y: 180 });
});
