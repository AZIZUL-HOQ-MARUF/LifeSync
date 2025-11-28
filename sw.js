
/* eslint-disable no-restricted-globals */
// Basic Service Worker to enable PWA capabilities and mobile notifications

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tell the active service worker to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through fetch. 
  // In a full PWA, we would handle caching here.
  event.respondWith(fetch(event.request));
});
