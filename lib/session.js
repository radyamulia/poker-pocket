// Client-side "which game am I currently in" pointer. This is a UX convenience
// for routing (skip the join form, resume after a stray back-navigation) — the
// actual identity of a session is always the playerId carried in the
// /play/[code] URL, per spec. Never used as the source of truth for game state.

const SESSION_KEY = 'pp:session';

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(code, playerId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId }));
  } catch {
    // private mode / storage disabled — join still works, just without resume
  }
}

function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

module.exports = { readSession, writeSession, clearSession };
