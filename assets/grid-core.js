/* Compact deformation: points outside the hover radius stay exactly fixed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ConanGridCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const RADIUS = 140;
  function warpPoint(x, y, field) {
    const dx = x - field.x, dy = y - field.y;
    const distanceSquared = dx * dx + dy * dy;
    if (!field.strength || distanceSquared >= RADIUS * RADIUS) return { x, y };
    const weight = (1 - distanceSquared / (RADIUS * RADIUS)) ** 3 * field.strength;
    return {
      x: x + (dx * .16 + field.pullX) * weight,
      y: y + (dy * .16 + field.pullY) * weight,
    };
  }
  return { RADIUS, warpPoint };
});
