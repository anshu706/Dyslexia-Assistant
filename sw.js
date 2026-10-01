const CACHE_NAME = 'dyslexia-assistant-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.html',
    '/css/styles.css',
    '/css/animations.css',
    '/css/accessibility.css',
    '/js/app.js',
    '/js/reader.js',
    '/js/speech.js',
    '/js/editor.js',
    '/js/storage.js',
    '/js/flashcards.js',
    '/js/ui.js'
];
 
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if found, else fetch from network
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
