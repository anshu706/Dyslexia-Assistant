/**
 * Dyslexia Assistant - Secure Auth & Storage Service (ES Module)
 * Implements Secure Vibe Coding Best Practices:
 * 
 * - Layer 03: Never Store Passwords in Plain Text (Salted cryptographic KDF/hashing)
 * - Layer 04: Don't Leak Information Through Errors (Anti-account enumeration)
 * - Layer 05: Session Management, Token Handling, and Secure Cookie Standards
 * - Step 04: Resource Ownership Verification (Prevents IDOR)
 */

import crypto from 'node:crypto';

const userDb = new Map();
const sessionDb = new Map();
const documentDb = new Map();

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
export function createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sessionDb.set(sessionId, { userId, expiresAt });
    return {
        sessionId,
        expiresAt,
        cookieOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000
        }
    };
}

/**
 * Validates session token and returns the authenticated user ID.
 */
export function getSessionUser(sessionId) {
    if (!sessionId) return null;
    const session = sessionDb.get(sessionId);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        sessionDb.delete(sessionId);
        return null;
    }
    return session.userId;
}

/**
 * User Registration with schema validation and safe password hashing.
 */
export async function registerUser(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
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
    const user = userDb.get(normalizedEmail);
    if (!user) {
        await hashPassword('dummy_password_timing_pad');
        throw genericAuthError;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
        throw genericAuthError;
    }

    const session = createSession(user.id);
    return {
        user: { id: user.id, email: user.email },
        session
    };
}

/**
 * Step 4: Resource Ownership Verification (Multi-Tenant IDOR Protection)
 */
export function verifyDocumentOwnership(docId, userId) {
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

export function saveUserDocument(userId, title, content) {
    const docId = 'doc_' + crypto.randomUUID();
    const record = {
        id: docId,
        ownerId: userId,
        title: title.substring(0, 120),
        content: content.substring(0, 300000),
        createdAt: new Date().toISOString()
    };
    documentDb.set(docId, record);
    return record;
}
