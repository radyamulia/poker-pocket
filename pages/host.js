import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { writeHostSession } from '../lib/hostSession';
import { useRedirectToActiveHostSession } from '../lib/useActiveHostSession';

export default function HostSetup() {
  const router = useRouter();
  const [buyIn, setBuyIn] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const checking = useRedirectToActiveHostSession();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyIn: Number(buyIn) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'unknown');
      writeHostSession(data.code, data.hostId);
      router.replace(`/host/${data.code}?hostId=${data.hostId}`);
    } catch (err) {
      setError('Gagal membuat game. Coba lagi.');
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <main className="center-screen">
      <Link href="/" className="back-link">
        ← Kembali
      </Link>
      <h1>Host a Game</h1>
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          Buy-in awal (chip)
          <input
            type="number"
            min="1"
            step="1"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Membuat game...' : 'Buat Game'}
        </button>
      </form>
    </main>
  );
}
