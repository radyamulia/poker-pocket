import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { clearSession } from '../../lib/session';
import { useHandFx } from '../../lib/useHandFx';
import { readCachedGame, writeCachedGame } from '../../lib/gameCache';
import GuideModal from '../../components/GuideModal';
import EmojiOverlay from '../../components/EmojiOverlay';

const ACTION_ERROR_MESSAGES = {
  not_your_turn: 'Belum giliranmu.',
  not_active: 'Kamu tidak bisa beraksi sekarang.',
  not_in_hand: 'Belum ada hand yang berjalan.',
  raise_too_low: 'Jumlah raise harus lebih besar dari taruhan tertinggi.',
  raise_too_small: 'Raise minimal segini (lihat minimum raise di layar).',
  raise_not_allowed: 'Kamu tidak bisa raise lagi ronde ini (ada all-in kecil sebelumnya) — call atau fold saja.',
  insufficient_chips: 'Chip kamu tidak cukup untuk jumlah itu.',
};

const STAGE_LABELS = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  hand_complete: 'Hand Selesai',
  game_over: 'Game Selesai',
};

export default function PlayGame() {
  const router = useRouter();
  const { code, playerId } = router.query;
  const [game, setGame] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [kicked, setKicked] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [actionError, setActionError] = useState('');
  const [raiseAmount, setRaiseAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { banner, emoji } = useHandFx(game);

  useEffect(() => {
    if (!code || !playerId) return undefined;
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
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/ws?code=${code}&role=player&playerId=${playerId}`
    );

    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('error');
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'state') {
        setGame(msg.game);
        writeCachedGame(code, msg.game);
      }
      if (msg.type === 'kicked') {
        clearSession();
        setKicked(true);
      }
      if (msg.type === 'room_closed') {
        clearSession();
        setRoomClosed(true);
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [code, playerId]);

  useEffect(() => {
    if (!kicked && !roomClosed) return undefined;
    const timer = setTimeout(() => router.replace('/'), 3000);
    return () => clearTimeout(timer);
  }, [kicked, roomClosed]);

  const me = game?.players.find((p) => p.id === playerId);
  const isMyTurn = game?.status === 'in_hand' && game.currentTurnPlayerId === playerId;
  const amountToCall = me ? Math.max(0, (game?.currentBet || 0) - (me.currentBet || 0)) : 0;
  const minRaiseTo = (game?.currentBet || 0) + (game?.minRaise || 0);
  const maxRaiseTo = me ? me.chips + me.currentBet : 0;

  useEffect(() => {
    if (isMyTurn) setRaiseAmount(String(Math.min(minRaiseTo, maxRaiseTo)));
  }, [isMyTurn, minRaiseTo, maxRaiseTo]);

  async function sendAction(action, amount) {
    if (submitting) return;
    setActionError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/games/${code}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(ACTION_ERROR_MESSAGES[data.error] || 'Aksi gagal. Coba lagi.');
      }
    } catch {
      setActionError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!code || !playerId) return null;

  if (kicked) {
    return (
      <main className="center-screen">
        <h1>Kamu dikeluarkan dari game</h1>
        <p className="muted">Host mengeluarkanmu dari sesi ini. Mengarahkan ke menu utama...</p>
      </main>
    );
  }

  if (roomClosed) {
    return (
      <main className="center-screen">
        <h1>Room ditutup</h1>
        <p className="muted">Host menutup room ini. Mengarahkan ke menu utama...</p>
      </main>
    );
  }

  if (game?.status === 'finished') {
    const isChampion = game.lastEvent?.winnerId === playerId;
    return (
      <main className="center-screen">
        <GuideModal />
        {banner && <div className={`event-banner event-banner-${banner.tone}`}>{banner.text}</div>}
        <EmojiOverlay emoji={emoji} />
        <h1>{isChampion ? '🏆 Kamu Juara!' : 'Game Selesai'}</h1>
        <p className="muted">
          {isChampion
            ? 'Semua pemain lain sudah tereliminasi.'
            : `${game.players.find((p) => p.id === game.lastEvent?.winnerId)?.name || 'Pemain lain'} jadi juara turnamen ini.`}
        </p>
      </main>
    );
  }

  const inHand = game?.status === 'in_hand';
  const potRemaining = game?.stage === 'showdown' ? (game.pots || []).reduce((sum, p) => sum + p.amount, 0) : game?.pot;

  return (
    <main className={`center-screen ${isMyTurn ? 'turn-active' : ''}`}>
      <GuideModal />
      {banner && <div className={`event-banner event-banner-${banner.tone}`}>{banner.text}</div>}
      <EmojiOverlay emoji={emoji} />
      <p className="ws-status">{wsStatus === 'connected' ? '🟢 Live' : '🟡 Menghubungkan...'}</p>
      <h1>{me ? me.name : 'Menunggu data...'}</h1>

      <div className="wallet-card">
        <p className="wallet-label">Chip kamu</p>
        <p className="wallet-value">{me ? me.chips : '-'}</p>
        {me?.status === 'folded' && <p className="status-tag status-folded">Folded</p>}
        {me?.status === 'allin' && <p className="status-tag status-allin">All-in</p>}
        {me?.status === 'eliminated' && <p className="status-tag status-eliminated">Tereliminasi</p>}
      </div>

      {!game || game.status === 'lobby' ? (
        <p className="muted">
          Menunggu host memulai game... ({game?.players.length ?? 0} pemain sudah join)
        </p>
      ) : (
        <>
          <p className="stage-badge">{STAGE_LABELS[game.stage] || game.stage}</p>
          <p className="muted">
            Pot: <strong>{potRemaining}</strong> · Taruhan tertinggi: <strong>{game.currentBet}</strong>
          </p>

          {inHand && me?.status === 'active' && (
            <div className="stack action-panel">
              {isMyTurn ? (
                <p className="turn-hint">Giliranmu! {amountToCall > 0 ? `Call ${amountToCall} chip.` : 'Bisa check.'}</p>
              ) : (
                <p className="muted small">Menunggu pemain lain...</p>
              )}

              <div className="action-buttons">
                <button
                  type="button"
                  className="btn btn-fold"
                  disabled={!isMyTurn || submitting}
                  onClick={() => sendAction('fold')}
                >
                  Fold
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!isMyTurn || submitting}
                  onClick={() => sendAction('call')}
                >
                  {amountToCall > 0 ? `Call ${amountToCall}` : 'Check'}
                </button>
              </div>

              <div className="raise-row">
                <input
                  type="number"
                  min={minRaiseTo}
                  max={maxRaiseTo}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  disabled={!isMyTurn || submitting}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!isMyTurn || submitting}
                  onClick={() => sendAction('raise', Number(raiseAmount))}
                >
                  Raise to {raiseAmount || minRaiseTo}
                </button>
              </div>
              <button
                type="button"
                className="btn-allin"
                disabled={!isMyTurn || submitting || maxRaiseTo <= (game.currentBet || 0)}
                onClick={() => sendAction('raise', maxRaiseTo)}
              >
                All-in ({maxRaiseTo})
              </button>

              {actionError && <p className="error">{actionError}</p>}
            </div>
          )}

          {game.status === 'hand_complete' && (
            <p className="muted small">Hand selesai. Menunggu host memulai hand berikutnya...</p>
          )}
          {game.stage === 'showdown' && (game.pots || []).length > 0 && (
            <p className="muted small">Menunggu host menentukan pemenang pot...</p>
          )}
        </>
      )}
    </main>
  );
}
