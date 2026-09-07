const test = require('node:test');
const assert = require('node:assert/strict');
const { RADIUS, warpPoint } = require('../assets/grid-core.js');

test('hover deformation leaves all points outside its local radius exactly fixed', () => {
  const field = { x: 320, y: 240, strength: 1, pullX: 9, pullY: -9 };
  for (const offset of [RADIUS, RADIUS + 1, 500, 2000]) {
    for (const [x, y] of [[320 + offset, 240], [320, 240 - offset]]) {
      assert.deepEqual(warpPoint(x, y, field), { x, y });
    }
  }
  assert.notDeepEqual(warpPoint(350, 270, field), { x: 350, y: 270 });
});

test('the grid relaxes exactly to rest and joins the unaffected grid smoothly', () => {
  const field = { x: 320, y: 240, strength: 0, pullX: 9, pullY: -9 };
  assert.deepEqual(warpPoint(350, 270, field), { x: 350, y: 270 });
  field.strength = 1;
  const edge = 320 + RADIUS - .01;
  const warped = warpPoint(edge, 240, field);
  assert.ok(Math.hypot(warped.x - edge, warped.y - 240) < 1e-8);
  for (let x = 180; x <= 460; x += 4) for (let y = 100; y <= 380; y += 4) {
    const p = warpPoint(x, y, field);
    assert.ok(Math.hypot(p.x - x, p.y - y) < 17, 'local movement stays subtle');
  }
});
