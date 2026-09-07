(function (root) {
  'use strict';
  const STORAGE_KEY = 'conan-casebook:v1';
  function readProgress(value, episodes) {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || data.version !== 1 || !Array.isArray(data.watched) ||
        data.watched.some(n => !Number.isInteger(n))) {
      throw new Error('Choose a valid Conan Casebook progress backup.');
    }
    const valid = new Set(episodes.map(e => e.episode));
    if (data.watched.some(n => !valid.has(n))) {
      throw new Error('This backup contains episodes outside this watchlist.');
    }
    return new Set(data.watched);
  }
  function backup(watched) {
    return { version: 1, watched: [...watched].sort((a, b) => a - b) };
  }
  function selectEpisodes(episodes, watched, filters) {
    const query = filters.query.trim().toLocaleLowerCase();
    const numeric = /^#?0*\d+$/.test(query) ? Number(query.replace('#', '')) : null;
    const result = episodes.filter(e => {
      const match = !query || (numeric !== null ? e.episode === numeric :
        (!filters.hideTitles && e.title.toLocaleLowerCase().includes(query)));
      return match && (!filters.arc || e.arc === filters.arc) &&
        (!filters.rating || (e.imdb.rating !== null && e.imdb.rating >= filters.rating)) &&
        (filters.status === 'all' || watched.has(e.episode) === (filters.status === 'watched'));
    });
    return result.sort((a, b) => filters.sort === 'rating'
      ? (b.imdb.rating ?? -1) - (a.imdb.rating ?? -1) || a.episode - b.episode
      : a.episode - b.episode);
  }
  const api = { STORAGE_KEY, readProgress, backup, selectEpisodes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConanCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
