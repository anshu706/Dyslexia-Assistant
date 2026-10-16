/**
 * Dyslexia Assistant - Production-Grade Secure API Server Reference (ES Module)
 * Demonstrating full compliance with "Secure Vibe Coding":
 * 
 * Layer 01: Always Validate on the Server
 * Layer 02: Protect Login With Rate Limiting
 * Layer 03: Never Store Passwords in Plain Text
 * Layer 04: Don't Leak Information Through Errors
 * Layer 05: Don't Build Authentication From Scratch If You Don't Have To
 * Step 04: Multi-Tenant Ownership Verification (IDOR Protection)
 * Step 05: Production Configuration & Security Headers
 */

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRateLimiter, validateSchema, securityHeaders, safeErrorHandler } from './securityMiddleware.js';
import * as authService from './authService.js';

const PORT = process.env.PORT || 3001;

// Login rate limiter: max 5 attempts per 15-minute window per IP/Account
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again in 15 minutes.'
});

// General API rate limiter: max 100 requests per 1-minute window
const generalLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests. Please slow down.'
});

// Schemas for Layer 01 validation
const registerSchema = {
    email: { required: true, type: 'string', format: 'email', maxLength: 120 },
    password: { required: true, type: 'string', minLength: 8, maxLength: 100 }
};

const documentSyncSchema = {
    title: { required: true, type: 'string', minLength: 1, maxLength: 120 },
    content: { required: true, type: 'string', minLength: 1, maxLength: 300000 }
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
            } catch (err) {
                const parseErr = new Error('Malformed JSON payload.');
                parseErr.statusCode = 400;
                reject(parseErr);
            }
        });
    });
}

export const server = http.createServer(async (req, res) => {
    res.json = function (data, statusCode = 200) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
    };

    res.status = function (code) {
        res.statusCode = code;
        return res;
    };

    securityHeaders(req, res, () => {});

    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (req.method === 'GET' && pathname === '/api/health') {
            return res.json({ status: 'ok', secure: true, timestamp: new Date().toISOString() });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            req.body = await parseJsonBody(req);
        }

        await new Promise((resolve, reject) => {
            generalLimiter(req, res, (err) => err ? reject(err) : resolve());
        });

        // 1. REGISTER: POST /api/auth/register
        if (req.method === 'POST' && pathname === '/api/auth/register') {
            await new Promise((resolve, reject) => {
                validateSchema(registerSchema)(req, res, (err) => err ? reject(err) : resolve());
            });
            if (res.writableEnded) return;

            const user = await authService.registerUser(req.body.email, req.body.password);
            return res.json({ message: 'User registered successfully.', user }, 201);
        }

        // 2. LOGIN: POST /api/auth/login (Layer 02 Rate Limited + Layer 03 + Layer 04)
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
            res.setHeader('Set-Cookie', `session=${authResult.session.sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
            return res.json({ message: 'Login successful.', user: authResult.user });
        }

        // 3. DOCUMENT SYNC: POST /api/sync/documents (Layer 01 + Ownership)
        if (req.method === 'POST' && pathname === '/api/sync/documents') {
            const cookieHeader = req.headers.cookie || '';
            const match = cookieHeader.match(/session=([a-f0-9]+)/);
            const sessionId = match ? match[1] : null;
            const userId = authService.getSessionUser(sessionId);

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required to sync documents.' });
            }

            await new Promise((resolve, reject) => {
                validateSchema(documentSyncSchema)(req, res, (err) => err ? reject(err) : resolve());
            });
            if (res.writableEnded) return;

            const saved = authService.saveUserDocument(userId, req.body.title, req.body.content);
            return res.json({ message: 'Document saved securely.', document: saved }, 201);
        }

        // 4. DOCUMENT FETCH: GET /api/sync/documents/:id (Step 04: Ownership check)
        if (req.method === 'GET' && pathname.startsWith('/api/sync/documents/')) {
            const docId = pathname.replace('/api/sync/documents/', '').trim();
            const cookieHeader = req.headers.cookie || '';
            const match = cookieHeader.match(/session=([a-f0-9]+)/);
            const sessionId = match ? match[1] : null;
            const userId = authService.getSessionUser(sessionId);

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required.' });
            }

            const doc = authService.verifyDocumentOwnership(docId, userId);
            return res.json({ document: doc });
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
