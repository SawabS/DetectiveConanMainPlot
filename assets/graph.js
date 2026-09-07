(() => {
  'use strict';
  window.createConanGraph = ({ data, getWatched, getHideTitles, onWatch, onDetails, onViewEpisode, onHideTitles }) => {
    const $ = id => document.getElementById(id);
    const { layout, zoomView, clampView, WIDTH, HEIGHT } = window.ConanGraphCore;
    const model = layout(data.episodes, data.arcs);
    const episodes = new Map(data.episodes.map(e => [e.episode, e]));
    const arcs = new Map(data.arcs.map(a => [a.id, a]));
    const nodeMap = new Map(model.nodes.map(n => [n.key, n]));
    const svg = $('story-graph'), world = $('graph-world');
    let view = { x: 0, y: 0, w: WIDTH, h: HEIGHT }, selected = null, focusKey = model.nodes[0].key;
    let drag = null, moved = false;
    const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const pad = n => String(n).padStart(3, '0');
    const arcName = n => getHideTitles() ? `Arc ${String(n).padStart(2, '0')}` : arcs.get(n).name;
    const episodeTitle = e => getHideTitles() ? `Case file ${pad(e.episode)}` : e.title;
    const status = message => { $('graph-status').textContent = message; };
    const external = 'target="_blank" rel="noopener noreferrer"';

    // SVG contains only data geometry. The eight dashed edges show arc order.
    world.innerHTML = model.edges.map(({ source: s, target: t }) => `<path class="arc-edge" d="M${s.x},${s.y} L${t.x},${t.y}"/>`).join('') + data.arcs.map(a => {
      const hub = model.hubs.find(h => h.arc === a.id);
      const orbits = [70, 101, 132].map(r => `<circle class="arc-orbit" cx="${hub.x}" cy="${hub.y}" r="${r}"/>`).join('');
      const nodes = model.nodes.filter(n => n.arc === a.id).map(n => n.kind === 'arc'
        ? `<g class="graph-node arc-hub" id="${n.key}" data-key="${n.key}" role="button" tabindex="${n.key === focusKey ? 0 : -1}" transform="translate(${n.x} ${n.y})"><circle class="node-halo" r="38"/><circle class="hub-ring" r="34"/><circle class="hub-disc" r="30"/><text class="hub-number" y="7">${String(n.arc).padStart(2,'0')}</text><text class="hub-label" y="165"></text></g>`
        : `<g class="graph-node episode-node" id="${n.key}" data-key="${n.key}" role="button" tabindex="-1" transform="translate(${n.x} ${n.y})"><circle class="node-hit" r="14"/><circle class="node-halo" r="${n.radius + 4}"/><circle class="node-dot" r="${n.radius}"/><path class="node-check" d="m-3.5 0 2.2 2.5 4.8-5"/><text class="node-label" y="-16">${pad(n.episode)}</text></g>`).join('');
      return `<g class="arc-group" data-arc-color="${a.id}">${orbits}${nodes}</g>`;
    }).join('');

    function drawView() {
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
      const zoom = WIDTH / view.w;
      svg.classList.toggle('show-node-labels', zoom >= 1.8);
      $('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
      $('zoom-out').disabled = zoom <= .701;
      $('zoom-in').disabled = zoom >= 4.999;
    }
    function fit() {
      view = { x: 0, y: 0, w: WIDTH, h: HEIGHT }; selected = null;
      $('graph-arc').value = '0'; drawView(); update();
    }
    function focusArc(arc) {
      const hub = model.hubs.find(h => h.arc === arc);
      view = clampView({ x: hub.x - 210, y: hub.y - 175, w: 420, h: 350 });
      drawView();
    }
    function select(key, zoom = false, announce = true) {
      const n = nodeMap.get(key);
      if (!n) return;
      selected = n; focusKey = key;
      $('graph-arc').value = String(n.arc);
      if (zoom) focusArc(n.arc);
      update();
      if (announce) status(n.kind === 'arc' ? `${arcName(n.arc)} selected.` : `Episode ${n.episode}: ${episodeTitle(episodes.get(n.episode))}.`);
    }
    function renderCard() {
      const watched = getWatched();
      if (!selected) {
        $('graph-card').innerHTML = `<div class="graph-card"><p class="graph-card-kicker">The entire investigation</p><h3>Nine arcs.<br>One continuous story.</h3><p class="card-subtitle">Select an arc to get closer, or an episode to open its case file.</p><div class="card-stats"><div><strong>${data.episodes.length}</strong><span>episode nodes</span></div><div><strong>${watched.size}</strong><span>watched</span></div></div><div class="card-arc-list">${data.arcs.map(a => `<button data-card-arc="${a.id}" data-arc-color="${a.id}">${esc(arcName(a.id))}<span>${data.episodes.filter(e => e.arc === a.id).length}</span></button>`).join('')}</div></div>`;
        return;
      }
      const members = data.episodes.filter(e => e.arc === selected.arc), done = members.filter(e => watched.has(e.episode)).length;
      if (selected.kind === 'arc') {
        const next = members.find(e => !watched.has(e.episode)) ?? members[0];
        const rated = members.filter(e => e.imdb.rating !== null);
        const average = rated.length ? (rated.reduce((s, e) => s + e.imdb.rating, 0) / rated.length).toFixed(1) : 'N/A';
        $('graph-card').innerHTML = `<div class="graph-card" data-arc-color="${selected.arc}"><p class="graph-card-kicker">Arc ${String(selected.arc).padStart(2,'0')}</p><h3>${esc(arcName(selected.arc))}</h3><p class="card-subtitle">Episodes ${members[0].episode} to ${members.at(-1).episode}, selected cases only.</p><div class="card-stats"><div><strong>${done}/${members.length}</strong><span>watched</span></div><div><strong>★ ${average}</strong><span>mean episode rating</span></div></div><p class="card-note">Follow the selected episodes in numerical order. ${members.length - done} remain in this arc.</p><button class="button primary" data-card-episode="${next.episode}">${done === members.length ? 'Revisit' : 'Continue with'} #${pad(next.episode)}</button><button class="button quiet" data-focus-arc="${selected.arc}">Focus this arc</button><div class="card-navigation"><button class="button quiet" data-card-arc="${Math.max(1,selected.arc-1)}" ${selected.arc === 1 ? 'disabled' : ''}>← Previous arc</button><button class="button quiet" data-card-arc="${Math.min(9,selected.arc+1)}" ${selected.arc === 9 ? 'disabled' : ''}>Next arc →</button></div></div>`;
      } else {
        const e = episodes.get(selected.episode), index = data.episodes.findIndex(item => item.episode === e.episode);
        const prev = data.episodes[index - 1], next = data.episodes[index + 1];
        $('graph-card').innerHTML = `<div class="graph-card" data-arc-color="${e.arc}"><p class="graph-card-kicker">Episode ${pad(e.episode)} / ${esc(arcName(e.arc))}</p><h3>${esc(episodeTitle(e))}</h3><p class="card-subtitle">${esc(e.airDate)}</p><div class="card-stats"><div><strong>★ ${e.imdb.rating === null ? 'N/A' : e.imdb.rating.toFixed(1)}</strong><span>IMDb / 10</span></div><div><strong>${(e.imdb.votes ?? 0).toLocaleString()}</strong><span>votes</span></div></div><p class="card-note">${watched.has(e.episode) ? 'Watched. Another clue connected.' : 'Unwatched. Your next clue awaits.'}</p><button class="button primary" data-card-watch="${e.episode}">${watched.has(e.episode) ? 'Mark as unwatched' : 'Mark as watched ✓'}</button><button class="button quiet" data-card-detail="${e.episode}">Sources & episode details</button><a class="card-link" href="https://www.imdb.com/title/${e.imdb.id}/" ${external}>IMDb entry ↗</a><button class="text-button card-link" data-card-list="${e.episode}">Show in watchlist ↗</button><div class="card-navigation"><button class="button quiet" data-card-episode="${prev?.episode ?? e.episode}" ${prev ? '' : 'disabled'}>← Previous</button><button class="button quiet" data-card-episode="${next?.episode ?? e.episode}" ${next ? '' : 'disabled'}>Next →</button></div></div>`;
      }
    }
    function update() {
      const focused = document.activeElement;
      const cardAction = focused?.closest('#graph-card button');
      const cardKey = cardAction ? Object.entries(cardAction.dataset)[0] : null;
      $('graph-hide-titles').checked = getHideTitles();
      const oldArc = $('graph-arc').value;
      $('graph-arc').innerHTML = '<option value="0">All nine arcs</option>' + data.arcs.map(a => `<option value="${a.id}">${String(a.id).padStart(2,'0')} / ${esc(arcName(a.id))}</option>`).join('');
      $('graph-arc').value = oldArc;
      model.nodes.forEach(n => {
        const el = $(n.key), done = n.kind === 'episode' && getWatched().has(n.episode);
        el.classList.toggle('is-watched', done);
        el.classList.toggle('is-selected', selected?.key === n.key);
        el.setAttribute('tabindex', n.key === focusKey ? '0' : '-1');
        el.setAttribute('aria-pressed', String(selected?.key === n.key));
        el.setAttribute('aria-label', n.kind === 'arc' ? `Arc ${n.arc}: ${arcName(n.arc)}` : `Episode ${n.episode}: ${episodeTitle(episodes.get(n.episode))}, ${done ? 'watched' : 'unwatched'}`);
        if (n.kind === 'arc') el.querySelector('.hub-label').textContent = arcName(n.arc);
      });
      renderCard();
      if (cardKey) {
        const replacement = [...$('graph-card').querySelectorAll('button')].find(b => b.dataset[cardKey[0]] === cardKey[1]);
        replacement?.focus({ preventScroll: true });
      }
    }
    function point(event) {
      const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    }
    world.addEventListener('click', event => {
      if (moved) return;
      const el = event.target.closest('[data-key]');
      if (el) select(el.dataset.key, nodeMap.get(el.dataset.key).kind === 'arc');
    });
    world.addEventListener('focusin', event => {
      const key = event.target.closest('[data-key]')?.dataset.key;
      if (key) { focusKey = key; select(key, false, false); }
    });
    svg.addEventListener('keydown', event => {
      const current = nodeMap.get(event.target.closest('[data-key]')?.dataset.key ?? focusKey);
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); select(current.key, current.kind === 'arc');
      } else if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const step = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1;
        const next = model.nodes[(model.nodes.indexOf(current) + step + model.nodes.length) % model.nodes.length];
        select(next.key, WIDTH / view.w > 1.5 && next.arc !== current.arc, false);
        $(next.key).focus({ preventScroll: true });
      } else if (['+','=','-','Home'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home') fit(); else { view = zoomView(view, event.key === '-' ? 1 / 1.25 : 1.25); drawView(); }
      }
    });
    svg.addEventListener('pointerdown', event => {
      moved = false;
      // A single touch keeps normal page scrolling; mouse/pen drag pans the map.
      if (event.pointerType === 'touch' || event.button !== 0 || event.target.closest('[data-key]')) return;
      const p = point(event); drag = { id: event.pointerId, x: p.x, y: p.y, view: { ...view }, clientX: event.clientX, clientY: event.clientY };
      svg.setPointerCapture(event.pointerId); svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const ctm = svg.getScreenCTM();
      const dx = (event.clientX - drag.clientX) / ctm.a, dy = (event.clientY - drag.clientY) / ctm.d;
      moved = Math.hypot(dx, dy) > 3;
      view = clampView({ ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy }); drawView();
    });
    function endDrag(event) {
      if (drag?.id !== event.pointerId) return;
      drag = null; svg.classList.remove('is-dragging');
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    }
    svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('lostpointercapture', () => { drag = null; svg.classList.remove('is-dragging'); });
    // Ctrl/Command + wheel zooms the map without trapping normal page scrolling.
    svg.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault(); view = zoomView(view, event.deltaY < 0 ? 1.15 : 1 / 1.15, point(event)); drawView();
    }, { passive: false });
    $('zoom-in').addEventListener('click', () => { view = zoomView(view, 1.25); drawView(); });
    $('zoom-out').addEventListener('click', () => { view = zoomView(view, 1 / 1.25); drawView(); });
    $('graph-fit').addEventListener('click', fit);
    $('graph-arc').addEventListener('change', event => Number(event.target.value) ? select(`arc-${event.target.value}`, true) : fit());
    $('graph-hide-titles').addEventListener('change', event => onHideTitles(event.target.checked));
    function findEpisode() {
      const raw = $('graph-search').value.trim().replace(/^#/, ''), n = /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (!episodes.has(n)) { status('Enter a selected Japanese episode number, such as 1, 129, or 345.'); return; }
      select(`node-${n}`, true); $( `node-${n}`).focus({ preventScroll: true });
    }
    $('graph-find').addEventListener('click', findEpisode);
    $('graph-search').addEventListener('keydown', e => { if (e.key === 'Enter') findEpisode(); });
    $('graph-card').addEventListener('click', event => {
      const b = event.target.closest('button'); if (!b) return;
      if (b.dataset.cardArc) select(`arc-${b.dataset.cardArc}`, true);
      if (b.dataset.focusArc) focusArc(Number(b.dataset.focusArc));
      if (b.dataset.cardEpisode) select(`node-${b.dataset.cardEpisode}`, true);
      if (b.dataset.cardWatch) { const n = Number(b.dataset.cardWatch); onWatch(n, !getWatched().has(n)); }
      if (b.dataset.cardDetail) onDetails(Number(b.dataset.cardDetail));
      if (b.dataset.cardList) onViewEpisode(Number(b.dataset.cardList));
    });
    drawView(); update();
    return { update, fit, openEpisode: n => select(`node-${n}`, true) };
  };
})();
