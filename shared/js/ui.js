/**
 * RouteBack, shared UI helpers, loaded on every page.
 * Small, reusable behaviours that aren't specific to any one page:
 * toast messages, accordions, modals, the "reveal on scroll" fade-in
 * animation, and "show more" toggles (used on benefit cards etc).
 */
function rbToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toast._rbTimer);
  toast._rbTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function rbInitAccordions(root = document) {
  root.querySelectorAll('.accordion-trigger').forEach((trigger) => {
    if (trigger._rbBound) return;
    trigger._rbBound = true;
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      const panelId = trigger.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      if (panel) panel.hidden = expanded;
    });
  });
}

function rbOpenModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (!backdrop) return;
  backdrop.hidden = false;
  document.body.classList.add('no-scroll');
  const focusable = backdrop.querySelector('[data-autofocus]') || backdrop.querySelector('button, input, select, textarea, a');
  if (focusable) focusable.focus();
  function escHandler(e) {
    if (e.key === 'Escape') rbCloseModal(modalId);
  }
  backdrop._rbEsc = escHandler;
  document.addEventListener('keydown', escHandler);
}

function rbCloseModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (!backdrop) return;
  backdrop.hidden = true;
  document.body.classList.remove('no-scroll');
  if (backdrop._rbEsc) document.removeEventListener('keydown', backdrop._rbEsc);
}

document.addEventListener('click', (e) => {
  const closeTarget = e.target.closest('[data-modal-close]');
  if (closeTarget) {
    const backdrop = closeTarget.closest('.modal-backdrop');
    if (backdrop) rbCloseModal(backdrop.id);
  }
  const openTarget = e.target.closest('[data-modal-open]');
  if (openTarget) {
    rbOpenModal(openTarget.getAttribute('data-modal-open'));
  }
});

document.addEventListener('DOMContentLoaded', () => rbInitAccordions());

/* =====================================================================
   "Reveal on scroll" — the gentle fade-in-and-slide-up effect on cards
   =====================================================================
   How it works, step by step:
     1. Every card that should fade in has the CSS class "reveal" in its
        HTML. Look in shared/css/sections.css for the ".reveal" rule: by
        default (before this script runs) it sits at 40% opacity, moved
        down slightly. That's a safety net — if JavaScript is ever slow,
        blocked, or turned off, the card is still visible, just muted,
        never fully invisible.
     2. This function uses the browser's IntersectionObserver: you give it
        a list of elements and a function to call whenever one of them
        scrolls into view. That's it — no manual scroll-position maths.
     3. The moment a card scrolls into view, we add the "reveal-visible"
        class to it. A CSS transition (also in sections.css) then animates
        it up to full opacity. We only do this once per card, then stop
        watching it (rbObserver.unobserve), since it should never fade
        back out again while scrolling past it.
     4. Accessibility: if the visitor's operating system has "reduce
        motion" turned on, we skip all of this entirely and leave every
        card at full opacity from the start (see the CSS media query).
     5. Safety net: on the rare chance the observer never fires (for
        example, a browser tab that is minimised or hidden), a plain
        setTimeout forces every card to reveal after 1.5 seconds, so
        nothing is ever stuck looking half-empty. */
function rbInitReveal() {
  const userWantsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (userWantsReducedMotion) return;

  const cardsToReveal = document.querySelectorAll('.reveal');
  if (cardsToReveal.length === 0) return;

  // Only now do we switch the CSS from "always visible" into "start
  // muted, then fade in" mode — see the .reveal-enabled rule in sections.css.
  document.documentElement.classList.add('reveal-enabled');

  function revealCard(card) {
    card.classList.add('reveal-visible');
  }

  const watcher = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        revealCard(entry.target);
        watcher.unobserve(entry.target);
      }
    });
  });
  cardsToReveal.forEach((card) => watcher.observe(card));

  // Safety net described above.
  setTimeout(() => {
    cardsToReveal.forEach(revealCard);
    watcher.disconnect();
  }, 1500);
}
document.addEventListener('rb:partialsready', rbInitReveal, { once: true });

/* ===== "Show more" toggles (benefit cards, destination explorer, etc.) ===== */
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-benefit-more]');
  if (!toggle) return;
  const detail = toggle.nextElementSibling;
  const isOpen = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!isOpen));
  if (detail) detail.classList.toggle('is-open', !isOpen);
});

