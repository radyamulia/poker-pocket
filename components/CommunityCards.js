// Decorative community card row for the host screen — see lib/engine.js for
// why these have zero bearing on the actual hand (physical cards on the
// table are authoritative). Purely a visual flourish tied to reveal stage.

import { useEffect, useRef } from 'react';
import { playCardFlip } from '../lib/sound';

const REVEAL_COUNT_BY_STAGE = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  showdown: 5,
  hand_complete: 5,
  game_over: 5,
};

const RED_SUITS = new Set(['♥', '♦']);
const CARD_DELAY_MS = 90;

export default function CommunityCards({ cards, stage }) {
  const revealedCount = REVEAL_COUNT_BY_STAGE[stage] ?? 0;
  const prevRevealedRef = useRef(0);

  useEffect(() => {
    const prev = prevRevealedRef.current;
    if (revealedCount > prev) {
      const timers = [];
      for (let i = prev; i < revealedCount; i += 1) {
        timers.push(setTimeout(() => playCardFlip(), i * CARD_DELAY_MS));
      }
      prevRevealedRef.current = revealedCount;
      return () => timers.forEach(clearTimeout);
    }
    prevRevealedRef.current = revealedCount;
    return undefined;
  }, [revealedCount]);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="community-cards">
      {[0, 1, 2, 3, 4].map((i) => {
        const card = cards[i];
        const isRevealed = i < revealedCount;
        const isRed = card && RED_SUITS.has(card.suit);
        return (
          <div className="comm-card" key={i}>
            <div
              className={`comm-card-inner ${isRevealed ? 'is-revealed' : ''}`}
              style={{ transitionDelay: `${i * CARD_DELAY_MS}ms` }}
            >
              <div className="comm-card-back" />
              {card && (
                <div className={`comm-card-face ${isRed ? 'is-red' : 'is-black'}`}>
                  <span className="comm-card-rank">{card.rank}</span>
                  <span className="comm-card-suit">{card.suit}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
