const { createServer } = require('http');
const next = require('next');
const { setupWebSocket } = require('./lib/ws');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  setupWebSocket(server);

  server.listen(port, () => {
    console.log(`> Poker Pocket ready on http://localhost:${port}`);
  });
});
