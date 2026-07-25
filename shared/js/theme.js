/**
 * RouteBack, light / dark theme toggle.
 * Defaults to the visitor's OS preference; an explicit choice is remembered locally.
 * Uses event delegation so it keeps working after header/footer are injected later.
 */
(function () {
  function currentIsDark() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function syncToggles() {
    const isDark = currentIsDark();
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isDark));
      const label = btn.querySelector('[data-theme-label]');
      if (label) label.textContent = isDark ? '☀' : '☾';
    });
  }

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

