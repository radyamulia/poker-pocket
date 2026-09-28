// Real sound effects (Mixkit — free for commercial/personal use, no
// attribution required) served from /public/sounds. Playback is client-only;
// every function below is a safe no-op on the server or if audio fails to
// load (autoplay-blocked, offline asset, etc).
//
// `maxMs` lets us use a longer source clip (e.g. a 20s crowd-boo ambience)
// but only actually play a short excerpt of it — keeps sound effects snappy
// even when the source file itself runs long.

function play(src, { volume = 0.6, maxMs, playbackRate } = {}) {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    if (playbackRate) audio.playbackRate = playbackRate;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    if (maxMs) {
      setTimeout(() => {
        audio.pause();
      }, maxMs);
    }
  } catch {
    // never let sound effects break gameplay
  }
}

export function playBoo() {
  play('/sounds/boo.mp3', { volume: 0.5, maxMs: 1400 });
}

// Longer, lower-pitched boo for elimination — reads as more dramatic than a
// regular fold boo, per the spec's "boo lebih dramatis" ask.
export function playEliminationBoo() {
  play('/sounds/boo.mp3', { volume: 0.6, maxMs: 2600, playbackRate: 0.8 });
}

export function playCheer() {
  play('/sounds/clap-win.mp3', { volume: 0.55 });
}

// Bigger applause for winning the whole tournament.
export function playChampionCheer() {
  play('/sounds/clap-champion.mp3', { volume: 0.6 });
}

export function playCardFlip() {
  play('/sounds/card-flip.mp3', { volume: 0.35, maxMs: 500 });
}
