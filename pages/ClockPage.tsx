import React, { useState, useEffect } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import { CityTimeZone } from '../types';

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

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addCity = (city: typeof AVAILABLE_ZONES[0]) => {
    if (!myCities.find(c => c.id === city.id)) {
      setMyCities([...myCities, city]);
    }
    setIsAdding(false);
  };

  const removeCity = (id: string) => {
    if (id === 'local') return;
    setMyCities(myCities.filter(c => c.id !== id));
  };

  const formatTime = (date: Date, timeZone: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone
    }).format(date);
  };
  
  const formatDate = (date: Date, timeZone: string) => {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone
      }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="text-indigo-500" /> World Clock
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition"
        >
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <h3 className="font-semibold mb-3">Add City</h3>
            <div className="flex flex-wrap gap-2">
                {AVAILABLE_ZONES.map(city => (
                    <button
                        key={city.id}
                        onClick={() => addCity(city)}
                        className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                    >
                        {city.name}
                    </button>
                ))}
            </div>
        </div>
      )}

      <div className="space-y-4">
        {myCities.map((city) => (
          <div key={city.id} className="relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center">
            <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{formatDate(time, city.timeZone)}</div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{city.name}</h3>
            </div>
            <div className="text-3xl font-light tracking-tight tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatTime(time, city.timeZone)}
            </div>
            {city.id !== 'local' && (
                <button 
                    onClick={() => removeCity(city.id)}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400"
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