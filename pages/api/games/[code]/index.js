const { getGame, toPublicGame } = require('../../../../lib/store');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code } = req.query;
  const game = getGame(code);
  if (!game) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.status(200).json({ game: toPublicGame(game) });
}
