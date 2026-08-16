import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { PlayerColor, LudoState, Token } from './types';
import { COLOR, PLAYER_LABEL } from './constants';
import { getTokenGridPos, getMainTrackPos, isMainTrackSafe } from './board';
import { buildInitialTokens, computeMovable, playersForCount, INITIAL_STATE, isTokenInDuo, getDuoPartner, pickBestToken } from './gameLogic';
import { playDiceSound, playTokenSound, playCaptureSound, playCompletionSound } from './audio';
import DiceButton from './DiceButton';
import LudoBoard from './LudoBoard';

const boardSize = 'min(calc(100vw - 32px), min(calc(100vh - 140px), 480px))';

const Ludo: React.FC = () => {
  const [state, setState] = useState<LudoState>(INITIAL_STATE);
  const [rolling, setRolling] = useState(false);
  const [vsComputer, setVsComputer] = useState(false);

  useEffect(() => {
    if (state.phase === 'playing' || state.phase === 'finished') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [state.phase]);

  const startGame = useCallback((count: 2 | 3 | 4, withComputer: boolean) => {
    const players = playersForCount(count);
    setState({
      ...INITIAL_STATE,
      phase: 'playing',
      playerCount: count,
      players,
      tokens: buildInitialTokens(players),
      computerPlayers: withComputer && count === 2 ? ['blue'] : [],
    });
  }, []);

  const rollStateRef = useRef({
    diceRolled: state.diceRolled,
    tokens: state.tokens,
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    consecutiveSixes: state.consecutiveSixes,
  });
  useEffect(() => {
    rollStateRef.current = {
      diceRolled: state.diceRolled,
      tokens: state.tokens,
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      consecutiveSixes: state.consecutiveSixes,
    };
  });

  const rollDice = useCallback(() => {
    const { diceRolled, tokens, players, currentPlayerIndex, consecutiveSixes } = rollStateRef.current;
    if (diceRolled) return;
    setRolling(true);
    playDiceSound();
    setTimeout(() => {
      setRolling(false);
      const dice = Math.floor(Math.random() * 6) + 1;
      const currentPlayer = players[currentPlayerIndex];

      if (dice === 6) {
        const nextConsecutiveSixes = consecutiveSixes + 1;

        if (nextConsecutiveSixes >= 3) {
          // PENALTY: 3rd consecutive six — show dice briefly, rollback, advance
          setState(s => ({
            ...s, diceValue: 6, diceRolled: true, movableTokenIds: [],
            consecutiveSixes: 0, bonusRolls: 0, sixPenalty: true,
          }));
          setTimeout(() => {
            setState(s => ({
              ...s,
              tokens: s.sixStreakSnapshot ?? s.tokens,
              currentPlayerIndex: (s.currentPlayerIndex + 1) % s.players.length,
              diceValue: null, diceRolled: false, movableTokenIds: [],
              bonusRolls: 0, consecutiveSixes: 0,
              sixStreakSnapshot: null, sixPenalty: false,
            }));
          }, 1400);
          return;
        }

        // 1st or 2nd six
        const movable = computeMovable(tokens, currentPlayer, dice);
        if (movable.length === 0) {
          setState(s => ({
            ...s, diceValue: dice, diceRolled: true, movableTokenIds: [],
            consecutiveSixes: nextConsecutiveSixes,
            sixStreakSnapshot: consecutiveSixes === 0 ? s.tokens : s.sixStreakSnapshot,
          }));
          setTimeout(() => {
            setState(s => ({
              ...s,
              currentPlayerIndex: (s.currentPlayerIndex + 1) % s.players.length,
              diceValue: null, diceRolled: false, movableTokenIds: [],
              bonusRolls: 0, consecutiveSixes: 0, sixStreakSnapshot: null,
            }));
          }, 900);
        } else {
          setState(s => ({
            ...s, diceValue: dice, diceRolled: true, movableTokenIds: movable,
            consecutiveSixes: nextConsecutiveSixes,
            sixStreakSnapshot: consecutiveSixes === 0 ? s.tokens : s.sixStreakSnapshot,
          }));
        }
      } else {
        // Non-6: always resets the streak
        const movable = computeMovable(tokens, currentPlayer, dice);
        if (movable.length === 0) {
          setState(s => ({
            ...s, diceValue: dice, diceRolled: true, movableTokenIds: [],
            consecutiveSixes: 0, sixStreakSnapshot: null,
          }));
          setTimeout(() => {
            setState(s => ({
              ...s,
              currentPlayerIndex: (s.currentPlayerIndex + 1) % s.players.length,
              diceValue: null, diceRolled: false, movableTokenIds: [],
              bonusRolls: 0, consecutiveSixes: 0, sixStreakSnapshot: null,
            }));
          }, 900);
        } else {
          setState(s => ({
            ...s, diceValue: dice, diceRolled: true, movableTokenIds: movable,
            consecutiveSixes: 0, sixStreakSnapshot: null,
          }));
        }
      }
    }, 400);
  }, []);

  const moveToken = useCallback((tokenId: string) => {
    playTokenSound();
    setState(s => {
      if (!s.movableTokenIds.includes(tokenId) || s.diceValue === null) return s;

      const dice = s.diceValue;
      const currentPlayer = s.players[s.currentPlayerIndex];

      const wasInDuo = isTokenInDuo(s.tokens, tokenId);
      const partner = wasInDuo ? getDuoPartner(s.tokens, tokenId) : null;
      const tokensToMove = new Set([tokenId, ...(partner ? [partner.id] : [])]);
      const steps = wasInDuo ? dice / 2 : dice;

      const tokensAfterMove = s.tokens.map(t => {
        if (!tokensToMove.has(t.id)) return t;
        const newPos = t.position === -1 ? 1 : Math.min(t.position + steps, 57);
        return { ...t, position: newPos };
      });

      const moved = tokensAfterMove.find(t => t.id === tokenId)!;

      const capturedTokens = tokensAfterMove.map(t => {
        if (t.player === currentPlayer || moved.position > 51 || moved.position < 0) return t;
        if (t.position < 0 || t.position > 51) return t;
        const movedCell = getMainTrackPos(currentPlayer, moved.position);
        const otherCell = getMainTrackPos(t.player, t.position);
        if (movedCell[0] !== otherCell[0] || movedCell[1] !== otherCell[1]) return t;
        if (isMainTrackSafe(currentPlayer, moved.position)) return t;

        const opponentsAtCell = tokensAfterMove.filter(op =>
          op.player === t.player && op.position === t.position
        ).length;
        if (!wasInDuo && opponentsAtCell >= 2) return t;

        return { ...t, position: -1 };
      });

      // 1 if any opponent tokens were sent home this move (duo counts as 1, not 2)
      let captureCount = 0;
      for (const afterToken of capturedTokens) {
        if (afterToken.player === currentPlayer || afterToken.position !== -1) continue;
        const beforeInMove = tokensAfterMove.find(t => t.id === afterToken.id)!;
        if (beforeInMove.position !== -1) { captureCount = 1; break; }
      }

      // Count current player's tokens newly reaching the finish
      let completionCount = 0;
      for (const afterToken of capturedTokens) {
        if (afterToken.player !== currentPlayer || afterToken.position !== 57) continue;
        const beforeToken = s.tokens.find(t => t.id === afterToken.id)!;
        if (beforeToken.position !== 57) completionCount++;
      }

      // Fire sounds (outside setState is ideal but here they run synchronously before return)
      if (captureCount > 0) playCaptureSound();
      if (completionCount > 0) playCompletionSound();

      const playerTokens = capturedTokens.filter(t => t.player === currentPlayer);
      const allDone = playerTokens.every(t => t.position === 57);

      if (allDone) {
        return {
          ...s, tokens: capturedTokens, phase: 'finished', winner: currentPlayer,
          movableTokenIds: [], diceRolled: false, diceValue: null,
          bonusRolls: 0, consecutiveSixes: 0, sixStreakSnapshot: null, sixPenalty: false,
        };
      }

      const newBonuses = (dice === 6 ? 1 : 0) + captureCount + completionCount;
      const totalBonusRolls = s.bonusRolls + newBonuses;
      const samePlayerGoesAgain = totalBonusRolls > 0;
      const nextPlayerIndex = samePlayerGoesAgain
        ? s.currentPlayerIndex
        : (s.currentPlayerIndex + 1) % s.players.length;

      // Streak only carries when the only reason for another roll is the six itself.
      // Captures and completions break the streak so bonus rolls don't count toward triple-six.
      const streakCarries = samePlayerGoesAgain && captureCount === 0 && completionCount === 0;

      return {
        ...s,
        tokens: capturedTokens,
        currentPlayerIndex: nextPlayerIndex,
        diceValue: null,
        diceRolled: false,
        movableTokenIds: [],
        bonusRolls: samePlayerGoesAgain ? totalBonusRolls - 1 : 0,
        consecutiveSixes: streakCarries ? s.consecutiveSixes : 0,
        sixStreakSnapshot: streakCarries ? s.sixStreakSnapshot : null,
      };
    });
  }, []);

  const resetGame = useCallback(() => setState(INITIAL_STATE), []);

  // ── Derived state — must be before the early return ─────────────────────────

  const tokensByCell = useMemo<Record<string, Token[]>>(() => {
    const map: Record<string, Token[]> = {};
    for (const token of state.tokens) {
      if (token.position === -1) continue;
      if (token.position === 57) continue; // rendered by FinishedTokensOverlay
      const pos = getTokenGridPos(token);
      if (!pos) continue;
      const key = `${pos[0]}-${pos[1]}`;
      if (!map[key]) map[key] = [];
      map[key].push(token);
    }
    return map;
  }, [state.tokens]);

  const inactiveSet = useMemo(
    () => new Set<PlayerColor>((['red', 'blue', 'green', 'yellow'] as PlayerColor[]).filter(p => !state.players.includes(p))),
    [state.players]
  );

  const movableSet = useMemo(() => new Set<string>(state.movableTokenIds), [state.movableTokenIds]);

  const isComputerTurn = state.phase === 'playing' &&
    state.computerPlayers.includes(state.players[state.currentPlayerIndex]);

  // ── Computer AI ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isComputerTurn || rolling) return;
    const cp = state.players[state.currentPlayerIndex];

    if (!state.diceRolled) {
      const t = setTimeout(() => rollDice(), 1000);
      return () => clearTimeout(t);
    }

    if (state.movableTokenIds.length > 0 && state.diceValue !== null) {
      const t = setTimeout(() => {
        moveToken(pickBestToken(state.tokens, state.movableTokenIds, cp, state.diceValue!));
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [
    isComputerTurn, rolling, state.diceRolled,
    state.movableTokenIds, state.tokens, state.diceValue,
    state.currentPlayerIndex, state.players,
    rollDice, moveToken,
  ]);

  // ── Setup screen ────────────────────────────────────────────────────────────

  if (state.phase === 'setup') {
    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">🎲 Ludo</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Classic board game for 2–4 players</p>
        </div>
        <div className="w-full">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 text-center">Select number of players</p>
          <div className="flex gap-3 justify-center">
            {([2, 3, 4] as const).map(n => (
              <button
                key={n}
                onClick={() => {
                  setState(s => ({ ...s, playerCount: n }));
                  if (n !== 2) setVsComputer(false);
                }}
                className={`w-16 h-16 rounded-2xl text-2xl font-bold shadow transition-all ${
                  state.playerCount === n
                    ? 'bg-indigo-500 text-white scale-110 shadow-indigo-300 shadow-lg'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {state.playerCount === 2 && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none justify-center">
              <input
                type="checkbox"
                checked={vsComputer}
                onChange={e => setVsComputer(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Play vs Computer</span>
            </label>
          )}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          {playersForCount(state.playerCount).map(p => (
            <div key={p} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${COLOR[p].bg}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-white opacity-80" />
              {PLAYER_LABEL[p]}
            </div>
          ))}
        </div>
        <button
          onClick={() => startGame(state.playerCount, vsComputer)}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
        >
          Start Game
        </button>
      </div>
    );
  }

  // ── Playing / Finished ──────────────────────────────────────────────────────

  const currentPlayer = state.players[state.currentPlayerIndex];
  const canRoll = !state.diceRolled && !rolling && !isComputerTurn;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        backgroundColor: '#2c1538',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(74,35,90,0.6) 0%, transparent 80%),
          linear-gradient(45deg, rgba(0,0,0,0.08) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.08) 75%),
          linear-gradient(45deg, rgba(0,0,0,0.08) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.08) 75%)
        `,
        backgroundSize: '100% 100%, 20px 20px, 20px 20px',
        backgroundPosition: '0 0, 0 0, 10px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        overflow: 'hidden',
      }}
    >
      {/* Win overlay */}
      {state.phase === 'finished' && state.winner && (
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,8,30,0.93)',
            borderRadius: 20,
            padding: '24px 48px',
            textAlign: 'center',
            zIndex: 50,
            border: `3px solid ${COLOR[state.winner].hex}`,
            boxShadow: `0 0 40px ${COLOR[state.winner].hex}55`,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 52 }}>🏆</div>
          <div style={{ color: COLOR[state.winner].hex, fontSize: 26, fontWeight: 'bold', marginTop: 8 }}>
            {PLAYER_LABEL[state.winner]} Wins!
          </div>
          <button
            onClick={resetGame}
            style={{
              marginTop: 18,
              padding: '10px 28px',
              borderRadius: 12,
              background: COLOR[state.winner].hex,
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Triple-six penalty overlay */}
      {state.sixPenalty && (
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,8,30,0.93)',
            borderRadius: 16,
            padding: '16px 32px',
            textAlign: 'center',
            zIndex: 50,
            border: '3px solid #E53935',
            boxShadow: '0 0 40px #E5393555',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 28 }}>🎲🎲🎲</div>
          <div style={{ color: '#E53935', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
            Triple Six! Moves Undone
          </div>
        </div>
      )}

      {/* Top-left controls */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <button
          onClick={resetGame}
          style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 2, background: 'white', borderRadius: 1 }} />)}
        </button>
        <button
          style={{
            width: 48, height: 40, borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>🏆</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1 }}>WIN</span>
        </button>
      </div>

      {/* Top-right avatar */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 10 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '2px solid #FFB300',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: COLOR[currentPlayer].hex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            👤
          </div>
        </div>
        <span style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 4, padding: '2px 8px', color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 600 }}>
          {isComputerTurn ? '🤖 Computer' : PLAYER_LABEL[currentPlayer]}
        </span>
      </div>

      {/* Board */}
      <div
        style={{
          background: '#8b4513',
          borderRadius: 12,
          padding: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 0 10px rgba(139,69,19,0.5)',
          width: boardSize,
          aspectRatio: '1/1',
          flexShrink: 0,
        }}
      >
        <LudoBoard
          tokens={state.tokens}
          players={state.players}
          tokensByCell={tokensByCell}
          movableSet={movableSet}
          moveToken={moveToken}
          inactiveSet={inactiveSet}
        />
      </div>

      {/* Bottom controls with bonus roll badge */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 10 }}>
        <div style={{ position: 'relative' }}>
          <DiceButton
            diceValue={state.diceValue}
            rolling={rolling}
            canRoll={state.phase === 'playing' && canRoll}
            onRoll={rollDice}
            playerColor={currentPlayer}
          />
          {state.bonusRolls > 0 && (
            <div style={{
              position: 'absolute', top: -10, right: -10,
              background: '#FFB300', color: '#000', borderRadius: '50%',
              width: 22, height: 22, fontSize: 11, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>
              +{state.bonusRolls}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ludo;
