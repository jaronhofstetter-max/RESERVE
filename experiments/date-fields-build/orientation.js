// Geometry schedules attempts; it never supplies date characters or lowers review gates.
export function orientationHint(lines) {
  let vertical = 0, horizontal = 0;
  for (const {box} of lines) {
    if (!Array.isArray(box) || box.length !== 4 || !box.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) continue;
    const dx = Math.abs(box[1][0] - box[0][0]), dy = Math.abs(box[1][1] - box[0][1]);
    const length = Math.hypot(dx, dy), height = Math.hypot(box[3][0] - box[0][0], box[3][1] - box[0][1]);
    if (length < 24 || height <= 0 || length < height * 2) continue;
    if (dy > dx * 2) vertical++;
    else if (dx > dy * 2) horizontal++;
  }
  const sideways = vertical >= 3 && vertical >= 3 * horizontal;
  return {priority: sideways ? 'sideways' : 'default', verticalLines: vertical, horizontalLines: horizontal};
}
export function remainingAngles(hint, readerPairs = 0) {
  // Once a numeric region was inspected, retain the established order.
  return readerPairs === 0 && hint?.priority === 'sideways' ? [90, 270, 180] : [180, 90, 270];
}
