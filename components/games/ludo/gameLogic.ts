import type { PlayerColor, Token, LudoState } from './types';
import { SAFE_POSITIONS, START_INDEX } from './constants';

export function buildInitialTokens(players: PlayerColor[]): Token[] {
  return players.flatMap(p =>
    [0,1,2,3].map(i => ({ id: `${p}-${i}`, player: p, index: i, position: -1 }))
  );
}

// True if two or more tokens of any player (other than excludePlayer) occupy absPos as a duo
function hasDuoAt(tokens: Token[], absPos: number, excludePlayer: PlayerColor): boolean {
  if (SAFE_POSITIONS.has(absPos)) return false;
  for (const op of ['red', 'blue', 'green', 'yellow'] as PlayerColor[]) {
    if (op === excludePlayer) continue;
    const opRelPos = (absPos - START_INDEX[op] + 52) % 52;
    if (opRelPos < 1 || opRelPos > 51) continue;
    if (tokens.filter(t => t.player === op && t.position === opRelPos).length >= 2) return true;
  }
  return false;
}

// True if the given token is one of the first 2 (by index) same-player tokens on a non-safe main-track cell
export function isTokenInDuo(tokens: Token[], tokenId: string): boolean {
  const token = tokens.find(t => t.id === tokenId);
  if (!token || token.position < 1 || token.position > 51) return false;
  const abs = (START_INDEX[token.player] + token.position) % 52;
  if (SAFE_POSITIONS.has(abs)) return false;
  const atPos = tokens
    .filter(t => t.player === token.player && t.position === token.position)
    .sort((a, b) => a.index - b.index);
  if (atPos.length < 2) return false;
  return atPos[0].id === tokenId || atPos[1].id === tokenId;
}

// Returns the duo partner (the other of the first-2-by-index pair), or null
export function getDuoPartner(tokens: Token[], tokenId: string): Token | null {
  const token = tokens.find(t => t.id === tokenId);
  if (!token || !isTokenInDuo(tokens, tokenId)) return null;
  const atPos = tokens
    .filter(t => t.player === token.player && t.position === token.position)
    .sort((a, b) => a.index - b.index);
  return atPos[0].id === tokenId ? atPos[1] : atPos[0];
}

export function computeMovable(tokens: Token[], player: PlayerColor, dice: number): string[] {
  const playerTokens = tokens.filter(t => t.player === player);

  // Build duoTokenIds: exactly the first 2 tokens (by index) at each non-safe main-track position
  const duoTokenIds = new Set<string>();
  const posFirst = new Map<number, Token>();
  for (const t of [...playerTokens].sort((a, b) => a.index - b.index)) {
    if (t.position < 1 || t.position > 51) continue;
    const abs = (START_INDEX[player] + t.position) % 52;
    if (SAFE_POSITIONS.has(abs)) continue;
    if (posFirst.has(t.position)) {
      const first = posFirst.get(t.position)!;
      if (!duoTokenIds.has(first.id)) {
        duoTokenIds.add(first.id);
        duoTokenIds.add(t.id);
      }
    } else {
      posFirst.set(t.position, t);
    }
  }

  return playerTokens
    .filter(t => {
      if (t.position === 57) return false;
      if (t.position === -1) return dice === 6;

      const isInDuo = duoTokenIds.has(t.id);

      // Duo rule: duo can only move on even dice
      if (isInDuo && dice % 2 !== 0) return false;

      // Duo moves dice/2 steps; singles move dice steps
      const steps = isInDuo ? dice / 2 : dice;
      if (t.position + steps > 57) return false;

      // Path-blocking: check each cell along the path
      if (t.position >= 1 && t.position <= 51) {
        const stepsOnTrack = Math.min(steps, 51 - t.position);
        for (let step = 1; step <= stepsOnTrack; step++) {
          const absAhead = (START_INDEX[player] + t.position + step) % 52;
          if (hasDuoAt(tokens, absAhead, player)) {
            if (step < steps) return false;   // can't pass through opponent duo
            // step === steps: single may land on (climb) the duo; duo-on-duo also allowed
          }
        }
      }

      return true;
    })
    .map(t => t.id);
}

export function playersForCount(count: 2 | 3 | 4): PlayerColor[] {
  if (count === 2) return ['green', 'blue'];
  if (count === 3) return ['green', 'yellow', 'blue'];
  return ['green', 'yellow', 'blue', 'red'];
}

export const INITIAL_STATE: LudoState = {
  phase: 'setup',
  playerCount: 4,
  players: ['green', 'yellow', 'blue', 'red'],
  tokens: [],
  currentPlayerIndex: 0,
  diceValue: null,
  diceRolled: false,
  movableTokenIds: [],
  winner: null,
  bonusRolls: 0,
  consecutiveSixes: 0,
  sixStreakSnapshot: null,
  sixPenalty: false,
};
