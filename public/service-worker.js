const CACHE_NAME = 'smartfarm-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/auth.js',
  '/js/app.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install Service Worker & Cache File Statis
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Intercept Fetch Requests (Bisa dibuka saat offline)
self.addEventListener('fetch', event => {
    // Abaikan request API POST (ditangani oleh logika offline sync di app.js)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});