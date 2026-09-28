const { getGame, removePlayer, toPublicGame } = require('../../../../lib/store');
const hub = require('../../../../lib/hub');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code } = req.query;
  const { hostId, playerId } = req.body || {};

  const game = getGame(code);
  if (!game) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (!hostId || hostId !== game.hostId) {
    res.status(403).json({ error: 'not_host' });
    return;
  }
  if (!playerId) {
    res.status(400).json({ error: 'missing_player' });
    return;
  }
  if (game.status !== 'lobby') {
    // Removing a player mid-hand would leave stale ids in the turn engine's
    // seatOrder/toAct arrays. Kicking is a lobby-only action for now.
    res.status(409).json({ error: 'game_in_progress' });
    return;
  }

  const result = removePlayer(code, playerId);
  if (result.error) {
    res.status(404).json({ error: result.error });
    return;
  }

  const normalizedCode = code.toUpperCase();
  const publicGame = toPublicGame(result.game);

  hub.disconnectPlayer(normalizedCode, playerId, { type: 'kicked' });
  hub.broadcast(normalizedCode, { type: 'state', game: publicGame });

  res.status(200).json({ game: publicGame });
}
