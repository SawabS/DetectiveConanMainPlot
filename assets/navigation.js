(() => {
  'use strict';
  const container = document.querySelector('.topbar > nav');
  if (!container) return;
  const tapeMedia = matchMedia('(max-width: 800px)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const originals = [...container.querySelectorAll(':scope > a')];
  // On phones the links form an endless tape: two copies on each side let the strip wrap around invisibly.
  const copies = () => originals.map(link => {
    const clone = link.cloneNode(true);
    clone.classList.add('nav-clone'); clone.setAttribute('aria-hidden', 'true'); clone.tabIndex = -1;
    clone.addEventListener('click', event => { event.preventDefault(); link.click(); });
    return clone;
  });
  container.prepend(...copies(), ...copies()); container.append(...copies(), ...copies());
  container.classList.add('glass-navigation');
  const pill = document.createElement('span');
  pill.className = 'nav-glass-pill'; pill.setAttribute('aria-hidden', 'true');
  container.prepend(pill);
  const items = [...container.querySelectorAll(':scope > a')];
  let hovering = null, steering = false, idle = 0;
  const isTape = () => container.classList.contains('is-tape');
  const visible = item => item.getClientRects().length > 0;
  const middle = item => item.offsetLeft + item.offsetWidth / 2;
  // Width of one full set of links, gap included.
  const period = () => originals[0].offsetLeft - items[originals.length].offsetLeft;
  // The active copy nearest the middle of the strip is the one the reader sees.
  function selected() {
    const view = container.scrollLeft + container.clientWidth / 2;
    return items.filter(item => visible(item) && item.classList.contains('nav-active')).sort((a, b) => Math.abs(middle(a) - view) - Math.abs(middle(b) - view))[0];
  }
  function position(instant = false) {
    const item = hovering || selected();
    pill.hidden = !item || !visible(item);
    if (pill.hidden) return;
    if (instant) pill.style.transition = 'none';
    pill.style.width = `${item.offsetWidth}px`; pill.style.height = `${item.offsetHeight}px`;
    pill.style.transform = `translate3d(${item.offsetLeft}px,${item.offsetTop}px,0)`;
    if (instant) { void pill.offsetWidth; pill.style.removeProperty('transition'); }
  }
  // Keep the view over the middle set; moving by exactly one set shows identical content.
  function wrap() {
    const span = period();
    if (!isTape() || !span) return;
    if (container.scrollLeft < span * 1.5) container.scrollLeft += span;
    else if (container.scrollLeft > span * 2.5) container.scrollLeft -= span;
    else return;
    position(true);
  }
  function settleLater() { clearTimeout(idle); idle = setTimeout(() => { steering = false; wrap(); }, 140); }
  function centre(item) {
    if (!isTape() || !item) return;
    const span = period();
    let left = middle(item) - container.clientWidth / 2;
    // Aim at the copy nearest the middle set, shifting the view with it so the motion looks the same.
    if (left < span * 1.5) { left += span; container.scrollLeft += span; }
    else if (left > span * 2.5) { left -= span; container.scrollLeft -= span; }
    position(true);
    steering = true; settleLater();
    container.scrollTo({ left, behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  function layout() {
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
    const content = originals.reduce((sum, link) => sum + link.offsetWidth, 0) + gap * (originals.length - 1);
    const tape = tapeMedia.matches && content > container.clientWidth + 1;
    if (tape !== isTape()) {
      container.classList.toggle('is-tape', tape);
      if (tape) { container.scrollLeft = middle(originals.find(link => link.classList.contains('nav-active')) || originals[0]) - container.clientWidth / 2; }
    }
    position(true);
  }
  container.addEventListener('scroll', () => {
    if (!isTape()) return;
    const span = period(), max = container.scrollWidth - container.clientWidth;
    // Near a hard edge, wrap at once; otherwise wait until the swipe settles so momentum is not interrupted.
    if (!steering && (container.scrollLeft < span * .5 || container.scrollLeft > max - span * .5)) wrap();
    settleLater();
  }, { passive: true });
  for (const item of items) {
    item.addEventListener('pointerenter', () => { hovering = item; position(); });
    item.addEventListener('focus', () => { hovering = item; position(); });
    item.addEventListener('blur', () => { hovering = null; position(); });
  }
  container.addEventListener('pointerleave', () => { hovering = null; position(); });
  new MutationObserver(() => { position(); centre(selected()); }).observe(container, { subtree: true, attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(layout).observe(container);
  window.addEventListener('resize', layout, { passive: true });
  window.addEventListener('conan:language', layout);
  document.fonts?.ready.then(layout);
  layout();
})();
