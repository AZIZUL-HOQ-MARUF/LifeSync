import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, Gamepad2, Clock, Settings, Zap, Cloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, syncStatus } = useAuth();

  const navItems = [
    { to: '/', icon: CheckSquare, label: 'Tasks' },
    { to: '/games', icon: Gamepad2, label: 'Games' },
    { to: '/clock', icon: Clock, label: 'Clock' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const getSyncIcon = () => {
    if (!user) return <Cloud className="text-gray-300 dark:text-slate-600 w-5 h-5" />;
    
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="text-indigo-500 w-5 h-5 animate-spin" />;
      case 'synced':
        return <CheckCircle2 className="text-green-500 w-5 h-5" />;
      case 'error':
        return <AlertCircle className="text-red-500 w-5 h-5" />;
      default:
        return <Cloud className="text-indigo-500 w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm p-4 z-10 flex justify-between items-center transition-colors shrink-0">
        <div className="flex items-center gap-2">
           <div className="p-2 bg-indigo-500 rounded-lg shadow-indigo-200 dark:shadow-none shadow-md">
             <Zap className="text-white w-5 h-5" />
           </div>
           <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">LifeSync</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-slate-700">
             {getSyncIcon()}
             <span className="hidden sm:inline text-gray-500 dark:text-gray-400">
               {user ? (syncStatus === 'syncing' ? 'Syncing...' : 'Cloud Active') : 'Offline'}
             </span>
          </div>
          {user && user.avatar && (
            <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="max-w-md mx-auto min-h-full p-4 pb-32">
            {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-20 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`
              }
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;