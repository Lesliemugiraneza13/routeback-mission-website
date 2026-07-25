/**
 * RouteBack, local persistence helpers.
 * Everything here is scoped to this browser/device only (localStorage / sessionStorage).
 * Nothing is ever sent anywhere. Passwords are never part of any stored object.
 */
const RB_KEYS = {
  profile: 'routebackProfile',
  session: 'routebackSession',
  savedRoutes: 'routebackSavedRoutes',
  lang: 'routebackLang',
  theme: 'routebackTheme',
  assistanceDraft: 'routebackAssistanceDraft',
  pendingSave: 'routebackPendingSave',
  lastPlan: 'routebackLastPlan',
};

const RBStorage = (() => {
  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) { /* storage unavailable, fail silently, feature degrades gracefully */ }
  }
  function removeLocal(key) {
    try { localStorage.removeItem(key); } catch (err) { /* ignore */ }
  }
  function readSession(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) { return fallback; }
  }
  function writeSession(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* ignore */ }
  }
  function removeSession(key) {
    try { sessionStorage.removeItem(key); } catch (err) { /* ignore */ }
  }

  // ---- Profile ----
  function getProfile() { return readLocal(RB_KEYS.profile, null); }
  function saveProfile(profile) { writeLocal(RB_KEYS.profile, profile); }
  function clearProfile() {
    removeLocal(RB_KEYS.profile);
    removeLocal(RB_KEYS.session);
    removeSession(RB_KEYS.session);
    removeLocal(RB_KEYS.savedRoutes);
    removeSession('routebackRecentSearches');
  }

  // Sessions live in sessionStorage by default (cleared when the tab closes).
  // Only when the visitor explicitly ticks "keep this local profile open on
  // this device" do we mirror the session flag into localStorage instead.
  function getSession() {
    return readSession(RB_KEYS.session, null) || readLocal(RB_KEYS.session, null);
  }
  function setSession(session, keepOpen) {
    if (keepOpen) {
      writeLocal(RB_KEYS.session, session);
      removeSession(RB_KEYS.session);
    } else {
      writeSession(RB_KEYS.session, session);
      removeLocal(RB_KEYS.session);
    }
  }
  /** Logout removes the session only, the profile and saved routes stay. */
  function logout() {
    removeLocal(RB_KEYS.session);
    removeSession(RB_KEYS.session);
  }

  // ---- Saved routes ----
  function getSavedRoutes() { return readLocal(RB_KEYS.savedRoutes, []); }
  function setSavedRoutes(list) { writeLocal(RB_KEYS.savedRoutes, list); }
  function saveRoute(entry) {
    const list = getSavedRoutes();
    const exists = list.some((r) => r.routeSignature === entry.routeSignature);
    if (exists) return { added: false, reason: 'duplicate' };
    list.unshift(entry);
    setSavedRoutes(list);
    return { added: true };
  }
  function removeRoute(id) {
    const list = getSavedRoutes().filter((r) => r.id !== id);
    setSavedRoutes(list);
  }

  return {
    KEYS: RB_KEYS,
    readLocal, writeLocal, removeLocal,
    readSession, writeSession, removeSession,
    getProfile, saveProfile, clearProfile,
    getSession, setSession, logout,
    getSavedRoutes, setSavedRoutes, saveRoute, removeRoute,
  };
})();

