(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ConanMoviesCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const STORAGE_KEY = 'conan-casebook:movies:v1';
  function readProgress(raw, movies) {
    const value = JSON.parse(raw);
    if (value?.app !== 'conan-casebook-movies' || value.version !== 1 || !Array.isArray(value.watched)) {
      throw new Error('Choose a Conan movie progress backup. Your progress was kept.');
    }
    const valid = new Set(movies.map(movie => movie.id));
    return new Set(value.watched.filter(id => typeof id === 'string' && valid.has(id)));
  }
  const backup = watched => ({ app: 'conan-casebook-movies', version: 1, watched: [...watched].sort() });
  function selectMovies(movies, watched, filters) {
    const query = (filters.query || '').trim().toLowerCase();
    return movies.filter(movie => {
      const matches = !query || (/^\d+$/.test(query)
        ? movie.number === Number(query) || movie.releaseDate.slice(0, 4) === query
        : `${movie.title} ${movie.category}`.toLowerCase().includes(query));
      return matches && (filters.category === 'all' || movie.category === filters.category) &&
        (filters.status === 'all' || watched.has(movie.id) === (filters.status === 'watched'));
    }).sort((a, b) => (filters.sort === 'newest' ? -1 : 1) * a.releaseDate.localeCompare(b.releaseDate));
  }
  return { STORAGE_KEY, readProgress, backup, selectMovies };
});
