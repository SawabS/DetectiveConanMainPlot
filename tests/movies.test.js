const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../data/movies.json');
const { readProgress, backup, selectMovies, STORAGE_KEY } = require('../assets/movies-core.js');
const defaults = { query: '', category: 'all', status: 'all', sort: 'release' };

test('catalog covers all 29 released main films and six categorized extras', () => {
  assert.equal(data.movies.length, 35);
  assert.equal(new Set(data.movies.map(m => m.id)).size, 35);
  assert.deepEqual(data.movies.filter(m => m.category === 'main').map(m => m.number), Array.from({ length: 29 }, (_, i) => i + 1));
  for (const [category, count] of [['crossover',1],['compilation',3],['short',2]]) {
    assert.equal(data.movies.filter(m => m.category === category).length, count);
  }
  for (const movie of data.movies) {
    assert.ok(movie.releaseDate <= data.updated);
    assert.match(movie.source, /^https:\/\/www\.detectiveconanworld\.com\/wiki\//);
    if (movie.poster) assert.ok(movie.posterSource);
  }
  assert.equal(data.movies.find(m => m.number === 24).releaseDate, '2021-04-16');
  assert.equal(data.movies.find(m => m.number === 29).releaseDate, '2026-04-10');
});

test('film number, release year, category, and status combine without changing the catalog', () => {
  const movies = data.movies, original = [...movies], watched = new Set(['movie-01']);
  assert.deepEqual(selectMovies(movies, watched, { ...defaults, query: '01' }).map(m => m.id), ['movie-01']);
  assert.equal(selectMovies(movies, watched, { ...defaults, query: '2021' }).length, 2);
  assert.equal(selectMovies(movies, watched, { ...defaults, category: 'main', status: 'unwatched' }).length, 28);
  assert.equal(selectMovies(movies, watched, { ...defaults, query: 'baker' })[0].number, 6);
  assert.equal(selectMovies(movies, watched, { ...defaults, sort: 'newest' })[0].number, 29);
  assert.deepEqual(movies, original);
});

test('movie backups stay separate from episodes and reject unrelated input', () => {
  assert.notEqual(STORAGE_KEY, require('../assets/core.js').STORAGE_KEY);
  const watched = new Set(['movie-01','short-2']);
  assert.deepEqual(readProgress(JSON.stringify(backup(watched)), data.movies), watched);
  assert.throws(() => readProgress(JSON.stringify({ app: 'conan-casebook', version: 1, watched: [1] }), data.movies));
  assert.deepEqual([...readProgress(JSON.stringify({ ...backup(watched), watched: ['movie-01','unknown',1,'movie-01'] }), data.movies)], ['movie-01']);
});

test('browser movie data and generated Markdown preserve all source entries', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/movies-data.js'), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.CONAN_MOVIES)), data);
  const markdown = fs.readFileSync(require.resolve('../detective_conan_movies.md'), 'utf8');
  assert.equal(markdown.split('\n').filter(line => line.startsWith('| ☐ |')).length, 35);
  for (const movie of data.movies) assert.ok(markdown.includes(movie.source));
});
