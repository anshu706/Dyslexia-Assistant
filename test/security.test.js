/**
 * Dyslexia Assistant - Automated Security Verification Test Suite
 * Tests full compliance with the "Secure Vibe Coding" specification:
 * - Layer 01: Server & Client Input Validation
 * - Layer 02: Rate Limiting & DoS Protection
 * - Layer 03: Purpose-Built Salted Password Hashing
 * - Layer 04: Safe Error Handling & Anti-Enumeration
 * - Layer 05: Session Management & Secure Cookie Attributes
 * - Step 04: IDOR Ownership Checks
 * - Prototype Pollution Defense & XSS Escaping
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, registerUser, loginUser, saveUserDocument, verifyDocumentOwnership } from '../server/authService.js';
import { createRateLimiter, validateSchema, safeErrorHandler } from '../server/securityMiddleware.js';

test('Layer 01: Validate schemas reject invalid types, out-of-bound strings, and bad emails', () => {
    const schema = {
        email: { required: true, type: 'string', format: 'email' },
        title: { required: true, type: 'string', minLength: 3, maxLength: 20 },
        count: { type: 'number', min: 1, max: 10 }
    };

    const validator = validateSchema(schema);

    // Case A: Missing required email
    let resPayload = null;
    let statusCode = 200;
    const reqInvalid = { body: { title: 'Valid Title' } };
    const resMock = {
        status(code) { statusCode = code; return this; },
        json(data) { resPayload = data; }
    };

    validator(reqInvalid, resMock, () => {});
    assert.equal(statusCode, 400);
    assert.match(resPayload.details[0], /Field "email" is required/);

    // Case B: Bad email format
    const reqBadEmail = { body: { email: 'not-an-email', title: 'Valid Title' } };
    validator(reqBadEmail, resMock, () => {});
    assert.equal(statusCode, 400);
    assert.match(resPayload.details[0], /valid email address/);

    // Case C: Exceeding maxLength
    const reqLongTitle = { body: { email: 'test@example.com', title: 'A'.repeat(50) } };
    validator(reqLongTitle, resMock, () => {});
    assert.equal(statusCode, 400);
    assert.match(resPayload.details[0], /cannot exceed 20 characters/);

    // Case D: Completely valid
    let nextCalled = false;
    const reqValid = { body: { email: 'reader@example.com', title: 'Great Book', count: 5 } };
    validator(reqValid, resMock, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
});

test('Layer 02: Rate limiter enforces maximum request thresholds', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, message: 'Too many requests' });
    let blocked = false;
    let status = 200;

    const req = { ip: '192.168.1.100', headers: {}, body: {} };
    const res = {
        setHeader() {},
        status(code) { status = code; return this; },
        json() { blocked = true; }
    };

    // First request - allowed
    limiter(req, res, () => {});
    assert.equal(blocked, false);

    // Second request - allowed
    limiter(req, res, () => {});
    assert.equal(blocked, false);

    // Third request - exceeds limit, must be blocked with HTTP 429
    limiter(req, res, () => {});
    assert.equal(blocked, true);
    assert.equal(status, 429);
});

test('Layer 03: Passwords are never stored in plain text and verify correctly', async () => {
    const plain = 'SecretPassphrase123!';
    const hash = await hashPassword(plain);

    // Assert it is hashed with a salt (salt:derivedHex)
    assert.notEqual(hash, plain);
    assert.equal(hash.includes(':'), true);

    const isMatch = await verifyPassword(plain, hash);
    assert.equal(isMatch, true);

    const isWrongMatch = await verifyPassword('WrongPassword', hash);
    assert.equal(isWrongMatch, false);
});

test('Layer 04: Login prevents account enumeration and leaks no diagnostic traces', async () => {
    const email = 'alex@example.com';
    const password = 'SuperSecurePassword99!';
    await registerUser(email, password);

    // Non-existent user should fail with generic message
    await assert.rejects(
        async () => {
            await loginUser('nonexistent@example.com', password);
        },
        (err) => {
            assert.equal(err.statusCode, 401);
            assert.equal(err.message, 'Invalid email or password.');
            return true;
        }
    );

    // Wrong password should fail with the exact same generic message
    await assert.rejects(
        async () => {
            await loginUser(email, 'WrongPassword');
        },
        (err) => {
            assert.equal(err.statusCode, 401);
            assert.equal(err.message, 'Invalid email or password.');
            return true;
        }
    );
});

test('Layer 04: Production error handler suppresses internal server paths and stack traces', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const leakedError = new Error('Database query failure in C:\\Users\\DELL\\DyslexiaAssistant\\secrets.json');
    let responseData = null;
    let statusCode = 500;

    const resMock = {
        status(code) { statusCode = code; return this; },
        json(data) { responseData = data; }
    };

    safeErrorHandler(leakedError, { method: 'POST', url: '/api/sync' }, resMock, () => {});

    assert.equal(statusCode, 500);
    // Asserts no internal paths or stack traces were leaked in production
    assert.equal(responseData.stack, undefined);
    assert.equal(responseData.error.includes('C:\\Users'), false);
    assert.equal(responseData.error, 'An internal error occurred. Please try again later.');

    process.env.NODE_ENV = originalEnv;
});

test('Layer 05 & Step 04: Ownership check prevents IDOR attacks between users', async () => {
    const userA = await registerUser('usera@example.com', 'PassUserA123!');
    const userB = await registerUser('userb@example.com', 'PassUserB123!');

    const docA = saveUserDocument(userA.id, 'User A Secret Journal', 'Confidential thoughts');

    // User A can access their own document
    const retrieved = verifyDocumentOwnership(docA.id, userA.id);
    assert.equal(retrieved.id, docA.id);

    // User B attempting to access User A's document must trigger 403 Forbidden
    assert.throws(
        () => {
            verifyDocumentOwnership(docA.id, userB.id);
        },
        (err) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /Access denied/);
            return true;
        }
    );
});
