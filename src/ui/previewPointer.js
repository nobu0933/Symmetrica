export function clampBoardPoint(point, size = 600) {
  return {
    x: Math.max(0, Math.min(size, point.x)),
    y: Math.max(0, Math.min(size, point.y)),
  };
}
