export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Token {
  id: string;
  player: PlayerColor;
  index: number;
  position: number; // -1=home base, 1-51=main track, 52-56=home col, 57=finished
}

export interface LudoState {
  phase: 'setup' | 'playing' | 'finished';
  playerCount: 2 | 3 | 4;
  players: PlayerColor[];
  tokens: Token[];
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  movableTokenIds: string[];
  winner: PlayerColor | null;
  bonusRolls: number;
  consecutiveSixes: number;
  sixStreakSnapshot: Token[] | null;
  sixPenalty: boolean;
  computerPlayers: PlayerColor[];
}
