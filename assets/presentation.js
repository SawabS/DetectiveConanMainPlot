(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.getElementById('theme-toggle');
  const motionButton = document.getElementById('motion-toggle');
  const systemTheme = matchMedia('(prefers-color-scheme: light)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  let themeChoice = null, motionChoice = true;
  try {
    const saved = localStorage.getItem('conan-casebook:theme');
    themeChoice = ['light', 'dark'].includes(saved) ? saved : null;
    motionChoice = localStorage.getItem('conan-casebook:motion') !== 'off';
  } catch { /* Preferences work for this session when storage is unavailable. */ }
  const hero = document.querySelector('.hero-art');
  let width = window.innerWidth, height = window.innerHeight, frame = 0;
  let current = { x: width / 2, y: height / 2 }, target = { ...current };
  const motionEnabled = () => motionChoice && !reducedMotion.matches && finePointer.matches;
  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    themeButton.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#071225' : '#eef5fd';
  }
  themeButton.addEventListener('click', () => {
    themeChoice = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('conan-casebook:theme', themeChoice); } catch { /* Session preference. */ }
    applyTheme(themeChoice);
  });
  systemTheme.addEventListener('change', () => { if (!themeChoice) applyTheme(systemTheme.matches ? 'light' : 'dark'); });
  function applyMotion() {
    root.dataset.motion = motionEnabled() ? 'on' : 'off';
    motionButton.setAttribute('aria-pressed', String(motionEnabled()));
    motionButton.disabled = reducedMotion.matches || !finePointer.matches;
    const reason = reducedMotion.matches ? 'Motion reduced by system preference' : !finePointer.matches ? 'Background motion requires a mouse or pen' : motionChoice ? 'Turn off background motion' : 'Turn on background motion';
    motionButton.setAttribute('aria-label', reason); motionButton.title = reason;
    if (!motionEnabled()) {
      resetMotion();
    }
  }
  motionButton.addEventListener('click', () => {
    motionChoice = !motionChoice;
    try { localStorage.setItem('conan-casebook:motion', motionChoice ? 'on' : 'off'); } catch { /* Session preference. */ }
    applyMotion();
  });
  reducedMotion.addEventListener('change', applyMotion); finePointer.addEventListener('change', applyMotion);
  function resetMotion() {
    cancelAnimationFrame(frame); frame = 0;
    root.dataset.pointerActive = 'false';
    current = { x: width / 2, y: height / 2 }; target = { ...current };
    ['--pointer-x', '--pointer-y', '--grid-x', '--grid-y'].forEach(key => root.style.removeProperty(key));
    hero.style.removeProperty('--hero-x'); hero.style.removeProperty('--hero-y');
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    resetMotion();
  }
  function tick() {
    frame = 0;
    if (!motionEnabled() || document.hidden) return;
    current.x += (target.x - current.x) * .18; current.y += (target.y - current.y) * .18;
    const settled = Math.hypot(target.x - current.x, target.y - current.y) < .1;
    if (settled) current = { ...target };
    root.style.setProperty('--pointer-x', `${current.x}px`); root.style.setProperty('--pointer-y', `${current.y}px`);
    hero.style.setProperty('--hero-x', `${(current.x / width - .5) * 9}px`);
    hero.style.setProperty('--hero-y', `${(current.y / height - .5) * 7}px`);
    root.style.setProperty('--grid-x', `${(current.x / width - .5) * -32}px`);
    root.style.setProperty('--grid-y', `${(current.y / height - .5) * -32}px`);
    if (!settled) frame = requestAnimationFrame(tick);
  }
  window.addEventListener('pointermove', event => {
    if (!motionEnabled() || event.pointerType === 'touch') return;
    target = { x: event.clientX, y: event.clientY };
    root.dataset.pointerActive = 'true';
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
  function returnToRest() {
    root.dataset.pointerActive = 'false';
    target = { x: width / 2, y: height / 2 };
    if (motionEnabled() && !frame) frame = requestAnimationFrame(tick);
  }
  root.addEventListener('pointerleave', returnToRest);
  window.addEventListener('blur', returnToRest);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetMotion(); });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('storage', event => {
    if (event.key === 'conan-casebook:theme') {
      themeChoice = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
      applyTheme(themeChoice ?? (systemTheme.matches ? 'light' : 'dark'));
    }
    if (event.key === 'conan-casebook:motion') { motionChoice = event.newValue !== 'off'; applyMotion(); }
  });
  applyTheme(root.dataset.theme); applyMotion(); resize();
})();
