import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import QRCode from 'qrcode';
import { useHandFx } from '../../lib/useHandFx';
import { clearHostSession } from '../../lib/hostSession';
import { readCachedGame, writeCachedGame } from '../../lib/gameCache';
import CommunityCards from '../../components/CommunityCards';
import GuideModal from '../../components/GuideModal';
import BgmToggle from '../../components/BgmToggle';
import EmojiOverlay from '../../components/EmojiOverlay';

const STAGE_LABELS = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  hand_complete: 'Hand Selesai',
  game_over: 'Game Selesai',
};

const STAGE_ORDER = ['preflop', 'flop', 'turn', 'river', 'showdown'];

const STATUS_LABELS = {
  active: '',
  folded: 'Folded',
  allin: 'All-in',
  eliminated: 'Eliminated',
};

export default function HostLobby() {
  const router = useRouter();
  const { code, hostId } = router.query;
  const [game, setGame] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [wsStatus, setWsStatus] = useState('connecting');
  const [kickingId, setKickingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectedWinners, setSelectedWinners] = useState([]);
  const [closed, setClosed] = useState(false);
  const wsRef = useRef(null);
  const { banner, emoji } = useHandFx(game);

  useEffect(() => {
    if (!code || typeof window === 'undefined') return;
    const joinUrl = `${window.location.origin}/join/${code}`;
    QRCode.toDataURL(joinUrl, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [code]);

  useEffect(() => {
    if (!code) return undefined;
    let cancelled = false;

    const cached = readCachedGame(code);
    if (cached) setGame(cached);

    fetch(`/api/games/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.game) setGame(data.game);
      })
      .catch(() => {});

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws?code=${code}&role=host`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('error');
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'state') {
        setGame(msg.game);
        writeCachedGame(code, msg.game);
      }
      if (msg.type === 'room_closed') {
        clearHostSession();
        setClosed(true);
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [code]);

  useEffect(() => {
    if (!closed) return undefined;
    const timer = setTimeout(() => router.replace('/'), 2000);
    return () => clearTimeout(timer);
  }, [closed]);

  const currentPot = game?.pots?.[0] || null;

  useEffect(() => {
    setSelectedWinners([]);
  }, [currentPot?.amount, game?.pots?.length]);

  async function handleKick(player) {
    if (!hostId) return;
    if (!window.confirm(`Kick ${player.name} dari game?`)) return;
    setKickingId(player.id);
    try {
      await fetch(`/api/games/${code}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, playerId: player.id }),
      });
    } finally {
      setKickingId(null);
    }
  }

  async function callHostAction(path, extraBody) {
    if (busy) return null;
    setActionError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${code}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, ...extraBody }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error || 'Gagal. Coba lagi.');
      return data;
    } catch {
      setActionError('Koneksi bermasalah. Coba lagi.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  function toggleWinner(playerId) {
    setSelectedWinners((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  }

  async function handleCloseRoom() {
    if (!hostId || busy) return;
    if (!window.confirm('Tutup room ini? Semua pemain akan dikeluarkan dan kode ini tidak bisa dipakai lagi.')) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/games/${code}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId }),
      });
      clearHostSession();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  if (!code) return null;

  if (closed) {
    return (
      <main className="center-screen">
        <h1>Room ditutup</h1>
        <p className="muted">Mengarahkan ke menu utama...</p>
      </main>
    );
  }

  const playerCount = game?.players.length ?? 0;
  const inLobby = !game || game.status === 'lobby';
  const isFinished = game?.status === 'finished';
  const champion = isFinished ? game.players.find((p) => p.id === game.lastEvent?.winnerId) : null;
  const totalPots = game?.pots?.length ?? 0;

  return (
    <main className="center-screen host-bg">
      <GuideModal />
      <BgmToggle />
      {banner && <div className={`event-banner event-banner-${banner.tone}`}>{banner.text}</div>}
      <EmojiOverlay emoji={emoji} />
      <p className="ws-status">{wsStatus === 'connected' ? '🟢 Live' : '🟡 Menghubungkan...'}</p>

      {isFinished ? (
        <>
          <h1>🏆 {champion ? champion.name : 'Juara'} menang turnamen!</h1>
          <p className="muted">Semua pemain lain sudah tereliminasi.</p>
        </>
      ) : (
        <h1>{inLobby ? 'Lobby Host' : `Meja — Hand #${game.handNumber}`}</h1>
      )}

      {inLobby && (
        <div className="join-card">
          {qrDataUrl && <img src={qrDataUrl} alt="QR untuk join game" width={200} height={200} />}
          <p className="join-code">
            Kode: <strong>{code}</strong>
          </p>
          <p className="join-hint">Scan QR atau buka poker-pocket dan masukkan kode ini.</p>
        </div>
      )}

      {!inLobby && !isFinished && (
        <>
          <p className="stage-badge">
            {STAGE_LABELS[game.stage] || game.stage} · Pot: <strong>{game.pot}</strong> · Taruhan
            tertinggi: <strong>{game.currentBet}</strong>
          </p>
          <CommunityCards cards={game.communityCards} stage={game.stage} />
        </>
      )}

      {game?.stage === 'showdown' && currentPot && (
        <p className="stage-badge">
          Pot {totalPots > 1 ? `(sisa ${totalPots})` : ''}: <strong>{currentPot.amount}</strong> chip · Berhak
          menang: {currentPot.eligiblePlayerIds.length} pemain
        </p>
      )}

      <section className="player-list">
        <h2>Pemain ({playerCount})</h2>
        {playerCount === 0 && <p className="muted">Menunggu pemain join...</p>}
        <ul>
          {game?.players.map((p) => (
            <li
              key={p.id}
              className={`player-row ${game.currentTurnPlayerId === p.id ? 'player-row-turn' : ''}`}
            >
              <span>
                {p.name} — {p.chips} chip
                {!inLobby && p.currentBet > 0 ? ` (taruh ${p.currentBet})` : ''}
                {p.isDealer ? ' 🔘D' : ''}
                {p.isSmallBlind ? ' SB' : ''}
                {p.isBigBlind ? ' BB' : ''}
                {STATUS_LABELS[p.status] ? ` · ${STATUS_LABELS[p.status]}` : ''}
              </span>
              {inLobby && (
                <button
                  type="button"
                  className="btn-kick"
                  onClick={() => handleKick(p)}
                  disabled={kickingId === p.id}
                >
                  {kickingId === p.id ? '...' : 'Kick'}
                </button>
              )}
              {game.stage === 'showdown' && currentPot?.eligiblePlayerIds.includes(p.id) && (
                <label className="winner-check">
                  <input
                    type="checkbox"
                    checked={selectedWinners.includes(p.id)}
                    onChange={() => toggleWinner(p.id)}
                  />
                  Menang
                </label>
              )}
            </li>
          ))}
        </ul>
      </section>

      {actionError && <p className="error">{actionError}</p>}

      {inLobby && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={playerCount < 2 || busy}
          onClick={() => callHostAction('start')}
        >
          Mulai Game {playerCount < 2 ? '(min. 2 pemain)' : ''}
        </button>
      )}

      {game?.status === 'in_hand' && game.stage !== 'showdown' && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!game.roundComplete || busy}
          onClick={() => callHostAction('reveal')}
        >
          {/* This button reveals the NEXT stage's card(s), not the current one — the
              current stage's card(s) were already shown by the previous click. */}
          Reveal {STAGE_LABELS[STAGE_ORDER[STAGE_ORDER.indexOf(game.stage) + 1]]} →{' '}
          {game.roundComplete ? 'lanjut' : '(menunggu aksi pemain)'}
        </button>
      )}

      {game?.stage === 'showdown' && currentPot && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={selectedWinners.length === 0 || busy}
          onClick={() => callHostAction('showdown', { winnerIds: selectedWinners })}
        >
          Bagikan Pot Ini ke {selectedWinners.length || '...'} pemenang
        </button>
      )}

      {game?.status === 'hand_complete' && (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => callHostAction('next-hand')}>
          Next Hand
        </button>
      )}

      {isFinished && (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => callHostAction('play-again')}>
          Main Lagi (semua pemain kembali dengan chip awal)
        </button>
      )}

      <button type="button" className="btn-close-room" onClick={handleCloseRoom} disabled={busy}>
        Tutup Room
      </button>
    </main>
  );
}
