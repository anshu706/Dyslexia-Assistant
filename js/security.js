/**
 * Dyslexia Assistant - Security Module
 * Implements Secure Vibe Coding principles:
 * - Layer 01: Input Validation & Sanitization (Types, lengths, MIME, allowed values)
 * - Layer 04: Safe Error Handling (No stack trace or internal path leaks)
 * - Rate Limiting & DoS Protection (Client-side action throttling & bounds)
 * - XSS & DOM Injection Mitigation (Strict escaping & safe DOM helpers)
 */

(function (window) {
    'use strict';

    const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB limit
    const MAX_DOC_CHAR_COUNT = 300000;      // 300k chars max to prevent browser DOM exhaustion
    const MAX_CARD_FRONT_LENGTH = 300;     // Front flashcard max chars
    const MAX_CARD_BACK_LENGTH = 1500;     // Back flashcard max chars
    const MAX_TITLE_LENGTH = 120;

    const ALLOWED_MIME_TYPES = new Set([
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '' // Browsers sometimes leave file.type empty for local text files
    ]);

    const ALLOWED_EXTENSIONS = new Set(['txt', 'pdf', 'docx']);

    /**
     * Strict HTML escaping to prevent XSS.
     * Escapes &, <, >, ", ', `, and forward slash.
     */
    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/`/g, '&#x60;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Sanitizes plain text input with optional length bounding.
     */
    function sanitizeText(value, maxLength = 10000) {
        if (!value) return '';
        const trimmed = String(value).trim();
        return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    /**
     * Validates an uploaded document file against extension, MIME type, and size limits.
     * Returns { valid: boolean, error?: string, extension?: string }
     */
    function validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file provided.' };
        }

        // 1. File size check
        if (file.size <= 0) {
            return { valid: false, error: 'File is empty (0 bytes).' };
        }
        if (file.size > MAX_DOC_SIZE) {
            return { valid: false, error: 'File exceeds the 10 MB maximum size limit.' };
        }

        // 2. Extension check
        const parts = file.name.split('.');
        if (parts.length < 2) {
            return { valid: false, error: 'File has no valid extension (.txt, .pdf, .docx required).' };
        }
        const extension = parts.pop().toLowerCase().trim();
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return { valid: false, error: `Unsupported file format ".${escapeHtml(extension)}". Only .txt, .pdf, and .docx are supported.` };
        }

        // 3. MIME check (if provided by browser)
        if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
            // Log warning but allow if extension matches safe known formats
            safeLog('warn', `MIME type warning: unexpected MIME type "${file.type}" for .${extension}`);
        }

        return { valid: true, extension };
    }

    /**
     * Validates flashcard inputs against length and empty requirements.
     */
    function validateFlashcard(front, back) {
        const cleanFront = sanitizeText(front, MAX_CARD_FRONT_LENGTH);
        const cleanBack = sanitizeText(back, MAX_CARD_BACK_LENGTH);

        if (!cleanFront || !cleanBack) {
            return { valid: false, error: 'Both card front and back must be filled in.' };
        }

        if (cleanFront.length < 1) {
            return { valid: false, error: 'Card front is too short.' };
        }

        return { valid: true, front: cleanFront, back: cleanBack };
    }

    /**
     * Client-side rate limiter / debouncer to prevent rapid spam or local DoS.
     */
    function createRateLimiter(maxCalls, timeWindowMs) {
        const timestamps = [];
        return function checkAllowed() {
            const now = Date.now();
            // Drop timestamps outside the window
            while (timestamps.length && timestamps[0] <= now - timeWindowMs) {
                timestamps.shift();
            }
            if (timestamps.length >= maxCalls) {
                return false; // Rate limit exceeded
            }
            timestamps.push(now);
            return true;
        };
    }

    /**
     * Safe Logger: Prevents leaking stack traces or internal system paths in production.
     */
    function safeLog(level, message, error) {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isDev) {
            if (error) console[level](`[DyslexiaSecurity] ${message}`, error);
            else console[level](`[DyslexiaSecurity] ${message}`);
        } else {
            // In production, only log safe high-level message without raw stack traces
            console[level](`[DyslexiaSecurity] ${message}`);
        }
    }

    /**
     * Safely sets text content on a DOM node without any innerHTML execution risk.
     */
    function safeSetText(element, text) {
        if (!element) return;
        element.textContent = text || '';
    }

    /**
     * Prototype pollution-safe JSON parser.
     * Prevents __proto__, constructor, and prototype pollution attacks.
     */
    function safeJsonParse(jsonString, fallback = null) {
        if (!jsonString || typeof jsonString !== 'string') return fallback;
        try {
            return JSON.parse(jsonString, (key, value) => {
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    return undefined; // Drop polluted keys
                }
                return value;
            });
        } catch (err) {
            safeLog('warn', 'JSON parse error suppressed for security.', err);
            return fallback;
        }
    }

    /**
     * Sanitizes file names to prevent path traversal or filesystem command injection.
     */
    function sanitizeFilename(filename, defaultName = 'document.txt') {
        if (!filename || typeof filename !== 'string') return defaultName;
        // Strip path traversal attempts and dangerous characters
        const clean = filename
            .replace(/[/\\?%*:|"<>]/g, '_')
            .replace(/\.\.+/g, '.')
            .trim();
        return clean.length > 0 ? clean.substring(0, 100) : defaultName;
    }

    /**
     * Formats an error into a safe, client-facing message without leaking internal
     * system paths, stack traces, or framework internals (Secure Vibe Coding Layer 04).
     */
    function formatSafeError(error, defaultMessage = 'An unexpected error occurred. Please try again.') {
        if (!error) return defaultMessage;
        
        // Log details in development
        safeLog('error', defaultMessage, error);

        if (typeof error === 'string') {
            // Check for path leaks in string errors
            if (error.includes('/') || error.includes('\\') || error.includes('Error:')) {
                return defaultMessage;
            }
            return sanitizeText(error, 150);
        }

        if (error instanceof Error && error.message) {
            // Strip any file path traces
            const msg = error.message.replace(/([a-zA-Z]:)?[\\/][\w.\-_/\\\\]+/g, '[internal path]');
            if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
                return 'Network request failed. Please check your connection.';
            }
            if (msg.includes('QuotaExceededError')) {
                return 'Storage quota reached. Please free up space or clear old documents.';
            }
            return sanitizeText(msg, 150);
        }

        return defaultMessage;
    }

    /**
     * Safe LocalStorage wrapper with QuotaExceededError protection and type validation.
     */
    const safeStorage = {
        setItem(key, value) {
            try {
                const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, serialized);
                return true;
            } catch (err) {
                safeLog('error', `Failed to persist key "${key}" to localStorage`, err);
                if (window.showToast) {
                    window.showToast('Storage quota exceeded. Older drafts could not be saved.', '⚠');
                }
                return false;
            }
        },
        getItem(key, fallback = null) {
            try {
                const raw = localStorage.getItem(key);
                if (raw === null) return fallback;
                return raw;
            } catch (err) {
                safeLog('error', `Failed to read key "${key}" from localStorage`, err);
                return fallback;
            }
        },
        getParsed(key, fallback = null) {
            const raw = this.getItem(key, null);
            if (!raw) return fallback;
            return safeJsonParse(raw, fallback);
        },
        removeItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (err) {
                safeLog('error', `Failed to remove key "${key}"`, err);
            }
        }
    };

    // Expose security utilities on window.DA_Security
    window.DA_Security = {
        escapeHtml,
        sanitizeText,
        sanitizeFilename,
        safeJsonParse,
        formatSafeError,
        safeStorage,
        validateFile,
        validateFlashcard,
        createRateLimiter,
        safeLog,
        safeSetText,
        limits: {
            MAX_DOC_SIZE,
            MAX_DOC_CHAR_COUNT,
            MAX_CARD_FRONT_LENGTH,
            MAX_CARD_BACK_LENGTH,
            MAX_TITLE_LENGTH
        }
    };

})(window);
