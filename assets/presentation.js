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
  const canvas = document.getElementById('ambient-canvas');
  const context = canvas.getContext('2d');
  const hero = document.querySelector('.hero-art');
  let width = 0, height = 0, frame = 0, particles = [], color = '';
  let current = { x: 0, y: 0 }, target = { x: 0, y: 0 }, active = false;
  const motionEnabled = () => motionChoice && !reducedMotion.matches && finePointer.matches;
  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    themeButton.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#071225' : '#eef5fd';
    color = getComputedStyle(root).getPropertyValue('--ambient-rgb').trim();
    draw();
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
      cancelAnimationFrame(frame); frame = 0; active = false;
      root.style.removeProperty('--pointer-x'); root.style.removeProperty('--pointer-y');
      hero.style.removeProperty('--hero-x'); hero.style.removeProperty('--hero-y');
      draw();
    }
  }
  motionButton.addEventListener('click', () => {
    motionChoice = !motionChoice;
    try { localStorage.setItem('conan-casebook:motion', motionChoice ? 'on' : 'off'); } catch { /* Session preference. */ }
    applyMotion();
  });
  reducedMotion.addEventListener('change', applyMotion); finePointer.addEventListener('change', applyMotion);
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(76, Math.max(25, Math.round(width * height / 20000)));
    // Deterministic abstract points remain stable across theme and motion changes.
    particles = Array.from({ length: count }, (_, i) => ({ x: ((i * .61803398875 + .13) % 1) * width, y: ((i * .41421356237 + .29) % 1) * height, r: i % 3 === 0 ? 1.5 : 1 }));
    draw();
  }
  function draw() {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    const positions = particles.map(p => {
      const dx = p.x - current.x, dy = p.y - current.y, distance = Math.hypot(dx, dy);
      const force = motionEnabled() && active ? Math.max(0, 1 - distance / 250) * 22 : 0;
      return { x: p.x + dx / (distance || 1) * force, y: p.y + dy / (distance || 1) * force, r: p.r };
    });
    positions.forEach((p, i) => {
      for (let j = i + 1; j < positions.length; j++) {
        const q = positions[j], distance = Math.hypot(p.x - q.x, p.y - q.y);
        if (distance < 155) {
          context.strokeStyle = `rgba(${color},${(1 - distance / 155) * .24})`;
          context.lineWidth = .65; context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(q.x, q.y); context.stroke();
        }
      }
      context.fillStyle = `rgba(${color},.45)`; context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI * 2); context.fill();
    });
  }
  function tick() {
    frame = 0;
    if (!motionEnabled() || document.hidden) return;
    current.x += (target.x - current.x) * .13; current.y += (target.y - current.y) * .13;
    root.style.setProperty('--pointer-x', `${current.x}px`); root.style.setProperty('--pointer-y', `${current.y}px`);
    hero.style.setProperty('--hero-x', `${(current.x / width - .5) * 9}px`);
    hero.style.setProperty('--hero-y', `${(current.y / height - .5) * 7}px`);
    draw();
    if (Math.hypot(target.x - current.x, target.y - current.y) > .5) frame = requestAnimationFrame(tick);
  }
  window.addEventListener('pointermove', event => {
    if (!motionEnabled() || event.pointerType === 'touch') return;
    target = { x: event.clientX, y: event.clientY };
    if (!active) { current = { ...target }; active = true; }
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { active = false; draw(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } });
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
