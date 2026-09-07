(function (root) {
  'use strict';
  const WIDTH = 1200, HEIGHT = 1000;
  function layout(episodes, arcs) {
    const nodes = [], hubs = [], edges = [];
    arcs.forEach((arc, index) => {
      const row = Math.floor(index / 3), column = row % 2 ? 2 - index % 3 : index % 3;
      const hub = { key: `arc-${arc.id}`, kind: 'arc', arc: arc.id, x: 200 + column * 400, y: 175 + row * 325, radius: 30 };
      hubs.push(hub); nodes.push(hub);
      const members = episodes.filter(e => e.arc === arc.id).sort((a, b) => a.episode - b.episode);
      let offset = 0, ring = 0;
      while (offset < members.length) {
        const count = Math.min(14 + ring * 8, members.length - offset), radius = 70 + ring * 31;
        for (let j = 0; j < count; j++) {
          const e = members[offset + j], angle = j * Math.PI * 2 / count - Math.PI / 2 + ring * .14;
          nodes.push({ key: `node-${e.episode}`, kind: 'episode', episode: e.episode, arc: arc.id,
            x: hub.x + Math.cos(angle) * radius, y: hub.y + Math.sin(angle) * radius,
            radius: e.imdb.rating === null ? 5 : 5 + (e.imdb.rating - 1) * .45 });
        }
        offset += count; ring++;
      }
    });
    for (let i = 1; i < hubs.length; i++) edges.push({ source: hubs[i - 1], target: hubs[i] });
    return { nodes, hubs, edges, width: WIDTH, height: HEIGHT };
  }
  function zoomView(view, factor, anchor = { x: view.x + view.w / 2, y: view.y + view.h / 2 }) {
    const w = Math.min(WIDTH / .7, Math.max(WIDTH / 5, view.w / factor));
    const ratio = w / view.w;
    return clampView({ x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio, w, h: w * HEIGHT / WIDTH });
  }
  function clampView(view) {
    return { ...view, x: Math.max(-view.w * .5, Math.min(WIDTH - view.w * .5, view.x)),
      y: Math.max(-view.h * .5, Math.min(HEIGHT - view.h * .5, view.y)) };
  }
  const api = { layout, zoomView, clampView, WIDTH, HEIGHT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConanGraphCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
