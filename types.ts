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
  GAME_2048 = 'game_2048',
  LUDO = 'ludo'
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// --- Prayer Times ---

export type PrayerMethod = 2 | 3 | 4 | 5 | 17;

export interface PrayerMethodOption {
  id: PrayerMethod;
  label: string;
}

export interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface AladhanHijriDate {
  date: string;
  day: string;
  month: { en: string; ar: string; number: number };
  year: string;
  weekday: { en: string; ar: string };
}

export interface PrayerTimings {
  timings: AladhanTimings;
  hijri: AladhanHijriDate;
  gregorianDate: string;
}

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type GeoStatus = 'idle' | 'detecting' | 'granted' | 'denied';