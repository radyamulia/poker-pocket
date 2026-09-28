import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { writeSession } from '../../lib/session';
import { useRedirectToActiveSession } from '../../lib/useActiveSession';

const ERROR_MESSAGES = {
  not_found: 'Kode game tidak ditemukan.',
  already_started: 'Game sudah dimulai, tidak bisa join.',
  invalid_name: 'Nama tidak boleh kosong.',
};

export default function JoinGame() {
  const router = useRouter();
  const { code } = router.query;
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const checking = useRedirectToActiveSession();
  // 'checking' | 'valid' | 'not_found' | 'already_started'
  const [codeStatus, setCodeStatus] = useState('checking');

  useEffect(() => {
    if (!code || checking) return undefined;
    let cancelled = false;
    setCodeStatus('checking');

    fetch(`/api/games/${code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
      .then((data) => {
        if (cancelled) return;
        setCodeStatus(data.game.status === 'lobby' ? 'valid' : 'already_started');
      })
      .catch(() => {
        if (!cancelled) setCodeStatus('not_found');
      });

    return () => {
      cancelled = true;
    };
  }, [code, checking]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'unknown');
      writeSession(code, data.playerId);
      router.replace(`/play/${code}?playerId=${data.playerId}`);
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || 'Gagal join. Coba lagi.');
      setLoading(false);
    }
  }

  if (!code || checking || codeStatus === 'checking') return null;

  if (codeStatus === 'not_found') {
    return (
      <main className="center-screen">
        <h1>Kode tidak valid</h1>
        <p className="muted">Kode "{code}" tidak ditemukan. Cek lagi kode dari host, atau scan ulang QR-nya.</p>
        <Link href="/join" className="btn btn-primary">
          Coba kode lain
        </Link>
      </main>
    );
  }

  if (codeStatus === 'already_started') {
    return (
      <main className="center-screen">
        <h1>Game sudah dimulai</h1>
        <p className="muted">Game dengan kode "{code}" sudah berjalan, tidak bisa join lagi.</p>
        <Link href="/join" className="btn btn-primary">
          Coba kode lain
        </Link>
      </main>
    );
  }

  return (
    <main className="center-screen">
      <h1>Join Game {code}</h1>
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          Nama kamu
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            required
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Bergabung...' : 'Gabung'}
        </button>
      </form>
    </main>
  );
}
