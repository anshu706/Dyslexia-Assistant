# ADR 002 — Authentication and Session Strategy

**Status:** Accepted  
**Date:** 2026-11-13  
**Authors:** Senior Full-Stack & DevOps Engineering Team

---

## Context

The core philosophy of Dyslexia Assistant is **local-first**:
- Reading, writing, dictation, and spaced repetition flashcards work completely offline without an account.
- User accounts and remote sync are purely optional features for users who want multi-device synchronization.

When designing cloud authentication, several options were evaluated:

| Strategy | Advantages | Trade-offs / Disadvantages |
|---|---|---|
| **Managed IdP (Cognito / Auth0 / Clerk)** | Built-in MFA, hosted UI | Heavy client runtime, external network dependency, violates "local-first / zero external vendor" principle, recurring cost |
| **JWT in LocalStorage** | Stateless | Susceptible to XSS token theft; cannot be securely revoked without server state |
| **Signed, HttpOnly Session Cookies (Chosen)** | Native browser security, zero XSS leakage, instant server-side revocation on logout, lightweight | Requires stateful server-side session store (PostgreSQL) |

---

## Decision

We chose **server-side sessions stored in PostgreSQL with HttpOnly, Secure, SameSite=Strict cookies**, implemented with standard Node.js crypto primitives (`crypto.randomBytes(32)`):

1. **Session Generation:**
   - Cryptographically random 32-byte hexadecimal session tokens generated on server (`crypto.randomBytes(32).toString('hex')`).
   - Tokens mapped to user accounts in PostgreSQL `sessions` table (or in-memory map during test/local isolation).
   - Server-side expiration (`expires_at` default 24 hours).
2. **Cookie Attributes (`serializeSessionCookie`):**
   - `HttpOnly`: Inaccessible to JavaScript (prevents token exfiltration via XSS).
   - `Secure`: Enforced when `NODE_ENV === 'production'`.
   - `SameSite=Strict`: Protects against cross-site request forgery in modern browsers.
   - `Path=/`: Scoped to entire domain.
   - `Max-Age=86400`: 24-hour lifetime.
3. **CSRF Mitigation:**
   - Double-defense: `SameSite=Strict` plus verification of custom headers (`X-Requested-With: XMLHttpRequest` or `Content-Type: application/json`) on all state-changing endpoints (`POST`, `PUT`, `DELETE`).
4. **Session Lifecycle:**
   - Rotation upon login: previous sessions for the user can be managed or invalidated.
   - Immediate revocation on `POST /api/auth/logout`: session row deleted from database and clear cookie emitted with `Max-Age=0`.

---

## Consequences

- **Security:** Complete protection against client-side script token theft and IDOR boundaries cleanly checked per session.
- **Independence:** Zero external cloud IdP dependency, keeping deployment overhead low and self-hostable.
- **Future Roadmap:** Multi-factor authentication (TOTP via RFC 6238) and Turnstile/reCAPTCHA bot protection documented as next steps for high-traffic environments.
