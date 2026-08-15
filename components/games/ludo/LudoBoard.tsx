import React from 'react';
import type { PlayerColor, Token } from './types';
import { COLOR } from './constants';
import { BOARD_CELLS } from './board';
import TokenCircle from './TokenCircle';

// Module-level constants (moved from index.tsx)
export const quadrantPos: Record<PlayerColor, React.CSSProperties> = {
  green:  { top: 0,    left: 0    },
  yellow: { top: 0,    right: 0   },
  blue:   { bottom: 0, right: 0   },
  red:    { bottom: 0, left: 0    },
};

export const quadrantRadius: Record<PlayerColor, string> = {
  green:  '0 0 10px 0',
  yellow: '0 0 0 10px',
  blue:   '10px 0 0 0',
  red:    '0 10px 0 0',
};

interface LudoBoardProps {
  tokens: Token[];
  players: PlayerColor[];
  tokensByCell: Record<string, Token[]>;
  movableSet: ReadonlySet<string>;
  moveToken: (id: string) => void;
  inactiveSet: ReadonlySet<PlayerColor>;
}

const BOARD_CONTAINER_STYLE: React.CSSProperties = {
  background: '#ecf0f1',
  borderRadius: 8,
  overflow: 'hidden',
  width: '100%',
  height: '100%',
  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15)',
  position: 'relative',
};

const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(15, 1fr)',
  width: '100%',
  height: '100%',
};

// BoardGrid: purely structural — re-renders only when inactiveSet changes (fixed at game start)
const BoardGrid = React.memo(({ inactiveSet }: { inactiveSet: ReadonlySet<PlayerColor> }) => (
  <div style={GRID_STYLE}>
    {Array.from({ length: 225 }, (_, i) => {
      const row = Math.floor(i / 15);
      const col = i % 15;
      const kind = BOARD_CELLS[row][col];

      const bgColor =
        kind.type === 'home-quadrant' ? COLOR[kind.color].hex :
        kind.type === 'home-col'      ? COLOR[kind.color].hex :
        kind.type === 'path'          ? '#ffffff' :
        kind.type === 'center'        ? 'transparent' :
        undefined;

      const dimmed = (kind.type === 'home-quadrant' || kind.type === 'home-col') && inactiveSet.has(kind.color);
      const hasBorder = kind.type !== 'home-quadrant' && kind.type !== 'blank';

      return (
        <div
          key={`${row}-${col}`}
          className="relative flex items-center justify-center"
          style={{
            aspectRatio: '1/1',
            minWidth: 0,
            minHeight: 0,
            backgroundColor: bgColor,
            opacity: dimmed ? 0.3 : undefined,
            ...(hasBorder ? { border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.08)' } : {}),
          }}
        >
          {kind.type === 'path' && kind.safe && !kind.startEntry && (
            <span
              className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
              style={{ fontSize: '85%', color: '#95a5a6', fontWeight: 'bold' }}
            >★</span>
          )}
          {kind.type === 'path' && kind.startEntry && (
            <span
              className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
              style={{ fontSize: '86%', opacity: 0.5 }}
            >🏠</span>
          )}
        </div>
      );
    })}
  </div>
));
BoardGrid.displayName = 'BoardGrid';

// TokenLayer: sparse — iterates only occupied cells instead of all 225
const TokenLayer = React.memo(({ tokensByCell, movableSet, moveToken }: {
  tokensByCell: Record<string, Token[]>;
  movableSet: ReadonlySet<string>;
  moveToken: (id: string) => void;
}) => (
  <>
    {Object.entries(tokensByCell).map(([key, tokensHere]) => {
      const dash = key.indexOf('-');
      const row = parseInt(key.slice(0, dash), 10);
      const col = parseInt(key.slice(dash + 1), 10);
      const kind = BOARD_CELLS[row][col];

      const isDuoCell =
        tokensHere.length >= 2 &&
        tokensHere.every(t => t.player === tokensHere[0].player) &&
        kind.type === 'path' && !kind.safe;

      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            top: `${(row / 15) * 100}%`,
            left: `${(col / 15) * 100}%`,
            width: `${(1 / 15) * 100}%`,
            height: `${(1 / 15) * 100}%`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4,
          }}
        >
          {isDuoCell ? (() => {
            const sorted = [...tokensHere].sort((a, b) => a.index - b.index);
            const duoLead = sorted[0];
            const singles = sorted.slice(2);
            const hex = COLOR[duoLead.player].hex;
            return (
              <div className="absolute inset-0 flex items-center justify-center gap-px">
                <div style={{ position: 'relative' }}>
                  <TokenCircle
                    token={duoLead}
                    movable={movableSet.has(duoLead.id)}
                    onClick={() => moveToken(duoLead.id)}
                    inDuo
                  />
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    background: hex, color: 'white',
                    borderRadius: '50%', width: 15, height: 15,
                    fontSize: 8, fontWeight: 900, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}>2</div>
                </div>
                {singles.map(single => (
                  <TokenCircle
                    key={single.id}
                    token={single}
                    movable={movableSet.has(single.id)}
                    onClick={() => moveToken(single.id)}
                    small
                  />
                ))}
              </div>
            );
          })() : tokensHere.length === 1 ? (
            <TokenCircle
              token={tokensHere[0]}
              movable={movableSet.has(tokensHere[0].id)}
              onClick={() => moveToken(tokensHere[0].id)}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-px" style={{ width: '100%', height: '100%', padding: 1 }}>
              {tokensHere.map(t => (
                <TokenCircle
                  key={t.id}
                  token={t}
                  movable={movableSet.has(t.id)}
                  onClick={() => moveToken(t.id)}
                  small
                />
              ))}
            </div>
          )}
        </div>
      );
    })}
  </>
));
TokenLayer.displayName = 'TokenLayer';

// HomeQuadrantOverlays: decorative corners — never re-renders during gameplay
const HomeQuadrantOverlays = React.memo(({ inactiveSet }: { inactiveSet: ReadonlySet<PlayerColor> }) => (
  <>
    {(['red', 'blue', 'green', 'yellow'] as PlayerColor[]).map(p => (
      <div
        key={p}
        style={{
          position: 'absolute',
          width: '40%',
          height: '40%',
          backgroundColor: COLOR[p].hex,
          opacity: inactiveSet.has(p) ? 0.3 : 1,
          pointerEvents: 'none',
          zIndex: 1,
          borderRadius: quadrantRadius[p],
          ...quadrantPos[p],
        }}
      >
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
          {[0, 1, 2, 3].map(idx => (
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
    ))}
  </>
));
HomeQuadrantOverlays.displayName = 'HomeQuadrantOverlays';

// HomeTokenOverlays: tokens sitting in home base
const HomeTokenOverlays = React.memo(({ players, tokens, movableSet, moveToken }: {
  players: PlayerColor[];
  tokens: Token[];
  movableSet: ReadonlySet<string>;
  moveToken: (id: string) => void;
}) => (
  <>
    {(['red', 'blue', 'green', 'yellow'] as PlayerColor[]).map(p => {
      if (!players.includes(p)) return null;
      const homeTokens = tokens.filter(t => t.player === p && t.position === -1);
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
            {[0, 1, 2, 3].map(idx => {
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
                      movable={movableSet.has(token.id)}
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
  </>
));
HomeTokenOverlays.displayName = 'HomeTokenOverlays';

// FinishedTokensOverlay: tokens at position 57, randomly scattered within the 3×3 center area
function pseudoRandom(seed: string): [number, number] {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (((h << 5) + h) ^ seed.charCodeAt(i)) & 0xffffffff;
  h = h >>> 0;
  return [(h & 0xffff) / 0xffff, (h >>> 16) / 0xffff];
}

const TOKEN_SIZE_PCT = 30;

const FinishedTokensOverlay = React.memo(({ tokens }: { tokens: Token[] }) => {
  const finished = tokens.filter(t => t.position === 57);
  if (finished.length === 0) return null;
  const spread = 100 - TOKEN_SIZE_PCT;
  return (
    <div
      style={{
        position: 'absolute',
        top: `${(6 / 15) * 100}%`,
        left: `${(6 / 15) * 100}%`,
        width: `${(3 / 15) * 100}%`,
        height: `${(3 / 15) * 100}%`,
        zIndex: 5,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {finished.map(token => {
        const [rx, ry] = pseudoRandom(token.id);
        return (
          <div
            key={token.id}
            style={{
              position: 'absolute',
              left: `${rx * spread}%`,
              top: `${ry * spread}%`,
              width: `${TOKEN_SIZE_PCT}%`,
              height: `${TOKEN_SIZE_PCT}%`,
              borderRadius: '50%',
              backgroundColor: COLOR[token.player].hex,
              border: '2px solid rgba(255,255,255,0.85)',
              boxShadow: 'inset 0 -3px 5px rgba(0,0,0,0.3), inset 0 3px 5px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: '50%', lineHeight: 1, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>👑</span>
          </div>
        );
      })}
    </div>
  );
});
FinishedTokensOverlay.displayName = 'FinishedTokensOverlay';

// CenterPinwheel: static, never re-renders
const PINWHEEL_SEGMENTS = [
  { color: '#43A047', clip: 'polygon(50% 50%, 0% 0%, 0% 100%)' },
  { color: '#FFB300', clip: 'polygon(50% 50%, 0% 0%, 100% 0%)' },
  { color: '#1E88E5', clip: 'polygon(50% 50%, 100% 0%, 100% 100%)' },
  { color: '#E53935', clip: 'polygon(50% 50%, 100% 100%, 0% 100%)' },
];

const CenterPinwheel = React.memo(() => (
  <div
    style={{
      position: 'absolute',
      top: `${(6 / 15) * 100}%`,
      left: `${(6 / 15) * 100}%`,
      width: `${(3 / 15) * 100}%`,
      height: `${(3 / 15) * 100}%`,
      pointerEvents: 'none',
      zIndex: 3,
      overflow: 'hidden',
    }}
  >
    {PINWHEEL_SEGMENTS.map(({ color, clip }) => (
      <div
        key={color}
        style={{ position: 'absolute', inset: 0, backgroundColor: color, clipPath: clip }}
      />
    ))}
  </div>
));
CenterPinwheel.displayName = 'CenterPinwheel';

const LudoBoard = React.memo<LudoBoardProps>(({
  tokens, players, tokensByCell, movableSet, moveToken, inactiveSet,
}) => (
  <div style={BOARD_CONTAINER_STYLE}>
    <BoardGrid inactiveSet={inactiveSet} />
    <TokenLayer tokensByCell={tokensByCell} movableSet={movableSet} moveToken={moveToken} />
    <HomeQuadrantOverlays inactiveSet={inactiveSet} />
    <HomeTokenOverlays players={players} tokens={tokens} movableSet={movableSet} moveToken={moveToken} />
    <CenterPinwheel />
    <FinishedTokensOverlay tokens={tokens} />
  </div>
));
LudoBoard.displayName = 'LudoBoard';

export default LudoBoard;
