// No-Limit Hold'em turn engine: starting a hand, applying player actions
// (fold/call/raise), detecting when a betting round is settled, stepping
// through reveal stages, splitting the pot (with side pots for uneven
// all-ins) at showdown, eliminating busted players, and moving to the next
// hand until one player remains.

const STAGES = ['preflop', 'flop', 'turn', 'river', 'showdown'];

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function computeBlinds(buyIn) {
  const smallBlind = Math.max(1, Math.round(buyIn / 100));
  return { smallBlind, bigBlind: smallBlind * 2 };
}

const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_SUITS = ['♠', '♥', '♦', '♣'];

// Purely decorative: the physical cards on the table are what actually
// determine the hand (see spec non-goals — no virtual dealing/evaluation).
// These five cards just give the host screen something to reveal alongside
// each street, with zero bearing on payouts or winner selection.
function drawCommunityCards() {
  const deck = [];
  for (const suit of CARD_SUITS) {
    for (const rank of CARD_RANKS) deck.push({ rank, suit });
  }
  return shuffle(deck).slice(0, 5);
}

function findPlayer(game, playerId) {
  return game.players.find((p) => p.id === playerId);
}

// Players still holding cards this hand (didn't fold, weren't eliminated).
function livePlayers(game) {
  return game.players.filter((p) => p.status === 'active' || p.status === 'allin');
}

// Players who can still make a betting decision (have chips, haven't folded/gone all-in).
function actablePlayers(game) {
  return game.players.filter((p) => p.status === 'active');
}

// Players still in the tournament (may be sitting out a hand they can't act in, but not busted).
function tournamentPlayers(game) {
  return game.players.filter((p) => p.status !== 'eliminated');
}

// Walks the table clockwise starting at `seatIndex`, returning the id of every
// player (in order) for whom `filterFn` is true. One full lap, each seat once.
function orderFromSeat(game, seatIndex, filterFn) {
  const n = game.seatOrder.length;
  const ordered = [];
  for (let i = 0; i < n; i += 1) {
    const idx = (seatIndex + i) % n;
    const playerId = game.seatOrder[idx];
    const player = findPlayer(game, playerId);
    if (player && filterFn(player)) ordered.push(playerId);
  }
  return ordered;
}

function seatAfter(game, seat) {
  return (seat + 1) % game.seatOrder.length;
}

// Next seat (clockwise from `fromSeat`, exclusive) occupied by a player still
// in the tournament — used for the dealer button, which must skip busted seats.
function nextTournamentSeat(game, fromSeat) {
  const n = game.seatOrder.length;
  for (let i = 1; i <= n; i += 1) {
    const seat = (fromSeat + i) % n;
    const player = findPlayer(game, game.seatOrder[seat]);
    if (player && player.status !== 'eliminated') return seat;
  }
  return null;
}

// Who's on the button/SB/BB right now, for display badges — mirrors the seat
// logic in startHand() (including skipping eliminated seats) so the UI never
// shows a stale blind position after someone busts out.
function getBlindSeats(game) {
  const n = game.seatOrder.length;
  if (n < 2 || game.dealerSeat === null) return { dealerId: null, sbId: null, bbId: null };

  const dealerId = game.seatOrder[game.dealerSeat];
  const headsUp = tournamentPlayers(game).length === 2;
  const sbSeat = headsUp ? game.dealerSeat : nextTournamentSeat(game, game.dealerSeat);
  const bbSeat = headsUp ? nextTournamentSeat(game, game.dealerSeat) : nextTournamentSeat(game, sbSeat);

  return {
    dealerId,
    sbId: sbSeat !== null ? game.seatOrder[sbSeat] : null,
    bbId: bbSeat !== null ? game.seatOrder[bbSeat] : null,
  };
}

function startGame(game) {
  if (game.status !== 'lobby') return { error: 'already_started' };
  if (game.players.length < 2) return { error: 'not_enough_players' };

  const seatOrder = shuffle(game.players.map((p) => p.id));
  seatOrder.forEach((playerId, seat) => {
    findPlayer(game, playerId).seat = seat;
  });
  game.seatOrder = seatOrder;
  game.dealerSeat = Math.floor(Math.random() * seatOrder.length);

  const { smallBlind, bigBlind } = computeBlinds(game.buyIn);
  game.smallBlind = smallBlind;
  game.bigBlind = bigBlind;
  game.status = 'in_hand';
  game.handNumber = 1;

  startHand(game);
  return { game };
}

function postBlind(player, amount, game) {
  const paid = Math.min(amount, player.chips);
  player.chips -= paid;
  player.currentBet += paid;
  player.handContribution += paid;
  game.pot += paid;
  if (player.chips === 0) player.status = 'allin';
  return paid;
}

function startHand(game) {
  game.players.forEach((p) => {
    if (p.status !== 'eliminated') p.status = 'active';
    p.currentBet = 0;
    p.handContribution = 0;
  });

  const dealerSeat = game.dealerSeat;
  const headsUp = tournamentPlayers(game).length === 2;
  const sbSeat = headsUp ? dealerSeat : nextTournamentSeat(game, dealerSeat);
  const bbSeat = headsUp ? nextTournamentSeat(game, dealerSeat) : nextTournamentSeat(game, sbSeat);

  game.pot = 0;
  game.pots = [];
  game.communityCards = drawCommunityCards();
  postBlind(findPlayer(game, game.seatOrder[sbSeat]), game.smallBlind, game);
  postBlind(findPlayer(game, game.seatOrder[bbSeat]), game.bigBlind, game);

  game.stage = 'preflop';
  game.currentBet = game.bigBlind;
  game.minRaise = game.bigBlind;

  const firstToActSeat = headsUp ? dealerSeat : nextTournamentSeat(game, bbSeat);
  game.toAct = orderFromSeat(game, firstToActSeat, (p) => p.status === 'active');
  game.raiseAllowed = [...game.toAct];
  game.currentTurnPlayerId = game.toAct[0] || null;
  game.roundComplete = game.toAct.length === 0;
  game.lastEvent = { type: 'hand_start', handNumber: game.handNumber };
}

function awardPotToSolePlayer(game, winner) {
  winner.chips += game.pot;
  game.pot = 0;
  game.pots = [];
  game.stage = 'hand_complete';
  game.status = 'hand_complete';
  game.toAct = [];
  game.raiseAllowed = [];
  game.currentTurnPlayerId = null;
  game.roundComplete = false;
  game.lastEvent = { type: 'hand_won_by_fold', playerId: winner.id };
}

function settleTurn(game) {
  game.currentTurnPlayerId = game.toAct[0] || null;
  game.roundComplete = game.toAct.length === 0;
}

function applyAction(game, playerId, action, amount) {
  if (game.status !== 'in_hand') return { error: 'not_in_hand' };
  if (game.currentTurnPlayerId !== playerId) return { error: 'not_your_turn' };

  const player = findPlayer(game, playerId);
  if (!player || player.status !== 'active') return { error: 'not_active' };

  if (action === 'fold') {
    player.status = 'folded';
    game.toAct = game.toAct.filter((id) => id !== playerId);
    game.raiseAllowed = game.raiseAllowed.filter((id) => id !== playerId);
    game.lastEvent = { type: 'fold', playerId };

    const remaining = livePlayers(game);
    if (remaining.length === 1) {
      awardPotToSolePlayer(game, remaining[0]);
    } else {
      settleTurn(game);
    }
    return { game };
  }

  if (action === 'call') {
    const toCall = game.currentBet - player.currentBet;
    if (toCall <= 0) {
      game.lastEvent = { type: 'check', playerId };
    } else if (toCall >= player.chips) {
      const paid = player.chips;
      player.currentBet += paid;
      player.handContribution += paid;
      player.chips = 0;
      player.status = 'allin';
      game.pot += paid;
      game.lastEvent = { type: 'allin', playerId, amount: player.currentBet };
    } else {
      player.chips -= toCall;
      player.currentBet += toCall;
      player.handContribution += toCall;
      game.pot += toCall;
      game.lastEvent = { type: 'call', playerId, amount: toCall };
    }
    game.toAct = game.toAct.filter((id) => id !== playerId);
    settleTurn(game);
    return { game };
  }

  if (action === 'raise') {
    const target = Math.round(Number(amount));
    if (!Number.isFinite(target) || target <= game.currentBet) return { error: 'raise_too_low' };
    // A short all-in bars the players who already acted since the last full
    // raise from raising again at all (any size) until someone makes a fresh
    // full raise — not just from making another undersized one.
    if (!game.raiseAllowed.includes(playerId)) return { error: 'raise_not_allowed' };

    const neededFromPlayer = target - player.currentBet;
    if (neededFromPlayer > player.chips) return { error: 'insufficient_chips' };

    const isAllIn = neededFromPlayer === player.chips;
    const increment = target - game.currentBet;
    const isFullRaise = increment >= game.minRaise;

    if (!isFullRaise && !isAllIn) return { error: 'raise_too_small' };

    player.chips -= neededFromPlayer;
    player.currentBet = target;
    player.handContribution += neededFromPlayer;
    game.pot += neededFromPlayer;
    if (isAllIn) player.status = 'allin';

    if (isFullRaise) {
      game.currentBet = target;
      game.minRaise = increment;
      game.toAct = orderFromSeat(game, seatAfter(game, player.seat), (p) => p.status === 'active' && p.id !== playerId);
      game.raiseAllowed = [...game.toAct];
    } else {
      // Short all-in raise: raises the amount others must call, but does not
      // reopen raising rights for anyone who already acted since the last
      // full raise (the "blocking" edge case flagged in the spec).
      const alreadyActed = actablePlayers(game)
        .map((p) => p.id)
        .filter((id) => id !== playerId && !game.toAct.includes(id));
      game.currentBet = target;
      game.toAct = orderFromSeat(game, seatAfter(game, player.seat), (p) => p.status === 'active' && p.id !== playerId);
      game.raiseAllowed = game.raiseAllowed.filter((id) => !alreadyActed.includes(id));
    }

    game.lastEvent = isAllIn ? { type: 'allin', playerId, amount: target } : { type: 'raise', playerId, amount: target };
    settleTurn(game);
    return { game };
  }

  return { error: 'unknown_action' };
}

// Splits the hand's total contributions into one or more pots by eligibility:
// a player who went all-in for less than others can only win a pot up to the
// level they contributed; the excess above that level forms a separate side
// pot among the players who put in more. Folded players' chips still count
// toward pot amounts but they're never eligible to win any of it.
function computePots(game) {
  const contributors = game.players.filter((p) => p.handContribution > 0);
  const levels = [...new Set(contributors.map((p) => p.handContribution))].sort((a, b) => a - b);

  const pots = [];
  let prevLevel = 0;
  for (const level of levels) {
    const layerSize = level - prevLevel;
    const payers = contributors.filter((p) => p.handContribution > prevLevel);
    const amount = payers.length * layerSize - payers.reduce((sum, p) => sum + Math.max(0, level - p.handContribution), 0);
    const eligiblePlayerIds = contributors
      .filter((p) => p.handContribution >= level && p.status !== 'folded')
      .map((p) => p.id);

    if (amount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({ amount, eligiblePlayerIds });
    }
    prevLevel = level;
  }
  return pots;
}

function advanceStage(game) {
  if (game.status !== 'in_hand') return { error: 'not_in_hand' };
  if (!game.roundComplete) return { error: 'round_not_complete' };

  const idx = STAGES.indexOf(game.stage);
  if (idx === -1 || idx >= STAGES.length - 1) return { error: 'no_next_stage' };

  const next = STAGES[idx + 1];
  game.stage = next;

  if (next === 'showdown') {
    game.toAct = [];
    game.raiseAllowed = [];
    game.currentTurnPlayerId = null;
    game.roundComplete = false;

    // A pot layer with only one eligible player is an uncalled excess bet —
    // nobody else can contest it, so return it automatically instead of
    // making the host pick a "winner" with no other option.
    const pots = computePots(game);
    game.pots = [];
    for (const pot of pots) {
      if (pot.eligiblePlayerIds.length === 1) {
        findPlayer(game, pot.eligiblePlayerIds[0]).chips += pot.amount;
      } else {
        game.pots.push(pot);
      }
    }

    game.lastEvent = { type: 'showdown_reached' };
    if (game.pots.length === 0) {
      settleHandCompletion(game);
    }
    return { game };
  }

  game.players.forEach((p) => {
    p.currentBet = 0;
  });
  game.currentBet = 0;
  game.minRaise = game.bigBlind;

  const canAct = actablePlayers(game);
  if (canAct.length <= 1) {
    game.toAct = [];
    game.raiseAllowed = [];
    game.currentTurnPlayerId = null;
    game.roundComplete = true;
  } else {
    const firstToActSeat = seatAfter(game, game.dealerSeat);
    game.toAct = orderFromSeat(game, firstToActSeat, (p) => p.status === 'active');
    game.raiseAllowed = [...game.toAct];
    game.currentTurnPlayerId = game.toAct[0];
    game.roundComplete = false;
  }
  game.lastEvent = { type: 'stage_advance', stage: next };
  return { game };
}

// Eliminates busted players and checks for a tournament winner. Called once
// every pot from this hand has been awarded.
function settleHandCompletion(game) {
  game.pot = 0;
  game.pots = [];

  const justEliminated = [];
  game.players.forEach((p) => {
    if (p.status !== 'eliminated' && p.chips === 0) {
      p.status = 'eliminated';
      justEliminated.push(p.id);
    }
  });

  const remaining = tournamentPlayers(game);
  if (remaining.length <= 1) {
    game.status = 'finished';
    game.stage = 'game_over';
    game.toAct = [];
    game.raiseAllowed = [];
    game.currentTurnPlayerId = null;
    game.lastEvent = { type: 'game_over', winnerId: remaining[0]?.id || null, eliminated: justEliminated };
  } else {
    game.status = 'hand_complete';
    game.lastEvent = justEliminated.length
      ? { type: 'player_eliminated', playerIds: justEliminated }
      : game.lastEvent;
  }
}

// Resolves the next pending side pot (game.pots[0]) with the winner(s) the
// host picked for it. Call repeatedly (one call per pot) until game.pots is
// empty, at which point the hand is fully settled.
function resolveShowdown(game, winnerIds) {
  if (game.status !== 'in_hand' || game.stage !== 'showdown') return { error: 'not_at_showdown' };
  if (!game.pots || game.pots.length === 0) return { error: 'no_pending_pot' };
  if (!Array.isArray(winnerIds) || winnerIds.length === 0) return { error: 'no_winners' };

  const [pot, ...restPots] = game.pots;
  const invalid = winnerIds.some((id) => !pot.eligiblePlayerIds.includes(id));
  if (invalid) return { error: 'invalid_winner' };

  const n = winnerIds.length;
  const share = Math.floor(pot.amount / n);
  let remainder = pot.amount - share * n;

  const orderedWinners = orderFromSeat(game, seatAfter(game, game.dealerSeat), (p) => winnerIds.includes(p.id));
  orderedWinners.forEach((playerId) => {
    const player = findPlayer(game, playerId);
    player.chips += share + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  });

  game.pots = restPots;
  game.lastEvent = { type: 'showdown_result', winners: winnerIds, amountEach: share, pot: pot.amount };

  if (game.pots.length === 0) {
    settleHandCompletion(game);
  }
  return { game };
}

function nextHand(game) {
  if (game.status !== 'hand_complete') return { error: 'not_ready' };

  const remaining = tournamentPlayers(game);
  if (remaining.length <= 1) return { error: 'game_already_over' };

  const nextDealerSeat = nextTournamentSeat(game, game.dealerSeat);
  if (nextDealerSeat === null) return { error: 'game_already_over' };

  game.dealerSeat = nextDealerSeat;
  game.handNumber += 1;
  game.status = 'in_hand';
  startHand(game);
  return { game };
}

// "Main Lagi": brings back everyone who was in the finished tournament
// (including anyone eliminated along the way) for a fresh one, chips reset
// to the original buy-in. Drops back to the lobby rather than auto-starting,
// so the host can still kick a no-show before tapping "Mulai Game" again.
function restartTournament(game) {
  if (game.status !== 'finished') return { error: 'not_finished' };
  if (game.players.length < 2) return { error: 'not_enough_players' };

  game.players.forEach((p) => {
    p.chips = game.buyIn;
    p.status = 'active';
    p.seat = null;
    p.currentBet = 0;
    p.handContribution = 0;
  });

  game.status = 'lobby';
  game.seatOrder = [];
  game.dealerSeat = null;
  game.smallBlind = null;
  game.bigBlind = null;
  game.stage = null;
  game.pot = 0;
  game.pots = [];
  game.communityCards = [];
  game.currentBet = 0;
  game.minRaise = 0;
  game.toAct = [];
  game.raiseAllowed = [];
  game.currentTurnPlayerId = null;
  game.roundComplete = false;
  game.handNumber = 0;
  game.lastEvent = { type: 'game_restarted' };
  return { game };
}

module.exports = {
  STAGES,
  computeBlinds,
  startGame,
  startHand,
  applyAction,
  advanceStage,
  resolveShowdown,
  nextHand,
  restartTournament,
  computePots,
  livePlayers,
  actablePlayers,
  tournamentPlayers,
  getBlindSeats,
};
