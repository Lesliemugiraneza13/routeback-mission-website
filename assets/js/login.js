/**
 * RouteBack, Open Profile page logic.
 */
(function () {
  function L() { return rbCurrentLang(); }

  function appendPendingParam(root) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pending') !== '1') return;
    ['no-profile-cta', 'create-instead-link'].forEach((id) => {
      const link = document.getElementById(id);
      if (link) link.href = `${root}signup.html?pending=1`;
    });
  }

  function checkProfileExists() {
    const profile = RBStorage.getProfile();
    const notice = document.getElementById('no-profile-notice');
    const form = document.getElementById('login-form');
    if (!profile) {
      notice.style.display = 'flex';
      form.style.display = 'none';
    } else {
      notice.style.display = 'none';
      form.style.display = 'block';
    }
    return profile;
  }

  function showMismatch() {
    const notice = document.getElementById('no-profile-notice');
    const lang = L();
    notice.querySelector('span[lang="en"]').textContent = 'No local profile on this device matches that email.';
    notice.querySelector('span[lang="fr"]').textContent = 'Aucun profil local sur cet appareil ne correspond à cet e-mail.';
    notice.style.display = 'flex';
  }

  function init() {
    const root = '';
    appendPendingParam(root);
    checkProfileExists();

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('li-email');
      const email = emailInput.value.trim();
      const lang = L();

      const checks = [[emailInput, rbValidEmail(email), 'li-email', 'Enter a valid email address.', 'Saisissez un e-mail valide.']];
      if (!rbShowErrorSummary(rbApplyFieldChecks(checks), 'error-summary', 'error-summary-list')) return;

      const profile = RBStorage.getProfile();
      // Prototype password is a frontend-only demo field, discard immediately, never compare.
      document.getElementById('li-password').value = '';

      if (!profile || profile.email.toLowerCase() !== email.toLowerCase()) {
        showMismatch();
        return;
      }

      const keepOpen = document.getElementById('li-keep-open').checked;
      RBStorage.setSession({ firstName: profile.firstName, openedAt: new Date().toISOString() }, keepOpen);
      const msgEl = document.getElementById('success-message');
      msgEl.innerHTML = lang === 'fr'
        ? `Profil local ouvert. Bon retour, ${profile.firstName}.`
        : `Local profile opened. Welcome back, ${profile.firstName}.`;
      msgEl.style.display = 'flex';

      setTimeout(() => rbRedirectAfterProfile(root), 900);
    });
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'login') return;
    init();
  }, { once: true });
})();

