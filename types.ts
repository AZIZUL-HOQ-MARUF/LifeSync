export enum AppTheme {
  LIGHT = 'light',
  DARK = 'dark'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO string
  isCompleted: boolean;
  notified: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface CityTimeZone {
  id: string;
  name: string;
  timeZone: string;
}

export enum GameType {
  NONE = 'none',
  TIC_TAC_TOE = 'tic_tac_toe',
  SNAKE = 'snake',
  MEMORY = 'memory',
  GAME_2048 = 'game_2048'
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';