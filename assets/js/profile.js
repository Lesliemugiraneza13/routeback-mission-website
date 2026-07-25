/**
 * RouteBack, My Profile page logic (page-specific; shared helpers come from shared/js).
 */
(function () {
  let stopCombo = null;
  function L() { return rbCurrentLang(); }

  function localeDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString(L() === 'fr' ? 'fr-FR' : 'en-GB');
  }

  function localizeStaticOptions(root) {
    root.querySelectorAll('option[data-en]').forEach((opt) => {
      opt.textContent = L() === 'fr' ? opt.getAttribute('data-fr') : opt.getAttribute('data-en');
    });
  }

  function renderProfile() {
    const profile = RBStorage.getProfile();
    const session = RBStorage.getSession();
    const notice = document.getElementById('no-session-notice');
    const view = document.getElementById('profile-view');

    if (!profile || !session) {
      notice.style.display = 'flex';
      view.style.display = 'none';
      return false;
    }
    notice.style.display = 'none';
    view.style.display = 'block';

    const lang = L();
    document.getElementById('profile-name-heading').textContent = `${profile.firstName} ${profile.lastName}`;

    const aboutRows = [
      [lang === 'fr' ? 'Nom complet' : 'Full name', `${profile.firstName} ${profile.lastName}`],
      [lang === 'fr' ? 'E-mail' : 'Email', profile.email],
      [lang === 'fr' ? 'Téléphone' : 'Phone', profile.phone || (lang === 'fr' ? 'Non renseigné' : 'Not provided')],
      [lang === 'fr' ? 'Établissement' : 'Institution', profile.institution],
      [lang === 'fr' ? 'Campus' : 'Campus', profile.campus],
    ];
    document.getElementById('profile-about-list').innerHTML = aboutRows.map(([k, v]) => `<div><dt style="font-weight:600;display:inline;">${k}:</dt> <dd style="display:inline;margin:0;">${v}</dd></div>`).join('');

    const stopName = profile.startingStop ? (rbStopById(profile.startingStop) || {}).name : null;
    const travelRows = [
      [lang === 'fr' ? 'Zone préférée' : 'Preferred area', rbLocalityById(profile.startingArea) ? rbLocalityById(profile.startingArea).name : '-'],
      [lang === 'fr' ? 'Arrêt préféré' : 'Preferred stop', stopName || (lang === 'fr' ? 'Non précisé' : 'Not specified')],
      [lang === 'fr' ? 'Statut de carte de bus' : 'Bus-pass status', profile.busPass === 'yes' ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No')],
    ];
    document.getElementById('profile-travel-list').innerHTML = travelRows.map(([k, v]) => `<div><dt style="font-weight:600;display:inline;">${k}:</dt> <dd style="display:inline;margin:0;">${v}</dd></div>`).join('');

    document.getElementById('saved-count').textContent = RBStorage.getSavedRoutes().length;
    document.getElementById('recent-count').textContent = RBStorage.readSession('routebackRecentSearches', []).length;
    document.getElementById('profile-dates').textContent = `${localeDate(profile.createdAt)} / ${localeDate(profile.updatedAt || profile.createdAt)}`;

    return true;
  }

  function populateEditForm() {
    const profile = RBStorage.getProfile();
    if (!profile) return;
    document.getElementById('ep-first').value = profile.firstName;
    document.getElementById('ep-last').value = profile.lastName;
    document.getElementById('ep-email').value = profile.email;
    document.getElementById('ep-phone').value = profile.phone || '';
    document.getElementById('ep-institution').value = profile.institution;
    document.getElementById('ep-campus').value = profile.campus;

    const areaSel = document.getElementById('ep-area');
    rbFillLocalitySelect(areaSel, 'Choose a starting area', 'Choisissez une zone de départ');
    areaSel.value = profile.startingArea;
    if (!stopCombo) {
      const root = '';
      stopCombo = rbReplaceSelectWithStopCombobox('ep-stop', {
        areaFieldId: 'ep-area',
        missingStopLink: (q) => `${root}contact.html?category=missing-stop&stopName=${encodeURIComponent(q)}`,
        onSelect: (entry) => { if (entry && entry.localityId) areaSel.value = entry.localityId; },
      });
    } else {
      stopCombo.refreshLanguage();
    }
    if (profile.startingStop) stopCombo.setById(profile.startingStop);

    const passSel = document.getElementById('ep-pass');
    rbFillBusPassSelect(passSel);
    passSel.value = profile.busPass || 'no';
  }

  function validateEdit() {
    const first = document.getElementById('ep-first');
    const last = document.getElementById('ep-last');
    const email = document.getElementById('ep-email');
    const phone = document.getElementById('ep-phone');
    const institution = document.getElementById('ep-institution');
    const campus = document.getElementById('ep-campus');
    const area = document.getElementById('ep-area');

    const errors = rbApplyFieldChecks([
      [first, rbValidName(first.value), 'ep-first', 'Enter a first name using only letters, 2-30 characters.', 'Saisissez un prénom composé uniquement de lettres, 2 à 30 caractères.'],
      [last, rbValidName(last.value), 'ep-last', 'Enter a last name using only letters, 2-30 characters.', 'Saisissez un nom composé uniquement de lettres, 2 à 30 caractères.'],
      [email, rbValidEmail(email.value), 'ep-email', 'Enter a valid email address.', 'Saisissez une adresse e-mail valide.'],
      [phone, rbValidMauritiusPhone(phone.value), 'ep-phone', 'Enter a valid Mauritius phone number or leave blank.', 'Saisissez un numéro mauricien valide ou laissez vide.'],
      [institution, institution.value.trim() !== '', 'ep-institution', 'Enter your institution.', 'Saisissez votre établissement.'],
      [campus, campus.value.trim() !== '', 'ep-campus', 'Enter your campus.', 'Saisissez votre campus.'],
      [area, area.value !== '', 'ep-area', 'Choose a starting area.', 'Choisissez une zone de départ.'],
    ]);
    return rbShowErrorSummary(errors, 'edit-error-summary', 'edit-error-summary-list');
  }

  function toggleEditForm(show) {
    document.getElementById('edit-profile-form').hidden = !show;
    if (show) populateEditForm();
  }

  function initEditFlow() {
    document.getElementById('edit-profile-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleEditForm(true);
    });
    document.getElementById('edit-profile-cancel').addEventListener('click', () => toggleEditForm(false));

    document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateEdit()) return;
      const profile = RBStorage.getProfile();
      const updated = {
        ...profile,
        firstName: document.getElementById('ep-first').value.trim(),
        lastName: document.getElementById('ep-last').value.trim(),
        email: document.getElementById('ep-email').value.trim(),
        phone: document.getElementById('ep-phone').value.trim(),
        institution: document.getElementById('ep-institution').value.trim(),
        campus: document.getElementById('ep-campus').value.trim(),
        startingArea: document.getElementById('ep-area').value,
        startingStop: document.getElementById('ep-stop').value,
        busPass: document.getElementById('ep-pass').value,
        updatedAt: new Date().toISOString(),
      };
      RBStorage.saveProfile(updated);
      const session = RBStorage.getSession();
      if (session) RBStorage.setSession({ ...session, firstName: updated.firstName });
      toggleEditForm(false);
      renderProfile();
      const msg = document.getElementById('profile-success-message');
      msg.textContent = L() === 'fr' ? 'Profil mis à jour.' : 'Profile updated.';
      msg.style.display = 'flex';
      rbToast(L() === 'fr' ? 'Profil mis à jour' : 'Profile updated');
    });
  }

  function initLogout() {
    document.getElementById('logout-btn').addEventListener('click', () => {
      RBStorage.logout();
      const root = '';
      rbToast(L() === 'fr' ? 'Déconnecté. Votre profil reste sur cet appareil.' : 'Logged out. Your profile stays on this device.');
      window.location.href = `${root}index.html`;
    });
  }

  function initDelete() {
    document.getElementById('delete-profile-btn').addEventListener('click', () => rbOpenModal('delete-profile-modal'));
    document.getElementById('delete-profile-cancel').addEventListener('click', () => rbCloseModal('delete-profile-modal'));
    document.getElementById('delete-profile-confirm').addEventListener('click', () => {
      RBStorage.clearProfile();
      rbCloseModal('delete-profile-modal');
      const root = '';
      rbToast(L() === 'fr' ? 'Profil local supprimé' : 'Local profile deleted');
      window.location.href = `${root}index.html`;
    });
  }

  function initClearRecent() {
    document.getElementById('clear-recent-btn').addEventListener('click', () => {
      RBStorage.removeSession('routebackRecentSearches');
      renderProfile();
      rbToast(L() === 'fr' ? 'Recherches récentes effacées' : 'Recent searches cleared');
    });
  }

  function init() {
    const hasSession = renderProfile();
    if (!hasSession) return;
    initEditFlow();
    initLogout();
    initDelete();
    initClearRecent();
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'profile') return;
    init();
  }, { once: true });
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'profile') return;
    renderProfile();
    localizeStaticOptions(document);
    if (stopCombo) stopCombo.refreshLanguage();
  });
})();

