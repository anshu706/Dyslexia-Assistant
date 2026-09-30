/**
 * Dyslexia Assistant - Offline Storage Logic
 * Registers Service Worker and sets up the IndexedDB schema.
 */

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// --- IndexedDB Initialization ---
const DB_NAME = 'DyslexiaAssistantDB';
const DB_VERSION = 1;

let db;

const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    console.log(`Upgrading IndexedDB to version ${DB_VERSION}`);

    // Create Stores
    if (!db.objectStoreNames.contains('Users')) {
        db.createObjectStore('Users', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('Documents')) {
        const docStore = db.createObjectStore('Documents', { keyPath: 'id', autoIncrement: true });
        docStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
    if (!db.objectStoreNames.contains('Settings')) {
        db.createObjectStore('Settings', { keyPath: 'key' });
    }
    if (!db.objectStoreNames.contains('Progress')) {
        db.createObjectStore('Progress', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('Flashcards')) {
        const fcStore = db.createObjectStore('Flashcards', { keyPath: 'id', autoIncrement: true });
        fcStore.createIndex('nextReview', 'nextReview', { unique: false });
    }
    if (!db.objectStoreNames.contains('Sessions')) {
        db.createObjectStore('Sessions', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexedDB initialized successfully.');
    // Expose db to window for other modules to use if necessary
    window.dyslexiaDB = db;
};

request.onerror = (event) => {
    console.error('IndexedDB error: ', event.target.error);
};
