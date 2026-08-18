import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Moon, SlidersHorizontal, X, MapPin, Search, Loader2, Bell } from 'lucide-react';
import {
  GeoStatus,
  PrayerMethod,
  PrayerMethodOption,
  PrayerName,
  PrayerTimings,
  AladhanTimings,
} from '../types';
import { prayerService } from '../services/prayerService';

const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const PRAYER_METHOD_OPTIONS: PrayerMethodOption[] = [
  { id: 3, label: 'Muslim World League' },
  { id: 2, label: 'ISNA (North America)' },
  { id: 4, label: 'Umm Al-Qura (Saudi)' },
  { id: 5, label: 'Egyptian Authority' },
  { id: 17, label: 'JAKIM (SE Asia)' },
];

function timeStringToMinutes(t: string): number {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPrayerStatuses(
  timings: AladhanTimings,
  now: Date
): {
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName;
  countdownSeconds: number;
} {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowSeconds = now.getSeconds();

  let currentPrayer: PrayerName | null = null;
  for (const name of PRAYER_NAMES) {
    if (timeStringToMinutes(timings[name]) <= nowMinutes) {
      currentPrayer = name;
    }
  }

  let nextPrayer: PrayerName | null = null;
  let nextPrayerTimeStr = '';
  for (const name of PRAYER_NAMES) {
    if (timeStringToMinutes(timings[name]) > nowMinutes) {
      nextPrayer = name;
      nextPrayerTimeStr = timings[name];
      break;
    }
  }

  if (!nextPrayer) {
    // After Isha — next prayer is Fajr tomorrow
    const secondsToMidnight = 24 * 3600 - (nowMinutes * 60 + nowSeconds);
    const fajrSeconds = timeStringToMinutes(timings['Fajr']) * 60;
    return { currentPrayer, nextPrayer: 'Fajr', countdownSeconds: secondsToMidnight + fajrSeconds };
  }

  const nextMinutes = timeStringToMinutes(nextPrayerTimeStr);
  const countdownSeconds = Math.max(0, nextMinutes * 60 - (nowMinutes * 60 + nowSeconds));
  return { currentPrayer, nextPrayer, countdownSeconds };
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function urlBase64ToUint8Array(b64url: string): Uint8Array {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from([...atob(b64)].map(c => c.charCodeAt(0)));
}

function formatPrayerTime(t: string): string {
  const [hh, mm] = t.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour = hh % 12 || 12;
  return `${hour}:${String(mm).padStart(2, '0')} ${period}`;
}

const PrayerPage: React.FC = () => {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [prayerData, setPrayerData] = useState<PrayerTimings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [method, setMethod] = useState<PrayerMethod>(3);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Push notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(
    () => localStorage.getItem('ls_prayer_location_name')
  );

  const lastFetchedDateRef = useRef<string | null>(null);
  const hasCachedCoordsRef = useRef(false);
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const methodRef = useRef(method);
  methodRef.current = method;

  // Load cached data immediately on mount
  useEffect(() => {
    const cached = localStorage.getItem('ls_prayer_data');
    if (cached) {
      try { setPrayerData(JSON.parse(cached)); } catch { /* ignore */ }
    }
    const cachedCoords = localStorage.getItem('ls_prayer_coords');
    if (cachedCoords) {
      try {
        const c = JSON.parse(cachedCoords);
        setCoords(c);
        setGeoStatus('granted');
        hasCachedCoordsRef.current = true;
      } catch { /* ignore */ }
    }
  }, []);

  const loadPrayerTimes = useCallback(async () => {
    const c = coordsRef.current;
    if (!c) return;
    setIsLoading(true);
    setFetchError(null);
    const result = await prayerService.fetchByCoords(c.lat, c.lon, methodRef.current);
    if (result) {
      setPrayerData(result);
      lastFetchedDateRef.current = result.gregorianDate;
      localStorage.setItem('ls_prayer_data', JSON.stringify(result));
    } else {
      setFetchError('Could not load prayer times. Check your connection.');
    }
    setIsLoading(false);
  }, []);

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      if (!hasCachedCoordsRef.current) setGeoStatus('denied');
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setCoords(c);
      setGeoStatus('granted');
      localStorage.setItem('ls_prayer_coords', JSON.stringify(c));
    };

    if (hasCachedCoordsRef.current) {
      // Silently refresh coords in background; never touch geoStatus or UI
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(c);
          localStorage.setItem('ls_prayer_coords', JSON.stringify(c));
        },
        () => { /* keep using cached coords */ },
        { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
      );
      return;
    }

    // First visit — no cached coords
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // User explicitly blocked — show city search form
          setGeoStatus('denied');
        } else {
          // Timeout or position unavailable — retry with coarse network location
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            () => setGeoStatus('denied'),
            { timeout: 20000, maximumAge: 600000, enableHighAccuracy: false }
          );
        }
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }, []);

  // Fetch when location is available or method changes
  useEffect(() => {
    if (geoStatus === 'granted' && coords) {
      loadPrayerTimes();
    }
  }, [geoStatus, coords, method, loadPrayerTimes]);

  // Second ticker + midnight refresh
  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setNow(n);
      const today = toDateString(n);
      if (lastFetchedDateRef.current && lastFetchedDateRef.current !== today) {
        loadPrayerTimes();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [loadPrayerTimes]);

  // Check whether browser already has an active push subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setIsPushSubscribed(!!sub))
    );
  }, []);

  // Reverse-geocode coords → human-readable city name, cached by rounded coords
  useEffect(() => {
    if (!coords) return;
    const key = `${Math.round(coords.lat * 10) / 10},${Math.round(coords.lon * 10) / 10}`;
    if (localStorage.getItem('ls_prayer_location_key') === key) return;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'LifeSync-PWA/1.0' } }
    )
      .then(r => r.json())
      .then(data => {
        const addr = data.address ?? {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
        const country = (addr.country_code ?? '').toUpperCase();
        const name = [city, country].filter(Boolean).join(', ');
        if (name) {
          setLocationName(name);
          localStorage.setItem('ls_prayer_location_name', name);
          localStorage.setItem('ls_prayer_location_key', key);
        }
      })
      .catch(() => {});
  }, [coords]);

  // Show first-visit notification prompt after 1.5s if not yet asked
  useEffect(() => {
    if (!('PushManager' in window)) return;
    if (localStorage.getItem('ls_prayer_notif_shown')) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      localStorage.setItem('ls_prayer_notif_shown', 'true');
      return;
    }
    const timer = setTimeout(() => setShowNotifModal(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleTogglePushNotifications = useCallback(async () => {
    const WORKER_URL = (import.meta.env.VITE_GEMINI_PROXY_URL as string) ?? '';
    const VAPID_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ?? '';

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }
    if (!VAPID_KEY) {
      alert('VITE_VAPID_PUBLIC_KEY is not set in .env.local');
      return;
    }

    setIsPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (isPushSubscribed) {
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          await fetch(`${WORKER_URL}/unsubscribe`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: existingSub.endpoint }),
          });
        }
        setIsPushSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        setNotifPermission(permission);
        if (permission !== 'granted') return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });

        if (!coords) throw new Error('Location not available yet');

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`${WORKER_URL}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            lat: coords.lat,
            lon: coords.lon,
            method,
            timezone,
          }),
        });
        if (!res.ok) throw new Error('Failed to save subscription on server');
        setIsPushSubscribed(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
    } finally {
      setIsPushLoading(false);
    }
  }, [isPushSubscribed, coords, method]);

  const handleNotifModalEnable = useCallback(async () => {
    localStorage.setItem('ls_prayer_notif_shown', 'true');
    setShowNotifModal(false);
    await handleTogglePushNotifications();
  }, [handleTogglePushNotifications]);

  const handleNotifModalDismiss = useCallback(() => {
    localStorage.setItem('ls_prayer_notif_shown', 'true');
    setShowNotifModal(false);
  }, []);

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setIsSearching(true);
    setFetchError(null);
    const result = await prayerService.fetchByCity(
      cityInput.trim(),
      countryInput.trim() || 'US',
      method
    );
    if (result) {
      setPrayerData(result);
      lastFetchedDateRef.current = result.gregorianDate;
      localStorage.setItem('ls_prayer_data', JSON.stringify(result));
      const name = [cityInput.trim(), (countryInput.trim() || 'US').toUpperCase()].join(', ');
      setLocationName(name);
      localStorage.setItem('ls_prayer_location_name', name);
    } else {
      setFetchError('City not found. Try e.g. "Dhaka" with country "BD".');
    }
    setIsSearching(false);
  };

  const prayerStatuses = prayerData
    ? getPrayerStatuses(prayerData.timings, now)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Moon className="text-indigo-500 w-7 h-7 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white leading-tight">Prayer Times</h2>
            {locationName && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={10} />
                {locationName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {'PushManager' in window && (
            <button
              onClick={handleTogglePushNotifications}
              disabled={isPushLoading || notifPermission === 'denied'}
              title={
                notifPermission === 'denied'
                  ? 'Notifications blocked in browser settings'
                  : isPushSubscribed
                  ? 'Disable prayer notifications'
                  : 'Enable prayer notifications'
              }
              className={`p-2 rounded-xl transition-colors disabled:opacity-40 ${
                isPushSubscribed
                  ? 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {isPushLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Bell size={20} className={isPushSubscribed ? 'fill-indigo-500 text-indigo-500' : ''} />
              )}
            </button>
          )}
          <button
            onClick={() => setShowMethodPicker((p) => !p)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            {showMethodPicker ? <X size={20} /> : <SlidersHorizontal size={20} />}
          </button>
        </div>
      </div>

      {/* Method Picker */}
      {showMethodPicker && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 space-y-1 animate-in fade-in slide-in-from-top-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Calculation Method</p>
          {PRAYER_METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setMethod(opt.id); setShowMethodPicker(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                method === opt.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
              {method === opt.id && <span className="ml-2 text-indigo-400">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Detecting location */}
      {geoStatus === 'detecting' && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <Loader2 className="animate-spin text-indigo-500 w-5 h-5 shrink-0" />
          <span className="text-sm text-indigo-700 dark:text-indigo-300">Detecting your location...</span>
        </div>
      )}

      {/* City search fallback */}
      {geoStatus === 'denied' && !prayerData && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
            <MapPin size={16} />
            <span className="text-sm font-medium">Location access denied. Enter your city:</span>
          </div>
          <form onSubmit={handleCitySearch} className="flex gap-2">
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="City (e.g. Dhaka)"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              value={countryInput}
              onChange={(e) => setCountryInput(e.target.value)}
              placeholder="BD"
              className="w-16 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {isSearching ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Error banner */}
      {fetchError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {fetchError}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !prayerData && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Main content */}
      {prayerData && prayerStatuses && (
        <>
          {/* Hero countdown card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-xs font-medium opacity-75 mb-1">
              {prayerData.hijri.weekday?.en && `${prayerData.hijri.weekday.en}, `}
              {prayerData.hijri.day} {prayerData.hijri.month.en} {prayerData.hijri.year} AH
            </div>
            <div className="text-sm font-semibold opacity-90 mb-2">
              Next: <span className="font-bold">{prayerStatuses.nextPrayer}</span>
              {' '}at {formatPrayerTime(prayerData.timings[prayerStatuses.nextPrayer])}
            </div>
            <div className="text-5xl font-light tracking-tight tabular-nums leading-none">
              {formatCountdown(prayerStatuses.countdownSeconds)}
            </div>
            <div className="text-xs opacity-60 mt-1">remaining</div>
          </div>

          {/* Prayer time cards */}
          <div className="space-y-3">
            {PRAYER_NAMES.map((name) => {
              const isCurrent = name === prayerStatuses.currentPrayer;
              const isNext = name === prayerStatuses.nextPrayer;
              return (
                <div
                  key={name}
                  className={`relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border flex justify-between items-center transition-colors ${
                    isCurrent
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : isNext
                      ? 'border-purple-200 dark:border-purple-700'
                      : 'border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        isCurrent
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {name}
                    </h3>
                    {isCurrent && (
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                        Current
                      </span>
                    )}
                    {isNext && !isCurrent && (
                      <span className="text-xs text-purple-500 dark:text-purple-400 font-medium">
                        Next
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-2xl font-light tracking-tight tabular-nums ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isNext
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {formatPrayerTime(prayerData.timings[name])}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secondary times */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3 tracking-wide">
              Additional Times
            </h4>
            <div className="space-y-2">
              {[
                { label: 'Sunrise', key: 'Sunrise' as const },
                { label: 'Imsak (Sehri ends)', key: 'Imsak' as const },
                { label: 'Midnight', key: 'Midnight' as const },
              ].map(({ label, key }) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {formatPrayerTime(prayerData.timings[key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* First-visit notification permission modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 border border-gray-100 dark:border-slate-700">
            <div className="flex justify-center gap-3 text-indigo-500">
              <Moon className="w-8 h-8" />
              <Bell className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                Enable Prayer Notifications
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Get notified when each prayer time starts, even when the app is closed.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleNotifModalEnable}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Enable
              </button>
              <button
                onClick={handleNotifModalDismiss}
                className="w-full py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerPage;
