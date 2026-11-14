# 🛡️ Security Architecture & Threat Model

> **Dyslexia Assistant** implements the **Secure Vibe Coding** framework — combining the speed of AI-assisted development with defense-in-depth engineering practices to ensure user safety, privacy, and zero data leakage.

---

## 📊 Side-by-Side Comparison: Secure Vibe Coding vs. Dyslexia Assistant

| Secure Vibe Coding Principle | Threat / Risk Mitigated | Dyslexia Assistant Implementation | Verification & Testing |
|:---|:---|:---|:---|
| **Layer 01: Always Validate on the Server** | Client-side validation bypass, malformed payloads, buffer/memory exhaustion | • **Client**: Length limits (`300,000` chars), strict MIME/extension whitelist (`.txt, .pdf, .docx`), sanitized inputs.<br>• **Server**: `validateInput()` middleware validates types, string lengths, numeric bounds, email formats, and rejects unknown fields on writes. | Automated schema validator tests in `test/security.test.js` & `test/integration.test.js` |
| **Layer 02: Protect Login with Rate Limiting** | Automated credential stuffing, password guessing, brute-force DoS | • **Client**: Action debouncing and rate limiter.<br>• **Server**: Sliding-window rate limiting on `POST /api/auth/login` (5 attempts / 15 min) keyed by socket IP by default; proxy headers only trusted when `TRUST_PROXY=true`. | Verified via integration test asserting rotating `X-Forwarded-For` does not bypass limits |
| **Layer 03: Never Store Passwords in Plain Text** | Credential harvesting and rainbow table cracking from data breaches | • Cryptographic `scrypt` key derivation with cryptographically random 16-byte unique salts per user.<br>• Constant-time verification (`crypto.timingSafeEqual`) prevents timing side-channel attacks. | Unit tests in `test/security.test.js` verify non-plaintext storage, salt uniqueness, and constant-time match |
| **Layer 04: Don't Leak Information Through Errors** | Account enumeration, internal server path disclosure, stack trace leaks | • Unified generic authentication error (`"Invalid email or password"`) for both unknown accounts and bad passwords.<br>• Centralized error handler suppresses stack traces and internal file paths in production environments (`NODE_ENV=production`). | Anti-enumeration and stack-stripping unit tests in `test/security.test.js` |
| **Layer 05: Don't Build Authentication From Scratch** | Session hijacking, CSRF, insecure cookie handling | • Cryptographically random 32-byte session tokens with server-side expiration.<br>• Cookies configured via `serializeSessionCookie()` with `HttpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/`, `Max-Age=86400`. Explicit `POST /api/auth/logout` revocation. | Validated in `test/integration.test.js` session lifecycle & CSRF header checks |
| **Step 04: Resource Ownership Verification (IDOR)** | User A accessing User B's documents or learning flashcards | • Explicit server-side ownership checks (`verifyDocumentOwnership`, `verifyFlashcardOwnership`) backed by PostgreSQL foreign key relations. | Verified with multi-user isolation tests in `test/integration.test.js` (HTTP 403 Forbidden on foreign access) |
| **Step 05: Production Configuration & Security Headers** | Clickjacking, MIME-sniffing attacks, cross-site scripting (XSS) | • Security headers configured in CloudFront response headers policy, `nginx.conf`, and `server/securityMiddleware.js`:<br>  - `X-Frame-Options: DENY`<br>  - `X-Content-Type-Options: nosniff`<br>  - `Referrer-Policy: strict-origin-when-cross-origin`<br>  - `Permissions-Policy: camera=(), microphone=(self)`<br>  - Strict `Content-Security-Policy` with `frame-ancestors 'none'` | Verified via `scripts/security-review.js` and automated Playwright security audits |
| **Bonus: Secure Client-Side PWA** | Prototype pollution, DOM injection, local storage quota exhaustion | • `safeJsonParse()` strips `__proto__`, `constructor`, `prototype`.<br>• `escapeHtml()` sanitizes HTML before DOM insertion.<br>• `safeStorage` catches `QuotaExceededError`. | Client security module (`js/security.js`) and Axe-Core automated tests |

---

## 🎯 STRIDE Threat Model Matrix

The application's threat landscape was analyzed using the STRIDE methodology:

| Threat Category | Potential Attack Vector | Applied Mitigation | Status |
|:---|:---|:---|:---|
| **Spoofing** | Attacker spoofs `X-Forwarded-For` header to reset login rate limiter | `server/securityMiddleware.js` uses socket IP (`req.socket.remoteAddress`) unless `TRUST_PROXY=true` is explicitly set in reverse proxy configurations. | **Mitigated & Tested** |
| **Tampering** | Man-in-the-middle modification of API requests or document content | HTTPS enforced via CloudFront and ALB redirect; HSTS header enabled; CSRF custom header checks on all state-changing endpoints. | **Mitigated & Tested** |
| **Repudiation** | User denies modifying document or performing password changes | Structured audit logging with ISO timestamps and user IDs (passwords and raw tokens are never logged). | **Mitigated** |
| **Information Disclosure** | Internal stack traces or database errors revealed during failures | Centralized error handler inspects `NODE_ENV`; development provides debugging traces while production suppresses paths and internal details. | **Mitigated & Tested** |
| **Denial of Service (DoS)** | Credential stuffing on login or massive document upload exhaustion | Rate limiting on authentication routes (5 req/15 min) and write routes; 10 MB payload limits and 300,000 character maximums on documents. | **Mitigated & Tested** |
| **Elevation of Privilege** | User A accesses or modifies User B's document IDs (IDOR) | Every sync endpoint queries `verifyDocumentOwnership(userId, docId)` against PostgreSQL before returning or modifying data. | **Mitigated & Tested** |

---

## 🔒 Client-Side PWA Hardening

Because Dyslexia Assistant operates primarily as an offline-first client application:

1. **Zero External File Transmission**: When parsing PDFs and Word documents, all processing occurs inside the user's browser using local `pdf.js` and `mammoth.js`. Files are never uploaded to third-party cloud infrastructure.
2. **Vendored Fonts & Assets**: Fonts (`OpenDyslexic`, `Lexend`) are self-hosted in `public/fonts/`. No runtime calls are made to Google Fonts or external CDNs, completely eliminating third-party tracking.
3. **Prototype Pollution Guard**: `safeJsonParse()` removes toxic keys (`__proto__`, `constructor`, `prototype`) during deserialization of stored drafts and flashcards.
4. **Filename Sanitization**: `sanitizeFilename()` removes path traversal sequences (`../`, `..\`) and dangerous operating system characters before creating downloadable files.

---

## 🧪 Automated Security Verification Suite

Dyslexia Assistant includes an end-to-end automated security verification runner:

```bash
node scripts/security-review.js
```

Runs the complete automated audit checking:
- `npm audit` (asserts 0 high/critical vulnerabilities)
- Backend unit and HTTP integration test suite (`npm test`, 20 tests)
- Browser end-to-end and Axe-Core accessibility audits (`npx playwright test`, 12 tests)
- Secret detection (scans codebase for hardcoded credentials)
- Security header validation (verifies CSP, framing, nosniff)

---

## 📬 Vulnerability Reporting Policy

If you identify a security vulnerability in Dyslexia Assistant, please report it responsibly by contacting the maintainers or opening a private GitHub Security Advisory. Please do not open public issues disclosing unpatched security vulnerabilities. We acknowledge reports within 48 hours and aim to provide a remediation patch within 7 business days.
