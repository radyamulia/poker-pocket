// In-memory game store (MVP: no database, single Node process, lives in RAM only).
//
// State lives on `globalThis` rather than a plain module-level variable: Next.js
// bundles API routes (pages/api/**) through its own webpack build, separate from
// the plain `require()` used by server.js, so the same file can end up loaded as
// two distinct module instances. globalThis is the one thing both copies share.

const globalStore = globalThis.__pokerPocketStore || (globalThis.__pokerPocketStore = { games: new Map() });
const games = globalStore.games;
const engine = require('./engine');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, easier to read aloud

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (games.has(code));
  return code;
}

function generateId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function createGame(buyIn) {
  const code = generateCode();
  const hostId = generateId();
  const game = {
    code,
    hostId,
    buyIn,
    status: 'lobby', // 'lobby' | 'in_hand' | 'hand_complete' | 'finished'
    players: [],
    seatOrder: [],
    dealerSeat: null,
    smallBlind: null,
    bigBlind: null,
    stage: null, // 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game_over'
    pot: 0,
    pots: [],
    communityCards: [], // decorative only — see lib/engine.js
    currentBet: 0,
    minRaise: 0,
    toAct: [],
    raiseAllowed: [],
    currentTurnPlayerId: null,
    roundComplete: false,
    lastEvent: null,
    handNumber: 0,
    createdAt: Date.now(),
  };
  games.set(code, game);
  return game;
}

function getGame(code) {
  if (!code) return undefined;
  return games.get(code.toUpperCase());
}

function joinGame(code, name) {
  const game = getGame(code);
  if (!game) return { error: 'not_found' };
  if (game.status !== 'lobby') return { error: 'already_started' };

  const trimmed = (name || '').trim().slice(0, 24);
  if (!trimmed) return { error: 'invalid_name' };

  const player = {
    id: generateId(),
    name: trimmed,
    chips: game.buyIn,
    status: 'active',
    seat: null,
    currentBet: 0,
    handContribution: 0,
    joinedAt: Date.now(),
  };
  game.players.push(player);
  return { game, player };
}

function removePlayer(code, playerId) {
  const game = getGame(code);
  if (!game) return { error: 'not_found' };

  const idx = game.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return { error: 'player_not_found' };

  const [removed] = game.players.splice(idx, 1);
  return { game, removed };
}

function closeGame(code, hostId) {
  const game = getGame(code);
  if (!game) return { error: 'not_found' };
  if (!hostId || hostId !== game.hostId) return { error: 'not_host' };

  games.delete(game.code);
  return { game };
}

function toPublicGame(game) {
  const { dealerId, sbId, bbId } = engine.getBlindSeats(game);

  return {
    code: game.code,
    buyIn: game.buyIn,
    status: game.status,
    stage: game.stage,
    pot: game.pot,
    pots: game.pots,
    communityCards: game.communityCards,
    currentBet: game.currentBet,
    minRaise: game.minRaise,
    smallBlind: game.smallBlind,
    bigBlind: game.bigBlind,
    currentTurnPlayerId: game.currentTurnPlayerId,
    roundComplete: game.roundComplete,
    lastEvent: game.lastEvent,
    handNumber: game.handNumber,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      status: p.status,
      seat: p.seat,
      currentBet: p.currentBet,
      isDealer: p.id === dealerId,
      isSmallBlind: p.id === sbId,
      isBigBlind: p.id === bbId,
    })),
  };
}

module.exports = { games, createGame, getGame, joinGame, removePlayer, closeGame, toPublicGame };
