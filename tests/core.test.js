'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { readProgress, backup, selectEpisodes } = require('../assets/core.js');
const data = require('../data/episodes.json');
const episodes = data.episodes;
const defaults = { query: '', arc: 0, rating: 0, status: 'all', sort: 'episode', hideTitles: false };

test('original table selection is preserved without accidentally expanded ranges', () => {
  assert.equal(episodes.length, 255);
  assert.equal(new Set(episodes.map(e => e.episode)).size, 255);
  assert.deepEqual(episodes.map(e => e.episode), episodes.map(e => e.episode).sort((a, b) => a - b));
  for (const n of [337, 505, 506, 669, 670, 757, 758]) assert(!episodes.some(e => e.episode === n));
  assert.equal(episodes.at(-1).episode, 1205);
});

test('each rating has distinct, dated, year-consistent episode provenance', () => {
  assert.equal(new Set(episodes.map(e => e.imdb.id)).size, 255);
  for (const e of episodes) {
    assert.match(e.imdb.id, /^tt\d+$/);
    assert(e.imdb.rating === null || (e.imdb.rating >= 1 && e.imdb.rating <= 10));
    assert(e.imdb.rating === null ? e.imdb.votes === null : Number.isInteger(e.imdb.votes) && e.imdb.votes > 0);
    assert.equal(Number(e.airDate.slice(-4)), e.imdb.year);
    assert.match(e.imdb.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new URL(e.source).hostname, 'www.detectiveconanworld.com');
    assert.match(e.selectionSource, /\/blob\/[0-9a-f]{40}\//);
  }
  assert.equal(episodes.find(e => e.episode === 733).imdb.id, 'tt3615564');
  assert.equal(episodes.find(e => e.episode === 345).imdb.id, 'tt1030179');
});

test('browser data and Markdown rows agree with the source dataset', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/episodes.js'), 'utf8'), context);
  assert.equal(JSON.stringify(context.window.CONAN_DATA), JSON.stringify(data));
  const markdown = fs.readFileSync(path.join(__dirname, '../detective_conan_main_story_watch_guide.md'), 'utf8');
  const numbers = [...markdown.matchAll(/^\| ☐ \| (\d+) \|/gm)].map(m => Number(m[1]));
  assert.deepEqual(numbers, episodes.map(e => e.episode));
});

test('progress survives JSON round trips and rejects unrelated or corrupt backups', () => {
  assert.deepEqual([...readProgress(JSON.stringify(backup(new Set([345, 1, 129]))), episodes)], [1, 129, 345]);
  assert.equal(readProgress({ version: 1, watched: [1, 1] }, episodes).size, 1);
  for (const value of ['broken', null, {}, { version: 2, watched: [1] }, { version: 1, watched: ['1'] }, { version: 1, watched: [3] }]) {
    assert.throws(() => readProgress(value, episodes));
  }
});

test('search uses exact Japanese numbers and combines arc, rating, and status', () => {
  const watched = new Set([1, 345]);
  assert.deepEqual(selectEpisodes(episodes, watched, { ...defaults, query: '#001' }).map(e => e.episode), [1]);
  assert.equal(selectEpisodes(episodes, watched, { ...defaults, query: '1', status: 'unwatched' }).length, 0);
  const selected = selectEpisodes(episodes, watched, { ...defaults, arc: 3, rating: 9, status: 'watched' });
  assert.deepEqual(selected.map(e => e.episode), [345]);
  assert.equal(selectEpisodes(episodes, watched, { ...defaults, query: 'roller coaster' })[0].episode, 1);
  assert.equal(selectEpisodes(episodes, watched, { ...defaults, query: 'roller coaster', hideTitles: true }).length, 0);
  assert.equal(selectEpisodes(episodes, watched, { ...defaults, query: 'nothing matches' }).length, 0);
});

test('rating sort is descending and preserves episode order on ties without mutating data', () => {
  const order = episodes.map(e => e.episode);
  const sorted = selectEpisodes(episodes, new Set(), { ...defaults, sort: 'rating' });
  for (let i = 1; i < sorted.length; i++) {
    assert(sorted[i - 1].imdb.rating >= sorted[i].imdb.rating);
    if (sorted[i - 1].imdb.rating === sorted[i].imdb.rating) assert(sorted[i - 1].episode < sorted[i].episode);
  }
  assert.deepEqual(episodes.map(e => e.episode), order);
});
