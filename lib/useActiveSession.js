import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { readSession, clearSession } from './session';

// Guards main-menu / join pages: if this browser already has a live session
// (verified against the server, not just trusted from localStorage), redirect
// straight into /play/[code] instead of letting the player start a new join
// and end up double-counted in the player list.
export function useRedirectToActiveSession() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const session = readSession();
    if (!session) {
      setChecking(false);
      return undefined;
    }

    fetch(`/api/games/${session.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const stillInGame = data?.game?.players.some((p) => p.id === session.playerId);
        if (stillInGame) {
          router.replace(`/play/${session.code}?playerId=${session.playerId}`);
          return;
        }
        clearSession();
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return checking;
}
