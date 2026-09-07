// Set the theme before styles load to avoid a bright or dark flash on reload.
(() => {
  let preference;
  try { preference = localStorage.getItem('conan-casebook:theme'); } catch { /* System theme remains available. */ }
  document.documentElement.dataset.theme = ['light', 'dark'].includes(preference)
    ? preference : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
})();
