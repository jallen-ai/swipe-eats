// Remembers the user's last active group session in localStorage so we can
// show a "Return to your group" card on the home screen. Cleared automatically
// when the stored session is older than the server-side expiry window.

const STORAGE_KEY = 'swipeEats.activeSession';
// Sessions expire at 2h server-side; 3h here covers clock skew and one quick
// pass before the validation query runs.
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

export function saveActiveSession(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, savedAt: Date.now() }));
  } catch {}
}

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.sessionId) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.sessionId;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
