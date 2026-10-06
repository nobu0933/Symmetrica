export const BLIND_FADE_MS = 500;

export function blindPlacementAlpha(data, index, now = Date.now()) {
  if (!data.stage.blindMode || index === 0 || data.mode === 'view' || (data.completed && !data.editing)) return 1;
  return Math.max(0, 1 - (now - (data.placed[index].placedAt ?? 0)) / BLIND_FADE_MS);
}
