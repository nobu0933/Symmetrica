import { isWorldComplete, isWorldUnlocked } from '../game/progressState.js';

export function worldProgressStatus(worlds, stages, records, seenUnlocks, currentIndex, {
  revealWorldIndex = -1,
  forceVisible = false,
  finalSeen = false,
} = {}) {
  const unlocked = (index) => index === 0 || Boolean(worlds[index] &&
    isWorldUnlocked(stages, records, index) &&
    (seenUnlocks.has(worlds[index].id) || index === revealWorldIndex));
  const dots = worlds.map((_, index) => ({
    current: index === currentIndex,
    unlocked: unlocked(index),
  }));
  const nextIndex = currentIndex + 1;
  const hasNext = nextIndex < worlds.length;
  return {
    visible: forceVisible || (worlds.length > 1 ? unlocked(1) :
      finalSeen && isWorldComplete(stages, records, 0)),
    dots,
    nextButtonVisible: hasNext && unlocked(nextIndex),
    placeholderVisible: currentIndex > 0 && hasNext && !unlocked(nextIndex),
  };
}
