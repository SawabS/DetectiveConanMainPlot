(() => {
  'use strict';
  const data = window.CONAN_DATA;
  const { STORAGE_KEY, readProgress, backup, selectEpisodes } = window.ConanCore;
  const $ = id => document.getElementById(id);
  const episodes = data.episodes;
  const byId = new Map(episodes.map(e => [e.episode, e]));
  const arcs = new Map(data.arcs.map(a => [a.id, a.name]));
  const filters = { query: '', arc: 0, rating: 0, status: 'all', sort: 'episode', hideTitles: false };
  let watched = new Set();
  let activeEpisode = null;
  let graph = null, movies = null, analytics = null;
  let activeView = 'list';
  let noticeTimer;
  let storageReady = true;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const padded = n => String(n).padStart(3, '0');
  const title = e => filters.hideTitles ? `Case file ${padded(e.episode)}` : e.title;
  const imdbUrl = e => `https://www.imdb.com/title/${e.imdb.id}/`;
  const external = 'target="_blank" rel="noopener noreferrer"';
  const snapshot = new Date(`${data.updated}T12:00:00Z`);
  const snapshotDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(snapshot);

  function notice(message) {
    clearTimeout(noticeTimer);
    $('notice').textContent = message;
    $('notice').hidden = false;
    noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5500);
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) watched = readProgress(saved, episodes);
    filters.hideTitles = localStorage.getItem(`${STORAGE_KEY}:hide-titles`) === 'true';
  } catch {
    storageReady = false;
    notice('Saved progress could not be read. This session still works; export a backup to keep it.');
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup(watched)));
      localStorage.setItem(`${STORAGE_KEY}:hide-titles`, String(filters.hideTitles));
      storageReady = true;
    } catch {
      storageReady = false;
      notice('Browser storage is unavailable. Export your progress before closing.');
    }
    $('storage-note').textContent = storageReady ? 'Saved on this device.' : 'Session only. Export to keep progress.';
  }
  function renderProgress() {
    const percentage = Math.round(watched.size / episodes.length * 100);
    $('progress-percent').textContent = `${percentage}%`;
    $('progress-ring').style.setProperty('--progress', `${percentage}%`);
    $('progress-bar').max = episodes.length;
    $('progress-bar').value = watched.size;
    $('progress-text').textContent = `${watched.size} of ${episodes.length} watched`;
    $('storage-note').textContent = storageReady ? 'Saved on this device.' : 'Session only. Export to keep progress.';
    const next = episodes.find(e => !watched.has(e.episode));
    $('continue-button').textContent = next ? `Continue with #${padded(next.episode)} ↗` : 'All case files complete ✓';
    $('continue-button').disabled = !next;
    $('arc-list').innerHTML = data.arcs.map(a => {
      const members = episodes.filter(e => e.arc === a.id);
      const done = members.filter(e => watched.has(e.episode)).length;
      const name = filters.hideTitles ? `Arc ${padded(a.id)}` : a.name;
      return `<button class="arc-button" data-arc="${a.id}" aria-pressed="${filters.arc === a.id}" aria-label="${escape(name)}, ${done} of ${members.length} watched"><span class="arc-number">${String(a.id).padStart(2, '0')}</span><span>${escape(name)}</span><span class="arc-count">${done}/${members.length}</span></button>`;
    }).join('');
    $('clear-arc').hidden = !filters.arc;
    graph?.update();
    if (analytics && activeView === 'analytics') analytics.render();
  }
  function renderList(focusEpisode) {
    const selected = selectEpisodes(episodes, watched, filters);
    $('result-count').textContent = `${selected.length} of ${episodes.length} episodes${filters.arc ? ` · Arc ${filters.arc}` : ''}`;
    $('empty-state').hidden = !!selected.length;
    document.querySelector('.table-wrap').hidden = !selected.length;
    $('episode-list').innerHTML = selected.map(e => {
      const checked = watched.has(e.episode);
      const rating = e.imdb.rating === null ? 'N/A' : e.imdb.rating.toFixed(1);
      return `<tr id="episode-${e.episode}" class="${checked ? 'watched' : ''}">
        <td><input type="checkbox" data-watch="${e.episode}" ${checked ? 'checked' : ''} aria-label="Mark episode ${e.episode} as ${checked ? 'unwatched' : 'watched'}"></td>
        <td><a class="ep-number" href="#episode-${e.episode}" aria-label="Open episode ${e.episode}">${padded(e.episode)}</a></td>
        <td><a class="episode-title" href="${escape(e.source)}" ${external}>${escape(title(e))}</a><span class="episode-meta">${escape(e.airDate)}${e.priority === 'SETUP' ? '<span class="setup-tag">SETUP</span>' : ''}</span></td>
        <td class="arc-column"><span class="arc-tag">${escape(filters.hideTitles ? `Arc ${e.arc}` : arcs.get(e.arc))}</span></td>
        <td><a class="rating-link" href="${imdbUrl(e)}" ${external} aria-label="Episode ${e.episode}: ${rating} out of 10 on IMDb"><span class="star" aria-hidden="true">★</span>${rating}</a><span class="rating-votes">${(e.imdb.votes ?? 0).toLocaleString()} votes</span></td>
        <td><button class="detail-button" data-detail="${e.episode}" aria-label="Sources and details for episode ${e.episode}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></button></td>
      </tr>`;
    }).join('');
    document.querySelectorAll('[data-status]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.status === filters.status)));
    if (focusEpisode && activeView === 'list' && !$('detail-dialog').open) {
      const checkbox = document.querySelector(`[data-watch="${focusEpisode}"]`);
      if (checkbox) checkbox.focus({ preventScroll: true });
      else $('result-count').focus({ preventScroll: true });
    }
  }
  function render() { renderProgress(); renderList(); }
  function setWatched(n, checked) {
    if (!byId.has(n)) return;
    checked ? watched.add(n) : watched.delete(n);
    save(); renderProgress(); renderList(n);
    if (activeEpisode === n) updateDetailWatch();
  }
  function updateDetailWatch() {
    $('detail-watch').textContent = watched.has(activeEpisode) ? 'Mark as unwatched' : 'Mark as watched ✓';
  }
  function showDetails(n) {
    const e = byId.get(n);
    if (!e) return;
    activeEpisode = n;
    $('detail-number').textContent = `CASE FILE ${padded(n)} / ARC ${String(e.arc).padStart(2, '0')}`;
    $('detail-title').textContent = title(e);
    $('detail-content').innerHTML = `<div class="detail-stats"><div><strong>★ ${e.imdb.rating === null ? 'N/A' : e.imdb.rating.toFixed(1)}</strong><span>IMDb / 10</span></div><div><strong>${(e.imdb.votes ?? 0).toLocaleString()}</strong><span>votes in this snapshot</span></div></div>
      <dl class="detail-data"><dt>Broadcast</dt><dd>${escape(e.airDate)}</dd><dt>Listed duration</dt><dd><a href="${escape(e.runtimeSource)}" ${external}>${e.runtimeMinutes} min · broadcast listing ↗</a></dd><dt>IMDb entry</dt><dd>S${e.imdb.season} · E${e.imdb.episode} · ${e.imdb.id}</dd>${filters.hideTitles ? '' : `<dt>IMDb title</dt><dd>${escape(e.imdb.title)}</dd>`}<dt>Checked</dt><dd>${escape(e.imdb.checked)}</dd><dt>Priority</dt><dd>${e.priority === 'SETUP' ? 'Setup for later story developments' : 'Core story selection'}</dd></dl>
      <div class="detail-links"><a href="${escape(e.source)}" ${external}>Episode source ↗</a><a href="${imdbUrl(e)}" ${external}>IMDb ↗</a></div><p class="dialog-note">Source pages may contain spoilers. This is a dated rating, not a live score.</p>`;
    updateDetailWatch();
    if (!$('detail-dialog').open) $('detail-dialog').showModal();
  }
  function clearFilters() {
    Object.assign(filters, { query: '', arc: 0, rating: 0, status: 'all', sort: 'episode' });
    $('search').value = ''; $('rating-filter').value = '0'; $('sort').value = 'episode';
    render();
  }
  function goToEpisode(n, detail = false) {
    if (!byId.has(n)) return;
    switchView('list', false);
    clearFilters();
    const row = $(`episode-${n}`);
    row.classList.add('target-row');
    row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (detail) showDetails(n);
  }
  $('episode-list').addEventListener('change', event => {
    if (event.target.dataset.watch) setWatched(Number(event.target.dataset.watch), event.target.checked);
  });
  $('episode-list').addEventListener('click', event => {
    const button = event.target.closest('[data-detail]');
    if (button) showDetails(Number(button.dataset.detail));
    const link = event.target.closest('.ep-number');
    if (link) {
      event.preventDefault();
      const n = Number(link.getAttribute('href').split('-').at(-1));
      history.replaceState(null, '', `#episode-${n}`); goToEpisode(n, true);
    }
  });
  $('detail-watch').addEventListener('click', () => setWatched(activeEpisode, !watched.has(activeEpisode)));
  $('search').addEventListener('input', event => { filters.query = event.target.value; renderList(); });
  $('rating-filter').addEventListener('change', event => { filters.rating = Number(event.target.value); renderList(); });
  $('sort').addEventListener('change', event => { filters.sort = event.target.value; renderList(); });
  function setHideTitles(hidden) {
    filters.hideTitles = hidden;
    $('hide-titles').checked = hidden;
    $('graph-hide-titles').checked = hidden;
    $('search').placeholder = hidden ? 'Search episode number' : 'Search episode number or title';
    save(); render();
  }
  $('hide-titles').checked = filters.hideTitles;
  $('graph-hide-titles').checked = filters.hideTitles;
  $('hide-titles').addEventListener('change', event => setHideTitles(event.target.checked));
  $('search').placeholder = filters.hideTitles ? 'Search episode number' : 'Search episode number or title';
  document.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => { filters.status = b.dataset.status; renderList(); }));
  $('arc-list').addEventListener('click', event => {
    const b = event.target.closest('[data-arc]');
    if (b) {
      const arc = Number(b.dataset.arc);
      filters.arc = filters.arc === arc ? 0 : arc; render();
      document.querySelector(`[data-arc="${arc}"]`).focus({ preventScroll: true });
    }
  });
  $('clear-arc').addEventListener('click', () => { filters.arc = 0; render(); });
  $('clear-filters').addEventListener('click', clearFilters);
  $('continue-button').addEventListener('click', () => {
    const e = episodes.find(item => !watched.has(item.episode));
    if (e) {
      history.replaceState(null, '', `#episode-${e.episode}`);
      goToEpisode(e.episode, true);
    }
  });
  for (const [button, dialog] of [['sources-button', 'sources-dialog'], ['credits-button', 'credits-dialog'], ['reset-button', 'reset-dialog']]) {
    $(button).addEventListener('click', () => $(dialog).showModal());
  }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $('confirm-reset').addEventListener('click', () => {
    watched.clear(); save(); render(); $('reset-dialog').close(); notice('Progress reset. A new investigation begins.');
  });
  $('export-button').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(backup(watched), null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'conan-casebook-progress.json'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Progress exported. Keep the JSON file as your backup.');
  });
  $('import-button').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('That file is too large for a progress backup.');
      const imported = readProgress(await file.text(), episodes);
      // Merge backups so importing never erases current progress.
      watched = new Set([...watched, ...imported]); save(); render();
      notice(`Progress imported. ${watched.size} episodes marked watched.`);
    } catch (error) { notice(error instanceof SyntaxError ? 'That file is not valid JSON. Progress was kept.' : error.message); }
    event.target.value = '';
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
      !document.activeElement.isContentEditable && !document.querySelector('dialog[open]')) {
      const field = $({ list: 'search', graph: 'graph-search', movies: 'movie-search' }[activeView]);
      if (field) { event.preventDefault(); field.focus(); }
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === `${STORAGE_KEY}:hide-titles`) {
      filters.hideTitles = event.newValue === 'true';
      $('hide-titles').checked = filters.hideTitles;
      render();
      if (activeEpisode && $('detail-dialog').open) showDetails(activeEpisode);
      return;
    }
    if (event.key !== STORAGE_KEY) return;
    try { watched = event.newValue ? readProgress(event.newValue, episodes) : new Set(); render(); }
    catch { notice('Another tab saved unreadable progress. This tab kept its current progress.'); }
  });
  function switchView(view, updateHash = true) {
    activeView = view;
    $('watchlist').hidden = view !== 'list';
    $('story-map').hidden = view !== 'graph';
    $('movies').hidden = view !== 'movies';
    $('analytics').hidden = view !== 'analytics';
    const tooltip = $('analytics-tooltip'); if (tooltip) tooltip.hidden = true;
    document.querySelectorAll('[data-view]').forEach(button => {
      button.setAttribute('aria-selected', String(button.dataset.view === view));
      button.tabIndex = button.dataset.view === view ? 0 : -1;
    });
    document.querySelectorAll('[data-view-link]').forEach(link => link.classList.toggle('nav-active', link.dataset.viewLink === view));
    if (view === 'graph' && !graph) {
      graph = window.createConanGraph({ data, getWatched: () => watched, getHideTitles: () => filters.hideTitles,
        onWatch: setWatched, onDetails: showDetails, onHideTitles: setHideTitles,
        onViewEpisode: n => { history.replaceState(null, '', `#episode-${n}`); goToEpisode(n); } });
    }
    if (view === 'graph') graph.update();
    if (view === 'movies' && !movies) movies = window.createConanMovies({ notice });
    if (view === 'analytics' && !analytics) analytics = window.createConanAnalytics({ getEpisodeWatched: () => watched, getMovieWatched: () => movies?.getWatched(), getHideTitles: () => filters.hideTitles, onHideTitles: setHideTitles, onEpisode: showDetails, notice });
    if (view === 'analytics') analytics.render();
    if (updateHash) history.replaceState(null, '', { list: '#watchlist', graph: '#story-map', movies: '#movies', analytics: '#analytics' }[view]);
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.querySelector('.view-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const views = ['list', 'graph', 'movies', 'analytics'];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 :
      (views.indexOf(activeView) + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    switchView(views[index]); $(`${views[index]}-tab`).focus();
  });
  document.querySelectorAll('[data-view-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); switchView(link.dataset.viewLink);
    document.querySelector('.view-bar').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));
  function handleHash() {
    const match = location.hash.match(/^#episode-(\d+)$/);
    if (match) goToEpisode(Number(match[1]), true);
    else if (location.hash === '#story-map') switchView('graph', false);
    else if (location.hash === '#watchlist') switchView('list', false);
    else if (location.hash === '#movies') switchView('movies', false);
    else if (location.hash === '#analytics') switchView('analytics', false);
  }
  window.addEventListener('hashchange', handleHash);
  $('total-count').textContent = episodes.length;
  document.querySelector('#sources-dialog h2 + p').textContent = `${episodes.length} main-story episodes across ${data.arcs.length} arcs, listed in Japanese broadcast order. Each IMDb score is matched to its episode by title, release year, and part number.`;
  $('rated-count').textContent = episodes.filter(e => e.imdb.rating !== null).length;
  document.querySelector('.overview-date strong').textContent = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(snapshot).toUpperCase();
  document.querySelector('.list-footnote').textContent = `Ratings checked ${snapshotDate}. Titles and linked sources may reveal story details.`;
  document.querySelector('#sources-dialog .source-list li:nth-child(3) span').textContent = `Title IDs, episode metadata, weighted ratings, and votes. Snapshot: ${snapshotDate}.`;
  $('result-count').tabIndex = -1;
  render();
  handleHash();
})();
