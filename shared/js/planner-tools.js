/**
 * RouteBack, shared planner building-blocks, loaded wherever a page needs
 * them (Home, Plan Journey, Create Profile, My Profile): the dropdown-fill
 * helpers and result-formatting functions used by both the Home quick
 * planner and the full Plan Journey page (this is their "one shared data
 * source"), plus the searchable stop combobox widget every "starting area"
 * field on the site is built from.
 */

const RB_DAY_TYPES = [
  { id: 'weekday', en: 'Weekday (Mon-Fri)', fr: 'Semaine (lun.-ven.)' },
  { id: 'saturday', en: 'Saturday', fr: 'Samedi' },
  { id: 'sun-ph', en: 'Sunday or public holiday', fr: 'Dimanche ou jour férié' },
];

const RB_JOURNEY_MODES = [
  { id: 'leave-around', en: 'Leave around', fr: 'Partir vers' },
  { id: 'arrive-by', en: 'Arrive by', fr: 'Arriver avant' },
];

const RB_PASSENGER_TYPES = [
  { id: 'student', en: 'Student (with valid bus pass)', fr: 'Étudiant (avec carte de bus valide)' },
  { id: 'regular', en: 'Regular passenger', fr: 'Passager standard' },
];

const RB_BUS_PASS_STATUS = [
  { id: 'yes', en: 'Yes, I have a valid student bus pass', fr: 'Oui, j’ai une carte de bus étudiante valide' },
  { id: 'no', en: 'No, not yet', fr: 'Non, pas encore' },
];

function rbTimeSlots() {
  const slots = [];
  for (let h = 5; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

function rbCurrentLang() {
  return (typeof rbGetLang === 'function') ? rbGetLang() : 'en';
}

function rbClearSelect(select) {
  while (select.options.length) select.remove(0);
}

function rbFillLocalitySelect(select, placeholderEn, placeholderFr) {
  const lang = rbCurrentLang();
  rbClearSelect(select);
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = lang === 'fr' ? placeholderFr : placeholderEn;
  ph.disabled = true;
  ph.selected = true;
  select.appendChild(ph);
  RB_LOCALITIES.slice().sort((a, b) => a.order - b.order).forEach((loc) => {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = loc.name;
    select.appendChild(opt);
  });
}

function rbFillDayTypeSelect(select) {
  const lang = rbCurrentLang();
  rbClearSelect(select);
  RB_DAY_TYPES.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = lang === 'fr' ? d.fr : d.en;
    select.appendChild(opt);
  });
}

function rbFillJourneyModeSelect(select) {
  const lang = rbCurrentLang();
  rbClearSelect(select);
  RB_JOURNEY_MODES.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = lang === 'fr' ? d.fr : d.en;
    select.appendChild(opt);
  });
}

function rbFillPassengerSelect(select) {
  const lang = rbCurrentLang();
  rbClearSelect(select);
  RB_PASSENGER_TYPES.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = lang === 'fr' ? d.fr : d.en;
    select.appendChild(opt);
  });
}

function rbFillBusPassSelect(select) {
  const lang = rbCurrentLang();
  rbClearSelect(select);
  RB_BUS_PASS_STATUS.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = lang === 'fr' ? d.fr : d.en;
    select.appendChild(opt);
  });
}

function rbFillTimeSelect(select, placeholderEn, placeholderFr) {
  const lang = rbCurrentLang();
  rbClearSelect(select);
  if (placeholderEn) {
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = lang === 'fr' ? placeholderFr : placeholderEn;
    ph.disabled = true;
    ph.selected = true;
    select.appendChild(ph);
  }
  rbTimeSlots().forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    select.appendChild(opt);
  });
}

function rbFareDisplay(fare, passengerType, lang) {
  if (!fare) {
    return lang === 'fr'
      ? { headline: 'Tarif non confirmé pour ce trajet', note: 'Confirmez le tarif actuel auprès du contrôleur avant de voyager.', status: 'warning' }
      : { headline: 'Fare not yet verified for this trip', note: 'Confirm the current fare before travelling.', status: 'warning' };
  }
  const amount = passengerType === 'student' && fare.student != null ? fare.student : fare.regular;
  const label = passengerType === 'student' && fare.student != null
    ? (lang === 'fr' ? 'Tarif étudiant' : 'Student fare')
    : (lang === 'fr' ? 'Tarif régulier' : 'Regular fare');
  return {
    headline: `${fare.currency} ${amount}, ${label}`,
    note: lang === 'fr' ? fare.note.fr : fare.note.en,
    checked: fare.dateChecked,
    status: fare.verificationStatus === 'pending' ? 'warning' : 'success',
  };
}

/* ===== source: shared/js/stop-search.js ===== */
/**
 * RouteBack, searchable stop combobox.
 * Replaces a plain <select id="X"> with a text-search combobox that keeps
 * the same id on a hidden input, so every existing ".value" read and
 * "change" listener elsewhere in the codebase keeps working unchanged.
 *
 * Search always covers the full Northern Mauritius catalogue. An optional
 * paired "area" select only reorders results (its area shown first), it
 * never removes a valid match from another area.
 */
function rbReplaceSelectWithStopCombobox(selectId, opts) {
  const options = opts || {};
  const select = document.getElementById(selectId);
  if (!select) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'stop-combobox';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'combobox-input-wrap';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = `${selectId}-search`;
  searchInput.setAttribute('role', 'combobox');
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.setAttribute('aria-controls', `${selectId}-listbox`);
  searchInput.setAttribute('aria-autocomplete', 'list');
  searchInput.setAttribute('autocomplete', 'off');
  if (select.hasAttribute('required')) searchInput.setAttribute('aria-required', 'true');

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'combobox-clear';
  clearBtn.setAttribute('aria-label', 'Clear');
  clearBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  const listbox = document.createElement('div');
  listbox.className = 'combobox-listbox';
  listbox.id = `${selectId}-listbox`;
  listbox.setAttribute('role', 'listbox');
  listbox.hidden = true;

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id = selectId;
  hidden.name = select.name || selectId;

  inputWrap.appendChild(searchInput);
  inputWrap.appendChild(clearBtn);
  wrapper.appendChild(inputWrap);
  wrapper.appendChild(listbox);
  wrapper.appendChild(hidden);

  const labelFor = document.querySelector(`label[for="${selectId}"]`);
  if (labelFor) labelFor.setAttribute('for', searchInput.id);

  select.replaceWith(wrapper);

  let activeIndex = -1;
  let currentOptionEls = [];
  let currentEntries = [];

  function lang() { return rbCurrentLang(); }

  function statusLabel(status) {
    const l = RB_STOP_STATUS_LABEL[status];
    if (!l) return '';
    return lang() === 'fr' ? l.fr : l.en;
  }

  function preferredAreaName() {
    if (!options.areaFieldId) return null;
    const areaEl = document.getElementById(options.areaFieldId);
    if (!areaEl || !areaEl.value) return null;
    const loc = (typeof rbLocalityById === 'function') ? rbLocalityById(areaEl.value) : null;
    return loc ? loc.name : null;
  }

  function setValue(entry) {
    hidden.value = entry ? entry.id : '';
    searchInput.value = entry ? `${entry.name}${entry.kind === 'area' ? '' : ` (${entry.area})`}` : '';
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
    if (typeof options.onSelect === 'function') options.onSelect(entry);
  }

  function renderEmpty(query) {
    const L = lang();
    const suggestHref = typeof options.missingStopLink === 'function' ? options.missingStopLink(query) : null;
    listbox.innerHTML = `
      <p class="combobox-empty">${L === 'fr' ? 'Aucun arrêt correspondant trouvé.' : 'No matching stop was found.'}</p>
      ${suggestHref ? `<a class="btn btn-secondary btn-sm combobox-suggest-btn" href="${suggestHref}">${L === 'fr' ? `Suggérer « ${query} »` : `Suggest "${query}"`}</a>` : ''}
    `;
    currentOptionEls = [];
    currentEntries = [];
    activeIndex = -1;
  }

  function renderGroups(groups, query) {
    const L = lang();
    const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);
    let html = `<div class="combobox-count">${L === 'fr' ? `${totalCount} arrêt(s) disponible(s)` : `${totalCount} stop${totalCount === 1 ? '' : 's'} available`}</div>`;
    currentEntries = [];
    groups.forEach((group) => {
      html += `<div class="combobox-group-label">${group.area}</div>`;
      group.items.forEach((entry) => {
        const idx = currentEntries.length;
        currentEntries.push(entry);
        html += `<div class="combobox-option" role="option" id="${selectId}-opt-${idx}" data-idx="${idx}" tabindex="-1">
          <span>${entry.name}</span>
          <span class="combobox-option-status">${statusLabel(entry.status)}</span>
        </div>`;
      });
    });
    listbox.innerHTML = html;
    currentOptionEls = Array.from(listbox.querySelectorAll('.combobox-option'));
    activeIndex = -1;
    currentOptionEls.forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.getAttribute('data-idx'));
        setValue(currentEntries[idx]);
        closeListbox();
      });
    });
  }

  function renderResults(query) {
    const results = rbSearchStops(query, preferredAreaName());
    if (results.length === 0) {
      renderEmpty(query.trim());
      return;
    }
    renderGroups(rbGroupStopsByArea(results), query);
  }

  function openListbox() {
    listbox.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
    renderResults(searchInput.value);
  }

  function closeListbox() {
    listbox.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  }

  function moveActive(delta) {
    if (!currentOptionEls.length) return;
    currentOptionEls.forEach((el) => el.classList.remove('is-active'));
    activeIndex = Math.max(0, Math.min(currentOptionEls.length - 1, activeIndex + delta));
    const el = currentOptionEls[activeIndex];
    el.classList.add('is-active');
    el.scrollIntoView({ block: 'nearest' });
    searchInput.setAttribute('aria-activedescendant', el.id);
  }

  searchInput.addEventListener('focus', openListbox);
  searchInput.addEventListener('input', () => {
    if (hidden.value) { hidden.value = ''; hidden.dispatchEvent(new Event('change', { bubbles: true })); }
    openListbox();
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (listbox.hidden) openListbox(); else moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') { if (!listbox.hidden && activeIndex >= 0) { e.preventDefault(); setValue(currentEntries[activeIndex]); closeListbox(); } }
    else if (e.key === 'Escape') { closeListbox(); }
  });
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeListbox();
  });
  clearBtn.addEventListener('click', () => {
    setValue(null);
    searchInput.focus();
    openListbox();
  });
  if (options.areaFieldId) {
    const areaEl = document.getElementById(options.areaFieldId);
    if (areaEl) areaEl.addEventListener('change', () => { if (!listbox.hidden) renderResults(searchInput.value); });
  }

  return {
    setById(id) {
      const entry = rbStopEntryById(id);
      setValue(entry);
    },
    refreshLanguage() {
      if (hidden.value) {
        const entry = rbStopEntryById(hidden.value);
        if (entry) searchInput.value = `${entry.name}${entry.kind === 'area' ? '' : ` (${entry.area})`}`;
      }
      if (!listbox.hidden) renderResults(searchInput.value);
    },
    hiddenInput: hidden,
    searchInput,
  };
}

