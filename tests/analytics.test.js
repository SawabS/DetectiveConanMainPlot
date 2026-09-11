'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/analytics-core.js');
const episodeData = require('../data/episodes.json');
const movieData = require('../data/movies.json');
const datasets = core.normalize(episodeData,movieData);
const sample = [
  {id:'a',number:1,title:'First',group:'1',groupName:'One',color:1,release:'2000-01-01',year:2000,rating:6,votes:10,runtime:30},
  {id:'b',number:2,title:'Second',group:'1',groupName:'One',color:1,release:'2002-01-01',year:2002,rating:8,votes:100,runtime:60},
  {id:'c',number:3,title:'Missing',group:'2',groupName:'Two',color:2,release:'2002-02-01',year:2002,rating:null,votes:null,runtime:null},
  {id:'d',number:4,title:'Perfect',group:'2',groupName:'Two',color:2,release:'2002-03-01',year:2002,rating:10,votes:1000,runtime:90}
];
test('analytics covers 255 distinct episodes and all 35 films with source-backed durations',()=>{
  assert.equal(datasets.episodes.length,255);assert.equal(new Set(datasets.episodes.map(r=>r.id)).size,255);
  assert.equal(datasets.movies.length,35);assert.equal(datasets.movies.filter(r=>r.rating!==null).length,33);
  for(const r of [...datasets.episodes,...datasets.movies]){
    assert.match(r.release,/^\d{4}-\d{2}-\d{2}$/);assert(Number.isInteger(r.runtime)&&r.runtime>0);assert.match(r.runtimeSource,/^https:\/\//);
    if(r.rating!==null){assert.match(r.imdbUrl,/\/tt\d+\/$/);assert(r.votes>0);assert.equal(r.checked,'2026-09-08');}
  }
  assert.equal(new Set(episodeData.episodes.map(e=>e.tvmazeId)).size,255);
  assert.equal(episodeData.episodes.filter(e=>e.imdb.runtimeMinutes!==null).length,12);
  assert.match(episodeData.episodes.find(e=>e.episode===13).runtimeMapping,/date differs/);
});
test('medians, quartiles and remaining totals exclude unknowns and weight each rated entry equally',()=>{
  const summary=core.summarize(sample,new Set(['b']));
  assert.equal(summary.median,8);assert.equal(summary.rated,3);assert.equal(summary.totalMinutes,180);
  assert.equal(summary.remainingMinutes,120);assert.equal(summary.missingRemaining,1);assert.equal(summary.remainingCount,3);assert.equal(summary.watched,1);
  assert.equal(core.median([6,9,null]),7.5);assert.equal(core.median([null,NaN]),null);assert.equal(core.quantile([1,2,3,4],.25),1.75);
  const groups=core.groupSummary(sample,new Set());
  assert.deepEqual(groups.map(g=>[g.median,g.q1,g.q3,g.min,g.max]),[[7,6.5,7.5,6,8],[10,10,10,10,10]]);
  assert.equal(core.strongest(groups),null,'a single rating cannot headline a group');
  assert.equal(core.strongest(groups,1).id,'2');
});
test('focus and unwatched filters keep story order; films follow release dates',()=>{
  const watched=new Set(['b']);
  assert.deepEqual(core.select(sample,watched,{group:'1',unwatched:true}).map(r=>r.id),['a']);
  assert.deepEqual(core.select(sample,new Set(),{group:'2',unwatched:true}).map(r=>r.id),['c','d']);
  assert.equal(core.select(sample,watched,{group:'all',unwatched:false}).length,4);
  const releases=datasets.movies.map(r=>r.release);assert.deepEqual(releases,[...releases].sort());
});
test('trend, rank, top list and finish date handle gaps and ties',()=>{
  assert.deepEqual(core.rollingMedian([6,8,null,10],3),[7,7,9,10]);
  assert.equal(core.percentile(sample,8),.5);assert.equal(core.percentile(sample,null),null);
  assert.deepEqual(core.topRated(sample,100).map(r=>r.id),['d','b']);assert.deepEqual(core.topRated(sample,0,1).map(r=>r.id),['d']);
  const plan=core.planFinish(120,60,new Date(2026,0,30));assert.equal(plan.days,2);assert.deepEqual([plan.date.getMonth(),plan.date.getDate()],[1,1]);
  assert.equal(core.planFinish(0,60,new Date(2026,0,30)).days,0);
});
test('CSV exports preserve missing values, sources and title privacy',()=>{
  const row={...sample[2],label:'Episode 003',dataset:'episodes',runtimeSource:'https://example.com/runtime',source:'https://example.com/episode',title:'=HYPERLINK("bad")'};
  const csv=core.csv([row],new Set(),false);assert(csv.includes('"\'=HYPERLINK(""bad"")"'));assert(csv.includes('"","",""'));assert(csv.includes(row.runtimeSource));
  const hidden=core.csv([row],new Set(),true);assert(!hidden.includes('HYPERLINK'));assert(hidden.includes('"Arc 2"'));
});
