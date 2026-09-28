import { useEffect, useRef, useState } from 'react';
import { playBoo, playCheer, playChampionCheer, playEliminationBoo } from './sound';

const EMOJI_DURATION_MS = 1900;
const BANNER_DURATION_MS = 3500;

// Turns game.lastEvent (set by the engine on fold/all-in/showdown/elimination)
// into a transient on-screen banner, a big emoji overlay, and a sound — on
// every connected device. Combined into one hook (rather than one per effect)
// so each event only triggers its sound exactly once.
export function useHandFx(game) {
  const [banner, setBanner] = useState(null);
  const [emoji, setEmoji] = useState(null);
  const lastSeenRef = useRef(null);

  useEffect(() => {
    const event = game?.lastEvent;
    if (!event) return undefined;

    const key = JSON.stringify(event);
    if (lastSeenRef.current === key) return undefined;
    lastSeenRef.current = key;

    const playerName = (id) => game.players.find((p) => p.id === id)?.name || 'Pemain';

    let nextBanner = null;
    let nextEmoji = null;

    if (event.type === 'fold') {
      playBoo();
      nextBanner = { text: `${playerName(event.playerId)} fold 👎`, tone: 'fold' };
      nextEmoji = { icon: '👎', tone: 'fold' };
    } else if (event.type === 'allin') {
      nextBanner = { text: `${playerName(event.playerId)} ALL-IN! 🔥`, tone: 'allin' };
    } else if (event.type === 'hand_won_by_fold') {
      playCheer();
      nextBanner = { text: `${playerName(event.playerId)} menang (lawan fold semua) 🏆`, tone: 'win' };
      nextEmoji = { icon: '🏆', tone: 'win' };
    } else if (event.type === 'showdown_result') {
      playCheer();
      const names = event.winners.map(playerName).join(', ');
      nextBanner = { text: `${names} menang ${event.amountEach} chip/orang 🏆`, tone: 'win' };
      nextEmoji = { icon: '🏆', tone: 'win' };
    } else if (event.type === 'player_eliminated') {
      playEliminationBoo();
      const names = event.playerIds.map(playerName).join(', ');
      nextBanner = { text: `${names} TERELIMINASI! 💀`, tone: 'eliminated' };
      nextEmoji = { icon: '💀', tone: 'eliminated' };
    } else if (event.type === 'game_over') {
      playChampionCheer();
      nextBanner = { text: `${playerName(event.winnerId)} JUARA! 🏆🎉`, tone: 'win' };
      nextEmoji = { icon: '🏆', tone: 'champion' };
    } else if (event.type === 'game_restarted') {
      nextBanner = { text: 'Game baru dimulai — semua pemain kembali dengan chip awal 🔄', tone: 'win' };
    }

    const timers = [];
    if (nextBanner) {
      setBanner(nextBanner);
      timers.push(setTimeout(() => setBanner(null), BANNER_DURATION_MS));
    }
    if (nextEmoji) {
      setEmoji(nextEmoji);
      timers.push(setTimeout(() => setEmoji(null), EMOJI_DURATION_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [game?.lastEvent]);

  return { banner, emoji };
}
