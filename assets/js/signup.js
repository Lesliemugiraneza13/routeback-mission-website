/**
 * RouteBack, Create Profile page logic.
 */
(function () {
  let stopCombo = null;
  function L() { return rbCurrentLang(); }

  function localizeStaticOptions() {
    document.querySelectorAll('#su-pass option').forEach((opt) => {
      opt.textContent = L() === 'fr' ? opt.getAttribute('data-fr') : opt.getAttribute('data-en');
    });
  }

  function populateSelects(prefillArea) {
    const areaSel = document.getElementById('su-area');
    rbFillLocalitySelect(areaSel, 'Choose a starting area', 'Choisissez une zone de départ');
    if (prefillArea) areaSel.value = prefillArea;
    if (!stopCombo) {
      const root = '';
      stopCombo = rbReplaceSelectWithStopCombobox('su-stop', {
        areaFieldId: 'su-area',
        missingStopLink: (q) => `${root}contact.html?category=missing-stop&stopName=${encodeURIComponent(q)}`,
        onSelect: (entry) => { if (entry && entry.localityId) areaSel.value = entry.localityId; },
      });
    } else {
      stopCombo.refreshLanguage();
    }
    localizeStaticOptions();
  }

  function validate() {
    const first = document.getElementById('su-first');
    const last = document.getElementById('su-last');
    const email = document.getElementById('su-email');
    const phone = document.getElementById('su-phone');
    const institution = document.getElementById('su-institution');
    const campus = document.getElementById('su-campus');
    const area = document.getElementById('su-area');
    const pwd = document.getElementById('su-password');
    const pwdConfirm = document.getElementById('su-password-confirm');
    const ack = document.getElementById('su-ack');

    const errors = rbApplyFieldChecks([
      [first, rbValidName(first.value), 'su-first', 'Enter a first name using only letters, 2-30 characters.', 'Saisissez un prénom composé uniquement de lettres, 2 à 30 caractères.'],
      [last, rbValidName(last.value), 'su-last', 'Enter a last name using only letters, 2-30 characters.', 'Saisissez un nom composé uniquement de lettres, 2 à 30 caractères.'],
      [email, rbValidEmail(email.value), 'su-email', 'Enter a valid email address.', 'Saisissez une adresse e-mail valide.'],
      [phone, rbValidMauritiusPhone(phone.value), 'su-phone', 'Enter a valid Mauritius phone number or leave blank.', 'Saisissez un numéro mauricien valide ou laissez vide.'],
      [institution, institution.value.trim() !== '', 'su-institution', 'Enter your institution.', 'Saisissez votre établissement.'],
      [campus, campus.value.trim() !== '', 'su-campus', 'Enter your campus.', 'Saisissez votre campus.'],
      [area, area.value !== '', 'su-area', 'Choose a starting area.', 'Choisissez une zone de départ.'],
      [pwd, rbValidPassword(pwd.value), 'su-password', 'Use 8-64 characters with an uppercase letter, a lowercase letter, a number and a special character.', 'Utilisez 8 à 64 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.'],
      [pwdConfirm, pwdConfirm.value === pwd.value && pwdConfirm.value.length > 0, 'su-password-confirm', 'Passwords must match.', 'Les mots de passe doivent correspondre.'],
    ]);

    const ackOk = ack.checked;
    document.getElementById('ack-error').style.display = ackOk ? 'none' : 'flex';
    if (!ackOk) errors.push({ id: 'su-ack', msgEn: 'Confirm you understand before continuing.', msgFr: 'Confirmez que vous avez compris avant de continuer.' });

    return rbShowErrorSummary(errors, 'error-summary', 'error-summary-list');
  }

  function updatePasswordChecklist() {
    const value = document.getElementById('su-password').value;
    const results = rbPasswordChecklist(value);
    const map = { length: 'pw-check-length', upper: 'pw-check-upper', lower: 'pw-check-lower', number: 'pw-check-number', special: 'pw-check-special' };
    Object.entries(map).forEach(([key, id]) => {
      const li = document.getElementById(id);
      const icon = li.querySelector('.pw-check-icon');
      const ok = results[key];
      li.classList.toggle('pw-ok', ok);
      icon.textContent = ok ? '✓' : '○';
    });
  }

  let duplicateBlocked = false;

  function preservePendingParam(link) {
    if (!link) return;
    const pending = new URLSearchParams(window.location.search).get('pending');
    if (pending) link.href = `${link.getAttribute('href')}?pending=${encodeURIComponent(pending)}`;
  }

  function setupDuplicateProfileGuard() {
    if (!RBStorage.getProfile()) return;
    duplicateBlocked = true;
    document.getElementById('duplicate-profile-notice').style.display = 'flex';
    const submitBtn = document.getElementById('signup-submit-btn');
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-disabled', 'true');

    preservePendingParam(document.getElementById('duplicate-open-existing-link'));
    preservePendingParam(document.getElementById('signup-footer-open-existing-link'));

    document.getElementById('duplicate-replace-btn').addEventListener('click', () => {
      rbOpenModal('replace-profile-confirm-modal');
    });
    document.getElementById('replace-profile-confirm-no').addEventListener('click', () => {
      rbCloseModal('replace-profile-confirm-modal');
    });
    document.getElementById('replace-profile-confirm-yes').addEventListener('click', () => {
      duplicateBlocked = false;
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-disabled');
      document.getElementById('duplicate-profile-notice').style.display = 'none';
      rbCloseModal('replace-profile-confirm-modal');
      rbToast(L() === 'fr' ? 'Vous pouvez maintenant créer le nouveau profil.' : 'You can now create the new profile.');
    }, { once: true });
  }

  function init() {
    populateSelects();
    setupDuplicateProfileGuard();
    document.getElementById('su-password').addEventListener('input', updatePasswordChecklist);
    updatePasswordChecklist();
    document.getElementById('signup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (duplicateBlocked) return;
      if (!validate()) return;

      const profile = {
        firstName: document.getElementById('su-first').value.trim(),
        lastName: document.getElementById('su-last').value.trim(),
        email: document.getElementById('su-email').value.trim(),
        phone: document.getElementById('su-phone').value.trim(),
        institution: document.getElementById('su-institution').value.trim(),
        campus: document.getElementById('su-campus').value.trim(),
        startingArea: document.getElementById('su-area').value,
        startingStop: document.getElementById('su-stop').value,
        busPass: document.getElementById('su-pass').value,
        createdAt: new Date().toISOString(),
      };

      // Prototype password fields are discarded immediately, never read again from here on.
      document.getElementById('su-password').value = '';
      document.getElementById('su-password-confirm').value = '';

      RBStorage.saveProfile(profile);
      const keepOpen = document.getElementById('su-keep-open').checked;
      RBStorage.setSession({ firstName: profile.firstName, openedAt: new Date().toISOString() }, keepOpen);

      const lang = L();
      const msgEl = document.getElementById('success-message');
      msgEl.innerHTML = lang === 'fr'
        ? `Profil créé. Bienvenue, ${profile.firstName}.`
        : `Profile created. Welcome, ${profile.firstName}.`;
      msgEl.style.display = 'flex';

      const root = '';
      setTimeout(() => rbRedirectAfterProfile(root), 900);
    });
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'signup') return;
    init();
  }, { once: true });
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'signup') return;
    localizeStaticOptions();
    if (stopCombo) stopCombo.refreshLanguage();
  });
})();

