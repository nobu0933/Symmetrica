import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeDefs } from '../src/game/shapes.js';

test('mountain tile renders at 80% of its former size without changing proportions', () => {
  const points = [];
  const context = {
    moveTo: (x, y) => points.push([x, y]),
    lineTo: (x, y) => points.push([x, y]),
    closePath: () => {},
  };
  ShapeDefs.step_triangle.drawPath(context, 100);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  assert.ok(Math.abs(width - 130 * 0.8) < 1e-9);
  assert.ok(Math.abs(height - 100 * Math.sqrt(3) / 2 * 0.8) < 1e-9);
});
