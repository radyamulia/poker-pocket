// Big full-screen emoji burst (trophy on a win, thumbs-down on a fold, skull
// on elimination) — purely a visual sting, never blocks clicks underneath
// (pointer-events: none) and clears itself via the useHandFx hook's timer.
export default function EmojiOverlay({ emoji }) {
  if (!emoji) return null;

  return (
    <div className={`emoji-overlay emoji-overlay-${emoji.tone}`}>
      <span className="emoji-overlay-icon">{emoji.icon}</span>
    </div>
  );
}
