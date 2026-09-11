(() => {
  'use strict';
  const containers = document.querySelectorAll('.topbar > nav');
  for (const container of containers) {
    container.classList.add('glass-navigation');
    const pill = document.createElement('span');
    pill.className = 'nav-glass-pill'; pill.setAttribute('aria-hidden','true');
    container.prepend(pill);
    const items = [...container.querySelectorAll(':scope > a, :scope > button')];
    let hovering = null;
    const selected = () => items.find(item => item.classList.contains('nav-active') || item.getAttribute('aria-selected') === 'true');
    function position() {
      const item = hovering || selected();
      pill.hidden = !item || !item.getClientRects().length;
      if (pill.hidden) return;
      pill.style.width = `${item.offsetWidth}px`; pill.style.height = `${item.offsetHeight}px`;
      pill.style.transform = `translate3d(${item.offsetLeft}px,${item.offsetTop}px,0)`;
    }
    for (const item of items) {
      item.addEventListener('pointerenter', () => { hovering=item; position(); });
      item.addEventListener('focus', () => { hovering=item; position(); });
      item.addEventListener('blur', () => { hovering=null; position(); });
    }
    container.addEventListener('pointerleave', () => { hovering=null; position(); });
    new MutationObserver(position).observe(container, {subtree:true,attributes:true,attributeFilter:['aria-selected','class']});
    if (window.ResizeObserver) new ResizeObserver(position).observe(container);
    window.addEventListener('resize',position,{passive:true});
    window.addEventListener('conan:language',position);
    document.fonts?.ready.then(position);
    position();
  }
})();
