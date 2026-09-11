(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ConanAnalyticsCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const categories = { main: 'Main films', crossover: 'Crossover', compilation: 'Compilations', short: '3D shorts' };
  const valid = n => typeof n === 'number' && Number.isFinite(n);
  // Linear interpolation between order statistics. Missing values are ignored, never read as zero.
  function quantile(values, p) {
    const sorted = values.filter(valid).sort((a,b) => a-b);
    if (!sorted.length) return null;
    const i = (sorted.length-1)*p, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
  }
  const median = values => quantile(values, .5);
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
    // Story order: episodes by Japanese number, films by release date.
    const films = movies.movies.map(m => record(m,'movies')).sort((a,b) => a.release.localeCompare(b.release) || (a.number ?? 0)-(b.number ?? 0));
    return { episodes: episodes.episodes.map(e => record(e,'episodes')), movies: films };
  }
  function select(records, watched, filters) {
    return records.filter(r => (filters.group === 'all' || r.group === filters.group) && (!filters.unwatched || !watched.has(r.id)));
  }
  function summarize(records, watched) {
    const rated = records.filter(r => r.rating !== null), timed = records.filter(r => r.runtime !== null);
    const remaining = records.filter(r => !watched.has(r.id));
    return { count: records.length, rated: rated.length, median: median(rated.map(r=>r.rating)),
      runtimeCount: timed.length, totalMinutes: timed.reduce((sum,r)=>sum+r.runtime,0),
      watched: records.length-remaining.length, remainingCount: remaining.length,
      remainingMinutes: remaining.reduce((sum,r)=>sum+(r.runtime ?? 0),0), missingRemaining: remaining.filter(r=>r.runtime===null).length };
  }
  function groupSummary(records, watched) {
    const groups = new Map();
    records.forEach(r => { if (!groups.has(r.group)) groups.set(r.group,[]); groups.get(r.group).push(r); });
    return [...groups].map(([id,items]) => {
      const ratings = items.map(r=>r.rating).filter(valid);
      return { id, name: items[0].groupName, color: items[0].color, ...summarize(items,watched),
        q1: quantile(ratings,.25), q3: quantile(ratings,.75), min: ratings.length ? Math.min(...ratings) : null, max: ratings.length ? Math.max(...ratings) : null };
    }).sort((a,b)=>a.color-b.color);
  }
  // A group needs a few ratings before its median can headline the page.
  function strongest(groups, minRated = 3) {
    return groups.filter(g => g.rated >= minRated).sort((a,b) => b.median-a.median || b.rated-a.rated)[0] || null;
  }
  // Centered window: each point's trend is the median of the scored entries around it.
  function rollingMedian(values, window) {
    const half = Math.floor(window/2);
    return values.map((_,i) => median(values.slice(Math.max(0,i-half), i+half+1)));
  }
  // Share of the other rated entries that score strictly lower.
  function percentile(records, rating) {
    const rated = records.filter(r => r.rating !== null);
    return rating === null || rated.length < 2 ? null : rated.filter(r => r.rating < rating).length/(rated.length-1);
  }
  // A vote floor keeps a handful of enthusiastic voters from topping the list.
  function topRated(records, minVotes, limit = 10) {
    return records.filter(r => r.rating !== null && r.votes !== null && r.votes >= minVotes)
      .sort((a,b) => b.rating-a.rating || b.votes-a.votes).slice(0,limit);
  }
  function planFinish(minutes, dailyMinutes, from = new Date()) {
    const days = minutes > 0 ? Math.ceil(minutes/dailyMinutes) : 0, date = new Date(from);
    date.setDate(date.getDate()+days);
    return { days, date };
  }
  function csv(records, watched, hideTitles) {
    const escape = value => { const raw=String(value ?? '');return '"'+(/^[=+@\-]/.test(raw)?"'"+raw:raw).replace(/"/g,'""')+'"'; };
    const header = ['Entry','Title','Group','Japanese release','IMDb rating','IMDb votes','Listed minutes','Duration basis','Watched','IMDb source','Duration source','Metadata source','Rating checked'];
    return [header,...records.map(r=>[r.label,hideTitles?r.label:r.title,hideTitles && r.dataset==='episodes'?`Arc ${r.group}`:r.groupName,r.release,r.rating,r.votes,r.runtime,r.runtimeBasis,watched.has(r.id),r.imdbUrl,r.runtimeSource,r.source,r.checked])].map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
  }
  return { normalize, select, summarize, groupSummary, strongest, rollingMedian, percentile, topRated, planFinish, csv, median, quantile, categories };
});
