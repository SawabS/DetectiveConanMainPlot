(() => {
  'use strict';
  window.createConanMovies = ({ notice }) => {
    const $ = id => document.getElementById(id);
    const { movies, updated } = window.CONAN_MOVIES;
    const { STORAGE_KEY, readProgress, backup, selectMovies } = window.ConanMoviesCore;
    const labels = { main: 'Main film', crossover: 'Crossover', compilation: 'Compilation', short: '3D short' };
    const filters = { query: '', category: 'all', status: 'all', sort: 'release' };
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const date = value => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
    const external = 'target="_blank" rel="noopener noreferrer"';
    let watched = new Set(), storageReady = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) watched = readProgress(raw, movies);
    } catch { storageReady = false; notice('Movie progress could not be read. This session still works.'); }
    function save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(backup(watched))); storageReady = true; }
      catch { storageReady = false; notice('Movie progress is session only. Export a backup before closing.'); }
    }
    function render(focusId) {
      const selected = selectMovies(movies, watched, filters);
      $('movie-progress-text').textContent = `${watched.size} of ${movies.length} watched`;
      $('movie-progress-bar').value = watched.size;
      $('movie-progress-bar').max = movies.length;
      $('movie-storage-note').textContent = storageReady ? 'Saved on this device.' : 'Session only. Export to keep progress.';
      $('movie-result-count').textContent = `${selected.length} of ${movies.length} films`;
      $('movie-empty').hidden = selected.length > 0;
      $('movie-grid').innerHTML = selected.map(movie => {
        const checked = watched.has(movie.id), number = movie.number ? String(movie.number).padStart(2, '0') : 'EX';
        return `<article class="movie-card${checked ? ' is-watched' : ''}">
          <div class="movie-poster"><div class="movie-poster-fallback" aria-hidden="true"><span>C</span><small>${number}</small></div>${movie.poster ? `<img src="${escape(movie.poster)}" alt="Artwork for ${escape(movie.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}<span class="movie-number">${movie.number ? `FILM ${number}` : labels[movie.category].toUpperCase()}</span></div>
          <div class="movie-card-body"><p class="movie-meta">${labels[movie.category]} · ${movie.releaseDate.slice(0, 4)}${movie.runtimeMinutes ? ` · ${movie.runtimeMinutes} min` : ''}</p><h3>${escape(movie.title)}</h3><p class="movie-release">Japan · <time datetime="${movie.releaseDate}">${date(movie.releaseDate)}</time></p>
          <div class="movie-card-links"><a href="${escape(movie.source)}" ${external} aria-label="Sources for ${escape(movie.title)}">Details & sources ↗</a>${movie.officialUrl ? `<a href="${escape(movie.officialUrl)}" ${external} aria-label="Official page for ${escape(movie.title)}">Official ↗</a>` : ''}</div>
          <label class="movie-watch"><input type="checkbox" id="watch-${movie.id}" data-movie-watch="${movie.id}" ${checked ? 'checked' : ''} aria-label="Watched: ${escape(movie.title)}"><span>${checked ? 'Watched' : 'Mark watched'}</span></label></div></article>`;
      }).join('');
      // Keep a readable cover when an external image cannot load.
      $('movie-grid').querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.hidden = true; }));
      if (focusId) ($(`watch-${focusId}`) || $('movie-result-count')).focus({ preventScroll: true });
    }
    $('movie-grid').addEventListener('change', event => {
      const id = event.target.dataset.movieWatch;
      if (!id) return;
      if (event.target.checked) watched.add(id); else watched.delete(id);
      save(); render(id);
    });
    $('movie-search').addEventListener('input', event => { filters.query = event.target.value; render(); });
    for (const [id, key] of [['movie-category','category'],['movie-status','status'],['movie-sort','sort']]) {
      $(id).addEventListener('change', event => { filters[key] = event.target.value; render(); });
    }
    $('movie-clear').addEventListener('click', () => {
      Object.assign(filters, { query: '', category: 'all', status: 'all', sort: 'release' });
      $('movie-search').value = ''; $('movie-category').value = 'all'; $('movie-status').value = 'all'; $('movie-sort').value = 'release';
      render(); $('movie-search').focus();
    });
    $('movie-export').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup(watched), null, 2) + '\n'], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'conan-movie-progress.json';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice('Movie progress exported.');
    });
    $('movie-import').addEventListener('click', () => $('movie-import-file').click());
    $('movie-import-file').addEventListener('change', async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        if (file.size > 1000000) throw new Error('That file is too large for a movie progress backup.');
        watched = new Set([...watched, ...readProgress(await file.text(), movies)]); save(); render();
        notice(`Movie progress imported. ${watched.size} films marked watched.`);
      } catch (error) { notice(error instanceof SyntaxError ? 'That file is not valid JSON. Movie progress was kept.' : error.message); }
      event.target.value = '';
    });
    window.addEventListener('storage', event => {
      if (event.key !== STORAGE_KEY) return;
      try { watched = event.newValue ? readProgress(event.newValue, movies) : new Set(); render(); }
      catch { notice('Another tab saved unreadable movie progress. This tab kept its progress.'); }
    });
    $('movie-reviewed').textContent = `Catalog checked ${date(updated)}. Japanese release dates. TV specials, OVAs, and unreleased films are excluded.`;
    render();
    return { render };
  };
})();
