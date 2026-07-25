/**
 * RouteBack, header behaviour: mobile menu open/close and active-link marking.
 */
(function () {
  function markActive() {
    const page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('.nav-link[data-page], .mobile-menu .nav-link[data-page]').forEach((link) => {
      if (link.getAttribute('data-page') === page) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initMobileMenu() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-mobile-menu]');
    const closeBtn = document.querySelector('[data-menu-close]');
    if (!toggle || !menu) return;
    // partials.js both dispatches rb:partialsready (which this module listens for)
    // and directly calls window.RBNavReinit() right after, so init() can run twice
    // per page load. Guard against binding the same listeners a second time.
    if (toggle._rbBound) return;
    toggle._rbBound = true;

    function openMenu() {
      menu.setAttribute('data-open', 'true');
      menu.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      const firstLink = menu.querySelector('a, button');
      if (firstLink) firstLink.focus();
    }
    function closeMenu() {
      menu.setAttribute('data-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      toggle.focus();
      setTimeout(() => { if (menu.getAttribute('data-open') === 'false') menu.setAttribute('hidden', ''); }, 260);
    }
    toggle.addEventListener('click', () => {
      const isOpen = menu.getAttribute('data-open') === 'true';
      isOpen ? closeMenu() : openMenu();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') closeMenu();
    });
  }

  function init() {
    markActive();
    initMobileMenu();
  }

  // Header/footer are injected asynchronously by partials.js, so nav wiring
  // runs once that injection announces itself, not on raw DOMContentLoaded.
  window.RBNavReinit = init;
  document.addEventListener('rb:partialsready', init);
})();

