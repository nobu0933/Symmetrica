export const BLIND_FADE_MS = 900;

export function blindPlacementAlpha(data, index, now = Date.now()) {
  if (!data.stage.blindMode || index === 0 || data.mode === 'view') return 1;
  return Math.max(0, 1 - (now - (data.placed[index].placedAt ?? 0)) / BLIND_FADE_MS);
}

export function blindThumbnailAlpha(data, index) {
  if (data.stage.blindMode && data.mode === 'play' && index > 0) return 0;
  return 1;
}
