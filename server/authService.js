/**
 * Dyslexia Assistant - Secure Auth & Storage Service (ES Module)
 * Implements Secure Vibe Coding Best Practices:
 * 
 * - Layer 03: Never Store Passwords in Plain Text (Salted scrypt KDF)
 * - Layer 04: Don't Leak Information Through Errors (Anti-account enumeration)
 * - Layer 05: Session Management, Token Handling, and Secure Cookie Standards
 * - Step 04: Resource Ownership Verification (Prevents IDOR)
 * - Phase 05: PostgreSQL multi-tenant storage with fallback
 */

import crypto from 'node:crypto';
import * as db from './db.js';

const userDb = new Map();
const sessionDb = new Map();
const documentDb = new Map();
const flashcardDb = new Map();

/**
 * Reset all in-memory collections (used primarily in test suites).
 */
export function resetDatabasesForTesting() {
    userDb.clear();
    sessionDb.clear();
    documentDb.clear();
    flashcardDb.clear();
}

/**
 * Layer 03: Password Hashing using Scrypt with cryptographically random salts.
 */
export function hashPassword(plainPassword) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * Layer 03: Constant-time password verification to prevent timing attacks.
 */
export function verifyPassword(plainPassword, storedHash) {
    return new Promise((resolve, reject) => {
        if (!storedHash || typeof storedHash !== 'string') return resolve(false);
        const [salt, key] = storedHash.split(':');
        if (!salt || !key) return resolve(false);

        const keyBuffer = Buffer.from(key, 'hex');
        crypto.scrypt(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) return reject(err);
            if (keyBuffer.length !== derivedKey.length) return resolve(false);
            resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        });
    });
}

/**
 * Layer 05: Session Generation with Expiration
 */
export async function createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    if (process.env.DATABASE_URL) {
        await db.query(
            'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
            [sessionId, userId, expiresAt]
        );
    } else {
        sessionDb.set(sessionId, { userId, expiresAt });
    }

    return {
        sessionId,
        expiresAt,
        cookieOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        }
    };
}

/**
 * Builds standard Set-Cookie header value with security attributes (Layer 05).
 */
export function serializeSessionCookie(sessionId, options = {}) {
    const isProd = process.env.NODE_ENV === 'production';
    const parts = [
        `session=${encodeURIComponent(sessionId)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${options.maxAge ?? 86400}`
    ];
    if (options.secure ?? isProd) {
        parts.push('Secure');
    }
    return parts.join('; ');
}

export function serializeClearSessionCookie() {
    const isProd = process.env.NODE_ENV === 'production';
    const parts = [
        'session=',
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        'Max-Age=0'
    ];
    if (isProd) {
        parts.push('Secure');
    }
    return parts.join('; ');
}

export async function revokeSession(sessionId) {
    if (!sessionId) return false;
    if (process.env.DATABASE_URL) {
        await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
        return true;
    }
    return sessionDb.delete(sessionId);
}

/**
 * Validates session token and returns the authenticated user ID.
 */
export async function getSessionUser(sessionId) {
    if (!sessionId) return null;
    const now = Date.now();

    if (process.env.DATABASE_URL) {
        const res = await db.query('SELECT user_id, expires_at FROM sessions WHERE id = $1', [sessionId]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        if (Number(row.expires_at) <= now) {
            await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
            return null;
        }
        return row.user_id;
    }

    const session = sessionDb.get(sessionId);
    if (!session) return null;
    if (session.expiresAt <= now) {
        sessionDb.delete(sessionId);
        return null;
    }
    return session.userId;
}

export async function getUserById(userId) {
    if (process.env.DATABASE_URL) {
        const res = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        return res.rows[0] || null;
    }
    for (const user of userDb.values()) {
        if (user.id === userId) {
            return { id: user.id, email: user.email };
        }
    }
    return null;
}

export async function getSessionUserRecord(sessionId) {
    const userId = await getSessionUser(sessionId);
    if (!userId) return null;
    return getUserById(userId);
}

/**
 * User Registration with schema validation and safe password hashing.
 */
export async function registerUser(email, password) {
    const normalizedEmail = email.toLowerCase().trim();

    if (process.env.DATABASE_URL) {
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existing.rows.length > 0) {
            const err = new Error('Registration could not be completed. Please check your credentials.');
            err.statusCode = 400;
            throw err;
        }

        const passwordHash = await hashPassword(password);
        const userId = 'usr_' + crypto.randomUUID();
        const res = await db.query(
            'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
            [userId, normalizedEmail, passwordHash]
        );
        return res.rows[0];
    }

    if (userDb.has(normalizedEmail)) {
        const err = new Error('Registration could not be completed. Please check your credentials.');
        err.statusCode = 400;
        throw err;
    }

    const passwordHash = await hashPassword(password);
    const userId = 'usr_' + crypto.randomUUID();
    userDb.set(normalizedEmail, { id: userId, email: normalizedEmail, passwordHash });

    return { id: userId, email: normalizedEmail };
}

/**
 * Layer 04: Login Verification with Anti-Enumeration
 */
export async function loginUser(email, password) {
    const genericAuthError = new Error('Invalid email or password.');
    genericAuthError.statusCode = 401;

    const normalizedEmail = email.toLowerCase().trim();

    if (process.env.DATABASE_URL) {
        const res = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [normalizedEmail]);
        if (res.rows.length === 0) {
            await hashPassword('dummy_password_timing_pad');
            throw genericAuthError;
        }

        const user = res.rows[0];
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            throw genericAuthError;
        }

        const session = await createSession(user.id);
        return {
            user: { id: user.id, email: user.email },
            session
        };
    }

    const user = userDb.get(normalizedEmail);
    if (!user) {
        await hashPassword('dummy_password_timing_pad');
        throw genericAuthError;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
        throw genericAuthError;
    }

    const session = await createSession(user.id);
    return {
        user: { id: user.id, email: user.email },
        session
    };
}

/**
 * Password change endpoint with current password verification.
 */
export async function changePassword(userId, currentPassword, newPassword) {
    if (process.env.DATABASE_URL) {
        const userRes = await db.query('SELECT id, email, password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        const user = userRes.rows[0];
        const isValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isValid) {
            const err = new Error('Current password does not match.');
            err.statusCode = 400;
            throw err;
        }

        const newHash = await hashPassword(newPassword);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
        await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

        const session = await createSession(userId);
        return { user: { id: user.id, email: user.email }, session };
    }

    let targetUser = null;
    let targetEmail = null;
    for (const [email, user] of userDb.entries()) {
        if (user.id === userId) {
            targetUser = user;
            targetEmail = email;
            break;
        }
    }

    if (!targetUser) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    const isValid = await verifyPassword(currentPassword, targetUser.passwordHash);
    if (!isValid) {
        const err = new Error('Current password does not match.');
        err.statusCode = 400;
        throw err;
    }

    targetUser.passwordHash = await hashPassword(newPassword);
    userDb.set(targetEmail, targetUser);

    for (const [sId, sess] of sessionDb.entries()) {
        if (sess.userId === userId) {
            sessionDb.delete(sId);
        }
    }

    const newSession = await createSession(userId);
    return { user: { id: targetUser.id, email: targetUser.email }, session: newSession };
}

/**
 * Step 4: Resource Ownership Verification (Multi-Tenant IDOR Protection)
 */
export async function verifyDocumentOwnership(docId, userId) {
    if (process.env.DATABASE_URL) {
        const res = await db.query('SELECT * FROM documents WHERE id = $1', [docId]);
        if (res.rows.length === 0) {
            const err = new Error('Document not found.');
            err.statusCode = 404;
            throw err;
        }

        const doc = res.rows[0];
        if (doc.owner_id !== userId) {
            const err = new Error('Access denied. You do not have permission to view this resource.');
            err.statusCode = 403;
            throw err;
        }

        return {
            id: doc.id,
            ownerId: doc.owner_id,
            title: doc.title,
            content: doc.content,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at
        };
    }

    const doc = documentDb.get(docId);
    if (!doc) {
        const err = new Error('Document not found.');
        err.statusCode = 404;
        throw err;
    }

    if (doc.ownerId !== userId) {
        const err = new Error('Access denied. You do not have permission to view this resource.');
        err.statusCode = 403;
        throw err;
    }

    return doc;
}

export async function saveUserDocument(userId, title, content) {
    const docId = 'doc_' + crypto.randomUUID();
    const now = new Date().toISOString();

    if (process.env.DATABASE_URL) {
        const res = await db.query(
            'INSERT INTO documents (id, owner_id, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [docId, userId, title.substring(0, 120), content.substring(0, 300000), now, now]
        );
        const row = res.rows[0];
        return {
            id: row.id,
            ownerId: row.owner_id,
            title: row.title,
            content: row.content,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    const record = {
        id: docId,
        ownerId: userId,
        title: title.substring(0, 120),
        content: content.substring(0, 300000),
        createdAt: now,
        updatedAt: now
    };
    documentDb.set(docId, record);
    return record;
}

export async function updateUserDocument(docId, userId, title, content) {
    await verifyDocumentOwnership(docId, userId);
    const now = new Date().toISOString();

    if (process.env.DATABASE_URL) {
        const res = await db.query(
            'UPDATE documents SET title = $1, content = $2, updated_at = $3 WHERE id = $4 AND owner_id = $5 RETURNING *',
            [title.substring(0, 120), content.substring(0, 300000), now, docId, userId]
        );
        const row = res.rows[0];
        return {
            id: row.id,
            ownerId: row.owner_id,
            title: row.title,
            content: row.content,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    const doc = documentDb.get(docId);
    doc.title = title.substring(0, 120);
    doc.content = content.substring(0, 300000);
    doc.updatedAt = now;
    documentDb.set(docId, doc);
    return doc;
}

export async function deleteUserDocument(docId, userId) {
    await verifyDocumentOwnership(docId, userId);
    if (process.env.DATABASE_URL) {
        await db.query('DELETE FROM documents WHERE id = $1 AND owner_id = $2', [docId, userId]);
        return true;
    }
    documentDb.delete(docId);
    return true;
}

export async function getUserDocuments(userId) {
    if (process.env.DATABASE_URL) {
        const res = await db.query('SELECT id, title, content, created_at, updated_at FROM documents WHERE owner_id = $1 ORDER BY updated_at DESC', [userId]);
        return res.rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    const results = [];
    for (const doc of documentDb.values()) {
        if (doc.ownerId === userId) {
            results.push({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            });
        }
    }
    return results;
}

export async function saveUserFlashcards(userId, cards) {
    const cardArray = Array.isArray(cards) ? cards : [];
    const now = new Date().toISOString();

    if (process.env.DATABASE_URL) {
        await db.query(
            `INSERT INTO flashcards (user_id, cards, updated_at) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (user_id) DO UPDATE SET cards = $2, updated_at = $3`,
            [userId, JSON.stringify(cardArray), now]
        );
        return { userId, cards: cardArray, updatedAt: now };
    }

    const record = {
        userId,
        cards: cardArray,
        updatedAt: now
    };
    flashcardDb.set(userId, record);
    return record;
}

export async function getUserFlashcards(userId) {
    if (process.env.DATABASE_URL) {
        const res = await db.query('SELECT cards FROM flashcards WHERE user_id = $1', [userId]);
        return res.rows[0] ? res.rows[0].cards : [];
    }
    const record = flashcardDb.get(userId);
    return record ? record.cards : [];
}
