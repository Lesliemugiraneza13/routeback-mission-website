/**
 * RouteBack, shared header & footer markup, injected on every page.
 * Every page is a flat file at the project root (index.html, planner.html,
 * mission.html, ...), so `root` is always an empty string. It's kept as a
 * parameter only so the link-building code below reads the same everywhere.
 */
// Purpose: Builds paired English and French markup so the site can switch language content in a consistent way.
function rbBilingual(en, fr, tag = 'span') {
  return `<${tag} lang="en" data-i18n>${en}</${tag}><${tag} lang="fr" data-i18n>${fr}</${tag}>`;
}

// Purpose: Creates the shared navigation links used by the header and mobile menu.
function rbNavItems(root) {
  return [
    { page: 'home', href: `${root}index.html`, en: 'Home', fr: 'Accueil' },
    { page: 'planner', href: `${root}planner.html`, en: 'Plan Journey', fr: 'Planifier un trajet' },
    { page: 'mission', href: `${root}mission.html`, en: 'Mission', fr: 'Mission' },
    { page: 'about', href: `${root}about.html`, en: 'About', fr: 'À propos' },
    { page: 'contact', href: `${root}contact.html`, en: 'Contact', fr: 'Contact' },
    { page: 'services', href: `${root}services.html`, en: 'Services', fr: 'Services' },
  ];
}

// Purpose: Injects the shared header markup into the page, including navigation, theme controls, and mobile menu hooks.
function rbRenderHeader(root) {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  const navLinks = rbNavItems(root)
    .map((item) => `<li><a class="nav-link" data-page="${item.page}" href="${item.href}">${rbBilingual(item.en, item.fr)}</a></li>`)
    .join('');

  const profile = (typeof RBStorage !== 'undefined') ? RBStorage.getProfile() : null;
  const session = (typeof RBStorage !== 'undefined') ? RBStorage.getSession() : null;
  const profileSlot = (profile && session)
    ? `<a class="profile-chip" href="${root}profile.html"><span class="avatar-dot" aria-hidden="true">${(profile.firstName || 'S').charAt(0).toUpperCase()}</span>${rbBilingual('My Profile', 'Mon profil')}</a>`
    : `<a class="btn btn-secondary btn-sm" href="${root}login.html">${rbBilingual('Log In', 'Connexion')}</a>`;

  mount.innerHTML = `
    <div class="container">
      <div class="header-zone header-zone--brand">
        <a class="brand-lockup" href="${root}index.html" aria-label="RouteBack, Home">
          <span class="logo-tile"><img src="${root}images/logo/routeback-logo.jpg" alt="RouteBack, North Mauritius" width="52" height="56"></span>
        </a>
      </div>
      <nav class="header-zone header-zone--nav" aria-label="Primary">
        <ul class="nav-list">${navLinks}</ul>
      </nav>
      <div class="header-zone header-zone--utility">
        <button type="button" class="utility-btn lang-switch" data-lang-toggle aria-label="Passer au français">FR</button>
        <button type="button" class="utility-btn" data-theme-toggle aria-pressed="false" aria-label="Toggle dark mode">
          <span data-theme-label aria-hidden="true">☾</span>
        </button>
        <span class="header-utility-profile">${profileSlot}</span>
        <button type="button" class="utility-btn menu-toggle" data-menu-toggle aria-haspopup="true" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true"><path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  `;

  // The mobile menu is mounted outside #site-header on purpose: that element
  // has `backdrop-filter` for its frosted-glass look, and any backdrop-filter
  // (or filter/transform) on an ancestor makes fixed-position descendants
  // position themselves relative to THAT ancestor instead of the viewport.
  // Left nested inside the header, this full-screen "position:fixed; inset:0"
  // panel got squashed down to the header's own height instead of covering
  // the screen. Mounting it on <body> keeps it a true full-screen overlay.
  let menuMount = document.getElementById('mobile-menu-root');
  if (!menuMount) {
    menuMount = document.createElement('div');
    menuMount.id = 'mobile-menu-root';
    document.body.appendChild(menuMount);
  }
  menuMount.innerHTML = `
    <div class="mobile-menu" id="mobile-menu" data-mobile-menu data-open="false" hidden role="dialog" aria-modal="true" aria-label="Menu">
      <div class="mobile-menu-head">
        <span class="brand-wordmark">RouteBack</span>
        <button type="button" class="utility-btn" data-menu-close aria-label="Close menu">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <nav class="mobile-menu-body" aria-label="Mobile">
        <ul class="nav-list" style="flex-direction:column;width:100%;">${navLinks}</ul>
        <a class="nav-link" href="${(profile && session) ? `${root}profile.html` : `${root}login.html`}">${(profile && session) ? rbBilingual('My Profile', 'Mon profil') : rbBilingual('Log In', 'Connexion')}</a>
      </nav>
    </div>
  `;
}

// Purpose: Injects the shared footer markup into the page with links and brand information.
function rbRenderFooter(root) {
  const mount = document.getElementById('site-footer');
  if (!mount) return;
  mount.innerHTML = `
    <div class="pattern-layer footer-pattern" aria-hidden="true"></div>
    <div class="container footer-grid">
      <div class="footer-brand footer-brand-block">
        <span class="logo-tile"><img src="${root}images/logo/routeback-logo.jpg" alt="RouteBack, North Mauritius" width="84" height="90"></span>
        <p style="max-width:30ch;color:var(--text-on-footer-muted);font-size:var(--fs-small);">
          ${rbBilingual(
            'Helping students prepare for selected journeys with clearer route, fare, timing and support information.',
            'Aider les étudiants à préparer certains trajets grâce à des informations plus claires sur les routes, tarifs, horaires et l’assistance.',
            'span'
          )}
        </p>
      </div>
      <div class="footer-col">
        <h5>${rbBilingual('Plan your journey', 'Planifiez votre trajet')}</h5>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:10px;">
          <li><a href="${root}planner.html">${rbBilingual('Plan Journey', 'Planifier un trajet')}</a></li>
          <li><a href="${root}planner.html#route-95">${rbBilingual('Route 95', 'Ligne 95')}</a></li>
          <li><a href="${root}planner.html#saved-routes">${rbBilingual('Saved Routes', 'Trajets enregistrés')}</a></li>
          <li><a href="${root}planner.html#recent-searches">${rbBilingual('Recent Searches', 'Recherches récentes')}</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>RouteBack</h5>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:10px;">
          <li><a href="${root}mission.html">${rbBilingual('Mission', 'Mission')}</a></li>
          <li><a href="${root}contact.html">${rbBilingual('Contact', 'Contact')}</a></li>
          <li><a href="${root}services.html">${rbBilingual('Services', 'Services')}</a></li>
          <li><a href="${root}index.html#alche">${rbBilingual('Near ALCHE', 'Près de l’ALCHE')}</a></li>
          <li><a href="${root}index.html#traffic">${rbBilingual('Traffic and delays', 'Trafic et retards')}</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>${rbBilingual('About', 'À propos')}</h5>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:10px;">
          <li><a href="${root}about.html">${rbBilingual('Meet the team', 'Rencontrer l’équipe')}</a></li>
          <li><a href="${root}about.html#how-we-work">${rbBilingual('How we work', 'Notre méthode')}</a></li>
          <li><a href="${root}about.html#skills">${rbBilingual('Skills', 'Compétences')}</a></li>
          <li><a href="${root}mission.html#verification">${rbBilingual('Quality and sources', 'Qualité et sources')}</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>${rbBilingual('Resources', 'Ressources')}</h5>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:10px;">
          <li><a href="${root}index.html#fares">${rbBilingual('Student fares', 'Tarifs étudiants')}</a></li>
          <li><a href="${root}services.html#safety">${rbBilingual('Safety guidance', 'Conseils de sécurité')}</a></li>
          <li><a href="${root}mission.html#verification">${rbBilingual('Data sources', 'Sources de données')}</a></li>
          <li><a href="${root}services.html#preparation">${rbBilingual('Travel preparation', 'Préparation du trajet')}</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 RouteBack</span>
      <div class="footer-bottom-links">
        <a href="${root}mission.html#verification">${rbBilingual('Data sources', 'Sources de données')}</a>
        <a href="${root}contact.html#privacy">${rbBilingual('Privacy note', 'Note de confidentialité')}</a>
        <a href="${root}mission.html#limitations">${rbBilingual('Prototype limitations', 'Limites du prototype')}</a>
        <button type="button" class="lang-switch" data-lang-toggle style="background:none;border:none;color:inherit;font-weight:700;cursor:pointer;">FR</button>
      </div>
    </div>
  `;
}

// Purpose: Renders the header and footer and then announces that the shared partials are ready for other scripts.
function rbMountPartials() {
  const root = '';
  rbRenderHeader(root);
  rbRenderFooter(root);
  if (typeof rbApplyLang === 'function') rbApplyLang(rbGetLang());
  document.dispatchEvent(new CustomEvent('rb:partialsready'));
  if (window.RBNavReinit) window.RBNavReinit();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rbMountPartials);
} else {
  rbMountPartials();
}
