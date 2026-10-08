export const TOUCH_SNAP_DWELL_MS = 100;

export function sameVisualSnap(a, b) {
  return (a.shapeIndex ?? 0) === (b.shapeIndex ?? 0) &&
    a.angle === b.angle && a.flipped === b.flipped &&
    Math.hypot(a.x - b.x, a.y - b.y) <= 0.6;
}

export function createTouchSnapDwell(onReady, {
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let pending = null;
  let timer = null;

  function cancel() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    pending = null;
  }

  return {
    cancel,
    observe(candidate, stageState, placedCount) {
      if (!candidate) { cancel(); return; }
      if (pending && pending.stageState === stageState &&
        pending.placedCount === placedCount && sameVisualSnap(pending.candidate, candidate)) return;
      cancel();
      const next = { candidate: { ...candidate }, stageState, placedCount };
      pending = next;
      timer = setTimer(() => {
        if (pending !== next) return;
        timer = null;
        pending = null;
        onReady(next);
      }, TOUCH_SNAP_DWELL_MS);
    },
  };
}
