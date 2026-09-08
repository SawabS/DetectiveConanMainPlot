(() => {
  'use strict';
  window.createConanAnalytics = ({ getEpisodeWatched, getMovieWatched, getHideTitles, onHideTitles, onEpisode, notice }) => {
    const core = window.ConanAnalyticsCore;
    const datasets = core.normalize(window.CONAN_DATA, window.CONAN_MOVIES);
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = n => n === null ? 'N/A' : n.toLocaleString();
    const score = n => n === null ? 'N/A' : n.toFixed(2);
    const hours = n => `${Math.floor(n/60)}h ${n%60}m`;
    const defaults = () => ({query:'',group:'all',year:'all',status:'all',minVotes:0,band:'all',sort:'order',hideTitles:getHideTitles()});
    let scope='episodes', filters=defaults(), entries=[], watched=new Set(), selectedId=null, metric='rating', groupMetric='median';
    const title = r => filters.hideTitles ? r.label : r.title;
    const groupName = r => filters.hideTitles && scope==='episodes' ? `Arc ${r.id ?? r.group}` : (r.name ?? r.groupName);
    const shortLabel = r => r.number ? String(r.number).padStart(scope==='episodes'?3:2,'0') : r.id.replace('crossover','X').replace('compilation','C').replace('short','S');
    function readWatched() {
      if (scope==='episodes') return new Set([...getEpisodeWatched()].map(n=>`episode-${n}`));
      const session = getMovieWatched?.(); if (session) return session;
      try {
        const raw=localStorage.getItem(window.ConanMoviesCore.STORAGE_KEY);
        return raw ? window.ConanMoviesCore.readProgress(raw,window.CONAN_MOVIES.movies) : new Set();
      } catch { return new Set(); }
    }
    function options() {
      const all=datasets[scope], groups=[...new Map(all.map(r=>[r.group,r])).values()];
      $('analytics-group').innerHTML='<option value="all">All '+(scope==='episodes'?'arcs':'categories')+'</option>'+groups.map(r=>`<option value="${r.group}">${esc(filters.hideTitles && scope==='episodes'?`Arc ${r.group}`:r.groupName)}</option>`).join('');
      $('analytics-year').innerHTML='<option value="all">All years</option>'+core.timeline(all,all).map(({year})=>`<option value="${year}">${year}</option>`).join('');
      $('analytics-group').value=filters.group; $('analytics-year').value=filters.year;
    }
    function reset() {
      filters=defaults(); selectedId=null;
      for (const [id,value] of [['analytics-search',''],['analytics-status','all'],['analytics-votes','0'],['analytics-band','all'],['analytics-sort','order']]) $(id).value=value;
      options(); render();
    }
    function selectEntry(id) {
      if (!entries.some(r=>r.id===id)) return;
      selectedId=id; inspector();
      $('analytics-entry-chart').querySelectorAll('[data-entry]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.entry===id));el.setAttribute('tabindex',el.dataset.entry===id?'0':'-1');});
    }
    function inspector() {
      const r=entries.find(r=>r.id===selectedId);
      if(!r){$('analytics-inspector').innerHTML='<p>Select an entry to inspect its sources.</p>';return;}
      $('analytics-inspector').innerHTML=`<p class="eyebrow">${esc(r.label)}</p><h4>${esc(title(r))}</h4><p class="analytics-entry-group">${esc(filters.hideTitles&&scope==='episodes'?`Arc ${r.group}`:r.groupName)} · ${r.release}</p><dl><div><dt>IMDb / 10</dt><dd>${score(r.rating)}</dd></div><div><dt>Votes</dt><dd>${fmt(r.votes)}</dd></div><div><dt>Listed minutes</dt><dd>${fmt(r.runtime)}</dd></div><div><dt>Progress</dt><dd>${watched.has(r.id)?'Watched':'Unwatched'}</dd></div></dl><p class="chart-note">${r.runtimeBasis}. ${scope==='episodes'?'May include advertising.':'Runtime varies by edition.'}</p><div class="analytics-entry-links">${r.imdbUrl?`<a href="${esc(r.imdbUrl)}" target="_blank" rel="noopener noreferrer">IMDb entry ↗</a>`:'<span>No verified IMDb entry</span>'}<a href="${esc(r.runtimeSource || r.source)}" target="_blank" rel="noopener noreferrer">Duration source ↗</a><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${scope==='episodes'?'Episode':'Movie'} source ↗</a>${scope==='episodes'?`<button class="text-button" data-analytics-open="${r.number}">Open episode details ↗</button>`:''}</div><p class="chart-note">Rating checked ${r.checked || 'not available'}.</p>`;
    }
    function tooltip(el,event) {
      const r=entries.find(item=>item.id===el.dataset.entry); if(!r)return;
      const tip=$('analytics-tooltip');tip.textContent=`${r.label} · ${title(r)}\nIMDb ${score(r.rating)} / 10 · ${fmt(r.votes)} votes\n${fmt(r.runtime)} listed min · ${r.release}`;tip.hidden=false;
      const rect=el.getBoundingClientRect(), x=event?.clientX ?? rect.left+rect.width/2, y=event?.clientY ?? rect.top;
      tip.style.left=`${Math.max(8,Math.min(x+14,window.innerWidth-tip.offsetWidth-12))}px`;
      tip.style.top=`${Math.max(8,Math.min(y+14,window.innerHeight-tip.offsetHeight-12))}px`;
    }
    function entryChart() {
      const width=Math.max(680,entries.length*24+60), base=238, height=280, left=44, plot=190, slot=(width-left-12)/Math.max(entries.length,1);
      const max=metric==='rating'?10:Math.max(30,Math.ceil(Math.max(0,...entries.map(r=>r.runtime||0))/30)*30);
      const grid=Array.from({length:6},(_,i)=>{const value=max*i/5,y=base-plot*i/5;return `<line x1="${left}" y1="${y}" x2="${width-8}" y2="${y}" class="analytics-gridline"/><text x="${left-9}" y="${y+4}" text-anchor="end" class="analytics-axis">${Number(value.toFixed(1))}</text>`;}).join('');
      const bars=entries.map((r,i)=>{const value=metric==='rating'?r.rating:r.runtime, h=value===null?7:value/max*plot,x=left+i*slot+3,y=base-h;return `<g data-entry="${r.id}" data-arc-color="${r.color}" tabindex="${r.id===selectedId?0:-1}" role="button" aria-pressed="${r.id===selectedId}" aria-label="${esc(r.label+': '+title(r)+', '+(value===null?'value unavailable':value+(metric==='rating'?' out of 10':' listed minutes')))}"><title>${esc(r.label+': '+title(r))} | IMDb ${score(r.rating)} | ${fmt(r.runtime)} listed min | ${fmt(r.votes)} votes</title><rect class="analytics-bar-hit" x="${x-3}" y="30" width="${slot}" height="${base-25}"/><rect class="analytics-entry-bar${value===null?' is-missing':''}" x="${x}" y="${y}" width="${Math.max(8,slot-6)}" height="${h}" rx="3"/>${watched.has(r.id)?`<circle cx="${x+(slot-6)/2}" cy="${Math.max(y-6,22)}" r="2.5" class="analytics-watched-dot"/>`:''}<text x="${x+(slot-6)/2}" y="${base+19}" text-anchor="middle" class="analytics-axis">${esc(shortLabel(r))}</text></g>`;}).join('');
      $('analytics-entry-chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" style="width:${width}px;min-width:100%" aria-label="${entries.length} entries, ${metric==='rating'?'IMDb ratings from 0 to 10':'listed durations in minutes'}"><text x="${left}" y="19" class="analytics-axis">${metric==='rating'?'IMDb / 10':'Listed minutes'}</text>${grid}${bars}</svg>`;
      $('analytics-explorer-note').textContent=`${metric==='rating'?'Rating axis starts at zero. Outlined bars indicate missing scores.':'Durations are source listings, not exact streaming playback times.'} Color identifies ${scope==='episodes'?'arc':'category'}; dots above bars mark watched entries. Equal spacing represents entry order, not elapsed time.`;
    }
    function smallCharts(summary) {
      const groups=core.groupSummary(entries,watched);
      $('analytics-group-title').textContent=scope==='episodes'?'Compare the arcs':'Compare film categories';
      const groupMax=groupMetric==='median'?10:Math.max(1,...groups.map(g=>g.totalMinutes/60));
      $('analytics-group-chart').innerHTML=groups.map(g=>{const value=groupMetric==='median'?g.median:g.totalMinutes/60;return `<button class="analytics-group-row" data-group="${g.id}" data-arc-color="${g.color}" aria-pressed="${filters.group===g.id}"><span>${esc(groupName(g))}<small>${g.count} entries · ${g.rated} rated</small></span><span class="analytics-track"><i style="width:${value===null?0:value/groupMax*100}%"></i></span><strong>${groupMetric==='median'?score(value):value.toFixed(1)+'h'}</strong></button>`;}).join('');
      const hist=core.distribution(entries), highest=Math.max(1,...hist.map(b=>b.count));
      $('analytics-distribution-chart').innerHTML=hist.map(b=>`<button data-band="${b.id}" class="analytics-bin" aria-pressed="${filters.band===b.id}" aria-label="${b.label}: ${b.count} entries. Filter this rating band."><strong>${b.count}</strong><span class="analytics-bin-track"><i style="height:${b.count/highest*100}%"></i></span><span>${b.label}</span></button>`).join('');
      $('analytics-distribution-note').textContent=`${summary.rated} rated entries; ${summary.count-summary.rated} missing scores excluded. Select a band to filter; select it again to clear.`;
      const years=core.timeline(entries,datasets[scope]), max=Math.max(1,...years.map(y=>y.count)), width=Math.max(720,years.length*29+50), base=200, plot=145, step=(width-50)/years.length;
      const grid=Array.from({length:5},(_,i)=>{const n=Math.ceil(max/4)*i,y=base-(n/(Math.ceil(max/4)*4))*plot;return `<line x1="35" y1="${y}" x2="${width-8}" y2="${y}" class="analytics-gridline"/><text x="27" y="${y+4}" text-anchor="end" class="analytics-axis">${n}</text>`;}).join('');
      $('analytics-year-chart').innerHTML=`<svg viewBox="0 0 ${width} 250" style="width:${width}px;min-width:100%" aria-label="Selected releases per year">${grid}${years.map((v,i)=>{const h=v.count/(Math.ceil(max/4)*4)*plot,x=40+i*step;return `<g role="button" tabindex="0" data-year="${v.year}" aria-pressed="${filters.year===String(v.year)}" aria-label="${v.year}: ${v.count} selected releases. Filter this year."><title>${v.year}: ${v.count} selected releases</title><rect class="analytics-bar-hit" x="${x-2}" y="40" width="${step}" height="175"/><rect class="analytics-year-bar" x="${x}" y="${base-h}" width="${step-5}" height="${h}" rx="3"/><text class="analytics-axis" x="${x+(step-5)/2}" y="${base+20}" text-anchor="middle" transform="rotate(-45 ${x+(step-5)/2} ${base+20})">${v.year}</text></g>`;}).join('')}</svg>`;
    }
    function planner() {
      const s=core.summarize(entries,watched), minutes=Number($('analytics-daily-minutes').value), days=Math.ceil(s.remainingMinutes/minutes);
      $('analytics-daily-label').textContent=`${minutes} min`;
      $('analytics-days').textContent=`${s.missingRemaining?'At least ':''}${days} ${days===1?'day':'days'}`;
      $('analytics-planner-description').textContent=`${s.remainingCount} unwatched ${scope==='episodes'?'episodes':'films'} in your filters · ${hours(s.remainingMinutes)} listed time${s.missingRemaining?` · ${s.missingRemaining} missing durations`:''}. A planning estimate; actual viewing time varies by edition and skipped material.`;
    }
    function render() {
      filters.hideTitles=getHideTitles(); $('analytics-hide-titles').checked=filters.hideTitles;
      $('analytics-search').placeholder=filters.hideTitles?'Episode / film number or year':'Title, episode / film number, or year';
      options(); watched=readWatched(); entries=core.select(datasets[scope],watched,filters);
      if(!entries.some(r=>r.id===selectedId)) selectedId=entries[0]?.id || null;
      const s=core.summarize(entries,watched), full=datasets[scope].length;
      $('analytics-status-text').textContent=`${s.count} of ${full} ${scope==='episodes'?'main-story episodes':'films'} in this view · ${s.watched} watched. Every chart follows these filters.`;
      $('analytics-kpis').innerHTML=[['In this view',fmt(s.count),`${full} total ${scope==='episodes'?'episodes':'films'}`],['Median IMDb',score(s.median),`${s.rated} / ${s.count} rated · equal entry weight`],['Listed time',hours(s.totalMinutes),`${s.runtimeCount} / ${s.count} durations · ${scope==='episodes'?'broadcast listings':'film listings'}`],['Still to watch',hours(s.remainingMinutes),`${s.remainingCount} unwatched${s.missingRemaining?' · durations incomplete':''}`]].map(([label,value,note])=>`<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
      $('analytics-empty').hidden=entries.length>0; $('analytics-content').hidden=!entries.length;
      const busiest=core.timeline(entries,datasets[scope]).sort((a,b)=>b.count-a.count || a.year-b.year)[0];
      $('analytics-highlights').innerHTML=`${s.highest?`<button data-highlight="${s.highest.id}"><span>Highest IMDb score</span><strong>${score(s.highest.rating)} <small>/ 10</small></strong><p>${esc(title(s.highest))} · ${fmt(s.highest.votes)} votes</p></button>`:''}${s.longest?`<button data-highlight="${s.longest.id}"><span>Longest listed duration</span><strong>${s.longest.runtime} <small>min</small></strong><p>${esc(title(s.longest))}</p></button>`:''}${busiest&&busiest.count?`<button data-year="${busiest.year}"><span>Busiest release year</span><strong>${busiest.year}</strong><p>${busiest.count} selected releases</p></button>`:''}`;
      $('analytics-table-body').innerHTML=entries.map(r=>`<tr><td><button class="text-button" data-highlight="${r.id}">${esc(r.label)}</button></td><td>${esc(title(r))}</td><td>${r.release}</td><td>${r.imdbUrl?`<a href="${esc(r.imdbUrl)}" target="_blank" rel="noopener noreferrer">${score(r.rating)}</a>`:'N/A'}</td><td>${fmt(r.votes)}</td><td><a href="${esc(r.runtimeSource||r.source)}" target="_blank" rel="noopener noreferrer">${fmt(r.runtime)}</a></td><td>${watched.has(r.id)?'Yes':'No'}</td></tr>`).join('');
      $('analytics-source-note').textContent=`Ratings checked ${scope==='episodes'?window.CONAN_DATA.updated:window.CONAN_MOVIES.ratingsUpdated}. ${s.rated} scores and ${s.runtimeCount} duration listings available in this filtered view. Missing values are never treated as zero ratings.`;
      $('analytics-tooltip').hidden=true;
      if(entries.length){entryChart();smallCharts(s);inspector();planner();}
      $('analytics-export').disabled=!entries.length;
    }
    $('analytics').addEventListener('click',event=>{
      const target=event.target.closest('[data-analytics-scope],[data-entry],[data-highlight],[data-group],[data-year],[data-band],[data-analytics-open]'); if(!target)return;
      if(target.dataset.analyticsScope){scope=target.dataset.analyticsScope;document.querySelectorAll('[data-analytics-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));reset();}
      else if(target.dataset.entry) selectEntry(target.dataset.entry);
      else if(target.dataset.highlight){selectEntry(target.dataset.highlight);$('analytics-inspector').scrollIntoView({block:'nearest'});}
      else if(target.dataset.analyticsOpen) onEpisode(Number(target.dataset.analyticsOpen));
      else { const key=target.dataset.group?'group':target.dataset.year?'year':'band', value=target.dataset[key];filters[key]=filters[key]===value?'all':value; render(); $(`analytics-${key}`).value=filters[key];$(`analytics-${key}`).focus({preventScroll:true}); }
    });
    $('analytics').addEventListener('keydown',event=>{
      if(event.key==='Escape') $('analytics-tooltip').hidden=true;
      const item=event.target.closest('[data-entry],[data-year]');if(!item)return;
      if(event.key==='Enter'||event.key===' '){event.preventDefault();item.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
      if(item.dataset.entry && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        event.preventDefault();const i=entries.findIndex(r=>r.id===item.dataset.entry), index=event.key==='Home'?0:event.key==='End'?entries.length-1:(i+(event.key==='ArrowRight'?1:-1)+entries.length)%entries.length;
        selectEntry(entries[index].id);const next=$('analytics-entry-chart').querySelector(`[data-entry="${selectedId}"]`);next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});
      }
    });
    const chart=$('analytics-entry-chart');
    chart.addEventListener('pointermove',e=>{const item=e.target.closest('[data-entry]');if(item)tooltip(item,e);else $('analytics-tooltip').hidden=true;});
    chart.addEventListener('pointerleave',()=>$('analytics-tooltip').hidden=true);
    chart.addEventListener('focusin',e=>{const item=e.target.closest('[data-entry]');if(item)tooltip(item);});
    chart.addEventListener('focusout',()=>$('analytics-tooltip').hidden=true);
    window.addEventListener('scroll',()=>$('analytics-tooltip').hidden=true,{passive:true});
    $('analytics-entry-scroll').addEventListener('scroll',()=>$('analytics-tooltip').hidden=true,{passive:true});
    $('analytics-search').addEventListener('input',e=>{filters.query=e.target.value;render();});
    for(const [id,key] of [['analytics-group','group'],['analytics-year','year'],['analytics-status','status'],['analytics-votes','minVotes'],['analytics-band','band'],['analytics-sort','sort']]) $(id).addEventListener('change',e=>{filters[key]=e.target.value;render();});
    $('analytics-metric').addEventListener('change',e=>{metric=e.target.value;render();});
    $('analytics-group-metric').addEventListener('change',e=>{groupMetric=e.target.value;render();});
    $('analytics-hide-titles').addEventListener('change',e=>{onHideTitles(e.target.checked);render();});
    $('analytics-reset').addEventListener('click',reset);
    $('analytics-daily-minutes').addEventListener('input',planner);
    $('analytics-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([core.csv(entries,watched,filters.hideTitles)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`conan-${scope}-analytics.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Filtered analytics exported with source links.');});
    window.addEventListener('storage',event=>{if([window.ConanCore.STORAGE_KEY,window.ConanMoviesCore.STORAGE_KEY,`${window.ConanCore.STORAGE_KEY}:hide-titles`].includes(event.key) && !$('analytics').hidden) queueMicrotask(render);});
    return { render };
  };
})();
