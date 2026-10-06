import test from 'node:test';
import assert from 'node:assert/strict';
import { drawSymmetryElements } from '../src/ui/symmetryRenderer.js';

test('glide dashes are thicker than mirror axes', () => {
  const widths = [];
  const ctx = {
    save() {}, restore() {}, translate() {}, beginPath() {}, setLineDash() {},
    moveTo() {}, lineTo() {}, stroke() { widths.push(this.lineWidth); },
  };
  const hints = { showProblem: true, mirror: true, glide: true, rotation: true };
  drawSymmetryElements(ctx, 'pg', 200, 200, 200, hints, [1], [], false, 1, '#d43d79');
  drawSymmetryElements(ctx, 'pm', 200, 200, 200, hints, [1], [], false, 1, '#d43d79');
  assert.deepEqual(widths, [7, 4]);
});
