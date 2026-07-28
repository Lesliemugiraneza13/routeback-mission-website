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
  // Purpose: Reads a JSON value from localStorage and falls back when the data is missing or invalid.
  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  // Purpose: Writes a JSON value to localStorage while tolerating storage failures.
  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) { /* storage unavailable, fail silently, feature degrades gracefully */ }
  }
  // Purpose: Removes a localStorage value for the given key.
  function removeLocal(key) {
    try { localStorage.removeItem(key); } catch (err) { /* ignore */ }
  }
  // Purpose: Reads a JSON value from sessionStorage and falls back when unavailable.
  function readSession(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) { return fallback; }
  }
  // Purpose: Writes a JSON value to sessionStorage while tolerating storage failures.
  function writeSession(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* ignore */ }
  }
  // Purpose: Removes a sessionStorage value for the given key.
  function removeSession(key) {
    try { sessionStorage.removeItem(key); } catch (err) { /* ignore */ }
  }

  // ---- Profile ----
  // Purpose: Returns the stored profile object if one exists.
  function getProfile() { return readLocal(RB_KEYS.profile, null); }
  // Purpose: Saves the current profile object to local storage.
  function saveProfile(profile) { writeLocal(RB_KEYS.profile, profile); }
  // Purpose: Clears the profile and related session or saved-route data from storage.
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
  // Purpose: Returns the active session object from sessionStorage or localStorage.
  function getSession() {
    return readSession(RB_KEYS.session, null) || readLocal(RB_KEYS.session, null);
  }
  // Purpose: Stores the current session, either for the active tab or for later reuse on this device.
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
  // Purpose: Removes the current session without deleting the saved profile or routes.
  function logout() {
    removeLocal(RB_KEYS.session);
    removeSession(RB_KEYS.session);
  }

  // ---- Saved routes ----
  // Purpose: Returns the list of saved routes from local storage.
  function getSavedRoutes() { return readLocal(RB_KEYS.savedRoutes, []); }
  // Purpose: Saves the complete list of saved routes back to local storage.
  function setSavedRoutes(list) { writeLocal(RB_KEYS.savedRoutes, list); }
  // Purpose: Adds a new route to the saved list when it is not already present.
  function saveRoute(entry) {
    const list = getSavedRoutes();
    const exists = list.some((r) => r.routeSignature === entry.routeSignature);
    if (exists) return { added: false, reason: 'duplicate' };
    list.unshift(entry);
    setSavedRoutes(list);
    return { added: true };
  }
  // Purpose: Removes a saved route by its identifier from storage.
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

