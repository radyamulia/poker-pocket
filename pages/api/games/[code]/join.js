const { joinGame, toPublicGame } = require('../../../../lib/store');
const hub = require('../../../../lib/hub');

const STATUS_BY_ERROR = {
  not_found: 404,
  already_started: 409,
  invalid_name: 400,
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code } = req.query;
  const { name } = req.body || {};

  const result = joinGame(code, name);
  if (result.error) {
    res.status(STATUS_BY_ERROR[result.error] || 400).json({ error: result.error });
    return;
  }

  const publicGame = toPublicGame(result.game);
  hub.broadcast(code.toUpperCase(), { type: 'state', game: publicGame });

  res.status(201).json({ playerId: result.player.id, game: publicGame });
}
