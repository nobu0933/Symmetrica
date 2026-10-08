import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACEMENT_FLASH_HOLD_MS, PLACEMENT_FLASH_MS, placementFlashColor } from '../src/ui/placementFeedback.js';

test('a correct placement briefly uses the clear color, then returns to the figure color', () => {
  assert.equal(placementFlashColor('#b6bb06', '#f0f2f5', 0), '#b6bb06');
  assert.equal(placementFlashColor('#b6bb06', '#f0f2f5', PLACEMENT_FLASH_HOLD_MS), '#b6bb06');
  const middle = placementFlashColor('#b6bb06', '#f0f2f5', (PLACEMENT_FLASH_HOLD_MS + PLACEMENT_FLASH_MS) / 2);
  assert.notEqual(middle, '#b6bb06');
  assert.notEqual(middle, '#f0f2f5');
  assert.equal(placementFlashColor('#b6bb06', '#f0f2f5', PLACEMENT_FLASH_MS), '#f0f2f5');
  assert.equal(placementFlashColor('#b6bb06', '#f0f2f5', PLACEMENT_FLASH_MS + 100), '#f0f2f5');
});
