/**
 * Dyslexia Assistant - Progressive Web App Service Worker (v5)
 * Comprehensive local-first offline caching for app shell,
 * vendored libraries (PDF.js, Mammoth.js), and dyslexic typography.
 */

const CACHE_NAME = 'dyslexia-assistant-v8';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.html',
    './manifest.json',
    './favicon.ico',
    './favicon.svg',
    './favicon-32x32.png',
    './favicon-16x16.png',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png',
    './css/styles.css',
    './css/animations.css',
    './css/accessibility.css',
    './css/fonts.css',
    './fonts/OpenDyslexic-Regular.woff',
    './fonts/OpenDyslexic-Italic.woff',
    './fonts/OpenDyslexic-Bold.woff',
    './fonts/OpenDyslexic-BoldItalic.woff',
    './fonts/lexend-0.woff2',
    './fonts/lexend-1.woff2',
    './fonts/lexend-2.woff2',
    './fonts/lexend-3.woff2',
    './fonts/rans____.ttf',
    './vendor/pdf.min.js',
    './vendor/pdf.worker.min.js',
    './vendor/mammoth.browser.min.js',
    './js/security.js',
    './js/storage.js',
    './js/audio.js',
    './js/docs.js',
    './js/pwa.js',
    './js/app.js',
    './js/reader.js',
    './js/speech.js',
    './js/editor.js',
    './js/flashcards.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests with http/https schemes
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    // Do not cache API requests
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached asset, fetch in background for cache refresh (stale-while-revalidate for local assets)
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                    })
                    .catch(() => {
                        // Offline network failure is expected and safe
                    });
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Fallback to app shell for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./app.html') || caches.match('./index.html');
                }
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
