import type { PlayerColor } from './types';

export const MAIN_TRACK: [number, number][] = [
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

export const HOME_COL: Record<PlayerColor, [number, number][]> = {
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9]],
  red:    [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

export const START_INDEX: Record<PlayerColor, number> = {
  green: 0, yellow: 13, blue: 26, red: 39,
};

export const HOME_BASE_CELLS: Record<PlayerColor, [number, number][]> = {
  green:  [[2,2],[2,3],[3,2],[3,3]],
  yellow: [[2,11],[2,12],[3,11],[3,12]],
  blue:   [[11,11],[11,12],[12,11],[12,12]],
  red:    [[11,2],[11,3],[12,2],[12,3]],
};

export const SAFE_POSITIONS = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
export const START_ABS_POSITIONS = new Set([1, 14, 27, 40]);

export const COLOR: Record<PlayerColor, { bg: string; light: string; border: string; ring: string; text: string; hex: string }> = {
  red:    { bg: 'bg-red-600',    light: 'bg-red-100',    border: 'border-red-600',    ring: 'ring-red-500',    text: 'text-red-700',    hex: '#E53935' },
  blue:   { bg: 'bg-blue-700',   light: 'bg-blue-100',   border: 'border-blue-700',   ring: 'ring-blue-600',   text: 'text-blue-700',   hex: '#1E88E5' },
  green:  { bg: 'bg-green-600',  light: 'bg-green-100',  border: 'border-green-600',  ring: 'ring-green-500',  text: 'text-green-700',  hex: '#43A047' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-100', border: 'border-yellow-500', ring: 'ring-yellow-400', text: 'text-yellow-700', hex: '#FFB300' },
};

export const PLAYER_LABEL: Record<PlayerColor, string> = {
  red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow',
};
