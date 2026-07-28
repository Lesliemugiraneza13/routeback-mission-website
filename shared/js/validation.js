/**
 * RouteBack, shared form validation, loaded on every page that has a form
 * (Contact, Log In, Create Profile, My Profile): password show/hide toggles,
 * every regex validator (phone, email, name, password, reference code), and
 * the two helpers every page's own validate() function calls:
 *   rbApplyFieldChecks()  - runs the checks, marks failing fields invalid
 *   rbShowErrorSummary()  - renders the error list and focuses the first error
 * Also includes the "redirect back to Planner and restore a pending save"
 * flow used after opening or creating a profile.
 */
// Purpose: Adds click handlers to password toggle buttons so users can show or hide their password input.
function rbTogglePasswordVisibility(root = document) {
  root.querySelectorAll('.password-toggle').forEach((btn) => {
    if (btn._rbBound) return;
    btn._rbBound = true;
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-for');
      const input = document.getElementById(targetId);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });
}

/**
 * Mauritius phone number check.
 * Pattern: /^(\+230[\s-]?)?[2-9]\d{3}[\s-]?\d{4}$/
 *   ^                start of the string
 *   (\+230[\s-]?)?    an OPTIONAL "+230" country code, with an optional
 *                     space or dash after it — the "?" at the end makes
 *                     the whole group optional
 *   [2-9]             the first digit of the local number: 2 through 9
 *                     (Mauritius numbers never start with 0 or 1)
 *   \d{3}             exactly 3 more digits
 *   [\s-]?            an optional single space or dash in the middle
 *   \d{4}             the last 4 digits
 *   $                 end of the string
 * The phone field is optional on our forms, so a blank value passes too.
 */
// Purpose: Validates Mauritius phone numbers with a regular expression that accepts the local format.
function rbValidMauritiusPhone(value) {
  const v = value.trim();
  if (v === '') return true; // optional field
  return /^(\+230[\s-]?)?[2-9]\d{3}[\s-]?\d{4}$/.test(v);
}

/**
 * Email check.
 * Pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *   [^\s@]+     one or more characters that are NOT a space and NOT an "@"
 *               (this is the part before the @)
 *   @           a single, required "@" symbol
 *   [^\s@]+     the domain name (again, no spaces or extra "@")
 *   \.          a literal dot (the backslash means "a real dot, not
 *               'any character'")
 *   [^\s@]+     the part after the dot, e.g. "com" or "mu"
 * This is a simple, readable check, not the full email specification —
 * good enough to catch obvious typos without being overly strict.
 */
// Purpose: Checks that an entered email follows a simple, common format.
function rbValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Name check (first name / last name).
 * Pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,30}(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]{2,30}){0,3}$/
 *   [A-Za-zÀ-ÖØ-öø-ÿ]{2,30}   2 to 30 letters, including accented
 *                             letters like "é" or "ï" (the À-ÖØ-öø-ÿ
 *                             ranges cover accented characters)
 *   (?: ... ){0,3}            a group, repeated 0 to 3 times, that is
 *                             NOT captured separately (the "?:" means
 *                             "just group these, don't remember them")
 *   [ '-][A-Za-zÀ-ÖØ-öø-ÿ]{2,30}   inside that group: a space, apostrophe
 *                                  or dash, followed by 2-30 more letters
 * In plain terms: this allows names like "Marie-Claire" or "Jean d'Arc"
 * (multiple letter-groups joined by a space, dash or apostrophe), while
 * rejecting numbers, symbols, or a single stray letter.
 */
// Purpose: Validates names so they contain only letters and common name separators.
const RB_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,30}(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]{2,30}){0,3}$/;
function rbValidName(value) { return RB_NAME_REGEX.test(value.trim()); }

/**
 * Password check.
 * Pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/
 *   (?=.*[a-z])   "lookahead": somewhere ahead there must be a lowercase
 *                 letter. A lookahead checks for something without
 *                 actually consuming/moving past it, so we can stack
 *                 several of these requirements one after another.
 *   (?=.*[A-Z])   ...and somewhere a lowercase letter
 *   (?=.*\d)      ...and somewhere a digit
 *   (?=.*[^A-Za-z0-9\s])   ...and somewhere a character that is NOT a
 *                          letter, digit or space (i.e. a special
 *                          character like ! or #)
 *   \S{8,64}      after all those checks pass, the actual password must
 *                 be 8 to 64 non-space characters
 * The four lookaheads are how one regex enforces four separate rules
 * (upper, lower, number, special character) at once.
 */
// Purpose: Checks password strength against several required rules, including uppercase, lowercase, numbers, and special characters.
const RB_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/;
function rbPasswordChecklist(value) {
  return {
    length: value.length >= 8 && value.length <= 64,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9\s]/.test(value) && !/\s/.test(value),
  };
}
function rbValidPassword(value) { return RB_PASSWORD_REGEX.test(value); }

/**
 * Reference-code check (Contact page, optional "following up on a previous report" field).
 * Pattern: /^[A-Z]{3}-\d{4}$/
 *   [A-Z]{3}   exactly three uppercase letters
 *   -          a literal dash
 *   \d{4}      exactly four digits
 * The field is optional, so a blank value passes too. The input auto-uppercases as you
 * type (see the Contact page's own script below), so typing lowercase still matches.
 */
// Purpose: Validates the optional reference code used on the contact form.
function rbValidReferenceCode(value) {
  const v = value.trim();
  if (v === '') return true;
  return /^[A-Z]{3}-\d{4}$/.test(v);
}

/**
 * Shared by every page's validate() function. Takes [input, isValid, id, msgEn, msgFr]
 * tuples, marks each failing field's wrapping `.field` as invalid, and returns the
 * failures as a plain array. Kept separate from rbShowErrorSummary so a caller (like
 * signup's acknowledgement checkbox) can push extra errors before the summary renders.
 */
// Purpose: Applies the validation results to each field and collects any failing fields into an error list.
function rbApplyFieldChecks(checks) {
  const errors = [];
  checks.forEach(([input, ok, id, msgEn, msgFr]) => {
    input.closest('.field').classList.toggle('is-invalid', !ok);
    if (!ok) errors.push({ id, msgEn, msgFr });
  });
  return errors;
}

/** Fills an error-summary list from `errors`, focuses the first failing field, and reports whether the form is valid. */
// Purpose: Displays the collected form errors in a summary and moves focus to the first invalid field.
function rbShowErrorSummary(errors, summaryId, listId) {
  const lang = rbCurrentLang();
  const summary = document.getElementById(summaryId);
  const list = document.getElementById(listId);
  if (errors.length) {
    list.innerHTML = errors.map((e) => `<li><a href="#${e.id}">${lang === 'fr' ? e.msgFr : e.msgEn}</a></li>`).join('');
    summary.classList.add('is-visible');
    document.getElementById(errors[0].id).focus();
  } else {
    summary.classList.remove('is-visible');
  }
  return errors.length === 0;
}

function rbShowPendingBanner() {
  const params = new URLSearchParams(window.location.search);
  const banner = document.getElementById('pending-banner');
  if (banner && params.get('pending') === '1') banner.style.display = 'flex';
}

/** After a profile is opened or created this session, honour any pending saved-route flow. */
function rbRedirectAfterProfile(root) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('pending') === '1' && RBStorage.readSession(RBStorage.KEYS.pendingSave, null)) {
    window.location.href = `${root}planner.html?restore=1`;
  } else {
    window.location.href = `${root}profile.html`;
  }
}

document.addEventListener('rb:partialsready', () => {
  rbTogglePasswordVisibility();
  rbShowPendingBanner();
}, { once: true });

