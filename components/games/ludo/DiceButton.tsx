import React from 'react';
import type { PlayerColor } from './types';

export const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const DICE_PALETTE: Record<PlayerColor, { top: string; mid: string; shadow: string }> = {
  red:    { top: '#ef5350', mid: '#E53935', shadow: '#b71c1c' },
  blue:   { top: '#42A5F5', mid: '#1E88E5', shadow: '#0d47a1' },
  green:  { top: '#66BB6A', mid: '#43A047', shadow: '#1b5e20' },
  yellow: { top: '#FFCA28', mid: '#FFB300', shadow: '#e65100' },
};

const DICE_FACE_STYLE: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  background: 'white',
  display: 'grid',
  gridTemplateColumns: 'repeat(3,1fr)',
  gridTemplateRows: 'repeat(3,1fr)',
  padding: 5,
  gap: 2,
};

const GRID_POSITIONS: Array<[number, number]> = Array.from({ length: 9 }, (_, i) => [Math.floor(i / 3), i % 3]);

const PIP_STYLE: React.CSSProperties = { borderRadius: '50%' };

interface DiceButtonProps {
  diceValue: number | null;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerColor: PlayerColor;
}

const DiceButton: React.FC<DiceButtonProps> = ({ diceValue, rolling, canRoll, onRoll, playerColor }) => {
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
      <div style={DICE_FACE_STYLE}>
        {diceValue !== null
          ? GRID_POSITIONS.map(([r, c], i) => {
              const active = PIP_LAYOUTS[diceValue]?.some(([pr, pc]) => pr === r && pc === c);
              return (
                <div key={i} style={{ ...PIP_STYLE, background: active ? '#2c1538' : 'transparent' }} />
              );
            })
          : (
            <div style={{ gridColumn: '1/-1', gridRow: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 'bold', color: pal.mid }}>
              {canRoll ? '?' : ''}
            </div>
          )
        }
      </div>
    </button>
  );
};

export default React.memo(DiceButton);
