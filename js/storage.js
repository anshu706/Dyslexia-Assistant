/**
 * Dyslexia Assistant - Storage
 * Registers Service Worker, initializes IndexedDB, and manages
 * offline-first document + settings persistence.
 */

// =========================================================================
// SERVICE WORKER REGISTRATION & UPDATE FLOW
// =========================================================================
function showUpdatePrompt(registration) {
    if (document.getElementById('pwa-update-banner')) return;
    const banner = document.createElement('aside');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.className = 'pwa-update-banner';
    banner.innerHTML = `
        <div class="pwa-update-content">
            <span class="pwa-update-icon" aria-hidden="true">🚀</span>
            <span>A new version of Dyslexia Assistant is ready.</span>
            <button id="pwa-reload-btn" class="btn btn-sm btn-accent" type="button">Update Now</button>
            <button id="pwa-dismiss-btn" class="icon-btn-sm" aria-label="Dismiss update notification" type="button">✕</button>
        </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwa-reload-btn')?.addEventListener('click', () => {
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
        banner.remove();
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('SW registered:', reg.scope);
                if (reg.waiting) {
                    showUpdatePrompt(reg);
                }
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdatePrompt(reg);
                        }
                    });
                });
            })
            .catch(err => console.warn('SW registration failed:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (navigator.webdriver) return; // Prevent disrupting automated test runs
            if (!refreshing && window.__DA_MANUAL_UPDATE) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}

// =========================================================================
// INDEXEDDB INITIALIZATION
// =========================================================================
const DB_NAME = 'DyslexiaAssistantDB';
const DB_VERSION = 2;

let db;
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = event => {
    db = event.target.result;
    const tx = event.target.transaction;

    if (!db.objectStoreNames.contains('Documents')) {
        const docStore = db.createObjectStore('Documents', { keyPath: 'id', autoIncrement: true });
        docStore.createIndex('timestamp', 'timestamp', { unique: false });
        docStore.createIndex('title', 'title', { unique: false });
    }
    if (!db.objectStoreNames.contains('Settings')) {
        db.createObjectStore('Settings', { keyPath: 'key' });
    }
    if (!db.objectStoreNames.contains('Flashcards')) {
        const fcStore = db.createObjectStore('Flashcards', { keyPath: 'id', autoIncrement: true });
        fcStore.createIndex('nextReview', 'nextReview', { unique: false });
    }
    if (!db.objectStoreNames.contains('Sessions')) {
        const sessStore = db.createObjectStore('Sessions', { keyPath: 'id', autoIncrement: true });
        sessStore.createIndex('date', 'date', { unique: false });
    }
    if (!db.objectStoreNames.contains('Progress')) {
        db.createObjectStore('Progress', { keyPath: 'id', autoIncrement: true });
    }

    console.log('IndexedDB schema created/upgraded.');
};

request.onsuccess = event => {
    db = event.target.result;
    window.dyslexiaDB = db;
    console.log('IndexedDB ready.');
};

request.onerror = event => {
    console.error('IndexedDB error:', event.target.error);
};

// =========================================================================
// DB HELPER UTILITIES (exposed globally for other modules if needed)
// =========================================================================
window.DA_DB = {
    saveDocument(title, text) {
        if (!db) return;
        const tx = db.transaction('Documents', 'readwrite');
        const store = tx.objectStore('Documents');
        store.add({ title, text: text.substring(0, 100000), timestamp: Date.now() });
    },

    getRecentDocuments(callback) {
        if (!db) return callback([]);
        const tx = db.transaction('Documents', 'readonly');
        const store = tx.objectStore('Documents');
        const index = store.index('timestamp');
        const req = index.openCursor(null, 'prev');
        const docs = [];
        req.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor && docs.length < 10) {
                docs.push(cursor.value);
                cursor.continue();
            } else {
                callback(docs);
            }
        };
    },

    saveSetting(key, value) {
        if (!db) {
            localStorage.setItem(`da_setting_${key}`, JSON.stringify(value));
            return;
        }
        const tx = db.transaction('Settings', 'readwrite');
        const store = tx.objectStore('Settings');
        store.put({ key, value, updated: Date.now() });
    },

    getSetting(key, callback) {
        if (!db) {
            const val = localStorage.getItem(`da_setting_${key}`);
            callback(val ? JSON.parse(val) : null);
            return;
        }
        const tx = db.transaction('Settings', 'readonly');
        const store = tx.objectStore('Settings');
        const req = store.get(key);
        req.onsuccess = e => callback(e.target.result?.value || null);
        req.onerror = () => callback(null);
    },

    logSession(durationSec, wordsRead, mode) {
        if (!db) return;
        const tx = db.transaction('Sessions', 'readwrite');
        const store = tx.objectStore('Sessions');
        store.add({ durationSec, wordsRead, mode, date: new Date().toISOString() });
    }
};
