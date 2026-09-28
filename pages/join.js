import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useRedirectToActiveSession } from '../lib/useActiveSession';

export default function JoinEntry() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const checking = useRedirectToActiveSession();

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) router.push(`/join/${trimmed}`);
  }

  if (checking) return null;

  return (
    <main className="center-screen">
      <Link href="/" className="back-link">
        ← Kembali
      </Link>
      <h1>Join a Game</h1>
      <p className="subtitle">Punya kode dari host? Masukkan di sini (atau scan QR-nya).</p>
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          Kode game
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="Contoh: AB2C9D"
            autoCapitalize="characters"
            required
            style={{ textTransform: 'uppercase' }}
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Lanjut
        </button>
      </form>
    </main>
  );
}
