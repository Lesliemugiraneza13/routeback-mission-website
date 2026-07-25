/**
 * RouteBack, English / French display toggle.
 * Bilingual copy lives in the markup as paired [lang="en"]/[lang="fr"] elements
 * (see base.css for the show/hide rule). This module flips the active
 * language, updates <html lang>, and notifies other scripts that build their
 * own text from data (planner dropdowns, results) via the "rb:langchange" event.
 * Uses event delegation so the header's FR/EN button works even though it is
 * injected later by partials.js.
 */
const RB_LANG_KEY = 'routebackLang';

function rbGetLang() {
  return RBStorage.readLocal(RB_LANG_KEY, 'en') || 'en';
}

function rbApplyLang(lang) {
  const isFr = lang === 'fr';
  document.body.classList.toggle('lang-fr', isFr);
  document.documentElement.setAttribute('lang', isFr ? 'fr' : 'en');
  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.textContent = isFr ? 'EN' : 'FR';
    btn.setAttribute('aria-label', isFr ? 'Switch to English' : 'Passer au français');
    btn.setAttribute('title', isFr ? 'Switch to English' : 'Passer au français');
  });
  document.dispatchEvent(new CustomEvent('rb:langchange', { detail: { lang: isFr ? 'fr' : 'en' } }));
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-lang-toggle]');
  if (!btn) return;
  const next = rbGetLang() === 'fr' ? 'en' : 'fr';
  RBStorage.writeLocal(RB_LANG_KEY, next);
  rbApplyLang(next);
});

rbApplyLang(rbGetLang());

