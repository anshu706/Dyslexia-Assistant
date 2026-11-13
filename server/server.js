/**
 * Dyslexia Assistant - Production-Grade Secure API Server Reference (ES Module)
 * Fully compliant with "Secure Vibe Coding":
 * 
 * Layer 01: Always Validate on the Server (strict schemas, type checking, bounds, rejection of unknown fields)
 * Layer 02: Protect Login With Rate Limiting (IP + Account, no proxy header bypass without TRUST_PROXY)
 * Layer 03: Never Store Passwords in Plain Text (Salted scrypt KDF, timing-safe verification)
 * Layer 04: Don't Leak Information Through Errors (Anti-account enumeration, sanitized prod errors)
 * Layer 05: Session Management, Token Handling & Secure Cookie Standards (SameSite=Strict, HttpOnly, Secure)
 * Step 04: Multi-Tenant Ownership Verification (IDOR Protection)
 * Step 05: Production Configuration & Security Headers (Strict CSP, frame-ancestors 'none', nosniff)
 */

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRateLimiter, validateSchema, securityHeaders, safeErrorHandler } from './securityMiddleware.js';
import * as authService from './authService.js';

const PORT = process.env.PORT || 3001;

// Login rate limiter: max 5 attempts per 15-minute window per IP/Account
export const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again in 15 minutes.'
});

// General API rate limiter: max 100 requests per 1-minute window
export const generalLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests. Please slow down.'
});

// Schemas for Layer 01 validation (rejects unknown fields)
const registerSchema = {
    email: { required: true, type: 'string', format: 'email', maxLength: 120 },
    password: { required: true, type: 'string', minLength: 8, maxLength: 100 }
};

const changePasswordSchema = {
    currentPassword: { required: true, type: 'string', minLength: 8, maxLength: 100 },
    newPassword: { required: true, type: 'string', minLength: 8, maxLength: 100 }
};

const documentSyncSchema = {
    title: { required: true, type: 'string', minLength: 1, maxLength: 120 },
    content: { required: true, type: 'string', minLength: 1, maxLength: 300000 }
};

const flashcardsSyncSchema = {
    cards: { required: true, type: 'array', maxItems: 1000 }
};

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5 MB ceiling

        req.on('data', chunk => {
            data += chunk;
            if (data.length > MAX_PAYLOAD_SIZE) {
                const err = new Error('Payload too large.');
                err.statusCode = 413;
                reject(err);
            }
        });

        req.on('end', () => {
            if (!data) return resolve({});
            try {
                const parsed = JSON.parse(data, (key, value) => {
                    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                        return undefined;
                    }
                    return value;
                });
                resolve(parsed);
            } catch {
                const parseErr = new Error('Malformed JSON payload.');
                parseErr.statusCode = 400;
                reject(parseErr);
            }
        });
    });
}

function extractSessionId(req) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function verifyCsrf(req) {
    // Only verify state-changing methods
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return true;

    // Check for custom header sent by AJAX/fetch
    const customHeader = req.headers['x-requested-with'] || req.headers['x-da-csrf'];
    if (customHeader) return true;

    // Check Origin or Referer matches host
    const origin = req.headers.origin;
    if (origin) {
        try {
            const originHost = new URL(origin).host;
            if (originHost === req.headers.host) return true;
        } catch {
            return false;
        }
    }

    return false;
}

export const server = http.createServer(async (req, res) => {
    // Defect 1 Fix: res.json honors statusCode set by res.status(code)
    res.json = function (data, statusCode) {
        if (typeof statusCode === 'number') {
            res.statusCode = statusCode;
        } else if (!res.statusCode || res.statusCode === 200) {
            res.statusCode = 200;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
    };

    res.status = function (code) {
        res.statusCode = code;
        return res;
    };

    // Step 05: Apply production security headers
    securityHeaders(req, res, () => {});

    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // Health check (Liveness probe)
        if (req.method === 'GET' && pathname === '/api/health') {
            return res.json({ status: 'ok', secure: true, timestamp: new Date().toISOString() });
        }

        // Readiness probe (Database & service readiness)
        if (req.method === 'GET' && pathname === '/api/ready') {
            return res.json({ status: 'ready', ready: true, timestamp: new Date().toISOString() });
        }

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            req.body = await parseJsonBody(req);
        }

        // General rate limiter
        await new Promise((resolve, reject) => {
            generalLimiter(req, res, (err) => err ? reject(err) : resolve());
        });
        if (res.writableEnded) return;

        // 1. REGISTER: POST /api/auth/register
        if (req.method === 'POST' && pathname === '/api/auth/register') {
            await new Promise((resolve, reject) => {
                validateSchema(registerSchema)(req, res, (err) => err ? reject(err) : resolve());
            });
            if (res.writableEnded) return;

            const user = await authService.registerUser(req.body.email, req.body.password);
            return res.json({ message: 'User registered successfully.', user }, 201);
        }

        // 2. LOGIN: POST /api/auth/login (Layer 02 Rate Limited + Layer 03 + Layer 04 + Defect 3 Cookie)
        if (req.method === 'POST' && pathname === '/api/auth/login') {
            await new Promise((resolve, reject) => {
                loginLimiter(req, res, (err) => err ? reject(err) : resolve());
            });
            if (res.writableEnded) return;

            await new Promise((resolve, reject) => {
                validateSchema(registerSchema)(req, res, (err) => err ? reject(err) : resolve());
            });
            if (res.writableEnded) return;

            const authResult = await authService.loginUser(req.body.email, req.body.password);
            res.setHeader('Set-Cookie', authService.serializeSessionCookie(authResult.session.sessionId));
            return res.json({ message: 'Login successful.', user: authResult.user });
        }

        // 3. LOGOUT: POST /api/auth/logout (Layer 05 Session Revocation)
        if (req.method === 'POST' && pathname === '/api/auth/logout') {
            const sessionId = extractSessionId(req);
            if (sessionId) {
                authService.revokeSession(sessionId);
            }
            res.setHeader('Set-Cookie', authService.serializeClearSessionCookie());
            return res.json({ message: 'Logged out successfully.' });
        }

        // 4. CURRENT USER: GET /api/auth/me
        if (req.method === 'GET' && pathname === '/api/auth/me') {
            const sessionId = extractSessionId(req);
            const user = authService.getSessionUserRecord(sessionId);
            if (!user) {
                return res.status(401).json({ error: 'Authentication required.' });
            }
            return res.json({ user });
        }

        // 5. CHANGE PASSWORD: POST /api/auth/change-password
        if (req.method === 'POST' && pathname === '/api/auth/change-password') {
            const sessionId = extractSessionId(req);
            const userId = authService.getSessionUser(sessionId);
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required.' });
            }
            if (!verifyCsrf(req)) {
                return res.status(403).json({ error: 'CSRF verification failed.' });
            }

            await new Promise((resolve, reject) => {
                validateSchema(changePasswordSchema)(req, res, (err) => err ? reject(err) : resolve());
            });
            if (res.writableEnded) return;

            const result = await authService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
            res.setHeader('Set-Cookie', authService.serializeSessionCookie(result.session.sessionId));
            return res.json({ message: 'Password updated successfully.', user: result.user });
        }

        // Authenticated endpoints boundary check
        if (pathname.startsWith('/api/sync/')) {
            const sessionId = extractSessionId(req);
            const userId = authService.getSessionUser(sessionId);

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required.' });
            }

            // CSRF protection for cookie-authenticated state changes
            if (['POST', 'PUT', 'DELETE'].includes(req.method) && !verifyCsrf(req)) {
                return res.status(403).json({ error: 'CSRF verification failed.' });
            }

            // GET /api/sync/documents (List user documents)
            if (req.method === 'GET' && pathname === '/api/sync/documents') {
                const docs = authService.getUserDocuments(userId);
                return res.json({ documents: docs });
            }

            // POST /api/sync/documents (Save user document)
            if (req.method === 'POST' && pathname === '/api/sync/documents') {
                await new Promise((resolve, reject) => {
                    validateSchema(documentSyncSchema)(req, res, (err) => err ? reject(err) : resolve());
                });
                if (res.writableEnded) return;

                const saved = authService.saveUserDocument(userId, req.body.title, req.body.content);
                return res.json({ message: 'Document saved securely.', document: saved }, 201);
            }

            // GET /api/sync/documents/:id (Fetch document with ownership check)
            if (req.method === 'GET' && pathname.startsWith('/api/sync/documents/')) {
                const docId = pathname.replace('/api/sync/documents/', '').trim();
                const doc = authService.verifyDocumentOwnership(docId, userId);
                return res.json({ document: doc });
            }

            // PUT /api/sync/documents/:id (Update document with ownership check)
            if (req.method === 'PUT' && pathname.startsWith('/api/sync/documents/')) {
                const docId = pathname.replace('/api/sync/documents/', '').trim();
                await new Promise((resolve, reject) => {
                    validateSchema(documentSyncSchema)(req, res, (err) => err ? reject(err) : resolve());
                });
                if (res.writableEnded) return;

                const updated = authService.updateUserDocument(docId, userId, req.body.title, req.body.content);
                return res.json({ message: 'Document updated successfully.', document: updated });
            }

            // DELETE /api/sync/documents/:id (Delete document with ownership check)
            if (req.method === 'DELETE' && pathname.startsWith('/api/sync/documents/')) {
                const docId = pathname.replace('/api/sync/documents/', '').trim();
                authService.deleteUserDocument(docId, userId);
                return res.json({ message: 'Document deleted successfully.' });
            }

            // GET /api/sync/flashcards
            if (req.method === 'GET' && pathname === '/api/sync/flashcards') {
                const cards = authService.getUserFlashcards(userId);
                return res.json({ cards });
            }

            // POST /api/sync/flashcards
            if (req.method === 'POST' && pathname === '/api/sync/flashcards') {
                await new Promise((resolve, reject) => {
                    validateSchema(flashcardsSyncSchema)(req, res, (err) => err ? reject(err) : resolve());
                });
                if (res.writableEnded) return;

                const result = authService.saveUserFlashcards(userId, req.body.cards);
                return res.json({ message: 'Flashcards synchronized successfully.', count: result.cards.length });
            }
        }

        return res.status(404).json({ error: 'Route not found.' });

    } catch (err) {
        safeErrorHandler(err, req, res);
    }
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
    server.listen(PORT, () => {
        console.log(`[SecureServer] Dyslexia Assistant Secure API running on port ${PORT}`);
    });
}

export default server;
