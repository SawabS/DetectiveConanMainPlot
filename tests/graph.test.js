'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../data/episodes.json');
const { layout, zoomView, clampView, WIDTH, HEIGHT } = require('../assets/graph-core.js');

test('map covers all 255 episodes once, with nine hubs and eight ordered arc edges', () => {
  const map = layout(data.episodes, data.arcs);
  const episodeNodes = map.nodes.filter(n => n.kind === 'episode');
  assert.equal(map.hubs.length, 9);
  assert.equal(map.edges.length, 8);
  assert.equal(episodeNodes.length, 255);
  assert.deepEqual(episodeNodes.map(n => n.episode), data.episodes.map(e => e.episode));
  assert.equal(new Set(map.nodes.map(n => n.key)).size, 264);
  for (const [i, edge] of map.edges.entries()) {
    assert.equal(edge.source.arc, i + 1);
    assert.equal(edge.target.arc, i + 2);
  }
});

test('nodes remain inside the canvas, in their own arc, without visible overlap', () => {
  const map = layout(data.episodes, data.arcs);
  for (const n of map.nodes) {
    assert(n.x - n.radius >= 0 && n.x + n.radius <= WIDTH);
    assert(n.y - n.radius >= 0 && n.y + n.radius <= HEIGHT);
    if (n.kind === 'episode') assert.equal(data.episodes.find(e => e.episode === n.episode).arc, n.arc);
  }
  for (let i = 0; i < map.nodes.length; i++) {
    for (let j = i + 1; j < map.nodes.length; j++) {
      const a = map.nodes[i], b = map.nodes[j];
      assert(Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 2, `${a.key} overlaps ${b.key}`);
    }
  }
});

test('zoom is bounded and keeps its anchor stable unless clamped to the canvas', () => {
  const initial = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  const anchor = { x: 400, y: 300 };
  const zoomed = zoomView(initial, 2, anchor);
  assert.equal((anchor.x - zoomed.x) / zoomed.w, anchor.x / WIDTH);
  assert.equal((anchor.y - zoomed.y) / zoomed.h, anchor.y / HEIGHT);
  assert.equal(zoomView(initial, 1000).w, WIDTH / 5);
  assert.equal(zoomView(initial, .0001).w, WIDTH / .7);
  const panned = clampView({ x: 100000, y: -100000, w: 400, h: 300 });
  assert.equal(panned.x, WIDTH - 200);
  assert.equal(panned.y, -150);
});

test('theme bootstrap honors saved choices and safely falls back to system settings', () => {
  const script = fs.readFileSync(path.join(__dirname, '../assets/theme.js'), 'utf8');
  function run(saved, systemLight, blocked = false) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(script, { document,
      localStorage: { getItem: () => { if (blocked) throw Error('blocked'); return saved; } },
      matchMedia: () => ({ matches: systemLight }) });
    return document.documentElement.dataset.theme;
  }
  assert.equal(run('light', false), 'light');
  assert.equal(run('dark', true), 'dark');
  assert.equal(run(null, true), 'light');
  assert.equal(run('invalid', false), 'dark');
  assert.equal(run('dark', true, true), 'light');
});
