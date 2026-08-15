import type { PlayerColor } from './types';
import { MAIN_TRACK, HOME_COL, HOME_BASE_CELLS, START_INDEX, SAFE_POSITIONS, START_ABS_POSITIONS } from './constants';

export type CellKind =
  | { type: 'home-quadrant'; color: PlayerColor; inner: boolean }
  | { type: 'path'; safe: boolean; startEntry: boolean }
  | { type: 'home-col'; color: PlayerColor }
  | { type: 'center' }
  | { type: 'blank' };

export function classifyCell(row: number, col: number): CellKind {
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

export const BOARD_CELLS: CellKind[][] = Array.from({ length: 15 }, (_, r) =>
  Array.from({ length: 15 }, (_, c) => classifyCell(r, c))
);

export function getTokenGridPos(token: { player: PlayerColor; index: number; position: number }): [number, number] | null {
  if (token.position === -1) return HOME_BASE_CELLS[token.player][token.index];
  if (token.position === 57)  return [7, 7];
  if (token.position >= 52)   return HOME_COL[token.player][token.position - 52];
  const trackIndex = (START_INDEX[token.player] + token.position) % 52;
  return MAIN_TRACK[trackIndex];
}

export function getMainTrackPos(player: PlayerColor, relPos: number): [number, number] {
  return MAIN_TRACK[(START_INDEX[player] + relPos) % 52];
}

export function isMainTrackSafe(player: PlayerColor, relPos: number): boolean {
  const absPos = (START_INDEX[player] + relPos) % 52;
  return SAFE_POSITIONS.has(absPos);
}
