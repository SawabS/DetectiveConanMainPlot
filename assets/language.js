(() => {
  'use strict';
  const root=document.documentElement, button=document.getElementById('language-toggle'), card=document.getElementById('language-card');
  if(!button||!card) return;
  const dictionary=window.CONAN_LOCALES||{}, supported=['en','ckb','ar','ja'];
  let language='en', closeTimer, applying=false;
  try { const saved=localStorage.getItem('conan-casebook:language');if(supported.includes(saved))language=saved; } catch {}
  const originalText=new WeakMap(), originalAttributes=new WeakMap();
  const norm=s=>s.replace(/\s+/g,' ').trim();
  let exact=new Map(), patterns=[];
  function compile() {
    exact=new Map();patterns=[];
    for(const entry of Object.values(dictionary[language]?.messages||{})) {
      if(!entry.translation)continue;
      if(!/\{\d+\}/.test(entry.source)){exact.set(norm(entry.source),entry.translation);continue;}
      const names=[];const parts=entry.source.split(/(\{\d+\})/);
      const regex=parts.map(p=>/^\{\d+\}$/.test(p)?(names.push(p), '(.+?)'):p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
      patterns.push({regex:new RegExp('^'+regex+'$'),names,target:entry.translation});
    }
    patterns.sort((a,b)=>b.regex.source.length-a.regex.source.length);
  }
  function translate(value) {
    const key=norm(value); if(language==='en'||!key)return value;
    let result=exact.get(key);
    if(!result) for(const pattern of patterns){const match=key.match(pattern.regex);if(match){result=pattern.target.replace(/\{\d+\}/g, token=>{const i=pattern.names.indexOf(token);return i<0?token:(exact.get(match[i+1])||match[i+1]);});break;}}
    return result?value.match(/^\s*/)[0]+result+value.match(/\s*$/)[0]:value;
  }
  const attributes=['aria-label','title','placeholder','alt'];
  const skip=node=>node.parentElement?.closest('script,style,code,pre,.language-card,[data-no-translate]');
  function apply() {
    if(applying)return;applying=true;observer.disconnect();
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(let node;node=walker.nextNode();){if(skip(node))continue;const known=originalText.get(node);const source=known&&node.nodeValue===known.rendered?known.source:node.nodeValue;const rendered=translate(source);if(rendered!==node.nodeValue)node.nodeValue=rendered;originalText.set(node,{source,rendered});}
    for(const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
      if(el.closest('.language-card')||el===button)continue;
      let saved=originalAttributes.get(el)||{};
      for(const attr of attributes){if(!el.hasAttribute(attr))continue;const value=el.getAttribute(attr),known=saved[attr],source=known&&value===known.rendered?known.source:value,rendered=translate(source);if(value!==rendered)el.setAttribute(attr,rendered);saved[attr]={source,rendered};}
      originalAttributes.set(el,saved);
    }
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes});applying=false;
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;apply();});}});
  function choose(locale) {
    language=locale;root.lang=locale;root.dir=['ckb','ar'].includes(locale)?'rtl':'ltr';
    try{localStorage.setItem('conan-casebook:language',locale);}catch{}
    compile();apply();
    for(const item of card.querySelectorAll('[data-language]'))item.setAttribute('aria-checked',String(item.dataset.language===locale));
    const pending=locale!=='en'&&dictionary[locale]?.status!=='reviewed';
    button.dataset.language=locale;
    window.dispatchEvent(new CustomEvent('conan:language',{detail:{locale,pending}}));
  }
  const items=()=>[...card.querySelectorAll('[data-language]')];
  function open(focus=false){clearTimeout(closeTimer);card.hidden=false;button.setAttribute('aria-expanded','true');if(focus)items().find(b=>b.dataset.language===language)?.focus();}
  function close(focus=false){clearTimeout(closeTimer);card.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();}
  button.addEventListener('click',()=>card.hidden?open():close());
  button.parentElement.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open();});
  button.parentElement.addEventListener('pointerleave',()=>{closeTimer=setTimeout(()=>{if(!button.parentElement.contains(document.activeElement))close();},180);});
  button.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open(true);}});
  card.addEventListener('click',e=>{const item=e.target.closest('[data-language]');if(item){choose(item.dataset.language);close(true);}});
  card.addEventListener('keydown',e=>{const list=items(),i=list.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();list[e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowDown'?1:-1)+list.length)%list.length].focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!card.hidden){e.preventDefault();close(true);}});
  document.addEventListener('pointerdown',e=>{if(!button.parentElement.contains(e.target))close();});
  button.parentElement.addEventListener('focusout',()=>queueMicrotask(()=>{if(!button.parentElement.contains(document.activeElement))close();}));
  window.addEventListener('storage',e=>{if(e.key==='conan-casebook:language')choose(supported.includes(e.newValue)?e.newValue:'en');});
  window.ConanI18n={translate,setLanguage:choose,get language(){return language;}};
  choose(language);
})();
