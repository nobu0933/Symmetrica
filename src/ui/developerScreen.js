import { DEFAULT_CLEAR_COLOR, DEFAULT_SUB_COLOR, DEFAULT_SYMBOL_COLOR, STAGE_WORLDS } from '../game/stages.js';
import { SymmetryConfig } from '../game/symmetryConfig.js';
import { drawSymmetryElements } from './symmetryRenderer.js';

const DRAFT_KEY = 'symmetrica_developer_draft_v2';
const LEGACY_DRAFT_KEY = 'symmetrica_developer_draft_v1';
const clone = (value) => structuredClone(value);
const byId = (id) => document.getElementById(id);
const symbolIds = (group) => [...new Set([
  ...Object.keys(SymmetryConfig[group]?.rotations || {}),
  ...Object.keys(SymmetryConfig[group]?.lines || {}),
].map(Number))].sort((a, b) => a - b);
const stepFor = (group) => SymmetryConfig[group]?.system === 'hexagonal' ? 60 : 90;

export function stageButtonLabel(worlds, worldIndex, stageIndex) {
  const number = worlds.slice(0, worldIndex).reduce((total, world) => total + world.stages.length, 0) + stageIndex + 1;
  return `${number} : ${worlds[worldIndex].stages[stageIndex].group}`;
}

export function swapDraftStages(worlds, worldIndex, fromIndex, toIndex) {
  const stages = worlds[worldIndex]?.stages;
  if (!stages || fromIndex === toIndex ||
    !Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
    fromIndex < 0 || toIndex < 0 || fromIndex >= stages.length || toIndex >= stages.length) return false;
  [stages[fromIndex], stages[toIndex]] = [stages[toIndex], stages[fromIndex]];
  return true;
}

export function renumberDraftWorlds(worlds) {
  worlds.forEach((world, index) => { world.id = index + 1; });
  return worlds;
}

export function removeDraftWorld(worlds, worldIndex) {
  if (worlds.length <= 1 || !Number.isInteger(worldIndex) || worldIndex < 0 || worldIndex >= worlds.length) return false;
  worlds.splice(worldIndex, 1);
  renumberDraftWorlds(worlds);
  return true;
}

export function migrateDraftWorldColors(worlds) {
  worlds.forEach((world) => {
    world.theme ||= { background: '#3c3e59', foreground: '#f0f2f5' };
    world.theme.subColor ||= DEFAULT_SUB_COLOR;
    world.theme.symbolColor ||= world.stages?.[0]?.symbolColor || DEFAULT_SYMBOL_COLOR;
    world.theme.clearColor ||= world.stages?.[0]?.clearColor || DEFAULT_CLEAR_COLOR;
    world.stages?.forEach((stage) => {
      stage.clearSymbols ||= [];
      stage.doubleMode ??= world.id === 3;
      stage.blindMode ??= world.id === 4;
      delete stage.symbolColor;
      delete stage.clearColor;
      delete stage.colorSet;
    });
  });
  return worlds;
}

function validDraft(worlds) {
  return Array.isArray(worlds) && worlds.length > 0 && worlds.every((world) =>
    Number.isInteger(world.id) && world.id > 0 && Array.isArray(world.stages) &&
    /^#[0-9a-f]{6}$/i.test(world.theme?.background) &&
    /^#[0-9a-f]{6}$/i.test(world.theme?.foreground) &&
    /^#[0-9a-f]{6}$/i.test(world.theme?.subColor) &&
    /^#[0-9a-f]{6}$/i.test(world.theme?.symbolColor) &&
    /^#[0-9a-f]{6}$/i.test(world.theme?.clearColor) &&
    world.stages.length === 17 && world.stages.every((stage) =>
      !!SymmetryConfig[stage.group] && Array.isArray(stage.symbols) &&
      Array.isArray(stage.clearSymbols) &&
      Array.isArray(stage.initialAngles) && typeof stage.doubleMode === 'boolean' &&
      typeof stage.blindMode === 'boolean' && Number.isFinite(stage.sizeMin) &&
      Number.isFinite(stage.sizeMax) && stage.sizeMax - stage.sizeMin >= 0.02));
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    const legacy = saved === null;
    const value = JSON.parse(saved ?? localStorage.getItem(LEGACY_DRAFT_KEY));
    if (Array.isArray(value)) migrateDraftWorldColors(value);
    if (validDraft(value)) {
      if (legacy) for (const published of STAGE_WORLDS) {
        if (!value.some((world) => world.id === published.id)) value.push(clone(published));
      }
      return renumberDraftWorlds(migrateDraftWorldColors(value));
    }
  } catch { /* Invalid drafts are ignored. */ }
  return migrateDraftWorldColors(clone(STAGE_WORLDS));
}

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
}

export function drawDeveloperSymbolPreview(ctx, stage, theme, drawGrid) {
  drawGrid(ctx, stepFor(stage.group) === 60, true, theme);
  const hints = { showProblem: true, rotation: true, mirror: true, glide: true };
  const all = symbolIds(stage.group);
  drawSymmetryElements(ctx, stage.group, 200, 200, 200, hints, all, [], false, 0.24, theme.symbolColor);
  drawSymmetryElements(ctx, stage.group, 200, 200, 200, hints, stage.symbols, [], false, 1, theme.symbolColor);
  drawSymmetryElements(ctx, stage.group, 200, 200, 200, hints, stage.clearSymbols, [], false, 1, theme.clearColor);
  return all;
}

export function createDeveloperScreen({ drawGrid, isStageCompleted = () => false, clearStageProgress = () => false, isInteractionLocked = () => false }) {
  const screen = byId('developer-screen');
  const canvas = byId('developer-symbol-canvas');
  const ctx = canvas.getContext('2d');
  const status = byId('developer-status');
  let worlds = loadDraft();
  let worldIndex = 0;
  let stageIndex = 0;
  let open = false;
  let draggedStageIndex = null;
  let draggedWorldIndex = null;
  const current = () => worlds[worldIndex].stages[stageIndex];
  const currentNumber = () => worlds.slice(0, worldIndex).reduce((sum, world) => sum + world.stages.length, 0) + stageIndex + 1;

  function persist() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(worlds)); status.textContent = '下書きを保存しました'; }
    catch { status.textContent = '下書きを保存できませんでした'; }
  }

  function renderWorlds() {
    const select = byId('developer-world');
    select.replaceChildren();
    worlds.forEach((world, index) => {
      const option = new Option(`ワールド ${world.id}`, String(index));
      select.add(option);
    });
    select.value = String(worldIndex);
  }

  function renderStages() {
    const list = byId('developer-stage-list');
    list.replaceChildren();
    worlds[worldIndex].stages.forEach((stage, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = stageButtonLabel(worlds, worldIndex, index);
      button.title = 'ドラッグして別のステージと入れ替え';
      button.draggable = true;
      button.classList.toggle('active', index === stageIndex);
      button.addEventListener('click', () => { stageIndex = index; render(); });
      button.addEventListener('dragstart', (event) => {
        draggedStageIndex = index;
        draggedWorldIndex = worldIndex;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
        button.classList.add('dragging');
      });
      button.addEventListener('dragover', (event) => {
        if (draggedWorldIndex !== worldIndex || draggedStageIndex === index) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        button.classList.add('drop-target');
      });
      button.addEventListener('dragleave', () => button.classList.remove('drop-target'));
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        button.classList.remove('drop-target');
        const from = draggedStageIndex;
        if (draggedWorldIndex !== worldIndex || !swapDraftStages(worlds, worldIndex, from, index)) return;
        if (stageIndex === from) stageIndex = index;
        else if (stageIndex === index) stageIndex = from;
        persist(); render();
      });
      button.addEventListener('dragend', () => {
        draggedStageIndex = null;
        draggedWorldIndex = null;
        for (const item of list.children) item.classList.remove('dragging', 'drop-target');
      });
      list.append(button);
    });
  }

  function renderAngles() {
    const container = byId('developer-angles');
    container.replaceChildren();
    const stage = current();
    const step = stepFor(stage.group);
    for (let angle = 0; angle < 360; angle += step) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${angle}°`;
      button.classList.toggle('active', stage.initialAngles.includes(angle));
      button.addEventListener('click', () => {
        const angles = stage.initialAngles.includes(angle)
          ? stage.initialAngles.filter((value) => value !== angle)
          : [...stage.initialAngles, angle].sort((a, b) => a - b);
        if (!angles.length) { status.textContent = '角度は1つ以上必要です'; return; }
        stage.initialAngles = angles;
        persist(); renderAngles();
      });
      container.append(button);
    }
  }

  function canvasPosition(group, u, v) {
    return SymmetryConfig[group].system === 'hexagonal'
      ? { x: 200 + 200 * u + 100 * v, y: 200 + 100 * Math.sqrt(3) * v }
      : { x: 200 + 200 * u, y: 200 + 200 * v };
  }

  function drawSymbols() {
    const stage = current();
    const all = drawDeveloperSymbolPreview(ctx, stage, worlds[worldIndex].theme, drawGrid);
    const list = byId('developer-symbol-list');
    list.replaceChildren();
    for (const id of all) {
      const config = SymmetryConfig[stage.group];
      const type = config.rotations?.[id]?.[0] || config.lines?.[id]?.[0];
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${type} ${id}`;
      button.title = `${type} 記号 ${id}`;
      button.classList.toggle('active', stage.symbols.includes(id));
      button.addEventListener('click', () => toggleSymbol(id));
      list.append(button);
    }
    if (!all.length) list.textContent = 'この平面群に対称記号はありません';
    renderClearSymbols();
  }

  function renderClearSymbols() {
    const stage = current();
    const config = SymmetryConfig[stage.group];
    const list = byId('developer-clear-symbol-list');
    list.replaceChildren();
    for (const id of symbolIds(stage.group)) {
      const type = config.rotations?.[id]?.[0] || config.lines?.[id]?.[0];
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${type} ${id}`;
      button.classList.toggle('active', stage.clearSymbols.includes(id));
      button.disabled = stage.symbols.includes(id);
      button.title = button.disabled ? '問題で表示する記号です' : 'クリア後に追加する記号';
      button.addEventListener('click', () => {
        stage.clearSymbols = stage.clearSymbols.includes(id)
          ? stage.clearSymbols.filter((value) => value !== id)
          : [...stage.clearSymbols, id].sort((a, b) => a - b);
        persist(); drawSymbols();
      });
      list.append(button);
    }
    if (!list.children.length) list.textContent = '追加できる記号はありません';
  }

  function toggleSymbol(id) {
    const stage = current();
    stage.symbols = stage.symbols.includes(id)
      ? stage.symbols.filter((value) => value !== id)
      : [...stage.symbols, id].sort((a, b) => a - b);
    stage.clearSymbols = stage.clearSymbols.filter((value) => !stage.symbols.includes(value));
    persist(); drawSymbols();
  }

  function render() {
    renderWorlds(); renderStages();
    const stage = current();
    byId('developer-group').value = stage.group;
    byId('developer-background').value = worlds[worldIndex].theme.background;
    byId('developer-foreground').value = worlds[worldIndex].theme.foreground;
    byId('developer-sub-color').value = worlds[worldIndex].theme.subColor;
    byId('developer-symbol-color').value = worlds[worldIndex].theme.symbolColor;
    byId('developer-clear-color').value = worlds[worldIndex].theme.clearColor;
    byId('developer-remove-world').disabled = worlds.length <= 1;
    byId('developer-clear-stage').disabled = !isStageCompleted(currentNumber());
    screen.style.setProperty('--rim', worlds[worldIndex].theme.subColor);
    screen.style.setProperty('--developer-clear-color', worlds[worldIndex].theme.clearColor);
    byId('developer-min-size').value = Math.round(stage.sizeMin * 100);
    byId('developer-max-size').value = Math.round(stage.sizeMax * 100);
    byId('developer-rotate').checked = stage.allowRotate;
    byId('developer-flip').checked = stage.allowFlip;
    byId('developer-double').checked = stage.doubleMode;
    byId('developer-blind').checked = stage.blindMode;
    renderAngles(); drawSymbols();
  }

  function exportCode() {
    // JSON is also valid JavaScript; this replaces the STAGE_WORLDS declaration.
    const code = `export const STAGE_WORLDS = ${JSON.stringify(worlds, null, 2)};`;
    byId('developer-output').value = code;
    status.textContent = 'src/game/stages.js の STAGE_WORLDS 宣言と置き換えてください';
    return code;
  }

  const groupSelect = byId('developer-group');
  Object.keys(SymmetryConfig).filter((name) => !name.includes('_')).forEach((group) => groupSelect.add(new Option(group, group)));

  groupSelect.addEventListener('change', () => {
    const stage = current();
    stage.group = groupSelect.value;
    stage.symbols = [];
    stage.clearSymbols = [];
    stage.initialAngles = Array.from({ length: 360 / stepFor(stage.group) }, (_, index) => index * stepFor(stage.group));
    persist(); render();
  });
  for (const [id, key] of [
    ['developer-background', 'background'], ['developer-foreground', 'foreground'],
    ['developer-sub-color', 'subColor'],
    ['developer-symbol-color', 'symbolColor'], ['developer-clear-color', 'clearColor'],
  ]) {
    byId(id).addEventListener('input', (event) => {
      worlds[worldIndex].theme[key] = event.target.value;
      screen.style.setProperty('--rim', worlds[worldIndex].theme.subColor);
      screen.style.setProperty('--developer-clear-color', worlds[worldIndex].theme.clearColor);
      persist(); drawSymbols();
    });
  }
  for (const [id, key] of [['developer-rotate', 'allowRotate'], ['developer-flip', 'allowFlip'],
    ['developer-double', 'doubleMode'], ['developer-blind', 'blindMode']]) {
    byId(id).addEventListener('change', (event) => { current()[key] = event.target.checked; persist(); });
  }
  for (const [id, key] of [['developer-min-size', 'sizeMin'], ['developer-max-size', 'sizeMax']]) {
    byId(id).addEventListener('change', (event) => {
      const value = Number(event.target.value) / 100;
      const stage = current();
      if (!Number.isFinite(value) || value < 0.05 || value > 1 ||
        (key === 'sizeMin' && stage.sizeMax - value < 0.02 - 1e-9) ||
        (key === 'sizeMax' && value - stage.sizeMin < 0.02 - 1e-9)) {
        status.textContent = 'サイズは5～100%、最小と最大を2%以上離してください';
        render(); return;
      }
      stage[key] = value; persist();
    });
  }
  byId('developer-world').addEventListener('change', (event) => { worldIndex = Number(event.target.value); stageIndex = 0; render(); });
  byId('developer-clear-stage').addEventListener('click', () => {
    const number = currentNumber();
    if (!isStageCompleted(number) || !window.confirm(`ステージ ${number} のクリア判定を消去しますか？模様と途中経過は保持します。`)) return;
    if (clearStageProgress(number)) {
      render();
      status.textContent = `ステージ ${number} のクリア判定を消去しました`;
    }
  });
  byId('developer-add-world').addEventListener('click', () => {
    const template = worlds[worldIndex];
    worlds.push({ id: worlds.length + 1, theme: clone(template.theme), stages: clone(template.stages) });
    worldIndex = worlds.length - 1; stageIndex = 0;
    persist(); render();
  });
  byId('developer-remove-world').addEventListener('click', () => {
    if (worlds.length <= 1 || !window.confirm(`ワールド ${worlds[worldIndex].id} と17ステージの下書きを削除しますか？`)) return;
    if (!removeDraftWorld(worlds, worldIndex)) return;
    worldIndex = Math.min(worldIndex, worlds.length - 1);
    stageIndex = 0;
    persist(); render();
  });
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * 600 / rect.width, y: (event.clientY - rect.top) * 600 / rect.height };
    const config = SymmetryConfig[current().group];
    let closest = null;
    for (const [id, [, u, v]] of Object.entries(config.rotations || {})) {
      const target = canvasPosition(current().group, u, v);
      const distance = Math.hypot(point.x - target.x, point.y - target.y);
      if (distance < 17 && (!closest || distance < closest.distance)) closest = { id: Number(id), distance };
    }
    if (!closest) for (const [id, [, u1, v1, u2, v2]] of Object.entries(config.lines || {})) {
      const distance = pointSegmentDistance(point, canvasPosition(current().group, u1, v1), canvasPosition(current().group, u2, v2));
      if (distance < 12 && (!closest || distance < closest.distance)) closest = { id: Number(id), distance };
    }
    if (closest) toggleSymbol(closest.id);
  });
  byId('developer-export').addEventListener('click', exportCode);
  byId('developer-copy').addEventListener('click', async () => {
    const code = exportCode();
    try { await navigator.clipboard.writeText(code); status.textContent = 'コードをコピーしました'; }
    catch { byId('developer-output').select(); status.textContent = '自動コピーできません。出力欄を選択してコピーしてください'; }
  });
  byId('developer-reset').addEventListener('click', () => {
    worlds = migrateDraftWorldColors(clone(STAGE_WORLDS)); worldIndex = 0; stageIndex = 0;
    try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(LEGACY_DRAFT_KEY); } catch { /* Keep working in memory. */ }
    status.textContent = '編集中の変更を破棄しました'; render();
  });
  function show() {
    if (open || isInteractionLocked()) return false;
    screen.hidden = false; open = true; byId('stage-screen').inert = true;
    render(); byId('developer-close').focus();
    return true;
  }
  byId('developer-close').addEventListener('click', () => {
    screen.hidden = true; open = false; byId('stage-screen').inert = false;
    byId('stage-screen').focus({ preventScroll: true });
  });
  return { isOpen: () => open, show };
}
