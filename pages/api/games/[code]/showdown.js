const { getGame, toPublicGame } = require('../../../../lib/store');
const engine = require('../../../../lib/engine');
const hub = require('../../../../lib/hub');

const STATUS_BY_ERROR = {
  not_found: 404,
  not_host: 403,
  not_at_showdown: 409,
  no_pending_pot: 409,
  no_winners: 400,
  invalid_winner: 400,
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code } = req.query;
  const { hostId, winnerIds } = req.body || {};

  const game = getGame(code);
  if (!game) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (!hostId || hostId !== game.hostId) {
    res.status(403).json({ error: 'not_host' });
    return;
  }

  const result = engine.resolveShowdown(game, winnerIds);
  if (result.error) {
    res.status(STATUS_BY_ERROR[result.error] || 400).json({ error: result.error });
    return;
  }

  const publicGame = toPublicGame(result.game);
  hub.broadcast(code.toUpperCase(), { type: 'state', game: publicGame });
  res.status(200).json({ game: publicGame });
}
