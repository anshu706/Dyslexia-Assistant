# 🛡️ Security Architecture & Secure Vibe Coding Compliance

> **Dyslexia Assistant** implements the **Secure Vibe Coding** framework — combining the speed of AI-assisted development with defense-in-depth engineering practices to ensure user safety, privacy, and zero data leakage.

---

## 📊 Side-by-Side Comparison: Secure Vibe Coding vs. Dyslexia Assistant

| Secure Vibe Coding Principle | Threat / Risk Mitigated | Dyslexia Assistant Implementation | Verification & Testing |
|:---|:---|:---|:---|
| **Layer 01: Always Validate on the Server** | Client-side validation bypass, malformed payloads, buffer/memory exhaustion | • **Client**: Length limits (`300,000` chars), strict MIME/extension whitelist (`.txt, .pdf, .docx`), sanitized inputs.<br>• **Server**: `validateSchema()` middleware validates types, string lengths, numeric bounds, and email formats. | Automated schema validator tests in `test/security.test.js` |
| **Layer 02: Protect Login with Rate Limiting** | Automated credential stuffing, password guessing, brute-force DoS | • **Client**: Action debouncing and rate limiter (`createRateLimiter(25, 10000)`).<br>• **Server**: Sliding-window rate limiting on `POST /api/auth/login` (5 attempts / 15 min) keyed by IP + Account identifier. | Verified via rate-limiting unit test asserting HTTP 429 response |
| **Layer 03: Never Store Passwords in Plain Text** | Credential harvesting and rainbow table cracking from data breaches | • Cryptographic `scrypt` / `Argon2id` key derivation with cryptographically random 16-byte unique salts.<br>• Constant-time verification (`crypto.timingSafeEqual`) prevents timing side-channel attacks. | Unit tests verify hash irreversibility, random salt generation, and match logic |
| **Layer 04: Don't Leak Information Through Errors** | Account enumeration, internal server path disclosure, stack trace leaks | • Unified generic authentication error (`"Invalid email or password"`) for both unknown accounts and bad passwords.<br>• `safeErrorHandler()` suppresses stack traces and internal file paths in production environments. | Anti-enumeration and stack-stripping unit tests |
| **Layer 05: Don't Build Authentication From Scratch** | Session hijacking, CSRF, insecure cookie handling | • Cryptographically random 32-byte session tokens with 24-hour expiration.<br>• Cookies configured with `HttpOnly`, `Secure`, and `SameSite=Strict` attributes. | Validated in session lifecycle & token generation |
| **Step 04: Resource Ownership Verification (IDOR)** | User A accessing User B's documents or learning flashcards | • Explicit server-side ownership checks (`verifyDocumentOwnership`) verifying `resource.ownerId === req.user.id`. | Verified with multi-user isolation unit tests (HTTP 403 Forbidden on foreign access) |
| **Step 05: Production Configuration & Security Headers** | Clickjacking, MIME-sniffing attacks, cross-site scripting (XSS) | • Security headers configured in `vite.config.js` and `server/securityMiddleware.js`:<br>  - `X-Frame-Options: DENY`<br>  - `X-Content-Type-Options: nosniff`<br>  - `Referrer-Policy: strict-origin-when-cross-origin`<br>  - `Permissions-Policy: camera=(), microphone=(self)`<br>  - Strict `Content-Security-Policy` | Audited in Vite configuration and middleware response headers |
| **Bonus: Secure Client-Side PWA** | Prototype pollution, DOM injection, local storage quota exhaustion | • `safeJsonParse()` strips `__proto__`, `constructor`, `prototype`.<br>• `escapeHtml()` sanitizes HTML before DOM insertion.<br>• `safeStorage` catches `QuotaExceededError`. | Client security module (`js/security.js`) |

---

## 🔍 The 5 Security Layers in Detail

### Layer 01: Always Validate on the Server
> *Rule: Client-side validation = UX. Server-side validation = the actual security boundary. Use both.*

- **Client Boundary**: Validates uploaded files against allowed extensions (`.txt`, `.pdf`, `.docx`), maximum file size (10 MB), and bounds reading document length to 300,000 characters to prevent browser DOM exhaustion.
- **Server Boundary**: `server/securityMiddleware.js` validates every incoming field against a declarative schema:
  ```javascript
  const documentSyncSchema = {
      title: { required: true, type: 'string', minLength: 1, maxLength: 120 },
      content: { required: true, type: 'string', minLength: 1, maxLength: 300000 }
  };
  ```

### Layer 02: Protect Login With Rate Limiting
> *Without rate limiting, an attacker can send thousands of login attempts for credential stuffing or password guessing.*

- Sensitive endpoints (such as `POST /api/auth/login`) are protected by an in-memory sliding-window rate limiter keyed on a compound tuple:
  $$\text{Key} = \text{IP Address} + \text{Account Identifier}$$
- When threshold is exceeded, the server responds with **HTTP 429 Too Many Requests**, sets the `Retry-After` header, and terminates request processing immediately.

### Layer 03: Never Store Passwords in Plain Text
> *Passwords should not simply be "encrypted" — use a purpose-built password-hashing algorithm. Store the hash, never the original password.*

- Password hashing is implemented in `server/authService.js` using Node's cryptographic key derivation function (`scrypt` / `Argon2id` equivalent):
  ```javascript
  // Salt: 16 cryptographically secure random bytes
  // Constant-time comparison prevents side-channel timing attacks
  crypto.timingSafeEqual(keyBuffer, derivedKey);
  ```

### Layer 04: Don't Leak Information Through Errors
> *"Email doesn't exist" lets attackers enumerate valid accounts. Use "Invalid email or password" instead.*

- Authentication flows return a single, indistinguishable error message:
  ```javascript
  const genericAuthError = new Error('Invalid email or password.');
  genericAuthError.statusCode = 401;
  ```
- If an unknown email is submitted, a dummy cryptographic operation is executed to equalize response timing with existing accounts.
- In production, server errors strip internal paths (`C:\Users\...`, `node_modules/...`) and return safe high-level messages.

### Layer 05: Don't Build Authentication From Scratch If You Don't Have To
> *Secure auth involves many moving parts: session management, cookies, expiration, brute-force protection.*

- Sessions are generated using high-entropy random identifiers (`crypto.randomBytes(32)`).
- Session cookies are protected with strict security flags:
  ```http
  Set-Cookie: session=<token>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
  ```
- For enterprise deployments, Dyslexia Assistant is designed to easily plug into identity providers (such as Clerk, Auth0, or Firebase Authentication).

---

## 🔒 Client-Side PWA Hardening

Because Dyslexia Assistant operates primarily as an offline-first client application:

1. **Zero External File Transmission**: When parsing PDFs and Word documents, all processing occurs inside the user's browser using `pdf.js` and `mammoth.js`. Files are never uploaded to third-party cloud infrastructure.
2. **Prototype Pollution Guard**: `safeJsonParse()` removes toxic keys (`__proto__`, `constructor`, `prototype`) during deserialization of stored drafts and flashcards.
3. **Safe Error Logger**: `safeLog()` suppresses verbose stack traces when running in production.
4. **Filename Sanitization**: `sanitizeFilename()` removes path traversal sequences (`../`, `..\`) and dangerous operating system characters before creating downloadable files.

---

## 🧪 Automated Security Verification

Dyslexia Assistant includes an automated security test suite that runs against all 5 layers:

```bash
npm run test:security
```

Output:
```plaintext
✔ Layer 01: Validate schemas reject invalid types, out-of-bound strings, and bad emails
✔ Layer 02: Rate limiter enforces maximum request thresholds
✔ Layer 03: Passwords are never stored in plain text and verify correctly
✔ Layer 04: Login prevents account enumeration and leaks no diagnostic traces
✔ Layer 04: Production error handler suppresses internal server paths and stack traces
✔ Layer 05 & Step 04: Ownership check prevents IDOR attacks between users
ℹ tests 6, pass 6, fail 0
```

---

## 📬 Vulnerability Reporting

If you identify a security vulnerability in Dyslexia Assistant, please report it responsibly by contacting the maintainers directly or opening a private security advisory on GitHub. Do not submit public issues with sensitive vulnerability details.
