'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/analytics-core.js');
const episodeData = require('../data/episodes.json');
const movieData = require('../data/movies.json');
const datasets = core.normalize(episodeData,movieData);
const defaults = {query:'',group:'all',year:'all',status:'all',minVotes:0,band:'all',sort:'order',hideTitles:false};
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
test('medians and remaining totals exclude unknowns and keep each rated entry equally weighted',()=>{
  const summary=core.summarize(sample,new Set(['b']));
  assert.equal(summary.median,8);assert.equal(summary.rated,3);assert.equal(summary.totalMinutes,180);
  assert.equal(summary.remainingMinutes,120);assert.equal(summary.missingRemaining,1);assert.equal(summary.remainingCount,3);
  assert.equal(core.median([6,9,null]),7.5);assert.equal(core.median([null,NaN]),null);
  assert.equal(core.summarize([],new Set()).highest,null);
  assert.deepEqual(core.groupSummary(sample,new Set()).map(g=>g.median),[7,10]);
});
test('combined filters respect votes, progress, rating boundaries and hidden titles',()=>{
  const watched=new Set(['b']);
  assert.deepEqual(core.select(sample,watched,{...defaults,group:'1',status:'watched',minVotes:100,band:'8'}).map(r=>r.id),['b']);
  assert.deepEqual(core.select(sample,watched,{...defaults,band:'9'}).map(r=>r.id),['d']);
  assert.equal(core.select(sample,watched,{...defaults,query:'First',hideTitles:true}).length,0);
  assert.equal(core.select(sample,watched,{...defaults,query:'#001',hideTitles:true})[0].id,'a');
  assert.equal(core.select(sample,watched,{...defaults,year:'2001'}).length,0);
  assert.deepEqual(core.select(sample,watched,{...defaults,sort:'rating'}).map(r=>r.id),['d','b','a','c']);
  assert.deepEqual(sample.map(r=>r.id),['a','b','c','d']);
});
test('timeline retains empty years and score bins count each known rating once',()=>{
  assert.deepEqual(core.timeline(sample,sample),[{year:2000,count:1},{year:2001,count:0},{year:2002,count:3}]);
  assert.deepEqual(core.distribution(sample).map(b=>b.count),[0,1,0,1,1]);
});
test('CSV exports preserve missing values, sources and title privacy',()=>{
  const row={...sample[2],label:'Episode 003',dataset:'episodes',runtimeSource:'https://example.com/runtime',source:'https://example.com/episode',title:'=HYPERLINK("bad")'};
  const csv=core.csv([row],new Set(),false);assert(csv.includes('"\'=HYPERLINK(""bad"")"'));assert(csv.includes('"","",""'));assert(csv.includes(row.runtimeSource));
  const hidden=core.csv([row],new Set(),true);assert(!hidden.includes('HYPERLINK'));assert(hidden.includes('"Arc 2"'));
});
