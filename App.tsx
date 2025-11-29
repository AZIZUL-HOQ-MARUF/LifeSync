import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TasksPage from './pages/TasksPage';
import GamesPage from './pages/GamesPage';
import ClockPage from './pages/ClockPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './context/AuthContext';
import { oneSignalService } from './services/oneSignalService';

function App() {
  useEffect(() => {
    // Initialize OneSignal when app loads (only on production domain)
    const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    const isProduction = window.location.hostname.includes('github.io');
    
    if (oneSignalAppId && isProduction) {
      oneSignalService.initialize(oneSignalAppId);
    } else if (!isProduction) {
      console.log('OneSignal skipped on localhost (only works on production domain)');
    } else {
      console.warn('OneSignal App ID not found. Add VITE_ONESIGNAL_APP_ID to .env.local');
    }
  }, []);

  return (
    <HashRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<TasksPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/clock" element={<ClockPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
