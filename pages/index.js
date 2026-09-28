import Link from 'next/link';
import { useRedirectToActiveSession } from '../lib/useActiveSession';
import { useRedirectToActiveHostSession } from '../lib/useActiveHostSession';

export default function Home() {
  const checkingPlayerSession = useRedirectToActiveSession();
  const checkingHostSession = useRedirectToActiveHostSession();
  if (checkingPlayerSession || checkingHostSession) return null;

  return (
    <main className="center-screen">
      <h1>Poker Pocket</h1>
      <p className="subtitle">Chip tracker buat poker rumahan — nggak perlu install apa-apa.</p>
      <div className="stack">
        <Link href="/host" className="btn btn-primary">
          Host a Game
        </Link>
        <Link href="/join" className="btn btn-secondary">
          Join a Game
        </Link>
      </div>
    </main>
  );
}
