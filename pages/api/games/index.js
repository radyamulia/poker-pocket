const { createGame, toPublicGame } = require('../../../lib/store');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const buyIn = Math.round(Number(req.body?.buyIn));
  if (!Number.isFinite(buyIn) || buyIn <= 0) {
    res.status(400).json({ error: 'invalid_buyin' });
    return;
  }

  const game = createGame(buyIn);
  res.status(201).json({ code: game.code, hostId: game.hostId, game: toPublicGame(game) });
}
