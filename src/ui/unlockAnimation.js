export const FINAL_ICON_PAUSE_MS = 1000;
export const PENULTIMATE_ICON_PAUSE_MS = 800;
export const EARLY_ICON_DELAY_MS = 90;
export const TURN_ICON_DELAY_MS = 140;
export const FINAL_ICON_HOP_MS = 1000;
export const FINAL_ICON_LANDING_MS = 830; // 83% of the 1s final hop.
export const NEXT_WORLD_BUTTON_LANDING_MS = 374; // 68% of the 550ms drop.
export const NEXT_WORLD_LANDING_GAP_MS = 800;
export const NEXT_WORLD_BUTTON_DELAY_MS = FINAL_ICON_LANDING_MS + NEXT_WORLD_LANDING_GAP_MS - NEXT_WORLD_BUTTON_LANDING_MS;

// Delay immediately before the icon at index. Brief accents mark the turns
// from icon 5 to 6 and 9 to 10; the final two pauses remain 800/1000 ms.
export function unlockStepDelay(index, count) {
  if (index >= count - 1) return FINAL_ICON_PAUSE_MS;
  const slowdownStart = Math.max(1, count - 4);
  if (index < slowdownStart) return index === 5 || index === 9 ? TURN_ICON_DELAY_MS : EARLY_ICON_DELAY_MS;
  const progress = (index - slowdownStart + 1) / Math.max(1, count - 1 - slowdownStart);
  return Math.round(EARLY_ICON_DELAY_MS + (PENULTIMATE_ICON_PAUSE_MS - EARLY_ICON_DELAY_MS) * progress);
}
