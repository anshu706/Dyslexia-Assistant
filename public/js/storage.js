/**
 * Dyslexia Assistant - Storage
 * Registers Service Worker, initializes IndexedDB, and manages
 * offline-first document + settings persistence.
 */

// =========================================================================
// SERVICE WORKER REGISTRATION
// =========================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.warn('SW registration failed:', err));
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
