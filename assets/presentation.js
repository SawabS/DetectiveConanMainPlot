(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.getElementById('theme-toggle');
  const systemTheme = matchMedia('(prefers-color-scheme: light)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  let themeChoice = null;
  try {
    const saved = localStorage.getItem('conan-casebook:theme');
    themeChoice = ['light', 'dark'].includes(saved) ? saved : null;
  } catch { /* Preferences work for this session when storage is unavailable. */ }
  const canvas = document.getElementById('ambient-canvas');
  const context = canvas.getContext('2d');
  const { RADIUS, warpPoint } = window.ConanGridCore;
  // A small foreground patch carries the same field across opaque cards and tables.
  const surfaceCanvas = document.createElement('canvas');
  surfaceCanvas.className = 'surface-liquid';
  surfaceCanvas.setAttribute('aria-hidden', 'true');
  document.body.append(surfaceCanvas);
  const surfaceContext = surfaceCanvas.getContext('2d');
  const patchSize = (RADIUS + 12) * 2;
  let activeSurface = null;
  const surfaces = 'tbody tr, .movie-card, .progress-card, .analytics-card, .analytics-inspector, .analytics-kpis > div, .analytics-highlights > button, .analytics-planner, .graph-card, .hero, .overview > div, .source-list li, .detail-stats > div, .guide-article > p, .guide-article > ul, .guide-article > h2';
  function selectSurface(target, pressed = false) {
    const next = !pressed && target instanceof Element ? target.closest(surfaces) || target.closest('button, a, input, select, summary') : null;
    if (next === activeSurface) return;
    activeSurface?.style.removeProperty('--liquid-scale');
    activeSurface = next;
    if (activeSurface) {
      activeSurface.classList.add('liquid-surface');
      activeSurface.style.setProperty('--liquid-scale', '.992');
    }
  }
  function positionSurfaceLayer() {
    // Native dialogs occupy the browser's top layer, above ordinary z-index values.
    const host = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
    if (surfaceCanvas.parentElement !== host) host.append(surfaceCanvas);
  }
  new MutationObserver(positionSurfaceLayer).observe(document.body, {subtree:true, attributes:true, attributeFilter:['open']});
  function drawSurface() {
    if (!surfaceContext) return;
    const ctx = surfaceContext, half = patchSize / 2;
    ctx.clearRect(0, 0, patchSize, patchSize);
    surfaceCanvas.hidden = !motionEnabled() || field.strength < .001;
    if (surfaceCanvas.hidden) return;
    surfaceCanvas.style.transform = `translate3d(${field.x-half}px,${field.y-half}px,0)`;
    const glow = ctx.createRadialGradient(half,half,0,half,half,RADIUS);
    glow.addColorStop(0, `rgba(${color},${.035*field.strength})`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow; ctx.fillRect(0,0,patchSize,patchSize);
    const stroke = ctx.createRadialGradient(half,half,0,half,half,RADIUS);
    stroke.addColorStop(0, `rgba(${color},${.22*field.strength})`);
    stroke.addColorStop(.65, `rgba(${color},${.065*field.strength})`);
    stroke.addColorStop(1, `rgba(${color},0)`);
    ctx.strokeStyle = stroke; ctx.lineWidth = 1;
    for (const vertical of [true,false]) {
      const origin = (vertical ? field.x : field.y)-half;
      const start = Math.floor(origin/48)*48;
      for (let fixed=start; fixed<=origin+patchSize; fixed+=48) {
        ctx.beginPath();
        for (let along=0; along<=patchSize; along+=8) {
          const point=warpPoint(vertical?fixed:field.x-half+along, vertical?field.y-half+along:fixed,field);
          const x=point.x-field.x+half, y=point.y-field.y+half;
          if (!along) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
    }
  }
  let color = '', previousTime = 0;
  const field = { x: 0, y: 0, strength: 0, pullX: 0, pullY: 0 };
  if (context) root.dataset.gridCanvas = 'true';
  let width = window.innerWidth, height = window.innerHeight, frame = 0;
  let current = { x: width / 2, y: height / 2 }, target = { ...current };
  const motionEnabled = () => !reducedMotion.matches && finePointer.matches;
  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    themeButton.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#071225' : '#eef5fd';
    color = getComputedStyle(root).getPropertyValue('--ambient-rgb').trim();
    drawGrid(); drawSurface();
  }
  themeButton.addEventListener('click', () => {
    themeChoice = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('conan-casebook:theme', themeChoice); } catch { /* Session preference. */ }
    applyTheme(themeChoice);
  });
  systemTheme.addEventListener('change', () => { if (!themeChoice) applyTheme(systemTheme.matches ? 'light' : 'dark'); });
  function applyMotionPreference() {
    if (!motionEnabled()) resetMotion();
  }
  reducedMotion.addEventListener('change', applyMotionPreference);
  finePointer.addEventListener('change', applyMotionPreference);
  function drawGrid() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    for (const vertical of [true, false]) {
      const limit = vertical ? width : height, length = vertical ? height : width;
      for (let fixed = 0; fixed <= limit; fixed += 48) {
        const alpha = fixed % 192 === 0 ? .075 : .045;
        const stroke = context.createRadialGradient(field.x, field.y, 0, field.x, field.y, RADIUS);
        stroke.addColorStop(0, `rgba(${color},${alpha + .16 * field.strength})`);
        stroke.addColorStop(1, `rgba(${color},${alpha})`);
        context.strokeStyle = stroke; context.lineWidth = 1;
        context.beginPath();
        for (let along = 0; along <= length + 12; along += 12) {
          const point = warpPoint(vertical ? fixed : along, vertical ? along : fixed, field);
          if (along === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        }
        context.stroke();
      }
    }
  }
  function resetMotion() {
    cancelAnimationFrame(frame); frame = 0; previousTime = 0;
    root.dataset.pointerActive = 'false';
    current = { x: width / 2, y: height / 2 }; target = { ...current };
    field.strength = 0; field.pullX = 0; field.pullY = 0;
    selectSurface(null);
    drawSurface();
    ['--pointer-x', '--pointer-y'].forEach(key => root.style.removeProperty(key));
    drawGrid();
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    surfaceCanvas.width = Math.round(patchSize*dpr); surfaceCanvas.height = Math.round(patchSize*dpr);
    surfaceCanvas.style.width = `${patchSize}px`; surfaceCanvas.style.height = `${patchSize}px`;
    surfaceContext?.setTransform(dpr,0,0,dpr,0,0);
    resetMotion();
  }
  function tick(time) {
    frame = 0;
    if (!motionEnabled() || document.hidden) return;
    // Time-based easing gives the same viscous response at different refresh rates.
    const elapsed = previousTime ? Math.min(40, time - previousTime) : 16.67;
    previousTime = time;
    const ease = 1 - Math.exp(-elapsed / 125);
    const active = root.dataset.pointerActive === 'true';
    const desiredStrength = active ? 1 : 0;
    current.x += (target.x - current.x) * ease; current.y += (target.y - current.y) * ease;
    field.x = current.x; field.y = current.y;
    field.strength += (desiredStrength - field.strength) * ease;
    const pullX = active ? Math.max(-9, Math.min(9, (target.x - current.x) * .18)) : 0;
    const pullY = active ? Math.max(-9, Math.min(9, (target.y - current.y) * .18)) : 0;
    field.pullX += (pullX - field.pullX) * ease;
    field.pullY += (pullY - field.pullY) * ease;
    const settled = Math.hypot(target.x - current.x, target.y - current.y) < .1 &&
      Math.abs(desiredStrength - field.strength) < .001 && Math.hypot(field.pullX, field.pullY) < .01;
    if (settled) {
      current = { ...target }; field.x = current.x; field.y = current.y;
      field.strength = desiredStrength; field.pullX = 0; field.pullY = 0;
    }
    root.style.setProperty('--pointer-x', `${current.x}px`); root.style.setProperty('--pointer-y', `${current.y}px`);
    drawGrid(); drawSurface();
    if (!settled) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }
  window.addEventListener('pointermove', event => {
    if (!motionEnabled() || event.pointerType === 'touch') return;
    selectSurface(event.target, Boolean(event.buttons));
    target = { x: event.clientX, y: event.clientY };
    if (root.dataset.pointerActive !== 'true') current = { ...target };
    root.dataset.pointerActive = 'true';
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
  function returnToRest() {
    selectSurface(null);
    root.dataset.pointerActive = 'false';
    // Relax the local patch in place rather than sweeping it across the page.
    target = { ...current };
    if (motionEnabled() && !frame) frame = requestAnimationFrame(tick);
  }
  root.addEventListener('pointerleave', returnToRest);
  window.addEventListener('pointerdown', () => selectSurface(null), {passive:true});
  window.addEventListener('scroll', returnToRest, {passive:true, capture:true});
  window.addEventListener('hashchange', returnToRest);
  window.addEventListener('blur', returnToRest);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetMotion(); });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('storage', event => {
    if (event.key === 'conan-casebook:theme') {
      themeChoice = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
      applyTheme(themeChoice ?? (systemTheme.matches ? 'light' : 'dark'));
    }
  });
  applyTheme(root.dataset.theme); resize();
})();
