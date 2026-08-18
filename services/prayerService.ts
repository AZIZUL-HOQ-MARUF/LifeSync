import { PrayerMethod, PrayerTimings } from '../types';

const BASE_URL = 'https://api.aladhan.com/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseResponse(data: any): PrayerTimings | null {
  try {
    const raw = data.timings;
    const timings: any = {};
    for (const key of Object.keys(raw)) {
      timings[key] = raw[key].split(' ')[0]; // strip " (EST)" suffix
    }
    return {
      timings,
      hijri: data.date.hijri,
      gregorianDate: toDateString(new Date()),
    };
  } catch {
    return null;
  }
}

function cacheGet(key: string): PrayerTimings | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { sessionStorage.removeItem(key); return null; }
    return data as PrayerTimings;
  } catch { return null; }
}

function cacheSet(key: string, data: PrayerTimings): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS }));
  } catch { /* storage full — skip */ }
}

export const prayerService = {
  fetchByCoords: async (
    lat: number,
    lon: number,
    method: PrayerMethod
  ): Promise<PrayerTimings | null> => {
    const key = `aladhan:${lat.toFixed(2)}:${lon.toFixed(2)}:${method}:${toDateString(new Date())}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `${BASE_URL}/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=${method}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.code !== 200) return null;
      const result = parseResponse(json.data);
      if (result) cacheSet(key, result);
      return result;
    } catch (error) {
      console.error('prayerService.fetchByCoords error:', error);
      return null;
    }
  },

  fetchByCity: async (
    city: string,
    country: string,
    method: PrayerMethod
  ): Promise<PrayerTimings | null> => {
    const key = `aladhan:city:${city.toLowerCase()}:${country.toLowerCase()}:${method}:${toDateString(new Date())}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    try {
      const url = `${BASE_URL}/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.code !== 200) return null;
      const result = parseResponse(json.data);
      if (result) cacheSet(key, result);
      return result;
    } catch (error) {
      console.error('prayerService.fetchByCity error:', error);
      return null;
    }
  },
};
