import React, { useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

interface Token {
  id: string;
  player: PlayerColor;
  index: number;
  position: number; // -1=home base, 0-51=main track, 52-56=home col, 57=finished
}

interface LudoState {
  phase: 'setup' | 'playing' | 'finished';
  playerCount: 2 | 3 | 4;
  players: PlayerColor[];
  tokens: Token[];
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  movableTokenIds: string[];
  extraTurn: boolean;
  winner: PlayerColor | null;
}

// ─── Board Constants ──────────────────────────────────────────────────────────

const MAIN_TRACK: [number, number][] = [
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
];

const HOME_COL: Record<PlayerColor, [number, number][]> = {
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9]],
  red:    [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

const START_INDEX: Record<PlayerColor, number> = {
  green: 0, yellow: 13, blue: 26, red: 39,
};

const HOME_BASE_CELLS: Record<PlayerColor, [number, number][]> = {
  green:  [[2,2],[2,3],[3,2],[3,3]],
  yellow: [[2,11],[2,12],[3,11],[3,12]],
  blue:   [[11,11],[11,12],[12,11],[12,12]],
  red:    [[11,2],[11,3],[12,2],[12,3]],
};

const SAFE_POSITIONS = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
const START_ABS_POSITIONS = new Set([1, 14, 27, 40]);

const COLOR = {
  red:    { bg: 'bg-red-600',    light: 'bg-red-100',    border: 'border-red-600',    ring: 'ring-red-500',    text: 'text-red-700',    hex: '#E53935' },
  blue:   { bg: 'bg-blue-700',   light: 'bg-blue-100',   border: 'border-blue-700',   ring: 'ring-blue-600',   text: 'text-blue-700',   hex: '#1E88E5' },
  green:  { bg: 'bg-green-600',  light: 'bg-green-100',  border: 'border-green-600',  ring: 'ring-green-500',  text: 'text-green-700',  hex: '#43A047' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-100', border: 'border-yellow-500', ring: 'ring-yellow-400', text: 'text-yellow-700', hex: '#FFB300' },
};

const PLAYER_LABEL: Record<PlayerColor, string> = {
  red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTokenGridPos(token: Token): [number, number] | null {
  if (token.position === -1) return HOME_BASE_CELLS[token.player][token.index];
  if (token.position === 57)  return [7, 7];
  if (token.position >= 52)   return HOME_COL[token.player][token.position - 52];
  const trackIndex = (START_INDEX[token.player] + token.position) % 52;
  return MAIN_TRACK[trackIndex];
}

function getMainTrackPos(player: PlayerColor, relPos: number): [number, number] {
  return MAIN_TRACK[(START_INDEX[player] + relPos) % 52];
}

function isMainTrackSafe(player: PlayerColor, relPos: number): boolean {
  const absPos = (START_INDEX[player] + relPos) % 52;
  return SAFE_POSITIONS.has(absPos);
}

function buildInitialTokens(players: PlayerColor[]): Token[] {
  return players.flatMap(p =>
    [0,1,2,3].map(i => ({ id: `${p}-${i}`, player: p, index: i, position: -1 }))
  );
}

function computeMovable(tokens: Token[], player: PlayerColor, dice: number): string[] {
  return tokens
    .filter(t => t.player === player)
    .filter(t => {
      if (t.position === 57) return false;
      if (t.position === -1) return dice === 6;
      return t.position + dice <= 57;
    })
    .map(t => t.id);
}

function playersForCount(count: 2 | 3 | 4): PlayerColor[] {
  if (count === 2) return ['green', 'blue'];
  if (count === 3) return ['green', 'yellow', 'blue'];
  return ['green', 'yellow', 'blue', 'red'];
}

// ─── Cell type classifier ─────────────────────────────────────────────────────

type CellKind =
  | { type: 'home-quadrant'; color: PlayerColor; inner: boolean }
  | { type: 'path'; safe: boolean; startEntry: boolean }
  | { type: 'home-col'; color: PlayerColor }
  | { type: 'center' }
  | { type: 'blank' };

function classifyCell(row: number, col: number): CellKind {
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return { type: 'center' };

  for (const [c, cells] of Object.entries(HOME_COL) as [PlayerColor, [number,number][]][]) {
    if (cells.some(([r2, c2]) => r2 === row && c2 === col)) return { type: 'home-col', color: c };
  }

  const trackIdx = MAIN_TRACK.findIndex(([r, c]) => r === row && c === col);
  if (trackIdx !== -1) return {
    type: 'path',
    safe: SAFE_POSITIONS.has(trackIdx),
    startEntry: START_ABS_POSITIONS.has(trackIdx),
  };

  const corners: { color: PlayerColor; rowRange: [number,number]; colRange: [number,number] }[] = [
    { color: 'green',  rowRange: [0,5],  colRange: [0,5]  },
    { color: 'yellow', rowRange: [0,5],  colRange: [9,14] },
    { color: 'blue',   rowRange: [9,14], colRange: [9,14] },
    { color: 'red',    rowRange: [9,14], colRange: [0,5]  },
  ];
  for (const { color, rowRange, colRange } of corners) {
    if (row >= rowRange[0] && row <= rowRange[1] && col >= colRange[0] && col <= colRange[1]) {
      const inner = HOME_BASE_CELLS[color].some(([r2,c2]) => r2 === row && c2 === col);
      return { type: 'home-quadrant', color, inner };
    }
  }

  return { type: 'blank' };
}

const BOARD_CELLS: CellKind[][] = Array.from({ length: 15 }, (_, r) =>
  Array.from({ length: 15 }, (_, c) => classifyCell(r, c))
);

// ─── Pip layouts ──────────────────────────────────────────────────────────────

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

// ─── Dice Button ──────────────────────────────────────────────────────────────

const DICE_PALETTE: Record<PlayerColor, { top: string; mid: string; shadow: string }> = {
  red:    { top: '#ef5350', mid: '#E53935', shadow: '#b71c1c' },
  blue:   { top: '#42A5F5', mid: '#1E88E5', shadow: '#0d47a1' },
  green:  { top: '#66BB6A', mid: '#43A047', shadow: '#1b5e20' },
  yellow: { top: '#FFCA28', mid: '#FFB300', shadow: '#e65100' },
};

const DiceButton: React.FC<{
  diceValue: number | null;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerColor: PlayerColor;
}> = ({ diceValue, rolling, canRoll, onRoll, playerColor }) => {
  const pal = DICE_PALETTE[playerColor];
  return (
    <button
      onClick={canRoll ? onRoll : undefined}
      style={{
        width: 80,
        height: 80,
        borderRadius: 16,
        border: 'none',
        cursor: canRoll ? 'pointer' : 'default',
        background: `linear-gradient(to bottom, ${pal.top}, ${pal.mid})`,
        boxShadow: canRoll
          ? `0 4px 0 ${pal.shadow}, 0 6px 12px rgba(0,0,0,0.4)`
          : `0 1px 0 ${pal.shadow}`,
        transform: rolling ? 'translateY(3px)' : 'none',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'white',
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gridTemplateRows: 'repeat(3,1fr)',
          padding: 5,
          gap: 2,
        }}
      >
        {diceValue !== null
          ? Array.from({ length: 9 }, (_, i) => {
              const r = Math.floor(i / 3);
              const c = i % 3;
              const active = PIP_LAYOUTS[diceValue]?.some(([pr, pc]) => pr === r && pc === c);
              return (
                <div key={i} style={{ borderRadius: '50%', background: active ? '#2c1538' : 'transparent' }} />
              );
            })
          : (
            <div style={{ gridColumn: '1/-1', gridRow: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 'bold', color: pal.mid }}>
              {canRoll ? '?' : '•'}
            </div>
          )
        }
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const INITIAL_STATE: LudoState = {
  phase: 'setup',
  playerCount: 4,
  players: ['green', 'yellow', 'blue', 'red'],
  tokens: [],
  currentPlayerIndex: 0,
  diceValue: null,
  diceRolled: false,
  movableTokenIds: [],
  extraTurn: false,
  winner: null,
};

const Ludo: React.FC = () => {
  const [state, setState] = useState<LudoState>(INITIAL_STATE);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (state.phase === 'playing' || state.phase === 'finished') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [state.phase]);

  const startGame = useCallback((count: 2 | 3 | 4) => {
    const players = playersForCount(count);
    setState({
      ...INITIAL_STATE,
      phase: 'playing',
      playerCount: count,
      players,
      tokens: buildInitialTokens(players),
    });
  }, []);

  const rollDice = useCallback(() => {
    if (state.diceRolled) return;
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      const dice = Math.floor(Math.random() * 6) + 1;
      const currentPlayer = state.players[state.currentPlayerIndex];
      const movable = computeMovable(state.tokens, currentPlayer, dice);

      if (movable.length === 0) {
        setState(s => ({ ...s, diceValue: dice, diceRolled: true, movableTokenIds: [] }));
        setTimeout(() => {
          setState(s => ({
            ...s,
            currentPlayerIndex: (s.currentPlayerIndex + 1) % s.players.length,
            diceValue: null,
            diceRolled: false,
            movableTokenIds: [],
            extraTurn: false,
          }));
        }, 900);
      } else {
        setState(s => ({ ...s, diceValue: dice, diceRolled: true, movableTokenIds: movable }));
      }
    }, 400);
  }, [state]);

  const moveToken = useCallback((tokenId: string) => {
    setState(s => {
      if (!s.movableTokenIds.includes(tokenId) || s.diceValue === null) return s;

      const dice = s.diceValue;
      const tokens = s.tokens.map(t => {
        if (t.id !== tokenId) return t;
        const newPos = t.position === -1 ? 1 : Math.min(t.position + dice, 57);
        return { ...t, position: newPos };
      });

      const moved = tokens.find(t => t.id === tokenId)!;
      const currentPlayer = s.players[s.currentPlayerIndex];

      const capturedTokens = tokens.map(t => {
        if (t.player === currentPlayer || moved.position > 51 || moved.position < 0) return t;
        if (t.position < 0 || t.position > 51) return t;
        const movedCell = getMainTrackPos(currentPlayer, moved.position);
        const otherCell = getMainTrackPos(t.player, t.position);
        if (movedCell[0] === otherCell[0] && movedCell[1] === otherCell[1]) {
          if (!isMainTrackSafe(currentPlayer, moved.position)) return { ...t, position: -1 };
        }
        return t;
      });

      const playerTokens = capturedTokens.filter(t => t.player === currentPlayer);
      const allDone = playerTokens.every(t => t.position === 57);

      if (allDone) {
        return { ...s, tokens: capturedTokens, phase: 'finished', winner: currentPlayer, movableTokenIds: [], diceRolled: false, diceValue: null };
      }

      const grantExtra = dice === 6;
      const nextPlayerIndex = grantExtra
        ? s.currentPlayerIndex
        : (s.currentPlayerIndex + 1) % s.players.length;

      return {
        ...s,
        tokens: capturedTokens,
        currentPlayerIndex: nextPlayerIndex,
        diceValue: null,
        diceRolled: false,
        movableTokenIds: [],
        extraTurn: grantExtra,
      };
    });
  }, []);

  const resetGame = useCallback(() => setState(INITIAL_STATE), []);

  // ─── Setup Screen ─────────────────────────────────────────────────────────────

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
                onClick={() => setState(s => ({ ...s, playerCount: n }))}
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
          onClick={() => startGame(state.playerCount)}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
        >
          Start Game
        </button>
      </div>
    );
  }

  // ─── Playing / Finished ───────────────────────────────────────────────────────

  const currentPlayer = state.players[state.currentPlayerIndex];
  const canRoll = !state.diceRolled && !rolling;

  // Only include non-home-base tokens in the grid (home-base rendered in overlay)
  const tokensByCell: Record<string, Token[]> = {};
  for (const token of state.tokens) {
    if (token.position === -1) continue;
    const pos = getTokenGridPos(token);
    if (!pos) continue;
    const key = `${pos[0]}-${pos[1]}`;
    if (!tokensByCell[key]) tokensByCell[key] = [];
    tokensByCell[key].push(token);
  }

  const getCellStyle = (kind: CellKind, inactivePlayers: PlayerColor[]): React.CSSProperties => {
    if (kind.type === 'home-col') {
      const opacity = inactivePlayers.includes(kind.color) ? 0.3 : 1;
      return { backgroundColor: COLOR[kind.color].hex, opacity };
    }
    return {};
  };

  const inactivePlayers = (['red','blue','green','yellow'] as PlayerColor[]).filter(p => !state.players.includes(p));

  const quadrantPos: Record<PlayerColor, React.CSSProperties> = {
    green:  { top: 0,    left: 0    },
    yellow: { top: 0,    right: 0   },
    blue:   { bottom: 0, right: 0   },
    red:    { bottom: 0, left: 0    },
  };

  const quadrantRadius: Record<PlayerColor, string> = {
    green:  '0 0 10px 0',
    yellow: '0 0 0 10px',
    blue:   '10px 0 0 0',
    red:    '0 10px 0 0',
  };

  const boardSize = 'min(calc(100vw - 32px), min(calc(100vh - 140px), 480px))';

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

      {/* Top-left controls */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        {/* Hamburger — resets game */}
        <button
          onClick={resetGame}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 16, height: 2, background: 'white', borderRadius: 1 }} />
          ))}
        </button>
        {/* WIN trophy button */}
        <button
          style={{
            width: 48,
            height: 40,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
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
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: COLOR[currentPlayer].hex,
            border: '2px solid #FFB300',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            background: 'rgba(0,0,0,0.5)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: COLOR[currentPlayer].hex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            👤
          </div>
        </div>
        <span
          style={{
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 4,
            padding: '2px 8px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {PLAYER_LABEL[currentPlayer]}
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
        <div
          style={{
            background: '#ecf0f1',
            borderRadius: 8,
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15)',
            position: 'relative',
          }}
        >
          {/* ── 15×15 grid ──────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(15, 1fr)',
              width: '100%',
              height: '100%',
            }}
          >
            {Array.from({ length: 225 }, (_, i) => {
              const row = Math.floor(i / 15);
              const col = i % 15;
              const kind = BOARD_CELLS[row][col];
              const cellKey = `${row}-${col}`;
              const tokensHere = tokensByCell[cellKey] || [];
              const cellStyle = getCellStyle(kind, inactivePlayers);

              // background color for the cell
              let bgColor: string | undefined;
              if (kind.type === 'home-quadrant') bgColor = COLOR[kind.color].hex;
              else if (kind.type === 'path' || kind.type === 'home-col') bgColor = undefined; // handled below
              else if (kind.type === 'blank') bgColor = undefined;

              return (
                <div
                  key={cellKey}
                  className="relative flex items-center justify-center"
                  style={{
                    aspectRatio: '1/1',
                    minWidth: 0,
                    minHeight: 0,
                    backgroundColor: kind.type === 'home-quadrant'
                      ? (inactivePlayers.includes(kind.color) ? COLOR[kind.color].hex : COLOR[kind.color].hex)
                      : kind.type === 'path' ? '#ffffff'
                      : kind.type === 'center' ? 'transparent'
                      : undefined,
                    opacity: kind.type === 'home-quadrant' && inactivePlayers.includes(kind.color) ? 0.3 : 1,
                    ...(kind.type !== 'home-quadrant' && kind.type !== 'blank' ? {
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: 'inset 0 0 2px rgba(0,0,0,0.08)',
                    } : {}),
                    ...cellStyle,
                  }}
                >
                  {/* Center: 4-triangle pinwheel (rendered as overlay below, cells just transparent) */}

                  {/* Safe star — gray, centered */}
                  {kind.type === 'path' && kind.safe && !kind.startEntry && (
                    <span
                      className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                      style={{ fontSize: '85%', color: '#95a5a6', fontWeight: 'bold' }}
                    >★</span>
                  )}

                  {/* Globe for start/entry tiles — centered */}
                  {kind.type === 'path' && kind.startEntry && (
                    <span
                      className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                      style={{ fontSize: '86%', opacity: 0.5 }}
                    >🌐</span>
                  )}

                  {/* Tokens on track / home-col / center */}
                  {tokensHere.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 4 }}>
                      {tokensHere.length === 1 ? (
                        <TokenCircle
                          token={tokensHere[0]}
                          movable={state.movableTokenIds.includes(tokensHere[0].id)}
                          onClick={() => moveToken(tokensHere[0].id)}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-px" style={{ width: '100%', height: '100%', padding: 1 }}>
                          {tokensHere.map(t => (
                            <TokenCircle
                              key={t.id}
                              token={t}
                              movable={state.movableTokenIds.includes(t.id)}
                              onClick={() => moveToken(t.id)}
                              small
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Home quadrant overlays (z:1) ─────────────────────── */}
          {(['red','blue','green','yellow'] as PlayerColor[]).map(p => {
            const inactive = inactivePlayers.includes(p);
            return (
              <div
                key={p}
                style={{
                  position: 'absolute',
                  width: '40%',
                  height: '40%',
                  backgroundColor: COLOR[p].hex,
                  opacity: inactive ? 0.3 : 1,
                  pointerEvents: 'none',
                  zIndex: 1,
                  borderRadius: quadrantRadius[p],
                  ...quadrantPos[p],
                }}
              >
                {/* Inner tray — thick semi-transparent border, rounded */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '10%',
                    border: '10px solid rgba(0,0,0,0.15)',
                    borderRadius: 12,
                    backgroundColor: COLOR[p].hex,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 8,
                    boxSizing: 'border-box',
                  }}
                >
                  {[0,1,2,3].map(idx => (
                    <div
                      key={idx}
                      style={{
                        width: 'calc(50% - 4px)',
                        height: 'calc(50% - 4px)',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* ── Home base token overlays (z:2) — interactive ────── */}
          {(['red','blue','green','yellow'] as PlayerColor[]).map(p => {
            if (!state.players.includes(p)) return null;
            const homeTokens = state.tokens.filter(t => t.player === p && t.position === -1);
            if (homeTokens.length === 0) return null;
            return (
              <div
                key={p}
                style={{
                  position: 'absolute',
                  width: '40%',
                  height: '40%',
                  pointerEvents: 'none',
                  zIndex: 2,
                  ...quadrantPos[p],
                }}
              >
                {/* Match inner tray layout exactly */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '10%',
                    border: '10px solid transparent',
                    borderRadius: 12,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 8,
                    boxSizing: 'border-box',
                  }}
                >
                  {[0,1,2,3].map(idx => {
                    const token = homeTokens.find(t => t.index === idx);
                    return (
                      <div
                        key={idx}
                        style={{
                          width: 'calc(50% - 4px)',
                          height: 'calc(50% - 4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: token ? 'auto' : 'none',
                          flexShrink: 0,
                        }}
                      >
                        {token && (
                          <TokenCircle
                            token={token}
                            movable={state.movableTokenIds.includes(token.id)}
                            onClick={() => moveToken(token.id)}
                            home
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Center piece overlay (z:3) — 4 clip-path triangles ─ */}
          <div
            style={{
              position: 'absolute',
              top: `${(6/15)*100}%`,
              left: `${(6/15)*100}%`,
              width: `${(3/15)*100}%`,
              height: `${(3/15)*100}%`,
              pointerEvents: 'none',
              zIndex: 3,
              overflow: 'hidden',
            }}
          >
            {[
              { color: '#43A047', clip: 'polygon(50% 50%, 0% 0%, 0% 100%)' },
              { color: '#FFB300', clip: 'polygon(50% 50%, 0% 0%, 100% 0%)' },
              { color: '#1E88E5', clip: 'polygon(50% 50%, 100% 0%, 100% 100%)' },
              { color: '#E53935', clip: 'polygon(50% 50%, 100% 100%, 0% 100%)' },
            ].map(({ color, clip }) => (
              <div
                key={color}
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: color,
                  clipPath: clip,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom controls — absolute bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 10,
        }}
      >
        <DiceButton
          diceValue={state.diceValue}
          rolling={rolling}
          canRoll={state.phase === 'playing' && canRoll}
          onRoll={rollDice}
          playerColor={currentPlayer}
        />
      </div>
    </div>
  );
};

// ─── Token Circle — 3D sphere with crown ─────────────────────────────────────

const TokenCircle: React.FC<{
  token: Token;
  movable: boolean;
  onClick: () => void;
  small?: boolean;
  home?: boolean;
}> = ({ token, movable, onClick, small, home }) => {
  const hex = COLOR[token.player].hex;

  const sizeClass = home ? 'w-full h-full' : small ? 'w-4 h-4' : 'w-7 h-7';

  return (
    <button
      onClick={movable ? onClick : undefined}
      className={`
        ${sizeClass} rounded-full select-none transition-all flex-shrink-0
        relative flex items-center justify-center overflow-hidden
        ${movable ? 'ring-2 ring-white ring-offset-1 animate-pulse cursor-pointer scale-110' : 'cursor-default'}
      `}
      style={{
        backgroundColor: hex,
        boxShadow: small
          ? 'inset 0 -2px 3px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.35), 0 1px 3px rgba(0,0,0,0.4)'
          : 'inset 0 -4px 6px rgba(0,0,0,0.3), inset 0 4px 6px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
        border: '2px solid rgba(255,255,255,0.8)',
        maxWidth: home ? '70%' : undefined,
        maxHeight: home ? '70%' : undefined,
        aspectRatio: home ? '1/1' : undefined,
      }}
      title={movable ? 'Click to move' : undefined}
    >
      {!small && (
        <span style={{ fontSize: home ? 12 : 10, lineHeight: 1, pointerEvents: 'none', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
          👑
        </span>
      )}
    </button>
  );
};

export default Ludo;
