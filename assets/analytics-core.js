(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ConanAnalyticsCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const categories = { main: 'Main films', crossover: 'Crossover', compilation: 'Compilations', short: '3D shorts' };
  const bands = [{ id: 'low', label: 'Below 6', min: 1, max: 6 }, ...[6,7,8,9].map(n => ({ id: String(n), label: n === 9 ? '9 to 10' : `${n} to <${n + 1}`, min: n, max: n === 9 ? 11 : n + 1 }))];
  const valid = n => typeof n === 'number' && Number.isFinite(n);
  const median = values => {
    const sorted = values.filter(valid).sort((a,b) => a-b), n = sorted.length;
    return n ? n % 2 ? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2 : null;
  };
  function isoDate(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const match = value.match(/^(\w+) (\d+), (\d{4})$/);
    const month = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(match?.[1]);
    if (!match || month < 0) throw new Error(`Unrecognized release date: ${value}`);
    return `${match[3]}-${String(month+1).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
  }
  function normalize(episodes, movies) {
    const arcs = new Map(episodes.arcs.map(a => [a.id,a.name]));
    const record = (item, dataset) => {
      const episode = dataset === 'episodes', release = isoDate(episode ? item.airDate : item.releaseDate);
      const number = episode ? item.episode : item.number;
      return { id: episode ? `episode-${number}` : item.id, number, dataset, title: item.title,
        label: episode ? `Episode ${String(number).padStart(3,'0')}` : number ? `Film ${String(number).padStart(2,'0')}` : item.category === 'short' ? `3D short ${item.id.split('-').at(-1)}` : `${categories[item.category]} ${item.id.split('-').at(-1)}`,
        group: episode ? String(item.arc) : item.category, groupName: episode ? arcs.get(item.arc) : categories[item.category],
        color: episode ? item.arc : ({main:1,crossover:3,compilation:2,short:4})[item.category],
        release, year: Number(release.slice(0,4)), rating: valid(item.imdb?.rating) ? item.imdb.rating : null,
        votes: valid(item.imdb?.votes) ? item.imdb.votes : null, checked: item.imdb?.checked || null,
        runtime: valid(item.runtimeMinutes) && item.runtimeMinutes > 0 ? item.runtimeMinutes : null,
        runtimeSource: item.runtimeSource, runtimeBasis: episode ? 'Broadcast listing' : 'Film listing',
        source: item.source, imdbUrl: item.imdb?.id ? `https://www.imdb.com/title/${item.imdb.id}/` : null };
    };
    return { episodes: episodes.episodes.map(e => record(e,'episodes')), movies: movies.movies.map(m => record(m,'movies')) };
  }
  function select(records, watched, filters) {
    const q = (filters.query || '').trim().toLowerCase(), numeric = /^#?\d+$/.test(q) ? Number(q.replace('#','')) : null;
    const band = bands.find(b => b.id === filters.band);
    const selected = records.filter(r => (!q || (numeric !== null ? r.number === numeric || r.year === numeric : !filters.hideTitles && r.title.toLowerCase().includes(q))) &&
      (filters.group === 'all' || r.group === filters.group) && (filters.year === 'all' || r.year === Number(filters.year)) &&
      (filters.status === 'all' || watched.has(r.id) === (filters.status === 'watched')) &&
      (!Number(filters.minVotes) || (r.votes !== null && r.votes >= Number(filters.minVotes))) &&
      (!band || (r.rating !== null && r.rating >= band.min && r.rating < band.max)));
    return selected.sort((a,b) => {
      if (filters.sort === 'rating') return (b.rating ?? -1)-(a.rating ?? -1) || (b.votes ?? 0)-(a.votes ?? 0) || a.release.localeCompare(b.release);
      if (filters.sort === 'runtime') return (b.runtime ?? -1)-(a.runtime ?? -1) || a.release.localeCompare(b.release);
      return a.release.localeCompare(b.release) || (a.number ?? 0)-(b.number ?? 0);
    });
  }
  function summarize(records, watched) {
    const rated = records.filter(r => r.rating !== null), timed = records.filter(r => r.runtime !== null);
    const remaining = records.filter(r => !watched.has(r.id));
    return { count: records.length, rated: rated.length, median: median(rated.map(r=>r.rating)),
      runtimeCount: timed.length, totalMinutes: timed.reduce((sum,r)=>sum+r.runtime,0),
      watched: records.filter(r=>watched.has(r.id)).length, remainingCount: remaining.length,
      remainingMinutes: remaining.reduce((sum,r)=>sum+(r.runtime ?? 0),0), missingRemaining: remaining.filter(r=>r.runtime===null).length,
      highest: [...rated].sort((a,b)=>b.rating-a.rating || (b.votes??0)-(a.votes??0))[0] || null,
      longest: [...timed].sort((a,b)=>b.runtime-a.runtime)[0] || null };
  }
  function groupSummary(records, watched) {
    const groups = new Map();
    records.forEach(r => { if (!groups.has(r.group)) groups.set(r.group,[]); groups.get(r.group).push(r); });
    return [...groups].map(([id,items]) => ({ id, name: items[0].groupName, color: items[0].color, ...summarize(items,watched) })).sort((a,b)=>a.color-b.color);
  }
  function timeline(records, allRecords) {
    if (!allRecords.length) return [];
    const years = allRecords.map(r=>r.year), start = Math.min(...years), end = Math.max(...years);
    return Array.from({length:end-start+1},(_,i)=>({year:start+i,count:records.filter(r=>r.year===start+i).length}));
  }
  function distribution(records) { return bands.map(b=>({...b,count:records.filter(r=>r.rating!==null && r.rating>=b.min && r.rating<b.max).length})); }
  function csv(records, watched, hideTitles) {
    const escape = value => { const raw=String(value ?? '');return '"'+(/^[=+@\-]/.test(raw)?"'"+raw:raw).replace(/"/g,'""')+'"'; };
    const header = ['Entry','Title','Group','Japanese release','IMDb rating','IMDb votes','Listed minutes','Duration basis','Watched','IMDb source','Duration source','Metadata source','Rating checked'];
    return [header,...records.map(r=>[r.label,hideTitles?r.label:r.title,hideTitles && r.dataset==='episodes'?`Arc ${r.group}`:r.groupName,r.release,r.rating,r.votes,r.runtime,r.runtimeBasis,watched.has(r.id),r.imdbUrl,r.runtimeSource,r.source,r.checked])].map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
  }
  return { normalize, select, summarize, groupSummary, timeline, distribution, csv, median, bands, categories };
});
