import { useRef, useState } from 'react';

// Looping background music for the host device only. Browsers block
// autoplay-with-sound until a user gesture, so this is a toggle the host
// taps once at the start of the session rather than something that plays
// automatically on page load.
export default function BgmToggle() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.volume = 0.22;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    setPlaying(true);
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src="/sounds/host-bgm.mp3" loop preload="none" />
      <button
        type="button"
        className="bgm-toggle"
        onClick={toggle}
        aria-label={playing ? 'Matikan musik latar' : 'Nyalakan musik latar'}
      >
        {playing ? '🔊 Musik' : '🔈 Musik'}
      </button>
    </>
  );
}
