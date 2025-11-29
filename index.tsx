import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
        
        // Request periodic background sync (if supported)
        if ('periodicSync' in registration && registration.periodicSync) {
          (registration.periodicSync as any).register('refresh-data', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          }).then(() => {
            console.log('Periodic sync registered');
          }).catch((err: any) => {
            console.log('Periodic sync registration failed:', err);
          });
        }
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'PERIODIC_SYNC') {
        console.log('Periodic sync triggered, refreshing data...');
        // Trigger data refresh in your app
      } else if (event.data.type === 'BACKGROUND_SYNC') {
        console.log('Background sync triggered, syncing tasks...');
        // Sync pending tasks
      } else if (event.data.type === 'INSTALL_AVAILABLE') {
        console.log('App can be installed');
        // Show install prompt
      }
    });
  });
}