import React, { useState, useEffect } from 'react';
import { Plus, X, Globe, Search, Loader2, MapPin } from 'lucide-react';
import { CityTimeZone } from '../types';
import { getTimeZoneInfo } from '../services/geminiService';

const AVAILABLE_ZONES = [
  { id: 'nyc', name: 'New York', timeZone: 'America/New_York' },
  { id: 'lon', name: 'London', timeZone: 'Europe/London' },
  { id: 'tyo', name: 'Tokyo', timeZone: 'Asia/Tokyo' },
  { id: 'syd', name: 'Sydney', timeZone: 'Australia/Sydney' },
  { id: 'dub', name: 'Dubai', timeZone: 'Asia/Dubai' },
  { id: 'par', name: 'Paris', timeZone: 'Europe/Paris' },
  { id: 'lax', name: 'Los Angeles', timeZone: 'America/Los_Angeles' },
];

const ClockPage: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [myCities, setMyCities] = useState<CityTimeZone[]>([
    { id: 'local', name: 'Local Time', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addCity = (city: { name: string, timeZone: string, id?: string }) => {
    if (!myCities.find(c => c.timeZone === city.timeZone)) {
      setMyCities([...myCities, { ...city, id: city.id || Date.now().toString() }]);
    }
    setIsAdding(false);
    setSearchQuery('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const result = await getTimeZoneInfo(searchQuery);
    setIsSearching(false);

    if (result) {
      addCity(result);
    } else {
      alert("Could not find timezone for that city. Please try checking the spelling.");
    }
  };

  const removeCity = (id: string) => {
    if (id === 'local') return;
    setMyCities(myCities.filter(c => c.id !== id));
  };

  const formatTime = (date: Date, timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone
      }).format(date);
    } catch (e) {
      return '--:--';
    }
  };
  
  const formatDate = (date: Date, timeZone: string) => {
      try {
        return new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone
        }).format(date);
      } catch (e) {
        return 'Invalid TZ';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="text-indigo-500" /> World Clock
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`p-2 rounded-lg transition-colors ${isAdding ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200'}`}
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 space-y-4">
            
            {/* AI Search Bar */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Find City</label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type city name..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    autoFocus
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-indigo-600 text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* Quick Suggestions */}
            <div>
               <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Popular Cities</label>
               <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ZONES.map(city => (
                      <button
                          key={city.id}
                          onClick={() => addCity(city)}
                          className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                      >
                          {city.name}
                      </button>
                  ))}
              </div>
            </div>
        </div>
      )}

      <div className="space-y-4">
        {myCities.map((city) => (
          <div key={city.id} className="relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
            <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{formatDate(time, city.timeZone)}</div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{city.name}</h3>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{city.timeZone}</div>
            </div>
            <div className="text-3xl font-light tracking-tight tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatTime(time, city.timeZone)}
            </div>
            {city.id !== 'local' && (
                <button 
                    onClick={() => removeCity(city.id)}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400 transition-colors"
                >
                    <X size={14} />
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClockPage;