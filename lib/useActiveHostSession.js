import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { readHostSession, clearHostSession } from './hostSession';

// Guards the main menu / "Host a Game" form: if this browser already has a
// room open (verified against the server), skip straight to that room's
// lobby/table instead of letting the host spin up a second one.
export function useRedirectToActiveHostSession() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const session = readHostSession();
    if (!session) {
      setChecking(false);
      return undefined;
    }

    fetch(`/api/games/${session.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.game) {
          router.replace(`/host/${session.code}?hostId=${session.hostId}`);
          return;
        }
        clearHostSession();
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
