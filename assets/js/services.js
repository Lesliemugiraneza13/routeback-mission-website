/**
 * RouteBack, Services page: renders the provider directory from RB_PROVIDERS.
 */
(function () {
  // Purpose: Returns the active language so service links can be localized.
  function L() { return rbCurrentLang(); }

  const LINK_LABELS = {
    website: { en: 'Visit website', fr: 'Visiter le site' },
    quoteUrl: { en: 'Request a quote', fr: 'Demander un devis' },
    contactUrl: { en: 'Contact', fr: 'Contact' },
    bookingUrl: { en: 'Booking', fr: 'Réservation' },
    signinUrl: { en: 'Sign in', fr: 'Connexion' },
    registerUrl: { en: 'Register', fr: 'Inscription' },
    appUrl: { en: 'Open app', fr: 'Ouvrir l’application' },
    newsroomUrl: { en: 'Newsroom', fr: 'Actualités' },
    mUrl: { en: 'Mobile site', fr: 'Site mobile' },
    airportUrl: { en: 'Airport transfers', fr: 'Transferts aéroport' },
    frUrl: { en: 'Français', fr: 'Français' },
  };
  const LINK_ORDER = ['website', 'bookingUrl', 'quoteUrl', 'appUrl', 'signinUrl', 'registerUrl', 'airportUrl', 'contactUrl', 'newsroomUrl', 'mUrl', 'frUrl'];

  // Purpose: Renders the provider directory cards with links and availability notes.
  function renderProviders() {
    const grid = document.getElementById('providers-grid');
    const lang = L();
    grid.innerHTML = RB_PROVIDERS.map((p) => {
      const links = LINK_ORDER.filter((key) => p[key]).map((key) => {
        const label = LINK_LABELS[key];
        return `<a class="btn btn-secondary btn-sm" href="${p[key]}" target="_blank" rel="noopener noreferrer">${lang === 'fr' ? label.fr : label.en}</a>`;
      });
      if (p.phone) links.push(`<a class="btn btn-ghost btn-sm" href="tel:${p.phone.replace(/\s+/g, '')}">${p.phone}</a>`);
      if (p.email) links.push(`<a class="btn btn-ghost btn-sm" href="mailto:${p.email}">${p.email}</a>`);

      const availability = p.availabilityNote
        ? `<div class="notice notice-warning" style="margin-top:var(--space-3);">
             <svg class="notice-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" stroke-width="1.8"/></svg>
             <span>${lang === 'fr' ? p.availabilityNote.fr : p.availabilityNote.en}</span>
           </div>`
        : '';

      return `
        <article class="card provider-card">
          <div class="provider-logo-tile">
            <img src="${p.logo}" alt="${p.name} logo" loading="lazy">
          </div>
          <h4 style="margin-bottom:0;">${p.name}</h4>
          <div class="provider-links">${links.join('')}</div>
          ${availability}
        </article>
      `;
    }).join('');
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'services') return;
    renderProviders();
  }, { once: true });
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'services') return;
    renderProviders();
  });
})();

