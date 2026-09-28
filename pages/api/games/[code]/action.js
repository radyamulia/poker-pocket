const { getGame, toPublicGame } = require('../../../../lib/store');
const engine = require('../../../../lib/engine');
const hub = require('../../../../lib/hub');

const STATUS_BY_ERROR = {
  not_found: 404,
  not_in_hand: 409,
  not_your_turn: 409,
  not_active: 409,
  unknown_action: 400,
  raise_too_low: 400,
  raise_too_small: 400,
  raise_not_allowed: 400,
  insufficient_chips: 400,
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code } = req.query;
  const { playerId, action, amount } = req.body || {};

  const game = getGame(code);
  if (!game) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const result = engine.applyAction(game, playerId, action, amount);
  if (result.error) {
    res.status(STATUS_BY_ERROR[result.error] || 400).json({ error: result.error });
    return;
  }

  const publicGame = toPublicGame(result.game);
  hub.broadcast(code.toUpperCase(), { type: 'state', game: publicGame });
  res.status(200).json({ game: publicGame });
}
