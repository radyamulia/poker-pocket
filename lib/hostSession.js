// Client-side "which room am I hosting" pointer — same idea as lib/session.js
// but for the host device, so pressing back / reopening the app doesn't spin
// up a second room. Routing convenience only; the server already trusts the
// hostId itself for authorization.

const HOST_SESSION_KEY = 'pp:hostSession';

function readHostSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HOST_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeHostSession(code, hostId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HOST_SESSION_KEY, JSON.stringify({ code, hostId }));
  } catch {
    // private mode / storage disabled — hosting still works, just without resume
  }
}

function clearHostSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HOST_SESSION_KEY);
  } catch {
    // ignore
  }
}

module.exports = { readHostSession, writeHostSession, clearHostSession };
