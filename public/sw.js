// Service Worker for Assignly PWA
const CACHE_NAME = 'assignly-v2'; // Bumped version to force cache refresh
const urlsToCache = [
  '/',
  '/dashboard',
  '/orders',
  '/orders/new',
  '/profile',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force new SW to take control immediately
});

// Fetch event - Network First for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
  // 1. For navigation requests (HTML pages), try Network first, then Cache
  // This ensures we always get the latest deployment (new chunks)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Optional: Update cache with new response
          return response;
        })
        .catch(() => {
          // Network failed, fall back to cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. For other requests (images, etc.), try Cache first, then Network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});



