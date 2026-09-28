const { WebSocketServer } = require('ws');
const { URL } = require('url');
const { getGame, toPublicGame } = require('./store');
const hub = require('./hub');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.code = (searchParams.get('code') || '').toUpperCase();
      ws.playerId = searchParams.get('playerId') || null;
      ws.role = searchParams.get('role') || 'player';
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    const { code } = ws;
    const game = getGame(code);

    if (!code || !game) {
      ws.send(JSON.stringify({ type: 'error', message: 'game_not_found' }));
      ws.close();
      return;
    }

    hub.subscribe(code, ws);
    ws.send(JSON.stringify({ type: 'state', game: toPublicGame(game) }));

    ws.on('close', () => hub.unsubscribe(code, ws));
    ws.on('error', () => hub.unsubscribe(code, ws));
  });

  // Keep connections alive across mobile networks / proxies that drop idle sockets.
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

module.exports = { setupWebSocket };
