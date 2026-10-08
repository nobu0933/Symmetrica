import { DEFAULT_CLEAR_COLOR, DEFAULT_SUB_COLOR, DEFAULT_SYMBOL_COLOR, STAGES, STAGE_WORLDS } from './game/stages.js';
import { ShapeDefs } from './game/shapes.js';
import { clearStageCompletion, freshStageState, hasClearedOperation, isEveryStageComplete, isWorldComplete, isWorldUnlocked, normalizeProgressRecord, restoreStageState, shouldOpenStageSelectionAtStartup, shouldShowStageNumber, snapshotStageState, unlockedStageCount } from './game/progressState.js';
import { createDeveloperScreen } from './ui/developerScreen.js';
import { drawSymmetryElements } from './ui/symmetryRenderer.js';
import { blindPlacementAlpha } from './ui/blindMode.js';
import { FINAL_ICON_HOP_MS, NEXT_WORLD_BUTTON_DELAY_MS, NEXT_WORLD_BUTTON_LANDING_MS, unlockStepDelay } from './ui/unlockAnimation.js';
import { createSoundEffects } from './ui/soundEffects.js';
import { PLACEMENT_FLASH_MS, placementFlashColor } from './ui/placementFeedback.js';
import { clampBoardPoint } from './ui/previewPointer.js';
import { createSecretSequence } from './ui/secretSequence.js';
import {
  CELL, OFFSET, addPlacement, canonicalPosition, isPlacementCorrect,
  makeStageTargets, periodicDelta, placementOutcome, reflectCursorVertically, requiredPlacementCount, samePlacement, snapPlacement,
} from './game/gameEngine.js';

const STORAGE_KEY = 'symmetrica_progress_v2';
const LEGACY_KEY = 'symmetrica_completed_v1';
const UNLOCK_SEEN_KEY = 'symmetrica_world_unlocks_seen_v2';
const LEGACY_UNLOCK_SEEN_KEY = 'symmetrica_world_2_unlock_seen_v1';
const FINAL_CELEBRATION_KEY = 'symmetrica_final_world_celebration_v1';
const board = document.getElementById('board');
const context = board.getContext('2d');
const frame = document.getElementById('board-frame');
const gameScreen = document.getElementById('game-screen');
const screen = document.getElementById('stage-screen');
const grid = document.getElementById('stage-grid');
const crown = document.getElementById('title-crown');
const worldPrevious = document.getElementById('world-previous');
const worldNext = document.getElementById('world-next');
const indicator = document.getElementById('stage-indicator');
const gauge = document.getElementById('placement-gauge');
const touchPad = document.getElementById('touch-pad');
const touchPadShape = document.getElementById('touch-pad-shape');
const touchKnob = document.getElementById('touch-knob');
const controls = Object.fromEntries(['reset', 'undo', 'change', 'rotate', 'flip', 'previous', 'next'].map((id) => [id, document.getElementById(id)]));
const announcement = document.getElementById('announcement');
const confirmBackdrop = document.getElementById('confirm-backdrop');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileLayout = window.matchMedia('(hover: none) and (pointer: coarse) and (max-width: 950px)');
const TOUCH_HINT_IDLE_MS = 3500;
const sounds = createSoundEffects();
sounds.preload('arrivals');
sounds.preload('unlock');
sounds.preload('nextWorld');

// All screen geometry is authored on the same 1080px square. Only the empty
// space around it changes with the viewport; fonts and borders scale with it.
function updateScreenScale() {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  const scale = Math.min(width, height) / 1080;
  document.documentElement.style.setProperty('--screen-scale', String(scale));
  document.documentElement.style.setProperty('--game-scale', String(mobileLayout.matches
    ? Math.min(width / 1080, height / 1920) : scale));
}
window.addEventListener('resize', updateScreenScale);
window.visualViewport?.addEventListener('resize', updateScreenScale);
mobileLayout.addEventListener('change', updateScreenScale);
updateScreenScale();

function loadRecords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const legacy = stored === null;
    const raw = JSON.parse(stored ?? localStorage.getItem(LEGACY_KEY) ?? '{}');
    const records = {};
    for (const [key, value] of Object.entries(raw)) {
      const index = /^\d+$/.test(key) ? Number(key) : STAGES.findIndex((stage) => stage.key === key);
      if (!Number.isInteger(index) || index < 0 || index >= STAGES.length) continue;
      const normalized = normalizeProgressRecord(STAGES[index], value, legacy);
      if (normalized) records[STAGES[index].key] = normalized;
    }
    return records;
  } catch { return {}; }
}

let records = loadRecords();
function loadSeenUnlocks() {
  try {
    const saved = localStorage.getItem(UNLOCK_SEEN_KEY);
    if (saved !== null) {
      const ids = JSON.parse(saved);
      return new Set(Array.isArray(ids) ? ids.filter(Number.isInteger) : []);
    }
    return new Set(localStorage.getItem(LEGACY_UNLOCK_SEEN_KEY) === '1' ? [2] : []);
  } catch { return new Set(); }
}
let seenUnlocks = loadSeenUnlocks();
let seenFinalCelebration = (() => {
  try { return localStorage.getItem(FINAL_CELEBRATION_KEY); }
  catch { return null; }
})();
let state;
let stageIndex = 0;
let menuWorldIndex = 0;
let menuOpen = false;
let busy = false;
let clearAnimationActive = false;
let introP1 = false;
let mouse = { x: 300, y: 300, visible: false, onBoard: false };
let touchGesture = null;
let touchPadOffset = { x: 0, y: 0 };
let touchHintTimer = 0;
const placementFlashes = new Map();
let placementFlashFrame = 0;
let extraSymbolAlpha = 0;
let extraSymbolOffsets = null;
let blindFrame = 0;
let usedOperations = new Set();
const finalCelebrationSignature = () => `${STAGE_WORLDS.length}:${STAGES.length}`;

function updateCrownVisibility() {
  crown.hidden = seenFinalCelebration !== finalCelebrationSignature() || !isEveryStageComplete(STAGES, records);
}

async function dropCrown() {
  crown.hidden = false;
  if (reducedMotion.matches) { sounds.play('crown'); return; }
  const animation = crown.animate([
    { opacity: 0, transform: 'translate(-50%, -135px) rotate(-17deg)', offset: 0, easing: 'cubic-bezier(.55,0,1,1)' },
    { opacity: 1, transform: 'translate(-50%, 7px) rotate(5deg)', offset: .7, easing: 'cubic-bezier(.22,.7,.2,1)' },
    { opacity: 1, transform: 'translate(-50%, -4px) rotate(-2deg)', offset: .86, easing: 'ease-out' },
    { opacity: 1, transform: 'translate(-50%, 0) rotate(0)', offset: 1 },
  ], { duration: 480 });
  await new Promise((resolve) => {
    function waitForLanding() {
      if (animation.currentTime >= 480 * .7 || animation.playState === 'finished') resolve();
      else requestAnimationFrame(waitForLanding);
    }
    requestAnimationFrame(waitForLanding);
  });
  sounds.play('crown');
  await animation.finished;
}

function applyTheme(stage) {
  const theme = stage.theme || { background: '#3c3e59', foreground: '#f0f2f5' };
  const root = document.documentElement.style;
  root.setProperty('--background', theme.background);
  root.setProperty('--board', theme.background);
  root.setProperty('--ink', theme.foreground);
  root.setProperty('--board-ink', theme.foreground);
  root.setProperty('--grid', theme.foreground);
  root.setProperty('--rim', theme.subColor || DEFAULT_SUB_COLOR);
  root.setProperty('--symbol', theme.symbolColor || DEFAULT_SYMBOL_COLOR);
  root.setProperty('--clear-color', theme.clearColor || DEFAULT_CLEAR_COLOR);
  root.setProperty('--gauge-correct', theme.clearColor || DEFAULT_CLEAR_COLOR);
  root.setProperty('--gauge-incorrect', theme.symbolColor || DEFAULT_SYMBOL_COLOR);
}

function updateGauge(motion = 'instant') {
  if (motion === 'instant' || motion === 'remove') gauge.classList.remove('overfilled-flash');
  const initialCount = state.stage.doubleMode ? 2 : 1;
  const total = state.placed.length >= initialCount && state.targets.length
    ? state.targets.length + initialCount : requiredPlacementCount(state.stage);
  const count = state.mode === 'view' ? total : Math.min(state.placed.length, total);
  const rebuilt = gauge.children.length !== total;
  const previous = rebuilt ? 0 : Number(gauge.dataset.count || 0);
  if (rebuilt) {
    gauge.replaceChildren(...Array.from({ length: total }, () => document.createElement('span')));
  }
  [...gauge.children].forEach((segment, index) => {
    if (motion === 'keep' && previous === count) return;
    segment.classList.remove('gauge-growing', 'gauge-shrinking');
    segment.style.removeProperty('--shrink-delay');
    segment.classList.toggle('filled', index < count);
    if (index < count) {
      const correct = index >= state.placed.length || isPlacementCorrect(state.placed, index, state.targets, state.stage);
      segment.classList.toggle('correct', correct);
      segment.classList.toggle('incorrect', !correct);
    } else if (motion !== 'remove' || index >= previous) {
      segment.classList.remove('correct', 'incorrect');
    }
    if (!rebuilt && motion === 'add' && index >= previous && index < count) {
      segment.classList.add('gauge-growing');
    } else if (!rebuilt && motion === 'remove' && index >= count && index < previous) {
      const removed = previous - count;
      segment.style.setProperty('--shrink-delay', `${(previous - 1 - index) * 180 / removed}ms`);
      segment.classList.add('gauge-shrinking');
    }
  });
  gauge.dataset.count = String(count);
  gauge.setAttribute('aria-valuemax', String(total));
  gauge.setAttribute('aria-valuenow', String(count));
  gauge.setAttribute('aria-valuetext', `${count}/${total}`);
}

function saveRecords() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
  catch { announcement.textContent = '保存できませんでした'; }
}

function saveCurrentState() {
  if (!state) return;
  records[state.stage.key] = snapshotStageState(state);
  saveRecords();
}

function newState(index) {
  const stage = STAGES[index];
  return restoreStageState(stage, records[stage.key]);
}

function updateStageIndicator() {
  const available = unlockedStageCount(STAGES, records);
  indicator.querySelector('span').textContent = `${STAGES[stageIndex].number}/${available}`;
  indicator.classList.toggle('multi-world', available > STAGE_WORLDS[0].stages.length);
}

function startStage(index, preparedState = null) {
  if (index < 0 || index >= STAGES.length || busy ||
    !isWorldUnlocked(STAGES, records, STAGES[index].worldIndex)) return;
  saveCurrentState();
  releaseTouchGesture();
  clearPlacementFlashes();
  cancelAnimationFrame(blindFrame);
  stageIndex = index;
  state = preparedState || newState(index);
  usedOperations = new Set();
  introP1 = state.firstAttempt === true;
  saveCurrentState();
  extraSymbolAlpha = state.clearSymbolsVisible ? 1 : 0;
  extraSymbolOffsets = null;
  frame.classList.remove('cleared');
  delete frame.dataset.clearPhase;
  applyTheme(state.stage);
  mouse = { x: 300, y: 300, visible: false, onBoard: false };
  updateStageIndicator();
  gameScreen.classList.remove('menu-covered');
  screen.hidden = true;
  menuOpen = false;
  gameScreen.inert = false;
  updateControls();
  updateGauge();
  draw();
  animateBlindFade();
  scheduleTouchGuidance(introP1);
  if (!state.completed && placementOutcome(state.placed, state.targets, state.stage) === 'complete') completeStage();
}

function updateControls() {
  board.classList.toggle('placing', state.mode === 'play' && !busy && !menuOpen);
  const initialCount = state.stage.doubleMode ? 2 : 1;
  const canEdit = state.mode === 'play' && state.placed.length >= initialCount && !busy;
  controls.reset.hidden = introP1;
  controls.undo.hidden = introP1;
  controls.undo.disabled = introP1 || !canEdit || state.placed.length <= initialCount;
  controls.undo.classList.toggle('undo-correction', !controls.undo.hidden && !controls.undo.disabled &&
    state.placed.some((_, index) => index >= initialCount &&
      !isPlacementCorrect(state.placed, index, state.targets, state.stage)));
  const canChange = state.stage.doubleMode && state.stage.group !== 'p1';
  controls.change.hidden = !canChange;
  controls.change.disabled = !canChange || !canEdit;
  controls.rotate.disabled = !canEdit || !state.stage.allowRotate;
  controls.flip.disabled = !canEdit || !state.stage.allowFlip;
  controls.rotate.hidden = !state.stage.allowRotate;
  controls.flip.hidden = !state.stage.allowFlip;
  for (const operation of ['rotate', 'flip', 'change']) {
    controls[operation].classList.toggle('tutorial-highlight',
      !controls[operation].hidden && !controls[operation].disabled &&
      !usedOperations.has(operation) && !hasClearedOperation(STAGES, records, operation));
  }
  controls.reset.disabled = busy || introP1;
  controls.previous.hidden = introP1;
  controls.next.hidden = introP1;
  controls.previous.disabled = busy || introP1 || stageIndex === 0;
  controls.next.disabled = busy || introP1 || stageIndex === STAGES.length - 1 ||
    !isWorldUnlocked(STAGES, records, STAGES[stageIndex + 1]?.worldIndex);
  indicator.hidden = introP1;
  indicator.disabled = busy || introP1;
  // During the clear sequence, buttons retain hover/press feedback. Their
  // handlers still reject input through the busy guard.
  if (clearAnimationActive) {
    for (const control of Object.values(controls)) {
      if (!control.hidden) control.disabled = false;
    }
    if (!indicator.hidden) indicator.disabled = false;
  }
}

function drawShape(ctx, x, y, item, data, alpha = 1, fillColor = null) {
  const shape = data.shapes?.[item.shapeIndex ?? 0] || data;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(item.angle * Math.PI / 180);
  if (item.flipped) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ShapeDefs[shape.type].drawPath(ctx, shape.size);
  ctx.fillStyle = fillColor || data.stage.theme?.foreground || '#f0f2f5';
  ctx.fill();
  ctx.restore();
}

function drawCopies(ctx, item, data, hex, alpha = 1, fillColor = null) {
  const size = (data.shapes?.[item.shapeIndex ?? 0] || data).size;
  const position = canonicalPosition(item.x, item.y, hex);
  const height = CELL * Math.sqrt(3) / 2;
  for (let u = -3; u <= 4; u++) {
    for (let v = -3; v <= 4; v++) {
      const x = position.x + u * CELL + (hex ? v * CELL / 2 : 0);
      const y = position.y + v * (hex ? height : CELL);
      if (x < -size || x > 600 + size || y < -size || y > 600 + size) continue;
      drawShape(ctx, x, y, item, data, alpha, fillColor);
    }
  }
}

function drawGrid(ctx, hex, showLattice = true, stageTheme = null) {
  const theme = getComputedStyle(document.documentElement);
  ctx.fillStyle = stageTheme?.background || theme.getPropertyValue('--board').trim() || '#3c3e59';
  ctx.fillRect(0, 0, 600, 600);
  if (!showLattice) return;
  ctx.strokeStyle = stageTheme?.foreground || theme.getPropertyValue('--grid').trim() || '#f0f2f5';
  ctx.globalAlpha = .28;
  ctx.lineWidth = 1.4;
  if (hex) {
    const height = CELL * Math.sqrt(3) / 2;
    ctx.beginPath();
    for (let u = -5; u <= 5; u++) {
      for (let v = -5; v <= 5; v++) {
        const x = OFFSET + u * CELL + v * CELL / 2;
        const y = OFFSET + v * height;
        // Horizontal and both 60-degree diagonal families form triangles.
        ctx.moveTo(x, y);
        ctx.lineTo(x + CELL, y);
        ctx.moveTo(x, y);
        ctx.lineTo(x + CELL / 2, y + height);
        ctx.moveTo(x, y);
        ctx.lineTo(x - CELL / 2, y + height);
      }
    }
    ctx.stroke();
  } else {
    for (let position = 0; position <= 600; position += CELL) {
      ctx.beginPath(); ctx.moveTo(position + .5, 0); ctx.lineTo(position + .5, 600); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, position + .5); ctx.lineTo(600, position + .5); ctx.stroke();
    }
  }
  ctx.globalAlpha = .65;
  ctx.strokeStyle = stageTheme?.foreground || theme.getPropertyValue('--grid').trim() || '#f0f2f5';
  ctx.lineWidth = 2;
  if (!hex) ctx.strokeRect(OFFSET, OFFSET, CELL, CELL);
  else {
    const h = CELL * Math.sqrt(3) / 2;
    ctx.beginPath();
    ctx.moveTo(OFFSET, OFFSET);
    ctx.lineTo(OFFSET + CELL, OFFSET);
    ctx.lineTo(OFFSET + CELL * 1.5, OFFSET + h);
    ctx.lineTo(OFFSET + CELL / 2, OFFSET + h);
    ctx.closePath(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function getPreview() {
  const initialCount = state.stage.doubleMode ? 2 : 1;
  const shapeIndex = state.stage.doubleMode ? (state.placed.length < initialCount ? state.placed.length : state.activeShape) : 0;
  const cursor = state.stage.doubleMode ? state.cursors[shapeIndex] : state.cursor;
  const raw = { x: mouse.x, y: mouse.y, angle: cursor.angle, flipped: cursor.flipped, shapeIndex };
  return mouse.onBoard && state.placed.length >= initialCount
    ? snapPlacement(raw, state.targets, state.placed, state.stage) : raw;
}

function animateBlindFade() {
  cancelAnimationFrame(blindFrame);
  if (!state?.stage.blindMode || state.mode !== 'play' || menuOpen) return;
  const tick = () => {
    draw();
    if (state.placed.some((_, index) => index > 0 && blindPlacementAlpha(state, index) > 0)) {
      blindFrame = requestAnimationFrame(tick);
    }
  };
  if (state.placed.some((_, index) => index > 0 && blindPlacementAlpha(state, index) > 0)) blindFrame = requestAnimationFrame(tick);
}

function drawScene(ctx, data, { symbols = true, preview = false, lattice = true, addedAlpha = 0, addedOffsets = null, flashes = null } = {}) {
  drawGrid(ctx, data.stage.hex, lattice, data.stage.theme);
  const now = flashes?.size ? performance.now() : 0;
  data.placed.forEach((item, index) => {
    const alpha = blindPlacementAlpha(data, index);
    const flash = flashes?.get(index);
    const color = flash ? placementFlashColor(data.stage.theme?.clearColor || DEFAULT_CLEAR_COLOR,
      data.stage.theme?.foreground || '#f0f2f5', now - flash.started) : null;
    if (alpha > 0) drawCopies(ctx, item, data, data.stage.hex, alpha, color);
  });
  if (symbols) {
    drawSymmetryElements(ctx, data.stage.group, OFFSET, OFFSET, CELL,
      { showProblem: true, rotation: true, mirror: true, glide: true },
      data.stage.symbols, [], false, 1, data.stage.theme?.symbolColor || DEFAULT_SYMBOL_COLOR);
    if (addedAlpha > 0 && data.stage.clearSymbols?.length) {
      const visibleIds = addedOffsets
        ? data.stage.clearSymbols.filter((id) => Object.hasOwn(addedOffsets, id))
        : data.stage.clearSymbols;
      for (const id of visibleIds) {
        drawSymmetryElements(ctx, data.stage.group, OFFSET, OFFSET, CELL,
          { showProblem: true, rotation: true, mirror: true, glide: true },
          [id], [], false, addedAlpha, data.stage.theme?.clearColor || DEFAULT_CLEAR_COLOR, addedOffsets?.[id] || 0);
      }
    }
  }
  if (preview && mouse.visible && data.mode === 'play') {
    const candidate = getPreview();
    drawShape(ctx, candidate.x, candidate.y, candidate, data, .55);
  }
}

function drawTouchPadShape() {
  if (!mobileLayout.matches || !state) return;
  const ctx = touchPadShape.getContext('2d');
  ctx.clearRect(0, 0, touchPadShape.width, touchPadShape.height);
  const initialCount = state.stage.doubleMode ? 2 : 1;
  const shapeIndex = state.stage.doubleMode
    ? (state.placed.length < initialCount ? state.placed.length : state.activeShape) : 0;
  const cursor = state.stage.doubleMode ? state.cursors[shapeIndex] : state.cursor;
  if (!cursor) return;
  ctx.save();
  ctx.translate(
    326 + touchPadOffset.x * touchPadShape.width / touchPad.clientWidth,
    240 + touchPadOffset.y * touchPadShape.height / touchPad.clientHeight,
  );
  ctx.scale(2.35, 2.35);
  drawShape(ctx, 0, 0, { ...cursor, shapeIndex }, state);
  ctx.restore();
}

function draw() {
  if (!state) return;
  drawScene(context, state, { preview: !menuOpen, addedAlpha: extraSymbolAlpha,
    addedOffsets: extraSymbolOffsets, flashes: placementFlashes });
  drawTouchPadShape();
}

function clearPlacementFlashes() {
  cancelAnimationFrame(placementFlashFrame);
  placementFlashFrame = 0;
  for (const flash of placementFlashes.values()) flash.resolve();
  placementFlashes.clear();
}

function flashPlacement(index) {
  if (reducedMotion.matches) return Promise.resolve();
  const promise = new Promise((resolve) => {
    placementFlashes.set(index, { started: performance.now(), resolve });
  });
  placementFlashes.get(index).promise = promise;
  if (!placementFlashFrame) placementFlashFrame = requestAnimationFrame(function tick(now) {
    placementFlashFrame = 0;
    for (const [key, flash] of placementFlashes) {
      if (now - flash.started >= PLACEMENT_FLASH_MS) {
        placementFlashes.delete(key);
        flash.resolve();
      }
    }
    draw();
    if (placementFlashes.size) placementFlashFrame = requestAnimationFrame(tick);
  });
  return promise;
}

function boardPoint(event) {
  const rect = board.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * 600 / rect.width, y: (event.clientY - rect.top) * 600 / rect.height };
}

function flashLimit() {
  sounds.play('error');
  frame.classList.remove('limit-flash');
  void frame.offsetWidth;
  frame.classList.add('limit-flash');
}

function flashOverfilledGauge() {
  sounds.play('error');
  gauge.classList.remove('overfilled-flash');
  void gauge.offsetWidth;
  gauge.classList.add('overfilled-flash');
}
gauge.addEventListener('animationend', (event) => {
  if (event.animationName === 'gauge-overfilled-flash') gauge.classList.remove('overfilled-flash');
});

function placeCandidate(candidate) {
  if (busy || menuOpen || state.mode !== 'play') return;
  const result = addPlacement(state, candidate);
  if (result === 'limit') { flashLimit(); return; }
  if (result === 'stage-limit') { flashOverfilledGauge(); return; }
  if (result === 'duplicate') return;
  sounds.play('put');
  if (state.stage.blindMode && state.placed.length > 1) candidate.placedAt = Date.now();
  const initialCount = state.stage.doubleMode ? 2 : 1;
  if (state.placed.length === initialCount) {
    state.targets = makeStageTargets(state.stage, state.placed);
    if (state.stage.doubleMode) state.activeShape = 0;
  }
  const flash = isPlacementCorrect(state.placed, state.placed.length - 1, state.targets, state.stage)
    ? flashPlacement(state.placed.length - 1) : Promise.resolve();
  if (state.firstAttempt) state.firstAttempt = false;
  if (state.openingTriangle) state.openingTriangle = false;
  saveCurrentState();
  updateGauge('add');
  const outcome = placementOutcome(state.placed, state.targets, state.stage);
  if (outcome === 'complete') {
    completeStage(flash);
  } else {
    if (outcome === 'overfilled') flashOverfilledGauge();
    updateControls(); draw();
    animateBlindFade();
  }
}

function place(event) {
  if (mobileLayout.matches || event.button !== 0) return;
  const point = boardPoint(event);
  mouse = { ...point, visible: true, onBoard: true };
  placeCandidate(getPreview());
}

function maybeAutoPlaceTouch() {
  if (!mobileLayout.matches || !mouse.visible || !state.targets.length || busy ||
    menuOpen || state.mode !== 'play') return;
  const candidate = getPreview();
  if (state.targets.some((target) => samePlacement(candidate, target, state.stage.hex))) {
    placeCandidate(candidate);
  }
}

function hideTouchGuidance() {
  clearTimeout(touchHintTimer);
  touchHintTimer = 0;
  touchPad.classList.remove('guidance-visible');
}

function scheduleTouchGuidance(immediate = false) {
  hideTouchGuidance();
  const canShow = () => mobileLayout.matches && state?.mode === 'play' &&
    !busy && !menuOpen && !touchGesture;
  if (!canShow()) return;
  if (immediate) touchPad.classList.add('guidance-visible');
  else touchHintTimer = setTimeout(() => {
    touchHintTimer = 0;
    if (canShow()) touchPad.classList.add('guidance-visible');
  }, TOUCH_HINT_IDLE_MS);
}

function releaseTouchGesture() {
  touchGesture = null;
  touchPadOffset = { x: 0, y: 0 };
  touchPad.classList.remove('active');
  touchKnob.style.removeProperty('--knob-x');
  touchKnob.style.removeProperty('--knob-y');
  drawTouchPadShape();
}

function moveTouchGesture(event) {
  if (!touchGesture || event.pointerId !== touchGesture.pointerId) return;
  if (busy || menuOpen || state.mode !== 'play') return;
  const scale = touchPad.getBoundingClientRect().width / 652;
  const maxX = (touchPad.clientWidth - 80) / 2;
  const maxY = (touchPad.clientHeight - 80) / 2;
  const dx = (event.clientX - touchGesture.lastX) / scale;
  const dy = (event.clientY - touchGesture.lastY) / scale;
  touchGesture.lastX = event.clientX;
  touchGesture.lastY = event.clientY;
  mouse.x = Math.max(0, Math.min(600, mouse.x + dx * 300 / maxX));
  mouse.y = Math.max(0, Math.min(600, mouse.y + dy * 300 / maxY));
  const knobX = Math.max(-maxX, Math.min(maxX, (event.clientX - touchGesture.startX) / scale));
  const knobY = Math.max(-maxY, Math.min(maxY, (event.clientY - touchGesture.startY) / scale));
  touchPadOffset = { x: knobX, y: knobY };
  touchKnob.style.setProperty('--knob-x', `${knobX}px`);
  touchKnob.style.setProperty('--knob-y', `${knobY}px`);
  draw();
  maybeAutoPlaceTouch();
}

function resetStage() {
  if (busy || state.firstAttempt) return;
  sounds.play('switch');
  clearPlacementFlashes();
  frame.classList.remove('cleared');
  delete frame.dataset.clearPhase;
  extraSymbolAlpha = 0;
  extraSymbolOffsets = null;
  cancelAnimationFrame(blindFrame);
  state = freshStageState(state.stage, state);
  usedOperations = new Set();
  saveCurrentState();
  updateControls(); draw();
  updateGauge('remove');
  scheduleTouchGuidance();
}

function undo() {
  if (busy || controls.undo.disabled) return;
  sounds.play('switch');
  clearPlacementFlashes();
  state.placed.pop();
  saveCurrentState();
  updateControls(); updateGauge('remove'); draw();
  scheduleTouchGuidance();
}

function rotate() {
  if (busy || controls.rotate.disabled) return;
  sounds.play('switch');
  const cursor = state.stage.doubleMode ? state.cursors[state.activeShape] : state.cursor;
  cursor.angle = (cursor.angle + (state.stage.hex ? 60 : 90)) % 360;
  usedOperations.add('rotate');
  updateControls();
  saveCurrentState();
  draw();
  maybeAutoPlaceTouch();
  scheduleTouchGuidance();
}

function flip() {
  if (busy || controls.flip.disabled) return;
  sounds.play('switch');
  if (state.stage.doubleMode) state.cursors[state.activeShape] = reflectCursorVertically(state.cursors[state.activeShape]);
  else state.cursor = reflectCursorVertically(state.cursor);
  usedOperations.add('flip');
  updateControls();
  saveCurrentState();
  draw();
  maybeAutoPlaceTouch();
  scheduleTouchGuidance();
}

function changeShape() {
  if (busy || controls.change.disabled) return;
  sounds.play('switch');
  state.activeShape = 1 - state.activeShape;
  usedOperations.add('change');
  updateControls();
  saveCurrentState();
  draw();
  maybeAutoPlaceTouch();
  scheduleTouchGuidance();
}

function updateMenu() {
  updateCrownVisibility();
  for (const tile of grid.querySelectorAll('.stage-tile')) {
    const index = STAGES.findIndex((stage) => stage.worldIndex === menuWorldIndex && stage.level === Number(tile.dataset.slot) + 1);
    if (index < 0) { tile.hidden = true; continue; }
    tile.hidden = false;
    tile.dataset.index = String(index);
    tile.style.setProperty('--clear-color', STAGES[index].theme.clearColor || DEFAULT_CLEAR_COLOR);
    const record = records[STAGES[index].key];
    tile.setAttribute('aria-label', `ステージ ${STAGES[index].number}（${STAGES[index].key}）、${STAGES[index].group}${record?.completed ? '、クリア済み' : ''}`);
    tile.classList.toggle('completed', record?.completed === true);
    tile.replaceChildren();
    if (shouldShowStageNumber(record)) { tile.textContent = String(STAGES[index].number); continue; }
    const thumbnail = document.createElement('canvas');
    thumbnail.width = 300; thumbnail.height = 300;
    const ctx = thumbnail.getContext('2d');
    ctx.scale(.5, .5);
    drawScene(ctx, { stage: STAGES[index], ...record }, { symbols: false, lattice: false });
    tile.append(thumbnail);
  }
  updateWorldSwitch();
}

function updateWorldSwitch() {
  const unlockedNext = menuWorldIndex + 1 < STAGE_WORLDS.length &&
    isWorldUnlocked(STAGES, records, menuWorldIndex + 1);
  worldPrevious.hidden = menuWorldIndex === 0;
  worldNext.hidden = !unlockedNext || !seenUnlocks.has(STAGE_WORLDS[menuWorldIndex + 1]?.id);
  worldNext.style.setProperty('--clear-color', STAGE_WORLDS[menuWorldIndex].theme.clearColor || DEFAULT_CLEAR_COLOR);
}

async function animateWorldUnlock() {
  const nextWorld = STAGE_WORLDS[menuWorldIndex + 1];
  if (!isWorldComplete(STAGES, records, menuWorldIndex)) return;
  const finalSignature = finalCelebrationSignature();
  if (nextWorld ? seenUnlocks.has(nextWorld.id) : seenFinalCelebration === finalSignature) return;
  const tiles = [...grid.querySelectorAll('.stage-tile:not([hidden])')];
  if (!reducedMotion.matches) sounds.play('unlock');
  const sequenceStart = performance.now();
  let nextIconAt = 0;
  for (const [index, tile] of tiles.entries()) {
    const last = index === tiles.length - 1;
    if (index > 0 && !reducedMotion.matches) {
      nextIconAt += unlockStepDelay(index, tiles.length);
      await pause(Math.max(0, sequenceStart + nextIconAt - performance.now()));
    }
    tile.classList.add('unlock-highlight', last ? 'unlock-finale' : 'unlock-hop');
  }
  if (!reducedMotion.matches) await pause(nextWorld ? NEXT_WORLD_BUTTON_DELAY_MS : FINAL_ICON_HOP_MS);
  if (nextWorld) {
    worldNext.hidden = false;
    worldNext.classList.add('unlock-green', 'unlock-entering');
    if (!reducedMotion.matches) await pause(NEXT_WORLD_BUTTON_LANDING_MS);
    sounds.play('nextWorld');
  }
  await pause(reducedMotion.matches ? 10 : nextWorld ? 650 - NEXT_WORLD_BUTTON_LANDING_MS : 650);
  worldNext.classList.remove('unlock-entering');
  if (nextWorld) {
    seenUnlocks.add(nextWorld.id);
    try { localStorage.setItem(UNLOCK_SEEN_KEY, JSON.stringify([...seenUnlocks])); } catch { /* The unlock still works this session. */ }
  } else {
    seenFinalCelebration = finalSignature;
    try { localStorage.setItem(FINAL_CELEBRATION_KEY, finalSignature); } catch { /* Keep the celebration in memory. */ }
  }
  for (const tile of tiles) tile.classList.remove('unlock-highlight', 'unlock-hop', 'unlock-finale');
  worldNext.classList.remove('unlock-green');
  updateWorldSwitch();
  if (!nextWorld && isEveryStageComplete(STAGES, records)) await dropCrown();
}

async function openMenu() {
  if (busy || menuOpen) return;
  sounds.play('switch');
  busy = true;
  hideTouchGuidance();
  releaseTouchGesture();
  mouse.visible = false;
  mouse.onBoard = false;
  draw();
  saveCurrentState();
  updateControls();
  await Promise.all([...placementFlashes.values()].map((flash) => flash.promise));
  await transferBoardToMenu();
}

function pause(duration) { return new Promise((resolve) => setTimeout(resolve, duration)); }

function animateClearWave() {
  if (reducedMotion.matches) return Promise.resolve();
  const snapshot = document.createElement('canvas');
  snapshot.width = snapshot.height = 600;
  snapshot.getContext('2d').drawImage(board, 0, 0);
  return new Promise((resolve) => {
    let start = null;
    const duration = 520;
    function tick(time) {
      if (start === null) start = time;
      const elapsed = time - start;
      context.fillStyle = state.stage.theme?.background || '#3c3e59';
      context.fillRect(0, 0, 600, 600);
      for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
        const progress = Math.max(0, Math.min(1, (elapsed - (row + column) * 58) / 270));
        const lift = progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
        const inset = 3 * lift;
        context.drawImage(snapshot, column * 200, row * 200, 200, 200,
          column * 200 + inset, row * 200 - 12 * lift + inset,
          200 - inset * 2, 200 - inset * 2);
      }
      if (elapsed < duration) requestAnimationFrame(tick);
      else { draw(); resolve(); }
    }
    requestAnimationFrame(tick);
  });
}

async function animateClearRim() {
  sounds.play('clear');
  if (reducedMotion.matches) {
    frame.classList.add('cleared');
    return;
  }
  frame.classList.add('rim-sweeping');
  await pause(400);
  frame.classList.add('cleared');
  frame.classList.remove('rim-sweeping');
  await pause(360);
}

function animateClearSymbols() {
  const ids = state.stage.clearSymbols || [];
  if (!ids.length) return Promise.resolve();
  if (reducedMotion.matches) {
    extraSymbolAlpha = 1; extraSymbolOffsets = null; draw();
    sounds.play('symbol');
    return Promise.resolve();
  }
  const duration = 570;
  const stagger = ids.length > 1 ? Math.min(110, 420 / (ids.length - 1)) : 0;
  const total = duration + stagger * (ids.length - 1);
  const finalLanding = stagger * (ids.length - 1) + duration * .66;
  return new Promise((resolve) => {
    let start = null;
    let landingPlayed = false;
    function tick(time) {
      if (start === null) start = time;
      const elapsed = time - start;
      if (!landingPlayed && elapsed >= finalLanding) {
        sounds.play('symbol');
        landingPlayed = true;
      }
      extraSymbolAlpha = 1;
      extraSymbolOffsets = {};
      ids.forEach((id, index) => {
        const progress = (elapsed - stagger * index) / duration;
        if (progress < 0) return;
        const p = Math.min(1, progress);
        let offset;
        if (p < .66) {
          const t = p / .66;
          offset = -175 + 190 * t * t;
        } else if (p < .82) {
          const t = (p - .66) / .16;
          offset = 15 - 27 * (1 - (1 - t) ** 2);
        } else {
          const t = (p - .82) / .18;
          offset = -12 + 12 * (1 - (1 - t) ** 2);
        }
        extraSymbolOffsets[id] = offset;
      });
      draw();
      if (elapsed < total) requestAnimationFrame(tick);
      else { extraSymbolOffsets = null; draw(); resolve(); }
    }
    requestAnimationFrame(tick);
  });
}

function sceneCanvas(data) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 600;
  drawScene(canvas.getContext('2d'), data, { addedAlpha: data.clearSymbolsVisible ? 1 : 0 });
  return canvas;
}

function boardCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 600;
  canvas.getContext('2d').drawImage(board, 0, 0, 600, 600);
  return canvas;
}

function tileCanvas(tile, stage) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 600;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = stage.theme?.background || '#3c3e59';
  ctx.fillRect(0, 0, 600, 600);
  const thumbnail = tile.querySelector('canvas');
  if (thumbnail) ctx.drawImage(thumbnail, 0, 0, 600, 600);
  else {
    const style = getComputedStyle(tile);
    ctx.fillStyle = style.color;
    ctx.font = `${style.fontWeight} ${parseFloat(style.fontSize) * 600 / tile.clientWidth}px ${style.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.textContent, 300, 300);
  }
  return canvas;
}

function scaledBorder(element, rect) {
  return parseFloat(getComputedStyle(element).borderLeftWidth) * rect.width / element.offsetWidth;
}

async function animateSurface(from, to, fromContent, toContent, background, duration, beforeMotion = null) {
  if (reducedMotion.matches) return;
  const floating = document.createElement('div');
  floating.style.cssText = `position:fixed;z-index:25;box-sizing:border-box;overflow:hidden;pointer-events:none;background:${background};border-style:solid;left:${from.rect.left}px;top:${from.rect.top}px;width:${from.rect.width}px;height:${from.rect.height}px;border-width:${from.border}px;border-color:${from.color};`;
  const layers = [fromContent, toContent].map((source, index) => {
    const layer = document.createElement('canvas');
    layer.width = layer.height = 600;
    layer.getContext('2d').drawImage(source, 0, 0, 600, 600);
    layer.style.cssText = `position:absolute;inset:0;width:100%;height:100%;opacity:${index ? 0 : 1};`;
    floating.append(layer);
    return layer;
  });
  document.body.append(floating);
  const keyframe = ({ rect, border, color }) => ({
    left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
    borderWidth: `${border}px`, borderColor: color,
  });
  try {
    if (beforeMotion) await beforeMotion();
    await Promise.all([
      floating.animate([keyframe(from), keyframe(to)], {
        duration, easing: 'cubic-bezier(.18,.78,.22,1)', fill: 'forwards',
      }).finished,
      layers[1].animate([
        { opacity: 0, offset: 0 }, { opacity: 0, offset: .65 }, { opacity: 1, offset: 1 },
      ], { duration, fill: 'forwards' }).finished,
    ]);
  } finally { floating.remove(); }
}

async function transferBoardToMenu() {
  const sourceRect = frame.getBoundingClientRect();
  const sourceContent = boardCanvas();
  const sourceStyle = getComputedStyle(frame);
  menuWorldIndex = state.stage.worldIndex;
  updateMenu();
  screen.classList.add('menu-arriving');
  screen.hidden = false;
  gameScreen.classList.add('menu-covered');
  menuOpen = true;
  gameScreen.inert = true;
  const tile = grid.querySelector(`[data-index="${stageIndex}"]`);
  tile?.classList.add('arrival-target');
  if (tile) {
    const targetRect = tile.getBoundingClientRect();
    const targetContent = tileCanvas(tile, state.stage);
    await animateSurface(
      { rect: sourceRect, border: scaledBorder(frame, sourceRect), color: sourceStyle.borderLeftColor },
      { rect: targetRect, border: scaledBorder(tile, targetRect), color: getComputedStyle(tile).borderLeftColor },
      sourceContent, targetContent, state.stage.theme?.background || '#3c3e59', 540,
    );
  }
  screen.classList.remove('menu-arriving');
  await revealMenu(tile);
}

async function revealMenu(tile = null) {
  screen.classList.add('menu-revealing');
  if (!reducedMotion.matches) sounds.play('arrivals');
  await pause(reducedMotion.matches ? 10 : 930);
  screen.classList.remove('menu-revealing');
  tile?.classList.remove('arrival-target');
  await animateWorldUnlock();
  busy = false;
  updateControls();
  screen.focus({ preventScroll: true });
}

function showInitialMenu() {
  busy = true;
  hideTouchGuidance();
  menuWorldIndex = 0;
  updateMenu();
  screen.hidden = false;
  gameScreen.classList.add('menu-covered');
  menuOpen = true;
  gameScreen.inert = true;
  updateControls();
  void revealMenu();
}

async function completeStage(lastPlacementFlash = Promise.resolve()) {
  busy = true;
  hideTouchGuidance();
  releaseTouchGesture();
  clearAnimationActive = true;
  state.mode = 'view';
  state.completed = true;
  state.clearSymbolsVisible = true;
  state.completedAt = Date.now();
  saveCurrentState();
  updateStageIndicator();
  updateControls(); updateGauge('keep'); draw();
  announcement.textContent = `ステージ ${state.stage.key} クリア`;
  await lastPlacementFlash;
  frame.dataset.clearPhase = 'wave';
  await animateClearWave();
  frame.dataset.clearPhase = 'rim';
  await animateClearRim();
  if (state.stage.clearSymbols?.length) {
    frame.dataset.clearPhase = 'symbols';
    await animateClearSymbols();
    frame.dataset.clearPhase = 'hold';
    await pause(reducedMotion.matches ? 100 : 1000);
  }
  frame.dataset.clearPhase = 'transfer';
  await transferBoardToMenu();
  delete frame.dataset.clearPhase;
  clearAnimationActive = false;
  updateControls();
}

async function selectStage(index, tile) {
  if (busy || !isWorldUnlocked(STAGES, records, STAGES[index]?.worldIndex)) return;
  sounds.play('switch');
  busy = true;
  const nextState = index === stageIndex ? state : newState(index);
  const origin = tile.getBoundingClientRect();
  const target = frame.getBoundingClientRect();
  const sourceStyle = getComputedStyle(tile);
  const fromContent = tileCanvas(tile, nextState.stage);
  const toContent = sceneCanvas(nextState);
  try {
    await animateSurface(
      { rect: origin, border: scaledBorder(tile, origin), color: sourceStyle.borderLeftColor },
      { rect: target, border: scaledBorder(frame, target), color: getComputedStyle(document.documentElement).getPropertyValue('--rim').trim() },
      fromContent, toContent,
      nextState.stage.theme?.background || '#3c3e59', 430,
      async () => {
        screen.classList.add('menu-departing');
        tile.classList.add('departure-target');
        await pause(90);
      },
    );
  } finally {
    screen.classList.remove('menu-departing');
    tile.classList.remove('departure-target');
  }
  busy = false;
  startStage(index, nextState);
}

const tilePositions = [
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
  [2, 5], [3, 5], [4, 5], [5, 5],
  [5, 4], [5, 3], [5, 2], [5, 1],
  [4, 1], [3, 1], [2, 1], [3, 3],
];
tilePositions.forEach(([row, column], index) => {
  const tile = document.createElement('button');
  tile.type = 'button'; tile.className = 'stage-tile';
  tile.dataset.slot = String(index);
  tile.dataset.index = String(index);
  tile.style.gridRow = String(row); tile.style.gridColumn = String(column);
  tile.style.setProperty('--arrival-order', String(row + column - 2));
  tile.setAttribute('aria-label', `ステージ ${index + 1}、${STAGES[index].group}`);
  tile.addEventListener('click', () => selectStage(Number(tile.dataset.index), tile));
  grid.append(tile);
});

async function changeMenuWorld(delta) {
  const nextIndex = menuWorldIndex + delta;
  if (busy || nextIndex < 0 || nextIndex >= STAGE_WORLDS.length ||
    !isWorldUnlocked(STAGES, records, nextIndex)) return;
  sounds.play('switch');
  busy = true;
  screen.classList.add('world-exiting');
  await pause(reducedMotion.matches ? 10 : 360);
  screen.classList.remove('world-exiting');
  menuWorldIndex = nextIndex;
  applyTheme({ theme: STAGE_WORLDS[menuWorldIndex].theme });
  updateMenu();
  screen.classList.add('world-entering');
  if (!reducedMotion.matches) sounds.play('arrivals');
  await pause(reducedMotion.matches ? 10 : 950);
  screen.classList.remove('world-entering');
  await animateWorldUnlock();
  busy = false;
}
worldPrevious.addEventListener('click', () => changeMenuWorld(-1));
worldNext.addEventListener('click', () => changeMenuWorld(1));
const developerScreen = createDeveloperScreen({
  drawGrid,
  isInteractionLocked: () => busy,
  isStageCompleted: (number) => Boolean(STAGES[number - 1] && records[STAGES[number - 1].key]?.completed),
  clearStageProgress: (number) => {
    const stage = STAGES[number - 1];
    if (!stage || !records[stage.key]?.completed) return false;
    records[stage.key] = clearStageCompletion(records[stage.key]);
    const nextWorld = STAGE_WORLDS[stage.worldIndex + 1];
    if (nextWorld) {
      seenUnlocks.delete(nextWorld.id);
      try { localStorage.setItem(UNLOCK_SEEN_KEY, JSON.stringify([...seenUnlocks])); } catch { /* Keep the in-memory state. */ }
    }
    if (stage.worldIndex === STAGE_WORLDS.length - 1) {
      seenFinalCelebration = null;
      try { localStorage.removeItem(FINAL_CELEBRATION_KEY); } catch { /* Keep working in memory. */ }
    }
    if (state?.stage.key === stage.key) {
      cancelAnimationFrame(blindFrame);
      state = restoreStageState(stage, records[stage.key]);
      usedOperations = new Set();
      introP1 = state.firstAttempt;
      extraSymbolAlpha = 0;
      extraSymbolOffsets = null;
      frame.classList.remove('cleared');
      delete frame.dataset.clearPhase;
    }
    if (!isWorldUnlocked(STAGES, records, state.stage.worldIndex)) {
      stageIndex = number - 1;
      state = restoreStageState(stage, records[stage.key]);
      introP1 = state.firstAttempt;
      usedOperations = new Set();
      applyTheme(state.stage);
    }
    if (!isWorldUnlocked(STAGES, records, menuWorldIndex)) {
      menuWorldIndex = stage.worldIndex;
      applyTheme({ theme: STAGE_WORLDS[menuWorldIndex].theme });
    }
    saveRecords();
    updateStageIndicator();
    updateMenu();
    updateControls();
    updateGauge();
    draw();
    return true;
  },
});
const developerSequence = createSecretSequence('kaihatusha');

function movePreview(event) {
  if (mobileLayout.matches || state.mode !== 'play' || menuOpen || busy) return;
  mouse = { ...boardPoint(event), visible: true, onBoard: true };
  draw();
}
board.addEventListener('pointerenter', movePreview);
board.addEventListener('pointermove', movePreview);
board.addEventListener('pointerleave', (event) => {
  if (mobileLayout.matches) return;
  if (!mouse.visible) return;
  if (state.mode !== 'play' || menuOpen || busy) {
    mouse.visible = false;
    mouse.onBoard = false;
    return;
  }
  mouse = { ...clampBoardPoint(boardPoint(event)), visible: true, onBoard: false };
  draw();
});
board.addEventListener('pointerdown', (event) => {
  if (mobileLayout.matches) return;
  if (event.button === 2) {
    event.preventDefault();
    if (controls.rotate.disabled) return;
    mouse = { ...boardPoint(event), visible: true, onBoard: true };
    rotate();
    return;
  }
  place(event);
});
board.addEventListener('contextmenu', (event) => event.preventDefault());
touchPad.addEventListener('pointerdown', (event) => {
  if (!mobileLayout.matches || touchGesture || busy || menuOpen || state.mode !== 'play') return;
  event.preventDefault();
  hideTouchGuidance();
  touchPad.setPointerCapture(event.pointerId);
  touchGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    startedWithoutTargets: state.targets.length === 0,
  };
  touchPad.classList.add('active');
  mouse.visible = true;
  mouse.onBoard = true;
  draw();
});
touchPad.addEventListener('pointermove', moveTouchGesture);
touchPad.addEventListener('pointerup', (event) => {
  if (!touchGesture || event.pointerId !== touchGesture.pointerId) return;
  const startedWithoutTargets = touchGesture.startedWithoutTargets;
  moveTouchGesture(event);
  if (startedWithoutTargets && !busy && !menuOpen && state.mode === 'play') {
    placeCandidate(getPreview());
  }
  releaseTouchGesture();
  scheduleTouchGuidance();
});
touchPad.addEventListener('pointercancel', (event) => {
  if (touchGesture?.pointerId === event.pointerId) {
    releaseTouchGesture();
    scheduleTouchGuidance();
  }
});
controls.reset.addEventListener('click', resetStage);
controls.undo.addEventListener('click', undo);
controls.change.addEventListener('click', changeShape);
controls.rotate.addEventListener('click', rotate);
controls.flip.addEventListener('click', flip);
controls.previous.addEventListener('click', () => {
  if (busy || controls.previous.disabled) return;
  sounds.play('switch');
  startStage(stageIndex - 1);
});
controls.next.addEventListener('click', () => {
  if (busy || controls.next.disabled) return;
  sounds.play('switch');
  startStage(stageIndex + 1);
});
indicator.addEventListener('click', openMenu);
document.getElementById('erase-button').addEventListener('click', () => {
  if (busy) return;
  sounds.play('switch');
  document.getElementById('confirm-backdrop').hidden = false;
  document.getElementById('confirm-erase').focus();
});
document.getElementById('cancel-erase').addEventListener('click', () => {
  sounds.play('switch');
  document.getElementById('confirm-backdrop').hidden = true;
  document.getElementById('erase-button').focus();
});
document.getElementById('confirm-erase').addEventListener('click', () => {
  sounds.play('switch');
  records = {};
  seenUnlocks = new Set();
  seenFinalCelebration = null;
  try { localStorage.removeItem(LEGACY_KEY); localStorage.removeItem(UNLOCK_SEEN_KEY); localStorage.removeItem(LEGACY_UNLOCK_SEEN_KEY); localStorage.removeItem(FINAL_CELEBRATION_KEY); } catch { /* New storage remains authoritative. */ }
  saveRecords();
  document.getElementById('confirm-backdrop').hidden = true;
  stageIndex = 0;
  menuWorldIndex = 0;
  state = newState(stageIndex);
  introP1 = state.firstAttempt;
  applyTheme(state.stage);
  extraSymbolAlpha = 0;
  extraSymbolOffsets = null;
  frame.classList.remove('cleared');
  delete frame.dataset.clearPhase;
  saveCurrentState();
  updateStageIndicator();
  updateMenu(); updateControls(); updateGauge(); draw();
  document.getElementById('erase-button').focus();
});
document.addEventListener('keydown', (event) => {
  if (menuOpen) {
    if (busy || screen.hidden || screen.inert || !confirmBackdrop.hidden || developerScreen.isOpen() ||
      event.altKey || event.ctrlKey || event.metaKey ||
      event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
      event.target?.isContentEditable) {
      developerSequence.reset();
      return;
    }
    if (!event.repeat && developerSequence.push(event.key)) developerScreen.show();
    return;
  }
  developerSequence.reset();
  if (event.altKey || event.ctrlKey || event.metaKey || busy) return;
  const action = { n: rotate, m: flip, b: undo, c: changeShape, r: resetStage }[event.key.toLowerCase()];
  if (action) { event.preventDefault(); action(); }
});

const openStageSelectionAtStartup = shouldOpenStageSelectionAtStartup(STAGES, records);
startStage(0);
if (openStageSelectionAtStartup) showInitialMenu();
