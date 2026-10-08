export const CONTROL_PRESS_MS = 240;

export function createButtonPressFeedback({ setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const timers = new WeakMap();
  return (button) => {
    const previous = timers.get(button);
    if (previous !== undefined) clearTimer(previous);
    button.classList.remove('press-flash');
    void button.offsetWidth; // Restart the brief inversion on rapid repeated presses.
    button.classList.add('press-flash');
    timers.set(button, setTimer(() => {
      button.classList.remove('press-flash');
      timers.delete(button);
    }, CONTROL_PRESS_MS));
  };
}
