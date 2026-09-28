// Broadcast hub: tracks which WebSocket clients are subscribed to which game code.
// Needs to be reachable from both the ws upgrade handler in server.js (plain
// require) and the Next.js API routes (webpack-bundled separately), so state
// lives on globalThis rather than a module-level variable — see lib/store.js
// for why that matters.

const globalHub = globalThis.__pokerPocketHub || (globalThis.__pokerPocketHub = { rooms: new Map() });
const rooms = globalHub.rooms; // code -> Set<ws>

function subscribe(code, ws) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  rooms.get(code).add(ws);
}

function unsubscribe(code, ws) {
  const room = rooms.get(code);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(code);
}

function broadcast(code, payload) {
  const room = rooms.get(code);
  if (!room || room.size === 0) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.readyState === 1 /* OPEN */) client.send(data);
  }
}

// Sends `payload` to the one connection matching playerId (if any is currently
// connected), then closes it — used to tell a kicked player before dropping them.
function disconnectPlayer(code, playerId, payload) {
  const room = rooms.get(code);
  if (!room) return;
  for (const client of room) {
    if (client.playerId !== playerId) continue;
    if (payload && client.readyState === 1 /* OPEN */) client.send(JSON.stringify(payload));
    client.close();
    room.delete(client);
  }
  if (room.size === 0) rooms.delete(code);
}

// Tells everyone still connected to `code` (host and players) that the room
// is gone, then drops every connection and forgets the room entirely.
function closeRoom(code, payload) {
  const room = rooms.get(code);
  if (!room) return;
  const data = payload ? JSON.stringify(payload) : null;
  for (const client of room) {
    if (data && client.readyState === 1 /* OPEN */) client.send(data);
    client.close();
  }
  rooms.delete(code);
}

module.exports = { subscribe, unsubscribe, broadcast, disconnectPlayer, closeRoom };
