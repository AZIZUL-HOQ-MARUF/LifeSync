import React from 'react';
import type { Token } from './types';
import { COLOR } from './constants';

interface TokenCircleProps {
  token: Token;
  movable: boolean;
  onClick: () => void;
  small?: boolean;
  home?: boolean;
  inDuo?: boolean;
}

const TokenCircle: React.FC<TokenCircleProps> = ({ token, movable, onClick, small, home, inDuo }) => {
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
        boxShadow: inDuo
          ? `inset 0 -4px 6px rgba(0,0,0,0.3), inset 0 4px 6px rgba(255,255,255,0.4), 0 0 0 3px white, 0 0 0 5px ${hex}, 0 2px 6px rgba(0,0,0,0.5)`
          : small
            ? 'inset 0 -2px 3px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.35), 0 1px 3px rgba(0,0,0,0.4)'
            : 'inset 0 -4px 6px rgba(0,0,0,0.3), inset 0 4px 6px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)',
        border: '2px solid rgba(255,255,255,0.8)',
        maxWidth: home ? '70%' : undefined,
        maxHeight: home ? '70%' : undefined,
        aspectRatio: home ? '1/1' : undefined,
      }}
      title={movable ? 'Click to move (duo)' : undefined}
    >
      {!small && (
        <span style={{ fontSize: home ? 12 : 10, lineHeight: 1, pointerEvents: 'none', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
          👑
        </span>
      )}
    </button>
  );
};

export default React.memo(TokenCircle);
