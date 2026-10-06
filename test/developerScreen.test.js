import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SUB_COLOR, STAGE_WORLDS } from '../src/game/stages.js';
import { drawDeveloperSymbolPreview, migrateDraftWorldColors, removeDraftWorld, stageButtonLabel, swapDraftStages } from '../src/ui/developerScreen.js';

test('developer stage labels use global numbers and current groups', () => {
  const worlds = structuredClone(STAGE_WORLDS);
  assert.equal(stageButtonLabel(worlds, 0, 0), `1 : ${worlds[0].stages[0].group}`);
  assert.equal(stageButtonLabel(worlds, 1, 0), `18 : ${worlds[1].stages[0].group}`);
  assert.equal(stageButtonLabel(worlds, 1, 16), `34 : ${worlds[1].stages[16].group}`);
});

test('dropping one stage on another swaps their complete configurations and updates labels', () => {
  const worlds = structuredClone(STAGE_WORLDS);
  worlds[1].stages[0].sizeMin = 0.31;
  const first = worlds[1].stages[0];
  const second = worlds[1].stages[1];
  assert.equal(swapDraftStages(worlds, 1, 0, 1), true);
  assert.strictEqual(worlds[1].stages[0], second);
  assert.strictEqual(worlds[1].stages[1], first);
  assert.equal(worlds[1].stages[1].sizeMin, 0.31);
  assert.equal(stageButtonLabel(worlds, 1, 0), `18 : ${second.group}`);
  assert.equal(stageButtonLabel(worlds, 1, 1), `19 : ${first.group}`);
  assert.equal(swapDraftStages(worlds, 1, 0, 0), false);
  assert.equal(swapDraftStages(worlds, 1, -1, 1), false);
});

test('accent colors are configured once per world', () => {
  for (const world of STAGE_WORLDS) {
    assert.match(world.theme.symbolColor, /^#[0-9a-f]{6}$/i);
    assert.match(world.theme.clearColor, /^#[0-9a-f]{6}$/i);
    assert.match(world.theme.subColor, /^#[0-9a-f]{6}$/i);
    for (const stage of world.stages) {
      assert.equal(Object.hasOwn(stage, 'symbolColor'), false);
      assert.equal(Object.hasOwn(stage, 'clearColor'), false);
    }
  }
});

test('old stage colors migrate to the first stage color of each world', () => {
  const worlds = structuredClone(STAGE_WORLDS);
  delete worlds[1].theme.symbolColor;
  delete worlds[1].theme.clearColor;
  delete worlds[1].theme.subColor;
  worlds[1].stages[0].symbolColor = '#123456';
  worlds[1].stages[0].clearColor = '#abcdef';
  worlds[1].stages[1].symbolColor = '#654321';
  migrateDraftWorldColors(worlds);
  assert.equal(worlds[1].theme.symbolColor, '#123456');
  assert.equal(worlds[1].theme.clearColor, '#abcdef');
  assert.equal(worlds[1].theme.subColor, DEFAULT_SUB_COLOR);
  assert.equal(Object.hasOwn(worlds[1].stages[0], 'symbolColor'), false);
  assert.equal(Object.hasOwn(worlds[1].stages[1], 'symbolColor'), false);
});

test('selected clear-only symbols appear on the editor lattice in the clear color', () => {
  const stage = STAGE_WORLDS.flatMap((world) => world.stages)
    .find((item) => item.symbols.length > 0 && item.clearSymbols.length > 0);
  assert.ok(stage);
  const colors = [];
  const ctx = {
    save() {}, restore() {}, translate() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, ellipse() {}, setLineDash() {},
    stroke() { colors.push(this.strokeStyle); }, fill() { colors.push(this.fillStyle); },
  };
  const theme = { symbolColor: '#112233', clearColor: '#445566' };
  drawDeveloperSymbolPreview(ctx, stage, theme, () => {});
  assert.ok(colors.includes(theme.symbolColor));
  assert.ok(colors.includes(theme.clearColor));
  colors.length = 0;
  drawDeveloperSymbolPreview(ctx, { ...stage, clearSymbols: [] }, theme, () => {});
  assert.equal(colors.includes(theme.clearColor), false);
});

test('deleting a world renumbers the remainder and their stage labels', () => {
  const worlds = structuredClone(STAGE_WORLDS.slice(0, 2));
  worlds.push({ ...structuredClone(worlds[1]), id: 3 });
  worlds.push({ ...structuredClone(worlds[1]), id: 4 });
  assert.equal(removeDraftWorld(worlds, 1), true);
  assert.deepEqual(worlds.map((world) => world.id), [1, 2, 3]);
  assert.equal(stageButtonLabel(worlds, 1, 0), '18 : p1');
  assert.equal(stageButtonLabel(worlds, 2, 0), '35 : p1');
  assert.equal(removeDraftWorld(worlds, -1), false);
  assert.equal(removeDraftWorld(worlds, 1), true);
  assert.equal(removeDraftWorld(worlds, 1), true);
  assert.equal(removeDraftWorld(worlds, 0), false);
});
