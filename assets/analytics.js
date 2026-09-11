(() => {
  'use strict';
  window.createConanAnalytics = ({ getEpisodeWatched, getMovieWatched, getHideTitles, onHideTitles, onEpisode, notice }) => {
    const core = window.ConanAnalyticsCore;
    const datasets = core.normalize(window.CONAN_DATA, window.CONAN_MOVIES);
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = n => n === null ? 'N/A' : n.toLocaleString();
    // Scores keep one decimal; medians that fall between two scores keep two.
    const score = n => n === null ? 'N/A' : n.toFixed(Math.abs(n*10-Math.round(n*10)) < 1e-9 ? 1 : 2);
    const hours = n => `${Math.floor(n/60)}h ${n%60}m`;
    const pad = (n, width) => String(n).padStart(width,'0');
    const dateLabel = date => new Intl.DateTimeFormat(document.documentElement.lang || 'en', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const chartBox = $('analytics-timeline-chart');
    let scope = 'episodes', focus = 'all', unwatchedOnly = false, selectedId = null, watched = new Set();
    let all = [], plotted = [], entries = [], geometry = null, chartWidth = 0;
    const words = () => scope === 'episodes' ? { one: 'episode', many: 'episodes', group: 'arc', groups: 'arcs' } : { one: 'film', many: 'films', group: 'category', groups: 'categories' };
    const title = r => getHideTitles() ? r.label : r.title;
    const groupName = id => scope === 'episodes' && getHideTitles() ? `Arc ${pad(id,2)}` : all.find(r => r.group === id)?.groupName ?? '';
    const shortLabel = r => r.number ? `#${pad(r.number, scope === 'episodes' ? 3 : 2)}` : r.label;
    const trendWindow = () => scope === 'episodes' ? 9 : 5;
    function readWatched() {
      if (scope === 'episodes') return new Set([...getEpisodeWatched()].map(n => `episode-${n}`));
      const session = getMovieWatched?.(); if (session) return session;
      try {
        const raw = localStorage.getItem(window.ConanMoviesCore.STORAGE_KEY);
        return raw ? window.ConanMoviesCore.readProgress(raw, window.CONAN_MOVIES.movies) : new Set();
      } catch { return new Set(); }
    }
    // Dots encode position, not length, so the axis can start just below the lowest score.
    function domain() {
      const ratings = plotted.map(r => r.rating).filter(n => n !== null);
      if (!ratings.length) return { lo: 0, hi: 10, step: 2 };
      const lo = Math.floor(Math.min(...ratings)), hi = Math.max(lo + 1, Math.ceil(Math.max(...ratings)));
      return { lo, hi, step: hi - lo <= 2 ? .5 : 1 };
    }
    function ticks({ lo, hi, step }) { const list = []; for (let v = lo; v <= hi + 1e-9; v += step) list.push(Math.round(v*10)/10); return list; }
    function renderTimeline() {
      const w = words(), width = chartWidth = Math.max(640, Math.round(chartBox.clientWidth) || 900), height = 300;
      const m = { top: 28, right: 14, bottom: 42, left: 38 }, scale = domain(), { lo, hi } = scale;
      const band = (width-m.left-m.right)/Math.max(plotted.length,1), bottom = height-m.bottom;
      const x = i => m.left+band*(i+.5), y = v => m.top+(hi-v)/(hi-lo)*(bottom-m.top);
      geometry = { x, y, band, m, height };
      const grid = ticks(scale).map(v => `<line class="analytics-grid" x1="${m.left}" x2="${width-m.right}" y1="${y(v)}" y2="${y(v)}"/><text class="analytics-axis" x="${m.left-8}" y="${y(v)+3.5}" text-anchor="end">${v}</text>`).join('');
      let bands = '';
      if (scope === 'episodes') {
        // One band per run of consecutive entries from the same arc.
        const runs = [];
        plotted.forEach((r,i) => { const last = runs.at(-1); if (last?.group === r.group) last.end = i; else runs.push({ group: r.group, start: i, end: i }); });
        bands = runs.map((run,k) => { const left = x(run.start)-band/2, span = (run.end-run.start+1)*band;
          return `<rect class="analytics-band${k%2?' is-alt':''}${focus===run.group?' is-focus':''}" x="${left}" y="${m.top}" width="${span}" height="${bottom-m.top}"/>${span >= 16 ? `<text class="analytics-axis" x="${left+span/2}" y="${bottom+16}" text-anchor="middle">${pad(run.group,2)}</text>` : ''}`; }).join('');
      } else {
        let lastYear = -Infinity;
        bands = plotted.map((r,i) => { if (r.year-lastYear < 3) return ''; lastYear = r.year; return `<text class="analytics-axis" x="${x(i)}" y="${bottom+16}" text-anchor="middle">${r.year}</text>`; }).join('');
      }
      const trend = core.rollingMedian(plotted.map(r => r.rating), trendWindow()).map((v,i) => v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean);
      const dot = (r,i) => r.rating === null ? '' : `<circle class="analytics-dot${watched.has(r.id)?' is-watched':''}${focus!=='all'&&r.group!==focus?' is-muted':''}" cx="${x(i).toFixed(1)}" cy="${y(r.rating).toFixed(1)}" r="4"/>`;
      // Muted dots go first so the focused arc stays on top.
      const dots = plotted.map((r,i) => focus !== 'all' && r.group !== focus ? dot(r,i) : '').join('') + plotted.map((r,i) => focus === 'all' || r.group === focus ? dot(r,i) : '').join('');
      // Label only the three highest peaks, spaced so their labels never collide.
      const pool = plotted.map((r,i) => ({ r, i })).filter(({ r }) => r.rating !== null && (focus === 'all' || r.group === focus)).sort((a,b) => b.r.rating-a.r.rating || (b.r.votes ?? 0)-(a.r.votes ?? 0));
      const peaks = [], gap = Math.max(3, Math.ceil(46/band));
      for (const p of pool) { if (peaks.length === 3) break; if (peaks.every(q => Math.abs(q.i-p.i) >= gap)) peaks.push(p); }
      const labels = peaks.map(({ r, i }) => `<text class="analytics-peak" x="${x(i)}" y="${y(r.rating)-10}">${esc(shortLabel(r))}</text>`).join('');
      chartBox.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" tabindex="0" role="group" aria-label="${esc(`${plotted.length} ${w.many} in ${scope==='episodes'?'story':'release'} order, IMDb scores from ${lo} to ${hi}. Use the left and right arrow keys to move between ${w.many} and Enter to open one.`)}"><text class="analytics-axis" x="${m.left}" y="12">IMDb / 10</text><text class="analytics-axis" x="${width-m.right}" y="${height-4}" text-anchor="end">${scope==='episodes'?'Arc, in story order':'Japanese release year'}</text>${bands}${grid}${trend.length > 1 ? `<path class="analytics-trend" d="M${trend.join(' L')}"/>` : ''}<line id="analytics-crosshair" class="analytics-crosshair" y1="${m.top}" y2="${bottom}" visibility="hidden"/>${dots}${labels}<circle id="analytics-hover" class="analytics-hover-ring" r="7" visibility="hidden"/><circle id="analytics-select-ring" class="analytics-select-ring" r="8" visibility="hidden"/></svg>`;
      placeSelection();
    }
    function placeSelection() {
      const ring = $('analytics-select-ring'); if (!ring || !geometry) return;
      const i = plotted.findIndex(r => r.id === selectedId), r = plotted[i];
      if (!r || r.rating === null) { ring.setAttribute('visibility','hidden'); return; }
      ring.setAttribute('cx', geometry.x(i)); ring.setAttribute('cy', geometry.y(r.rating)); ring.setAttribute('visibility','visible');
    }
    // The crosshair snaps to the nearest entry, so readers aim at a position rather than a 4px dot.
    function indexAt(event) {
      const svg = chartBox.querySelector('svg'); if (!svg || !geometry || !plotted.length) return -1;
      const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
      const local = p.matrixTransform(svg.getScreenCTM().inverse());
      return Math.max(0, Math.min(plotted.length-1, Math.floor((local.x-geometry.m.left)/geometry.band)));
    }
    function showHover(i, clientX, clientY) {
      const svg = chartBox.querySelector('svg'), r = plotted[i]; if (!svg || !r) return;
      const cx = geometry.x(i), cy = r.rating === null ? geometry.height-geometry.m.bottom : geometry.y(r.rating);
      const cross = $('analytics-crosshair'), ring = $('analytics-hover');
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility','visible');
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('visibility', r.rating === null ? 'hidden' : 'visible');
      if (clientX === undefined) { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; ({ x: clientX, y: clientY } = p.matrixTransform(svg.getScreenCTM())); }
      const tip = $('analytics-tooltip');
      tip.textContent = `${r.rating === null ? 'No IMDb score' : `${score(r.rating)} / 10`} · ${fmt(r.votes)} votes\n${r.label} · ${title(r)}\n${groupName(r.group)} · ${r.release}${watched.has(r.id) ? ' · Watched' : ''}`;
      tip.hidden = false;
      tip.style.left = `${Math.max(8, Math.min(clientX+14, innerWidth-tip.offsetWidth-12))}px`;
      tip.style.top = `${Math.max(8, Math.min(clientY+14, innerHeight-tip.offsetHeight-12))}px`;
    }
    function hideHover() {
      $('analytics-tooltip').hidden = true;
      for (const id of ['analytics-crosshair','analytics-hover']) $(id)?.setAttribute('visibility','hidden');
    }
    function selectEntry(id, reveal = false) {
      selectedId = id; placeSelection(); renderInspector();
      $('analytics-top').querySelectorAll('[data-select]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.select === id)));
      if (reveal) $('analytics-timeline-card').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    function renderInspector() {
      const r = plotted.find(item => item.id === selectedId), w = words();
      if (!r) { $('analytics-inspector').innerHTML = `<p class="eyebrow">CASE FILE</p><h4>Pick a dot</h4><p class="chart-note">Hover to preview any ${w.one}. Select one, or focus the chart and use the arrow keys, to see its score, votes, and sources here.</p>`; return; }
      const share = core.percentile(all, r.rating);
      $('analytics-inspector').innerHTML = `<p class="eyebrow">${esc(r.label)}</p><h4>${esc(title(r))}</h4><p class="analytics-entry-group">${esc(groupName(r.group))} · ${r.release}</p><dl><div><dt>IMDb / 10</dt><dd>${score(r.rating)}</dd></div><div><dt>Votes</dt><dd>${fmt(r.votes)}</dd></div><div><dt>Listed minutes</dt><dd>${fmt(r.runtime)}</dd></div><div><dt>Progress</dt><dd>${watched.has(r.id) ? 'Watched' : 'Unwatched'}</dd></div></dl>${share === null ? '' : `<p class="chart-note">${share === 1 ? `The highest score among rated ${w.many}.` : share === 0 ? `The lowest score among rated ${w.many}.` : `Scores higher than ${Math.round(share*100)}% of the other rated ${w.many}.`}</p>`}<div class="analytics-entry-links">${scope === 'episodes' ? `<button class="button quiet" data-analytics-open="${r.number}">Open episode details</button>` : ''}${r.imdbUrl ? `<a href="${esc(r.imdbUrl)}" target="_blank" rel="noopener noreferrer">IMDb entry ↗</a>` : '<span>No verified IMDb entry</span>'}<a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${scope === 'episodes' ? 'Episode' : 'Film'} source ↗</a></div>`;
    }
    function renderHeadline() {
      const w = words(), { lo } = domain(), best = core.strongest(core.groupSummary(plotted, watched));
      const focused = focus === 'all' ? null : core.groupSummary(plotted.filter(r => r.group === focus), watched)[0];
      $('analytics-timeline-title').textContent = focused ? (focused.rated ? `${groupName(focus)} has a median of ${score(focused.median)}, ranging from ${score(focused.min)} to ${score(focused.max)}.` : `${groupName(focus)} has no ratings yet.`)
        : best ? `${groupName(best.id)} is the high point, with a median of ${score(best.median)}.` : 'Ratings across the story.';
      $('analytics-timeline-subtitle').textContent = `Each dot is one ${w.one}, in ${scope === 'episodes' ? 'story' : 'release'} order. The line is the rolling median of ${trendWindow()} ${w.many}. The axis starts at ${lo}, so small differences stay visible.`;
      const missing = plotted.filter(r => r.rating === null).length;
      $('analytics-legend').innerHTML = `<span><i class="key-dot"></i>IMDb score, one ${w.one}</span><span><i class="key-ring"></i>Watched</span><span><i class="key-line"></i>Rolling median</span>${focus !== 'all' ? `<span><i class="key-muted"></i>Other ${w.groups}</span>` : ''}${missing ? `<span>${missing} without a score, not plotted</span>` : ''}`;
    }
    function renderGroups() {
      const w = words(), scale = domain(), { lo, hi } = scale, groups = core.groupSummary(plotted, watched), overall = core.median(plotted.map(r => r.rating));
      const pos = v => `${((v-lo)/(hi-lo)*100).toFixed(2)}%`;
      $('analytics-group-title').textContent = `Which ${w.groups} score highest`;
      const chart = $('analytics-group-chart');
      chart.classList.toggle('has-focus', focus !== 'all');
      chart.style.setProperty('--overall', overall === null ? '-10%' : pos(overall));
      chart.innerHTML = groups.map(g => `<button class="analytics-arc-row" data-group="${esc(g.id)}" aria-pressed="${focus === g.id}" aria-label="${esc(g.rated ? `${groupName(g.id)}: median ${score(g.median)}, middle half ${score(g.q1)} to ${score(g.q3)}, ${g.rated} rated.` : `${groupName(g.id)}: no ratings.`)}"><span class="arc-row-name">${scope === 'episodes' && !getHideTitles() ? `<b>${pad(g.id,2)}</b>` : ''}${esc(groupName(g.id))}<small>${g.rated} rated</small></span><span class="arc-row-track" aria-hidden="true">${g.rated ? `<i class="arc-row-range" style="left:${pos(g.min)};width:calc(${pos(g.max)} - ${pos(g.min)})"></i><i class="arc-row-iqr" style="left:${pos(g.q1)};width:calc(${pos(g.q3)} - ${pos(g.q1)})"></i><i class="arc-row-median" style="left:${pos(g.median)}"></i>` : ''}</span><strong>${score(g.median)}</strong></button>`).join('') +
        `<div class="analytics-arc-axis" aria-hidden="true"><span></span><span class="arc-axis-ticks">${ticks(scale).filter(v => Number.isInteger(v)).map(v => `<i style="left:${pos(v)}">${v}</i>`).join('')}</span><span></span></div>`;
      $('analytics-group-note').textContent = `Dot: median score. Bar: the middle half of ${w.many} (25th to 75th percentile). Thin line: lowest to highest. The vertical rule is the overall median, ${score(overall)}. Select a row to focus it everywhere.`;
    }
    function renderTop() {
      const w = words(), minVotes = Math.round(core.median(all.map(r => r.votes)) ?? 0), top = core.topRated(entries, minVotes, 10);
      $('analytics-top-title').textContent = `${unwatchedOnly ? 'Best unwatched' : 'Top rated'}${focus !== 'all' ? ` in ${groupName(focus)}` : ''}`;
      $('analytics-top').innerHTML = top.length ? top.map((r,i) => `<li><button data-select="${r.id}" aria-pressed="${r.id === selectedId}"><span class="top-rank">${i+1}</span><span class="top-title">${esc(title(r))}<small>${esc(r.label)} · ${fmt(r.votes)} votes</small></span><strong>${score(r.rating)}</strong></button></li>`).join('')
        : `<li class="chart-note">No ${w.many} in this view have ${fmt(minVotes)} or more votes yet.</li>`;
      $('analytics-top-note').textContent = `Ranked by IMDb score among ${w.many} with at least ${fmt(minVotes)} votes, the median for all ${w.many}, so a handful of voters cannot top the list. Ties go to more votes. Select one to find it on the chart.`;
    }
    function renderPlanner(s) {
      const w = words(), daily = Number($('analytics-daily-minutes').value), plan = core.planFinish(s.remainingMinutes, daily);
      $('analytics-progress-text').textContent = `${s.watched} of ${s.count} ${w.many} watched`;
      $('analytics-progress-bar').style.width = `${s.count ? s.watched/s.count*100 : 0}%`;
      $('analytics-daily-label').textContent = `${daily} min a day`;
      $('analytics-days').textContent = s.remainingMinutes ? `${plan.days} ${plan.days === 1 ? 'day' : 'days'}` : 'All caught up';
      $('analytics-finish').textContent = s.remainingMinutes ? `Finish around ${dateLabel(plan.date)} at this pace.` : `Every ${w.one} in this view is watched.`;
      $('analytics-planner-description').textContent = `${s.remainingCount} unwatched ${w.many}${focus !== 'all' ? ` in ${groupName(focus)}` : ''} · ${hours(s.remainingMinutes)} of listed time${s.missingRemaining ? ` · ${s.missingRemaining} without a duration` : ''}. Listings may include ads, so treat this as a budget.`;
      const next = entries.find(r => !watched.has(r.id));
      $('analytics-next').innerHTML = next ? `<button class="button primary" ${scope === 'episodes' ? `data-analytics-open="${next.number}"` : `data-select="${next.id}"`}>Next up: ${esc(getHideTitles() ? next.label : `${shortLabel(next)} ${next.title}`)}</button>` : '';
    }
    function render() {
      $('analytics-hide-titles').checked = getHideTitles(); $('analytics-unwatched').checked = unwatchedOnly;
      watched = readWatched(); all = datasets[scope];
      if (focus !== 'all' && !all.some(r => r.group === focus)) focus = 'all';
      plotted = core.select(all, watched, { group: 'all', unwatched: unwatchedOnly });
      entries = core.select(all, watched, { group: focus, unwatched: unwatchedOnly });
      if (!plotted.some(r => r.id === selectedId)) selectedId = null;
      const s = core.summarize(entries, watched), w = words();
      const chip = $('analytics-focus'); chip.hidden = focus === 'all';
      if (focus !== 'all') { chip.innerHTML = `Focused on ${esc(groupName(focus))} <span aria-hidden="true">×</span>`; chip.setAttribute('aria-label', `Clear focus on ${groupName(focus)}`); }
      $('analytics-status-text').textContent = `${s.count} of ${all.length} ${w.many}${focus !== 'all' ? ` in ${groupName(focus)}` : ''}${unwatchedOnly ? ', unwatched only' : ''} · ${s.watched} watched. Every total, list, and table below follows this view.`;
      const best = core.strongest(core.groupSummary(plotted, watched));
      $('analytics-kpis').innerHTML = [['Median IMDb score', score(s.median), `${s.rated} of ${s.count} ${w.many} rated`],
        [`Strongest ${w.group}`, best ? esc(groupName(best.id)) : 'N/A', best ? `Median ${score(best.median)} across ${best.rated} rated` : `Needs 3 rated ${w.many}`, true],
        ['Listed time', hours(s.totalMinutes), `${s.runtimeCount} ${scope === 'episodes' ? 'broadcast' : 'film'} listings`],
        ['Still to watch', hours(s.remainingMinutes), `${s.remainingCount} unwatched${s.missingRemaining ? ' · some durations missing' : ''}`]]
        .map(([label, value, note, text]) => `<div><span>${label}</span><strong${text ? ' class="is-text"' : ''}>${value}</strong><small>${note}</small></div>`).join('');
      $('analytics-empty').hidden = plotted.length > 0; $('analytics-content').hidden = !plotted.length;
      hideHover();
      if (plotted.length) { renderHeadline(); renderTimeline(); renderInspector(); renderGroups(); renderTop(); renderPlanner(s); }
      $('analytics-group-heading').textContent = scope === 'episodes' ? 'Arc' : 'Category';
      $('analytics-table-body').innerHTML = entries.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(title(r))}</td><td>${esc(groupName(r.group))}</td><td>${r.release}</td><td>${r.imdbUrl ? `<a href="${esc(r.imdbUrl)}" target="_blank" rel="noopener noreferrer">${score(r.rating)}</a>` : 'N/A'}</td><td>${fmt(r.votes)}</td><td><a href="${esc(r.runtimeSource || r.source)}" target="_blank" rel="noopener noreferrer">${fmt(r.runtime)}</a></td><td>${watched.has(r.id) ? 'Yes' : 'No'}</td></tr>`).join('');
      $('analytics-source-note').textContent = `Ratings checked ${scope === 'episodes' ? window.CONAN_DATA.updated : window.CONAN_MOVIES.ratingsUpdated}. ${s.rated} scores and ${s.runtimeCount} duration listings in this view. Missing values are never treated as zero.`;
      $('analytics-export').disabled = !entries.length;
    }
    $('analytics').addEventListener('click', event => {
      const target = event.target.closest('[data-analytics-scope],[data-group],[data-select],[data-analytics-open],[data-clear-focus]'); if (!target) return;
      if (target.dataset.analyticsScope) {
        scope = target.dataset.analyticsScope; focus = 'all'; selectedId = null;
        document.querySelectorAll('[data-analytics-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === target)));
        render();
      } else if (target.dataset.group) {
        const id = target.dataset.group; focus = focus === id ? 'all' : id; render();
        $('analytics-group-chart').querySelector(`[data-group="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
      } else if (target.dataset.select) selectEntry(target.dataset.select, true);
      else if (target.dataset.analyticsOpen) onEpisode(Number(target.dataset.analyticsOpen));
      else { focus = 'all'; render(); }
    });
    chartBox.addEventListener('pointermove', event => { const i = indexAt(event); if (i >= 0) showHover(i, event.clientX, event.clientY); });
    chartBox.addEventListener('pointerleave', hideHover);
    chartBox.addEventListener('click', event => { const i = indexAt(event); if (i >= 0) selectEntry(plotted[i].id); });
    chartBox.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key) || !plotted.length) return;
      event.preventDefault();
      let i = plotted.findIndex(r => r.id === selectedId);
      if (event.key === 'Enter' || event.key === ' ') { if (i >= 0 && scope === 'episodes') onEpisode(plotted[i].number); return; }
      i = event.key === 'Home' ? 0 : event.key === 'End' ? plotted.length-1 : i < 0 ? 0 : Math.max(0, Math.min(plotted.length-1, i+(event.key === 'ArrowRight' ? 1 : -1)));
      selectEntry(plotted[i].id); showHover(i);
    });
    chartBox.addEventListener('focusout', hideHover);
    if (window.ResizeObserver) new ResizeObserver(() => { if (!$('analytics').hidden && plotted.length && Math.round(chartBox.clientWidth) !== chartWidth) renderTimeline(); }).observe(chartBox);
    window.addEventListener('scroll', hideHover, { passive: true });
    $('analytics-unwatched').addEventListener('change', event => { unwatchedOnly = event.target.checked; render(); });
    $('analytics-hide-titles').addEventListener('change', event => { onHideTitles(event.target.checked); render(); });
    $('analytics-daily-minutes').addEventListener('input', () => renderPlanner(core.summarize(entries, watched)));
    $('analytics-export').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([core.csv(entries, watched, getHideTitles())], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = `conan-${scope}-analytics.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Analytics exported with source links.'); });
    window.addEventListener('storage', event => { if ([window.ConanCore.STORAGE_KEY, window.ConanMoviesCore.STORAGE_KEY, `${window.ConanCore.STORAGE_KEY}:hide-titles`].includes(event.key) && !$('analytics').hidden) queueMicrotask(render); });
    return { render };
  };
})();
