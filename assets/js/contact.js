/**
 * RouteBack, Assistance page: reason dropdown, structured conditional fields,
 * validation, review preview, copy / JSON download / local save / clear.
 */
(function () {
  function L() { return rbCurrentLang(); }

  const DIRECTION_OPTIONS = [
    { id: 'toward-saint-antoine', en: 'Towards Saint Antoine', fr: 'Vers Saint Antoine' },
    { id: 'toward-pamplemousses', en: 'Towards Pamplemousses', fr: 'Vers Pamplemousses' },
  ];

  function renderCategorySelect(selected) {
    const select = document.getElementById('category-select');
    const lang = L();
    select.innerHTML = `<option value="" disabled ${selected ? '' : 'selected'}>${lang === 'fr' ? 'Choisissez un motif' : 'Choose a reason'}</option>` +
      RB_ASSISTANCE_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${lang === 'fr' ? c.fr : c.en}</option>`).join('');
  }

  function showConditional(categoryId) {
    document.querySelectorAll('.conditional-block').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-cond') === categoryId);
    });
  }

  function fillRouteNumberSelect(select) {
    const lang = L();
    select.innerHTML = RB_ROUTE_CATALOGUE.map((r) => {
      const status = RB_ROUTE_STATUS_LABEL[r.status];
      return `<option value="${r.number}">${r.number}, ${lang === 'fr' ? status.fr : status.en}</option>`;
    }).join('');
  }

  function fillDirectionSelect(select) {
    const lang = L();
    select.innerHTML = DIRECTION_OPTIONS.map((d) => `<option value="${d.id}">${lang === 'fr' ? d.fr : d.en}</option>`).join('');
  }

  function fillProviderSelect(select) {
    const lang = L();
    select.innerHTML = RB_PROVIDERS.map((p) => `<option value="${p.name}">${p.name}</option>`).join('') +
      `<option value="other">${lang === 'fr' ? 'Autre / non listé' : 'Other / not listed'}</option>`;
  }

  function populateSupportingSelects() {
    rbFillLocalitySelect(document.getElementById('mr-from'), 'Choose an area', 'Choisissez une zone');
    rbFillLocalitySelect(document.getElementById('mr-to'), 'Choose a destination', 'Choisissez une destination');
    rbFillLocalitySelect(document.getElementById('ms-area'), 'Choose an area', 'Choisissez une zone');
    rbFillLocalitySelect(document.getElementById('wd-dest'), 'Choose a destination', 'Choisissez une destination');
    rbFillLocalitySelect(document.getElementById('fi-from'), 'Choose an area', 'Choisissez une zone');
    rbFillLocalitySelect(document.getElementById('fi-to'), 'Choose a destination', 'Choisissez une destination');
    fillRouteNumberSelect(document.getElementById('ir-route'));
    fillRouteNumberSelect(document.getElementById('wd-route'));
    fillRouteNumberSelect(document.getElementById('dt-route'));
    fillDirectionSelect(document.getElementById('ir-direction'));
    fillDirectionSelect(document.getElementById('dt-direction'));
    rbFillDayTypeSelect(document.getElementById('dt-day'));
    rbFillTimeSelect(document.getElementById('dt-time'), null, null);
    rbFillPassengerSelect(document.getElementById('fi-passenger'));
    rbFillBusPassSelect(document.getElementById('fi-buspass'));
    fillProviderSelect(document.getElementById('as-name'));
    document.querySelectorAll('#ir-operator option[data-en]').forEach((opt) => {
      opt.textContent = L() === 'fr' ? opt.getAttribute('data-fr') : opt.getAttribute('data-en');
    });
  }

  function selectedCategory() {
    return document.getElementById('category-select').value;
  }

  function collectFormData() {
    const cat = selectedCategory();
    const data = { category: cat, submittedAt: new Date().toISOString() };
    switch (cat) {
      case 'missing-route':
        data.from = document.getElementById('mr-from').value;
        data.to = document.getElementById('mr-to').value;
        break;
      case 'incorrect-route':
        data.route = document.getElementById('ir-route').value;
        data.operator = document.getElementById('ir-operator').value;
        data.direction = document.getElementById('ir-direction').value;
        break;
      case 'missing-stop':
        data.area = document.getElementById('ms-area').value;
        data.suggestedStopName = document.getElementById('ms-name').value.trim();
        data.nearbyLandmark = document.getElementById('ms-landmark').value.trim();
        break;
      case 'incorrect-destination':
        data.route = document.getElementById('wd-route').value;
        data.destination = document.getElementById('wd-dest').value;
        break;
      case 'timing-delay':
        data.route = document.getElementById('dt-route').value;
        data.direction = document.getElementById('dt-direction').value;
        data.day = document.getElementById('dt-day').value;
        data.time = document.getElementById('dt-time').value;
        break;
      case 'fare-info':
        data.from = document.getElementById('fi-from').value;
        data.to = document.getElementById('fi-to').value;
        data.passengerType = document.getElementById('fi-passenger').value;
        data.busPassStatus = document.getElementById('fi-buspass').value;
        break;
      case 'alt-service':
        data.providerName = document.getElementById('as-name').value;
        break;
      default:
        break;
    }
    data.explanation = document.getElementById('explain').value.trim();
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const reference = document.getElementById('contact-reference').value.trim();
    if (name) data.contactName = name;
    if (email) data.contactEmail = email;
    if (phone) data.contactPhone = phone;
    if (reference) data.referenceCode = reference;
    return data;
  }

  const DIRECTION_LABEL_BY_ID = Object.fromEntries(DIRECTION_OPTIONS.map((d) => [d.id, d]));

  function localityName(id) { const l = rbLocalityById(id); return l ? l.name : id; }
  function dayTypeLabel(id, lang) { const d = RB_DAY_TYPES.find((x) => x.id === id); return d ? (lang === 'fr' ? d.fr : d.en) : id; }
  function passengerLabel(id, lang) { const d = RB_PASSENGER_TYPES.find((x) => x.id === id); return d ? (lang === 'fr' ? d.fr : d.en) : id; }
  function busPassLabel(id, lang) { const d = RB_BUS_PASS_STATUS.find((x) => x.id === id); return d ? (lang === 'fr' ? d.fr : d.en) : id; }
  function directionLabel(id, lang) { const d = DIRECTION_LABEL_BY_ID[id]; return d ? (lang === 'fr' ? d.fr : d.en) : id; }

  /** Turn the collected form data into plain-language rows, never raw field names or JSON. */
  function buildReviewRows(data, lang) {
    const rows = [];
    const catLabel = rbAssistanceCategoryById(data.category);
    rows.push([lang === 'fr' ? 'Motif' : 'Reason', catLabel ? (lang === 'fr' ? catLabel.fr : catLabel.en) : data.category]);

    if (data.from) rows.push([lang === 'fr' ? 'Depuis' : 'From', localityName(data.from)]);
    if (data.to) rows.push([lang === 'fr' ? 'Vers' : 'To', localityName(data.to)]);
    if (data.route) rows.push([lang === 'fr' ? 'Numéro de ligne' : 'Route number', data.route]);
    if (data.operator) rows.push([lang === 'fr' ? 'Opérateur' : 'Operator', data.operator === 'other' ? (lang === 'fr' ? 'Autre / pas sûr' : 'Other / not sure') : data.operator]);
    if (data.direction) rows.push([lang === 'fr' ? 'Direction' : 'Direction', directionLabel(data.direction, lang)]);
    if (data.area) rows.push([lang === 'fr' ? 'Zone' : 'Area', localityName(data.area)]);
    if (data.suggestedStopName) rows.push([lang === 'fr' ? 'Nom d’arrêt suggéré' : 'Suggested stop name', data.suggestedStopName]);
    if (data.nearbyLandmark) rows.push([lang === 'fr' ? 'Repère proche' : 'Nearby landmark', data.nearbyLandmark]);
    if (data.destination) rows.push([lang === 'fr' ? 'Destination' : 'Destination', localityName(data.destination)]);
    if (data.day) rows.push([lang === 'fr' ? 'Jour de voyage' : 'Travel day', dayTypeLabel(data.day, lang)]);
    if (data.time) rows.push([lang === 'fr' ? 'Heure de voyage' : 'Travel time', data.time]);
    if (data.passengerType) rows.push([lang === 'fr' ? 'Type de passager' : 'Passenger type', passengerLabel(data.passengerType, lang)]);
    if (data.busPassStatus) rows.push([lang === 'fr' ? 'Statut de carte de bus' : 'Bus-pass status', busPassLabel(data.busPassStatus, lang)]);
    if (data.providerName) rows.push([lang === 'fr' ? 'Prestataire' : 'Provider', data.providerName === 'other' ? (lang === 'fr' ? 'Autre / non listé' : 'Other / not listed') : data.providerName]);
    if (data.explanation) rows.push([lang === 'fr' ? 'Détails' : 'Details', data.explanation]);
    if (data.contactName) rows.push([lang === 'fr' ? 'Nom' : 'Name', data.contactName]);
    if (data.contactEmail) rows.push([lang === 'fr' ? 'E-mail' : 'Email', data.contactEmail]);
    if (data.contactPhone) rows.push([lang === 'fr' ? 'Téléphone' : 'Phone', data.contactPhone]);
    if (data.referenceCode) rows.push([lang === 'fr' ? 'Code de référence' : 'Reference code', data.referenceCode]);
    return rows;
  }

  function updateReview() {
    const data = collectFormData();
    const lang = L();
    const rows = buildReviewRows(data, lang);
    const box = document.getElementById('review-box');
    box.innerHTML = rows.map(([label, value]) =>
      `<div class="review-row"><span class="review-label">${label}</span><span class="review-value">${value}</span></div>`
    ).join('') || `<p class="field-hint" style="margin:0;">${lang === 'fr' ? 'Choisissez un motif pour voir un résumé ici.' : 'Choose a reason to see a summary here.'}</p>`;
  }

  function validate() {
    const cat = selectedCategory();
    document.getElementById('category-error').style.display = cat ? 'none' : 'flex';

    const explain = document.getElementById('explain');
    const email = document.getElementById('contact-email');
    const phone = document.getElementById('contact-phone');
    const reference = document.getElementById('contact-reference');
    const errors = rbApplyFieldChecks([
      [explain, explain.value.trim().length >= 5, 'explain', 'Add a short explanation (at least a few words).', 'Ajoutez une brève explication (quelques mots au moins).'],
      [email, email.value.trim() === '' || rbValidEmail(email.value), 'contact-email', 'Enter a valid email address or leave it blank.', 'Saisissez une adresse e-mail valide ou laissez le champ vide.'],
      [phone, rbValidMauritiusPhone(phone.value), 'contact-phone', 'Enter a valid Mauritius phone number or leave it blank.', 'Saisissez un numéro mauricien valide ou laissez le champ vide.'],
      [reference, rbValidReferenceCode(reference.value), 'contact-reference', 'Use the format ABC-1234: three letters, a dash, four digits.', 'Utilisez le format ABC-1234 : trois lettres, un tiret, quatre chiffres.'],
    ]);
    if (!cat) errors.unshift({ id: 'category-select', msgEn: 'Choose what you would like to tell us.', msgFr: 'Choisissez ce que vous souhaitez nous signaler.' });

    return rbShowErrorSummary(errors, 'error-summary', 'error-summary-list');
  }

  function copyToClipboard() {
    if (!validate()) return;
    updateReview();
    const rows = buildReviewRows(collectFormData(), L());
    const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => rbToast(L() === 'fr' ? 'Copié dans le presse-papiers' : 'Copied to clipboard'),
        () => rbToast(L() === 'fr' ? 'Impossible de copier' : 'Could not copy')
      );
    }
  }

  function saveLocally(data) {
    const list = RBStorage.readLocal('routebackAssistanceSubmissions', []);
    list.unshift(data);
    RBStorage.writeLocal('routebackAssistanceSubmissions', list.slice(0, 25));
  }

  function clearForm() {
    document.getElementById('assistance-form').reset();
    document.getElementById('category-select').selectedIndex = 0;
    document.querySelectorAll('.conditional-block').forEach((el) => el.classList.remove('is-active'));
    document.querySelectorAll('.field.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    document.getElementById('error-summary').classList.remove('is-visible');
    document.getElementById('confirm-message').style.display = 'none';
    document.getElementById('review-box').textContent = '';
  }

  function prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const route = params.get('route');
    const from = params.get('from');
    const to = params.get('to');
    const stopName = params.get('stopName');
    if (category) {
      document.getElementById('category-select').value = category;
      showConditional(category);
    }
    if (route) {
      ['ir-route', 'wd-route', 'dt-route'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = route; });
    }
    if (stopName && category === 'missing-stop') {
      document.getElementById('ms-name').value = stopName;
      document.getElementById('explain').value = L() === 'fr'
        ? `Arrêt recherché mais introuvable : « ${stopName} ».`
        : `Searched for this stop but couldn't find it: "${stopName}".`;
    } else if (from || to) {
      const parts = [];
      if (route) parts.push(`Route ${route}`);
      if (from && to) parts.push(`${from} → ${to}`);
      document.getElementById('explain').value = parts.length ? `${parts.join(', ')}: ` : '';
    }
  }

  function init() {
    renderCategorySelect('');
    populateSupportingSelects();
    prefillFromQuery();
    updateReview();

    document.getElementById('category-select').addEventListener('change', (e) => {
      showConditional(e.target.value);
      updateReview();
    });

    document.getElementById('assistance-form').addEventListener('input', updateReview);
    document.getElementById('assistance-form').addEventListener('change', updateReview);

    document.getElementById('assistance-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      const data = collectFormData();
      updateReview();
      saveLocally(data);
      document.getElementById('confirm-message').style.display = 'flex';
      rbToast(L() === 'fr' ? 'Retour préparé' : 'Feedback prepared');
    });

    document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
    document.getElementById('clear-btn').addEventListener('click', clearForm);

    // Reference codes are three uppercase letters + a dash + four digits; uppercase as the
    // visitor types so what they see always matches what the pattern attribute expects.
    document.getElementById('contact-reference').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'contact') return;
    init();
  }, { once: true });
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'contact') return;
    const current = selectedCategory();
    renderCategorySelect(current);
    populateSupportingSelects();
    showConditional(current);
    updateReview();
  });
})();

