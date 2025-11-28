
import React, { useEffect, useState } from 'react';
import { Moon, Sun, Bell, Shield, Info, LogOut, User as UserIcon, Cloud, Check, X, Smartphone } from 'lucide-react';
import { AppTheme } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';

const SettingsPage: React.FC = () => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (document.documentElement.classList.contains('dark')) return AppTheme.DARK;
    return AppTheme.LIGHT;
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === AppTheme.DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    setNotifPermission(notificationService.getPermission());
  }, []);

  const requestNotif = async () => {
    const result = await notificationService.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') {
        notificationService.sendNotification("Notifications Active", {
            body: "You will now be notified of your tasks!",
        });
    }
  };

  const sendTestNotification = () => {
      notificationService.sendNotification("Test Notification", {
          body: "This is how your task reminders will look.",
      });
  };

  const handleLogout = async () => {
      await logout();
      navigate('/login');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <div className="space-y-4">
        {/* Account Section */}
        <section className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account</h3>
            {user ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                             {user.avatar ? <img src={user.avatar} alt="Profile" /> : <UserIcon className="text-indigo-500" />}
                         </div>
                         <div>
                             <div className="font-medium">{user.name}</div>
                             <div className="text-xs text-gray-500">{user.email}</div>
                         </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <div onClick={() => navigate('/login')} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                            <Cloud className="text-gray-500" />
                        </div>
                        <div>
                            <div className="font-medium group-hover:text-indigo-600 transition-colors">Sign In to Cloud</div>
                            <div className="text-xs text-gray-500">Sync tasks across devices</div>
                        </div>
                    </div>
                    <div className="text-indigo-600 text-sm font-medium">Login</div>
                </div>
            )}
        </section>

        {/* Theme Section */}
        <section className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Appearance</h3>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {theme === AppTheme.DARK ? <Moon className="text-indigo-500" /> : <Sun className="text-orange-500" />}
                    <span>Dark Mode</span>
                </div>
                <button 
                    onClick={() => setTheme(prev => prev === AppTheme.DARK ? AppTheme.LIGHT : AppTheme.DARK)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${theme === AppTheme.DARK ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${theme === AppTheme.DARK ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Permissions</h3>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className={notifPermission === 'granted' ? 'text-green-500' : 'text-gray-400'} />
                        <div>
                            <div className="font-medium">Push Notifications</div>
                            <div className="text-xs text-gray-500">
                                {notifPermission === 'granted' ? 'Active' : notifPermission === 'denied' ? 'Blocked' : 'Not Enabled'}
                            </div>
                        </div>
                    </div>
                    {notifPermission === 'granted' ? (
                         <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                            <Check size={16} /> On
                         </div>
                    ) : (
                         <button 
                            onClick={requestNotif} 
                            disabled={notifPermission === 'denied'}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                notifPermission === 'denied' 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}
                         >
                            {notifPermission === 'denied' ? 'Blocked in Browser' : 'Enable'}
                         </button>
                    )}
                </div>

                {notifPermission === 'granted' && (
                    <button 
                        onClick={sendTestNotification}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                    >
                        <Smartphone size={16} />
                        Test Notification
                    </button>
                )}
            </div>
        </section>

        {/* About Section */}
        <section className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
             <div className="flex items-center gap-3 mb-2">
                <Info className="text-blue-500" />
                <span className="font-medium">About LifeSync</span>
             </div>
             <p className="text-sm text-gray-500 ml-9">
                LifeSync is a PWA designed for productivity and downtime. 
                Built with React, Tailwind, and Gemini AI. 
                Cloud Sync enabled.
             </p>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
