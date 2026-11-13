/**
 * Dyslexia Assistant - Comprehensive HTTP Integration & Abuse-Case Test Suite
 * Validates real HTTP status codes, proxy rate-limiting defense, IDOR isolation,
 * session lifecycle, and CSRF protection on a live server instance.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { server } from '../server/server.js';
import { resetDatabasesForTesting } from '../server/authService.js';

let baseUrl;
let testServer;

test.before(async () => {
    await new Promise((resolve) => {
        testServer = server.listen(0, '127.0.0.1', () => {
            const port = testServer.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });
});

test.after(async () => {
    await new Promise((resolve) => {
        testServer.close(resolve);
    });
});

test.beforeEach(() => {
    resetDatabasesForTesting();
});

test('Defect 1: HTTP Error responses return actual 4xx status codes (never masked as 200)', async () => {
    // 1. Unauthenticated request to /api/sync/documents must return 401
    const resAuth = await fetch(`${baseUrl}/api/sync/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Title', content: 'Test Content' })
    });
    assert.equal(resAuth.status, 401, 'Unauthenticated sync must return HTTP 401, not 200');
    const dataAuth = await resAuth.json();
    assert.equal(dataAuth.error, 'Authentication required.');

    // 2. Malformed register request must return 400
    const resBad = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email', password: 'short' })
    });
    assert.equal(resBad.status, 400, 'Malformed payload must return HTTP 400, not 200');

    // 3. Unknown route must return 404
    const resNotFound = await fetch(`${baseUrl}/api/unknown-endpoint`);
    assert.equal(resNotFound.status, 404, 'Unknown endpoint must return HTTP 404, not 200');
});

test('Defect 2: Rotating X-Forwarded-For header does NOT bypass login rate limiter', async () => {
    const targetEmail = 'ratelimit-target@example.com';
    const targetPass = 'SomePassword123!';

    // Register user first
    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass })
    });

    let blocked = false;
    let rateLimitStatus = 0;
    let retryAfterHeader = null;

    // Send 7 login attempts with different spoofed X-Forwarded-For IPs
    for (let i = 1; i <= 7; i++) {
        const spoofedIp = `10.0.0.${i}`;
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': spoofedIp
            },
            body: JSON.stringify({ email: targetEmail, password: 'WrongPassword99!' })
        });

        if (res.status === 429) {
            blocked = true;
            rateLimitStatus = res.status;
            retryAfterHeader = res.headers.get('retry-after');
            break;
        }
    }

    assert.equal(blocked, true, 'Rate limiter must trigger despite rotating X-Forwarded-For');
    assert.equal(rateLimitStatus, 429, 'Rate limit response must be HTTP 429');
    assert.ok(retryAfterHeader, 'Rate limit response must include Retry-After header');
});

test('Defect 3 & Layer 05: Set-Cookie includes HttpOnly, SameSite=Strict, Path, and Max-Age', async () => {
    const email = 'cookie-tester@example.com';
    const password = 'StrongPassword123!';

    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header must be present');
    assert.match(setCookie, /HttpOnly/i, 'Cookie must have HttpOnly');
    assert.match(setCookie, /SameSite=Strict/i, 'Cookie must have SameSite=Strict');
    assert.match(setCookie, /Path=\//i, 'Cookie must have Path=/');
    assert.match(setCookie, /Max-Age=86400/i, 'Cookie must have Max-Age');
});

test('Layer 01: Write endpoints strictly reject unknown payload fields', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'clean@example.com',
            password: 'ValidPassword123!',
            isAdmin: true, // Unknown field injection
            role: 'superuser'
        })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Validation failed.');
    assert.ok(body.details.some(d => d.includes('isAdmin')));
    assert.ok(body.details.some(d => d.includes('role')));
});

test('Step 04: IDOR Protection — User A cannot view, update, or delete User B documents', async () => {
    // 1. Register and log in User A
    const userAEmail = 'usera-test@example.com';
    const pass = 'SecurePassUser123!';
    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: pass })
    });
    const loginA = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: pass })
    });
    const cookieA = loginA.headers.get('set-cookie').split(';')[0];

    // 2. User A creates a document
    const createDocRes = await fetch(`${baseUrl}/api/sync/documents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieA,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ title: 'User A Secret Draft', content: 'Secret thoughts of User A.' })
    });
    assert.equal(createDocRes.status, 201);
    const docData = await createDocRes.json();
    const docId = docData.document.id;

    // 3. Register and log in User B
    const userBEmail = 'userb-test@example.com';
    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userBEmail, password: pass })
    });
    const loginB = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userBEmail, password: pass })
    });
    const cookieB = loginB.headers.get('set-cookie').split(';')[0];

    // 4. User B attempts GET User A's document -> 403 Forbidden
    const getResB = await fetch(`${baseUrl}/api/sync/documents/${docId}`, {
        method: 'GET',
        headers: { 'Cookie': cookieB }
    });
    assert.equal(getResB.status, 403, 'User B must be forbidden from viewing User A document');

    // 5. User B attempts PUT User A's document -> 403 Forbidden
    const putResB = await fetch(`${baseUrl}/api/sync/documents/${docId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieB,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ title: 'Hacked Title', content: 'Overwritten content' })
    });
    assert.equal(putResB.status, 403, 'User B must be forbidden from updating User A document');

    // 6. User B attempts DELETE User A's document -> 403 Forbidden
    const delResB = await fetch(`${baseUrl}/api/sync/documents/${docId}`, {
        method: 'DELETE',
        headers: {
            'Cookie': cookieB,
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    assert.equal(delResB.status, 403, 'User B must be forbidden from deleting User A document');

    // 7. User B document listing returns only User B's documents
    const listResB = await fetch(`${baseUrl}/api/sync/documents`, {
        method: 'GET',
        headers: { 'Cookie': cookieB }
    });
    const listDataB = await listResB.json();
    assert.equal(listDataB.documents.length, 0, 'User B list must not contain User A document');
});

test('Layer 05: Session logout revokes token and subsequent authenticated requests fail', async () => {
    const email = 'logout-tester@example.com';
    const password = 'PasswordLogout123!';

    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const cookie = loginRes.headers.get('set-cookie').split(';')[0];

    // Verify authenticated access works
    const meResBefore = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Cookie': cookie }
    });
    assert.equal(meResBefore.status, 200);

    // Call logout endpoint
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Cookie': cookie }
    });
    assert.equal(logoutRes.status, 200);

    // Verify revoked session is rejected
    const meResAfter = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Cookie': cookie }
    });
    assert.equal(meResAfter.status, 401, 'Revoked session cookie must be rejected with 401');
});

test('Layer 05: CSRF verification rejects state-changing requests without custom header', async () => {
    const email = 'csrf-tester@example.com';
    const password = 'PasswordCsrf123!';

    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const cookie = loginRes.headers.get('set-cookie').split(';')[0];

    // State-changing request missing X-Requested-With / X-DA-CSRF header
    const postRes = await fetch(`${baseUrl}/api/sync/documents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
            // Omitting X-Requested-With
        },
        body: JSON.stringify({ title: 'CSRF Attempt', content: 'Content' })
    });

    assert.equal(postRes.status, 403, 'Cookie-authenticated write request without CSRF protection must return 403');
    const errData = await postRes.json();
    assert.equal(errData.error, 'CSRF verification failed.');
});

