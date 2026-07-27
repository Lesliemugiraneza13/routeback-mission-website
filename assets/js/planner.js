// RouteBack — Plan Journey page: form + dropdowns, results, Route 95
// overview, Saved Routes, Recent Searches. Second IIFE below handles the
// separate "Northern Journey Guide" section.
(function () {
  let lastPlan = null; // last search result, so language changes can redraw it
  let startStopCombo = null;
  let destStopCombo = null;

  function lang() { return rbCurrentLang(); }

  // "Leave around" <-> "Arrive by" label above the time dropdown.
  function updateTimeLabel(modeSelect) {
    const label = document.getElementById('pl-time-label');
    const isArrive = modeSelect.value === 'arrive-by';
    label.innerHTML = isArrive
      ? '<span lang="en" data-i18n>Arrive by</span><span lang="fr" data-i18n>Arriver avant</span>'
      : '<span lang="en" data-i18n>Leave around</span><span lang="fr" data-i18n>Partir vers</span>';
  }

  // Fills every dropdown, wires up the stop comboboxes (once), and
  // applies a previous search if we were given one to restore.
  function populateForm(prefill) {
    const startSel = document.getElementById('pl-start');
    const destSel = document.getElementById('pl-dest');
    const daySel = document.getElementById('pl-day');
    const modeSel = document.getElementById('pl-mode');
    const timeSel = document.getElementById('pl-time');
    const passengerSel = document.getElementById('pl-passenger');
    const busPassSel = document.getElementById('pl-buspass');

    rbFillLocalitySelect(startSel, 'Choose a starting area', 'Choisissez une zone de départ');
    rbFillLocalitySelect(destSel, 'Choose a destination', 'Choisissez une destination');
    rbFillDayTypeSelect(daySel);
    rbFillJourneyModeSelect(modeSel);
    rbFillTimeSelect(timeSel, null, null);
    rbFillPassengerSelect(passengerSel);
    rbFillBusPassSelect(busPassSel);

    // Only build the comboboxes once — after that, just refresh their language.
    if (!startStopCombo) {
      startStopCombo = rbReplaceSelectWithStopCombobox('pl-start-stop', {
        areaFieldId: 'pl-start',
        missingStopLink: (q) => `contact.html?category=missing-stop&stopName=${encodeURIComponent(q)}`,
        onSelect: (entry) => { if (entry && entry.localityId) startSel.value = entry.localityId; },
      });
      destStopCombo = rbReplaceSelectWithStopCombobox('pl-dest-stop', {
        areaFieldId: 'pl-dest',
        missingStopLink: (q) => `contact.html?category=missing-stop&stopName=${encodeURIComponent(q)}`,
        onSelect: (entry) => { if (entry && entry.localityId) destSel.value = entry.localityId; },
      });
    } else {
      startStopCombo.refreshLanguage();
      destStopCombo.refreshLanguage();
    }

    if (prefill) {
      if (prefill.start) startSel.value = prefill.start;
      if (prefill.dest) destSel.value = prefill.dest;
      if (prefill.startStop) startStopCombo.setById(prefill.startStop);
      if (prefill.time) timeSel.value = prefill.time;
      if (prefill.mode) modeSel.value = prefill.mode;
    }

    updateTimeLabel(modeSel);
    modeSel.addEventListener('change', () => updateTimeLabel(modeSel));
    renderMissingRouteLink();
  }

  // "Open the form" link — only shows up if a real form URL is configured.
  function renderMissingRouteLink() {
    const el = document.getElementById('missing-route-form-link');
    if (!el) return;
    const url = (typeof routebackConfig !== 'undefined') ? routebackConfig.missingRouteFormUrl : '';
    el.innerHTML = url
      ? `<a class="btn btn-ghost btn-block" href="${url}" target="_blank" rel="noopener noreferrer">${lang() === 'fr' ? 'Ouvrir le formulaire' : 'Open the form'}</a>`
      : '';
  }

  function localityLabel(id) {
    const l = rbLocalityById(id);
    return l ? l.name : id;
  }

  function buildAssistanceLink(category, plan) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (plan) { params.set('route', '95'); params.set('from', plan.fromLocalityName); params.set('to', plan.toLocalityName); }
    return `contact.html?${params.toString()}`;
  }

  // --- small shared helpers (used to be repeated in several places) ---

  // A "student" fare only applies if they're a student AND have a bus pass.
  function effectivePassengerType(meta) {
    return (meta.passengerType === 'student' && meta.busPassStatus === 'yes') ? 'student' : 'regular';
  }

  // "Arrive by" and "Leave around" searches need different labels for the
  // same two numbers — this used to be four separate ternaries.
  function modeLabels(mode, L) {
    return mode === 'arrive-by'
      ? { waiting: L === 'fr' ? 'Marge d’arrivée' : 'Arrival buffer', boarding: L === 'fr' ? 'Soyez à votre arrêt avant' : 'Be at your stop by' }
      : { waiting: L === 'fr' ? 'Temps d’attente' : 'Waiting time', boarding: L === 'fr' ? 'Heure à votre arrêt' : 'Time at your stop' };
  }

  // Turns a list of connections into <li> items; shared by the result
  // card and the Route 95 overview below, instead of being written twice.
  function connectionsListHtml(connections) {
    const L = lang();
    return connections.map((c) => {
      const note = c.note ? `, <span class="tag tag-warning">${L === 'fr' ? c.note.fr : c.note.en}</span>` : '';
      return `<li><strong>${c.route}</strong> ${L === 'fr' ? 'vers' : 'towards'} ${c.towards}${note}</li>`;
    }).join('');
  }

  // Stop list with ALCHE tags — shared by the result card and Route 95 overview.
  function renderStopList(container, stops) {
    container.innerHTML = stops.map((s) => `<li>${s.name}${s.alche ? ' <span class="tag tag-brand" style="margin-left:6px;">ALCHE</span>' : ''}</li>`).join('')
      || `<li>${lang() === 'fr' ? 'Aucun arrêt intermédiaire recensé.' : 'No intermediate stop recorded.'}</li>`; //Saint-Andre to solitude
  }

  function renderConnections(container, connections) {
    if (!connections || connections.length === 0) {
      container.innerHTML = `<p class="field-hint">${lang() === 'fr' ? 'Aucune correspondance recensée pour cette destination pour le moment.' : 'No connecting route recorded for this destination yet.'}</p>`;
      return;
    }
    container.innerHTML = `<ul style="padding-left:1.1em;">${connectionsListHtml(connections)}</ul>`;
  }

  // Builds the whole result card from a computed plan.
  //plan contains route result: stops, fare, time delay, etc
  //meta contains information such as the passenger type.
  function renderResult(plan, meta) {
    const L = lang();
    const fare = rbFareDisplay(plan.fare, effectivePassengerType(meta), L);
    const section = document.getElementById('planner-results');
    const body = document.getElementById('result-card-body');
    const labels = modeLabels(plan.mode, L);
    const waitingMinutes = plan.mode === 'arrive-by' ? plan.arrivalBufferMinutes : plan.waitingMinutes;

    // ALCHE = a suggested drop-off point for this trip. Only shown when
    // the route data actually has one.
    const alcheBlock = plan.alche ? `
      <div class="notice notice-warning">
        <svg class="notice-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" stroke-width="1.8"/></svg>
        <span><strong>${L === 'fr' ? 'Repère ALCHE' : 'ALCHE guidance'}:</strong>
        ${L === 'fr' ? 'Dépose suggérée' : 'Suggested drop-off'}: <strong>${plan.alche.dropoff}</strong>, ${L === 'fr' ? plan.alche.destination.fr : plan.alche.destination.en}.
        ${L === 'fr' ? plan.alche.note.fr : plan.alche.note.en}</span>
      </div>` : '';

    body.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="card-eyebrow" style="margin-bottom:0;"><span class="tag tag-brand">Route ${plan.number}</span> ${plan.operator}</div>
        <span class="tag tag-info">${L === 'fr' ? plan.directionLabel.fr : plan.directionLabel.en}</span>
      </div>
      <h3 style="margin-top:var(--space-3);">${plan.from} → ${plan.to}</h3>
      <div class="result-meta-grid">
        <div class="result-meta-item"><div class="meta-label">${labels.waiting}</div><div class="meta-value">${waitingMinutes} min</div></div>
        <div class="result-meta-item"><div class="meta-label">${labels.boarding}</div><div class="meta-value">${plan.boardingAtStop}</div></div>
        <div class="result-meta-item"><div class="meta-label">${L === 'fr' ? 'Durée de base' : 'Base duration'}</div><div class="meta-value">${plan.baseDurationMinutes} min</div></div>
        <div class="result-meta-item"><div class="meta-label">${L === 'fr' ? 'Plage d’arrivée estimée' : 'Expected arrival range'}</div><div class="meta-value">${plan.arrivalRange.min}-${plan.arrivalRange.max}</div></div>
        <div class="result-meta-item"><div class="meta-label">${L === 'fr' ? 'Retard possible' : 'Possible delay'}</div><div class="meta-value">${L === 'fr' ? plan.delay.label.fr : plan.delay.label.en} (+${plan.delay.minMinutes}-${plan.delay.maxMinutes} min)</div></div>
      </div>
      <p class="field-hint">${L === 'fr' ? plan.delay.note.fr : plan.delay.note.en}</p>
      <div class="notice ${fare.status === 'success' ? 'notice-success' : 'notice-warning'}">
        <svg class="notice-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.8"/></svg>
        <span><strong>${fare.headline}</strong><br>${fare.note}${fare.checked ? `, ${L === 'fr' ? 'vérifié le' : 'checked'} ${fare.checked}` : ''}</span>
      </div>
      ${alcheBlock}
      <div class="grid-2">
        <div><h4>${L === 'fr' ? 'Arrêts sur ce trajet' : 'Stops on this trip'}</h4><ol class="stop-list" id="result-stop-list" style="list-style:none;padding-left:0;"></ol></div>
        <div><h4>${L === 'fr' ? 'Correspondances possibles à l’arrivée' : 'Possible connections at arrival'}</h4><div id="result-connections"></div></div>
      </div>
      <div class="notice notice-info">
        <svg class="notice-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 12l2 2 4-4M12 21s7-3.5 7-10V5l-7-3-7 3v6c0 6.5 7 10 7 10z" stroke="currentColor" stroke-width="1.6"/></svg>
        <span><strong>${L === 'fr' ? 'Source et vérification' : 'Source and verification'}:</strong> ${L === 'fr' ? plan.timetableSource.fr : plan.timetableSource.en}</span>
      </div>
      <div class="cluster gap-3 flex-wrap">
        <button type="button" class="btn btn-primary" id="save-route-btn">${L === 'fr' ? 'Enregistrer le trajet' : 'Save route'}</button>
        <button type="button" class="btn btn-secondary" id="copy-summary-btn">${L === 'fr' ? 'Copier le résumé' : 'Copy summary'}</button>
        <a class="btn btn-ghost" href="${buildAssistanceLink('', plan)}">${L === 'fr' ? 'Signaler un problème' : 'Report issue'}</a>
        <a class="btn btn-ghost" href="${buildAssistanceLink('missing-route', plan)}">${L === 'fr' ? 'Suggérer une ligne manquante' : 'Suggest missing route'}</a>
      </div>
    `;

    renderStopList(document.getElementById('result-stop-list'), plan.stops);
    renderConnections(document.getElementById('result-connections'), plan.connections);
    section.hidden = false;

    document.getElementById('save-route-btn').addEventListener('click', () => handleSaveRoute(plan, meta));
    document.getElementById('copy-summary-btn').addEventListener('click', () => copySummary(plan, meta));

    lastPlan = { plan, meta };
    return section;
  }

  // Puts a plain-text summary on the clipboard.
  function copySummary(plan, meta) {
    const L = lang();
    const fare = rbFareDisplay(plan.fare, effectivePassengerType(meta), L);
    const labels = modeLabels(plan.mode, L);
    const waitingMinutes = plan.mode === 'arrive-by' ? plan.arrivalBufferMinutes : plan.waitingMinutes;

    const lines = [
      `RouteBack, Route ${plan.number} (${plan.operator})`,
      L === 'fr' ? plan.directionLabel.fr : plan.directionLabel.en,
      `${plan.from} → ${plan.to}`,
      `${labels.waiting}: ${waitingMinutes} min`,
      `${L === 'fr' ? 'Heure à l’arrêt' : 'Time at stop'}: ${plan.boardingAtStop}`,
      `${L === 'fr' ? 'Durée de base' : 'Base duration'}: ${plan.baseDurationMinutes} min`,
      `${L === 'fr' ? 'Plage d’arrivée' : 'Arrival range'}: ${plan.arrivalRange.min}-${plan.arrivalRange.max}`,
      `${L === 'fr' ? 'Tarif' : 'Fare'}: ${fare.headline}`,
      `${L === 'fr' ? 'Arrêts' : 'Stops'}: ${plan.stops.map((s) => s.name).join(' → ')}`,
    ];

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join('\n')).then(
        () => rbToast(L === 'fr' ? 'Résumé copié' : 'Summary copied'),
        () => rbToast(L === 'fr' ? 'Impossible de copier' : 'Could not copy')
      );
    }
  }

  // Smaller object we actually store for a saved route (not the full plan).
  function routeEntryFromPlan(plan, meta) {
    const fare = rbFareDisplay(plan.fare, effectivePassengerType(meta), lang());
    return {
      id: `${plan.routeSignature}:${Date.now()}`,
      routeSignature: plan.routeSignature,
      number: plan.number, operator: plan.operator, from: plan.from, to: plan.to,
      boardingAtStop: plan.boardingAtStop, arrivalRange: plan.arrivalRange,
      fareStatus: fare.headline, savedAt: new Date().toISOString(),
    };
  }

  // NOTE: kept English-only on purpose, even though the rest of the file
  // is bilingual — if you want it bilingual too, wrap the two rbToast
  // messages the same way the rest of this file does (L === 'fr' ? ... : ...).
  function handleSaveRoute(plan, meta) {
    const profile = RBStorage.getProfile();
    if (!profile) {
      rbToast('Log in to save routes. This route cannot be saved until you log in.');
      return;
    }
    const result = RBStorage.saveRoute(routeEntryFromPlan(plan, meta));
    rbToast(result.added ? 'Route saved' : 'This route is already saved');
    renderSavedRoutes();
  }

  function renderSavedRoutes() {
    const list = document.getElementById('saved-routes-list');
    const empty = document.getElementById('saved-routes-empty');
    const routes = RBStorage.getSavedRoutes();
    const L = lang();

    if (routes.length === 0) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    list.innerHTML = routes.map((r) => `
      <article class="card">
        <div class="card-eyebrow"><span class="tag tag-brand">Route ${r.number}</span></div>
        <h4>${r.from} → ${r.to}</h4>
        <p class="field-hint" style="margin-top:0;">${r.operator}</p>
        <p>${L === 'fr' ? 'Arrivée' : 'Arrival'}: ${r.arrivalRange ? `${r.arrivalRange.min}-${r.arrivalRange.max}` : '-'}<br>${r.fareStatus}</p>
        <p class="field-hint">${L === 'fr' ? 'Enregistré le' : 'Saved'} ${new Date(r.savedAt).toLocaleDateString(L === 'fr' ? 'fr-FR' : 'en-GB')}</p>
        <div class="cluster gap-2"><button type="button" class="btn btn-danger-ghost btn-sm" data-remove-route="${r.id}">${L === 'fr' ? 'Retirer' : 'Remove'}</button></div>
      </article>
    `).join('');

    list.querySelectorAll('[data-remove-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        RBStorage.removeRoute(btn.getAttribute('data-remove-route'));
        renderSavedRoutes();
        rbToast(L === 'fr' ? 'Trajet retiré' : 'Route removed');
      });
    });
  }

  function pushRecentSearch(entry) {
    const list = RBStorage.readSession('routebackRecentSearches', []);
    list.unshift(entry);
    RBStorage.writeSession('routebackRecentSearches', list.slice(0, 6));
    renderRecentSearches();
  }

  function renderRecentSearches() {
    const list = RBStorage.readSession('routebackRecentSearches', []);
    const container = document.getElementById('recent-searches-list');
    const empty = document.getElementById('recent-searches-empty');

    if (list.length === 0) { container.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    container.innerHTML = list.map((s, idx) => `<button type="button" class="btn btn-ghost btn-sm" data-recent-idx="${idx}">${s.fromName} → ${s.toName}</button>`).join('');

    container.querySelectorAll('[data-recent-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = list[Number(btn.getAttribute('data-recent-idx'))];
        document.getElementById('pl-start').value = s.start;
        document.getElementById('pl-dest').value = s.dest;
        if (startStopCombo) startStopCombo.setById(null);
        if (destStopCombo) destStopCombo.setById(null);
        document.getElementById('planner-form').dispatchEvent(new Event('submit', { cancelable: true }));
        document.getElementById('planner-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // Static Route 95 info — reuses renderStopList()/connectionsListHtml()
  // instead of rebuilding the same HTML a second time.
  function renderRoute95Overview() {
    renderStopList(document.getElementById('route95-stop-list'), RB_STOPS.slice().sort((a, b) => a.order - b.order));

    const acc = document.getElementById('connections-accordion');
    acc.innerHTML = Object.keys(RB_ROUTE_95.connections).map((id, i) => {
      const loc = rbLocalityById(id);
      const items = connectionsListHtml(RB_ROUTE_95.connections[id]);
      return `
        <div class="accordion-item">
          <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="conn-panel-${i}">
            ${loc.name}
            <svg class="chev" width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true"><path d="M1 1l7 7 7-7" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
          <div class="accordion-panel" id="conn-panel-${i}" hidden><ul style="padding-left:1.1em;">${items}</ul></div>
        </div>`;
    }).join('');
    rbInitAccordions(acc);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const start = document.getElementById('pl-start').value;
    const dest = document.getElementById('pl-dest').value;
    const startStopRaw = document.getElementById('pl-start-stop').value;
    const destStopRaw = document.getElementById('pl-dest-stop').value;
    const dayType = document.getElementById('pl-day').value;
    const mode = document.getElementById('pl-mode').value;
    const time = document.getElementById('pl-time').value;
    const passengerType = document.getElementById('pl-passenger').value;
    const busPassStatus = document.getElementById('pl-buspass').value;
    const errorEl = document.getElementById('planner-form-error');
    const offCorridorEl = document.getElementById('planner-off-corridor-notice');
    const offCorridorTextEl = document.getElementById('planner-off-corridor-notice-text');

    if (!start || !dest || start === dest || !time) {
      offCorridorEl.style.display = 'none';
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';

    const startStopEntry = startStopRaw ? rbStopEntryById(startStopRaw) : null;
    const destStopEntry = destStopRaw ? rbStopEntryById(destStopRaw) : null;

    // An "area-only" entry (no exact stop) that isn't on Route 95 at all.
    const offCorridorEntry = [startStopEntry, destStopEntry].find((entry) => entry && entry.kind === 'area' && !entry.localityId);
    if (offCorridorEntry) {
      offCorridorTextEl.textContent = lang() === 'fr'
        ? `La ligne 95 ne dessert pas encore ${offCorridorEntry.name}. Cet arrêt est répertorié mais pas encore vérifié sur ce trajet.`
        : `Route 95 does not currently serve ${offCorridorEntry.name}. This area is catalogued but not yet verified on this route.`;
      offCorridorEl.style.display = 'flex';
      return;
    }
    offCorridorEl.style.display = 'none';

    const plan = rbComputePlan({
      startLocality: start, destLocality: dest,
      startStopId: (startStopEntry && startStopEntry.kind === 'stop') ? startStopEntry.id : null,
      destStopId: (destStopEntry && destStopEntry.kind === 'stop') ? destStopEntry.id : null,
      dayType, mode, time, passengerType,
    });
    if (!plan) return; // rbComputePlan returns nothing if this pair isn't on Route 95

    const section = renderResult(plan, { passengerType, busPassStatus, dayType, mode });
    pushRecentSearch({ start, dest, fromName: localityLabel(start), toName: localityLabel(dest) });
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const prefill = {
      start: params.get('start') || '', dest: params.get('dest') || '',
      startStop: params.get('startStop') || '', time: params.get('time') || '', mode: params.get('mode') || '',
    };

    populateForm(prefill);
    document.getElementById('planner-form').addEventListener('submit', handleSubmit);
    renderRoute95Overview();
    renderSavedRoutes();
    renderRecentSearches();

    // If the URL already had a full search in it, run it right away.
    if (prefill.start && prefill.dest) {
      document.getElementById('planner-form').dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'planner') return;
    init();
  }, { once: true });

  // Redraws the page's dynamic bits when the language is switched.
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'planner') return;
    populateForm({ start: document.getElementById('pl-start')?.value, dest: document.getElementById('pl-dest')?.value });
    renderRoute95Overview();
    renderSavedRoutes();
    renderRecentSearches();
    if (lastPlan) renderResult(lastPlan.plan, lastPlan.meta);
  });
})();

// Northern Journey Guide — the "Beyond Route 95" section. Data lives in
// shared/js/data.js (RB_NORTHERN_GUIDE). Doesn't touch the search form at all.
(function () {
  function L() { return rbCurrentLang(); }

  function originCardHtml(label, leg) {
    const lang = L();
    return `
      <div class="origin-card">
        <h5>${label}</h5>
        <div class="meta-row"><span>${lang === 'fr' ? 'Ligne' : 'Route'}</span><span>${leg.routeText}</span></div>
        <div class="meta-row"><span>${lang === 'fr' ? 'Durée' : 'Duration'}</span><span>${rbFormatGuideRange(leg.durationMin, leg.durationMax, ' min')}</span></div>
        <div class="meta-row"><span>${lang === 'fr' ? 'Tarif' : 'Fare'}</span><span>${rbFormatGuideFare(leg.fareMin, leg.fareMax)}</span></div>
        <div class="meta-row"><span>${lang === 'fr' ? 'Trajet' : 'Transfer'}</span><span>${leg.transfer ? (lang === 'fr' ? 'Correspondance requise' : 'Transfer required') : 'Direct'}</span></div>
      </div>
    `;
  }

  function renderDetail(entry) {
    const lang = L();
    document.getElementById('guide-detail-title').textContent = entry.destination;
    document.getElementById('guide-detail-grid').innerHTML =
      originCardHtml(lang === 'fr' ? 'Depuis Port Louis (Gare du Nord)' : 'From Port Louis (Gare du Nord)', entry.fromPortLouis) +
      originCardHtml(lang === 'fr' ? 'Depuis l’Hôpital SSRN (Pamplemousses)' : 'From SSRN Hospital (Pamplemousses)', entry.fromSSRN);
    document.getElementById('guide-detail').classList.add('is-visible');
  }

  // Clickable destination chips; clicking one shows its detail via renderDetail().
  function renderChips() {
    const container = document.getElementById('guide-chips');
    if (!container) return;
    container.innerHTML = RB_NORTHERN_GUIDE.map((entry, idx) => `<button type="button" class="destination-chip" role="option" data-guide-idx="${idx}">${entry.destination}</button>`).join('');
    container.querySelectorAll('[data-guide-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.destination-chip').forEach((c) => c.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderDetail(RB_NORTHERN_GUIDE[Number(btn.getAttribute('data-guide-idx'))]);
      });
    });
  }

  // Three highlighted "fare ticket" cards for popular destinations.
  function renderFareTickets() {
    const container = document.getElementById('guide-fare-tickets');
    if (!container) return;
    const lang = L();
    container.innerHTML = ['Grand Baie', 'Goodlands', 'Triolet'].map((name) => {
      const entry = rbNorthernGuideEntry(name);
      if (!entry) return '';
      const leg = entry.fromSSRN;
      return `
        <div class="fare-ticket reveal">
          <p class="fare-origin">${lang === 'fr' ? 'Depuis l’Hôpital SSRN' : 'From SSRN Hospital'}</p>
          <p class="fare-dest">${entry.destination}</p>
          <p class="field-hint" style="margin-top:2px;">${leg.routeText}</p>
          <div class="fare-ticket-perforation">
            <div class="fare-value-row"><span>${lang === 'fr' ? 'Durée' : 'Duration'}</span><span>${rbFormatGuideRange(leg.durationMin, leg.durationMax, ' min')}</span></div>
            <div class="fare-value-row"><span>${lang === 'fr' ? 'Tarif' : 'Fare'}</span><span class="fare-range">${rbFormatGuideFare(leg.fareMin, leg.fareMax)}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // The full 26-row reference table.
  function renderTable() {
    const body = document.getElementById('guide-table-body');
    if (!body) return;
    body.innerHTML = RB_NORTHERN_GUIDE.map((entry) => `
      <tr>
        <td>${entry.destination}</td>
        <td>${entry.fromPortLouis.routeText}<br><span class="field-hint">${rbFormatGuideRange(entry.fromPortLouis.durationMin, entry.fromPortLouis.durationMax, ' min')} · ${rbFormatGuideFare(entry.fromPortLouis.fareMin, entry.fromPortLouis.fareMax)}</span></td>
        <td>${entry.fromSSRN.routeText}<br><span class="field-hint">${rbFormatGuideRange(entry.fromSSRN.durationMin, entry.fromSSRN.durationMax, ' min')} · ${rbFormatGuideFare(entry.fromSSRN.fareMin, entry.fromSSRN.fareMax)}</span></td>
      </tr>
    `).join('');
  }

  function render() {
    renderFareTickets();
    renderChips();
    renderTable();
    const detail = document.getElementById('guide-detail');
    if (detail) detail.classList.remove('is-visible');
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'planner') return;
    render();
  }, { once: true });
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'planner') return;
    render();
  });
})();