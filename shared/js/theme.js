/**
 * RouteBack, light / dark theme toggle.
 * Defaults to the visitor's OS preference; an explicit choice is remembered locally.
 * Uses event delegation so it keeps working after header/footer are injected later.
 */
(function () {
  // Purpose: Checks the current theme state so the page can decide whether to use dark or light mode.
  function currentIsDark() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Purpose: Keeps the visible theme toggle button in sync with the active theme.
  function syncToggles() {
    const isDark = currentIsDark();
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isDark));
      const label = btn.querySelector('[data-theme-label]');
      if (label) label.textContent = isDark ? '☀' : '☾';
    });
  }

  // Purpose: Applies the chosen theme to the document and updates the toggle state.
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    syncToggles();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = currentIsDark() ? 'light' : 'dark';
    RBStorage.writeLocal(RBStorage.KEYS.theme, next);
    applyTheme(next);
  });

  document.addEventListener('rb:partialsready', syncToggles);

  applyTheme(RBStorage.readLocal(RBStorage.KEYS.theme, null));
})();

