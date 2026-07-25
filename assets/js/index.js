/**
 * RouteBack, Home page behaviour: quick planner + services strip.
 */
(function () {
  let startStopCombo = null;

  function renderServicesStrip() {
    const strip = document.getElementById('services-strip');
    if (!strip) return;
    strip.innerHTML = RB_PROVIDERS.map((p) => `
      <a href="${p.website}" target="_blank" rel="noopener noreferrer"
         class="provider-logo-tile" style="width:132px;height:72px;" aria-label="${p.name}, opens in a new tab">
        <img src="${p.logo}" alt="${p.name} logo" loading="lazy">
      </a>
    `).join('');
  }

  function updateQpTimeLabel() {
    const modeSel = document.getElementById('qp-mode');
    const label = document.getElementById('qp-time-label');
    if (!modeSel || !label) return;
    const isArrive = modeSel.value === 'arrive-by';
    label.innerHTML = isArrive
      ? '<span lang="en" data-i18n>Arrive by</span><span lang="fr" data-i18n>Arriver avant</span>'
      : '<span lang="en" data-i18n>Leave around</span><span lang="fr" data-i18n>Partir vers</span>';
  }

  function populateQuickPlanner() {
    const startSel = document.getElementById('qp-start');
    const destSel = document.getElementById('qp-dest');
    const modeSel = document.getElementById('qp-mode');
    const timeSel = document.getElementById('qp-time');
    if (!startSel || !destSel) return;
    rbFillLocalitySelect(startSel, 'Choose a starting area', 'Choisissez une zone de départ');
    rbFillLocalitySelect(destSel, 'Choose a destination', 'Choisissez une destination');
    rbFillJourneyModeSelect(modeSel);
    rbFillTimeSelect(timeSel, 'Any time', 'N’importe quelle heure');
    updateQpTimeLabel();
    modeSel.addEventListener('change', updateQpTimeLabel);

    if (!startStopCombo) {
      startStopCombo = rbReplaceSelectWithStopCombobox('qp-start-stop', {
        areaFieldId: 'qp-start',
        missingStopLink: (q) => `contact.html?category=missing-stop&stopName=${encodeURIComponent(q)}`,
      });
    } else {
      startStopCombo.refreshLanguage();
    }
  }

  function initQuickPlanner() {
    const form = document.getElementById('quick-planner-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const start = document.getElementById('qp-start').value;
      const dest = document.getElementById('qp-dest').value;
      const startStop = document.getElementById('qp-start-stop').value;
      const mode = document.getElementById('qp-mode').value;
      const time = document.getElementById('qp-time').value;
      const errorEl = document.getElementById('qp-error');
      if (!start || !dest || start === dest) {
        errorEl.style.display = 'flex';
        return;
      }
      errorEl.style.display = 'none';
      const params = new URLSearchParams({ start, dest, mode });
      if (startStop) params.set('startStop', startStop);
      if (time) params.set('time', time);
      window.location.href = `planner.html?${params.toString()}`;
    });
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'home') return;
    populateQuickPlanner();
    renderServicesStrip();
    initQuickPlanner();
  }, { once: true });

  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'home') return;
    const startSel = document.getElementById('qp-start');
    const destSel = document.getElementById('qp-dest');
    const timeSel = document.getElementById('qp-time');
    if (!startSel) return;
    const s = startSel.value, d = destSel.value, t = timeSel.value;
    populateQuickPlanner();
    if (s) startSel.value = s;
    if (d) destSel.value = d;
    if (t) timeSel.value = t;
  });
})();

