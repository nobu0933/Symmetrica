export const PLACEMENT_FLASH_MS = 440;
export const PLACEMENT_FLASH_HOLD_MS = 80;

function rgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((digit) => digit + digit).join('') : value;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
}

export function placementFlashColor(success, normal, elapsed) {
  const progress = Math.max(0, Math.min(1,
    (elapsed - PLACEMENT_FLASH_HOLD_MS) / (PLACEMENT_FLASH_MS - PLACEMENT_FLASH_HOLD_MS)));
  const eased = 1 - (1 - progress) ** 2;
  const from = rgb(success);
  const to = rgb(normal);
  return `#${from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * eased).toString(16).padStart(2, '0')).join('')}`;
}
