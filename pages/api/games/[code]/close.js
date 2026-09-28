const { closeGame } = require('../../../../lib/store');
const hub = require('../../../../lib/hub');

const STATUS_BY_ERROR = {
  not_found: 404,
  not_host: 403,
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { code } = req.query;
  const { hostId } = req.body || {};

  const result = closeGame(code, hostId);
  if (result.error) {
    res.status(STATUS_BY_ERROR[result.error] || 400).json({ error: result.error });
    return;
  }

  hub.closeRoom(code.toUpperCase(), { type: 'room_closed' });
  res.status(200).json({ ok: true });
}
