// Per-code snapshot of the last game state received, used ONLY to render
// something instantly on reload/reconnect (flaky mobile networks) before the
// fresh GET + WebSocket connection lands. Never the source of truth — every
// value here gets overwritten the moment real data arrives.

function cacheKey(code) {
  return `pp:gameCache:${code}`;
}

function readCachedGame(code) {
  if (typeof window === 'undefined' || !code) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedGame(code, game) {
  if (typeof window === 'undefined' || !code || !game) return;
  try {
    window.localStorage.setItem(cacheKey(code), JSON.stringify(game));
  } catch {
    // storage full/disabled — instant-render-on-reload just won't happen
  }
}

module.exports = { readCachedGame, writeCachedGame };
