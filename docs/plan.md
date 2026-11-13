# Dyslexia Assistant — Engineering & DevOps Implementation Plan

## 1. Overview and Objectives
Turn "Dyslexia Assistant" into a fully functional, secure, offline-capable, and operable web application backed by an AWS production DevOps pipeline.
The implementation follows the **Secure Vibe Coding** framework and strict Product Principles:
- Local-first reading/writing/flashcards mode is the core product (100% offline-ready).
- Cloud accounts & synchronization are optional extensions.
- Zero unsubstantiated medical claims: neutral, verifiable phrasing.
- Strict security controls, verified by automated unit, integration, abuse-case, and Playwright tests.

---

## 2. Defects Verification & Remediation Matrix

| Defect # | Location | Defect Description | Remediation Plan |
|---|---|---|---|
| **1** | `server/server.js` | `res.json(data, statusCode = 200)` overrides `res.statusCode` set by `res.status()`, causing all HTTP errors (400, 401, 403, 429) to return HTTP 200. | Fix `res.json` to preserve existing `res.statusCode` unless explicitly passed. Add integration test with real HTTP requests asserting 400, 401, 403, 429 status codes. |
| **2** | `server/securityMiddleware.js` | `createRateLimiter` trusts unvalidated `X-Forwarded-For` by default, allowing attackers to bypass rate limits by header spoofing. | Only trust forwarded headers when `TRUST_PROXY` is explicitly enabled. Use `req.socket.remoteAddress` by default. Add automated test proving rotating `X-Forwarded-For` fails to bypass. |
| **3** | `server/server.js` & `authService.js` | `Set-Cookie` is hardcoded without `Secure` attribute; `cookieOptions` in `authService.js` is ignored. | Centralize cookie serialization in `buildCookieHeader()` ensuring `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age`, and `Secure` (when `NODE_ENV === 'production'`). |
| **4** | `server/authService.js` | In-memory `Map` storage for users, sessions, documents causes state loss on restart and fails multi-instance scaling. | Implement PostgreSQL storage layer (with connection pooling, migrations, and schema) and environment-driven configuration. |
| **5** | `server/authService.js` | Password hashing uses custom scrypt configuration; needs audit against Secure Vibe Coding guidelines. | Maintain hardened scrypt with unique 16-byte random salt, high iteration work factor, and constant-time `timingSafeEqual`. Support password change and session invalidation. |
| **6** | `README.md` & `SECURITY.md` | False/unverified claims: Wikipedia lookup, 5 SRS intervals (code has 7), React 18 (pins React 19), full offline DOCX/PDF, strict MIME validation, zero cloud telemetry while fetching Google/cdnfonts, unverified WCAG 2.1 AA. | Purge false claims; document real 7-interval SRS, React 19, local font vendoring, offline parsers, actual validation behavior, and real axe-core accessibility results. |
| **7** | Static Site & CDN | Security headers only exist on dev/preview server and Node API; static assets on CDN have no CSP or framing protections. | Add CloudFront Response Headers Policy in Terraform and configure strict CSP, frame-ancestors 'none', HSTS, nosniff, Referrer-Policy, Permissions-Policy. |
| **8** | `public/js/ui.js` & `js/ui.js` | Dead code referencing non-existent element IDs from an obsolete landing page version. | Delete `ui.js` from `js/` and `public/js/` and clean up build references. |
| **9** | `dist/` vs `public/js/` vs `js/` | Divergent copies of `editor.js`, `flashcards.js`, and `security.js`. Hand-maintained artifacts committed. | Consolidate source of truth into single canonical directory; build `dist/` in CI; keep `dist/` gitignored. |
| **10** | `package.json` | Dependencies use floating `"latest"` tags. | Pin exact versions for `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, and update lockfile. |
| **11** | `sw.js` & Assets | Service worker only caches local paths; PDF.js, Mammoth, and fonts load from CDNs, breaking offline mode. | Vendor PDF.js, Mammoth, and fonts (Lexend, OpenDyslexic) locally into `/vendor/` and precache in `sw.js` with versioning and update banner. |
| **12** | Working Tree | Ensure clean, reviewable state with Conventional Commits. | Execute disciplined commits per phase. |
| **13** | Non-source artifacts | Marketing media (`brag-output/`, unused images) tracked in repository. | Remove `brag-output/` from repository, ignore in `.gitignore`, keep repo clean and professional. |

---

## 3. Phased Execution Roadmap

### Phase 1: Defect Remediation & Tree Hygiene
1. Remove `brag-output/` and untracked media from git, add to `.gitignore`.
2. Delete obsolete `ui.js`.
3. Pin exact dependencies in `package.json` and sync lockfile.
4. Harmonize `js/` scripts, ensuring canonical source files contain security hardening (`safeStorage`, `safeJsonParse`, `sanitizeFilename`, etc.).
5. Vendor PDF.js, Mammoth, and local fonts into `vendor/`, eliminate runtime CDN dependencies, update CSP, and update `sw.js` to cache them.
6. Fix `res.json` status code override bug in `server/server.js`.
7. Fix `createRateLimiter` proxy spoofing bug in `server/securityMiddleware.js`.
8. Fix cookie generation with centralized `buildSessionCookie` in `server/authService.js`.
9. Commit: `fix: resolve core architectural defects, pin dependencies, and vendor offline assets`

### Phase 2: Secure the Server (Secure Vibe Coding Layers 01–05 + Step 04 & 05)
1. **Layer 01 - Server Validation**: Strict input schemas with unknown-field rejection, type checking, bounds, and payload limits on all write endpoints.
2. **Layer 02 - Rate Limiting**: Enforce IP + account identifier rate limits on `/api/auth/*` and general endpoints with `Retry-After` header. Add proxy spoof defense.
3. **Layer 03 - Password Security**: Salted cryptographic KDF, constant-time verification, no body/token/password logging.
4. **Layer 04 - Information Leak Prevention**: Unified generic auth error messages, suppress stack traces and database details in production.
5. **Layer 05 - Managed Auth & Sessions**: Robust session tokens (32 cryptographically random bytes), session expiry, session revocation (`/api/auth/logout`), password change endpoint (`/api/auth/change-password`), CSRF header protection (`X-Requested-With` or custom header).
6. **Step 04 - Multi-Tenant Ownership (IDOR)**: Enforce strict ownership verification on document and flashcard CRUD operations.
7. **Step 05 - Production Headers**: Strict CSP, HSTS, frame-ancestors, X-Content-Type-Options, Permissions-Policy.
8. Commit: `feat: implement secure vibe coding layers 01-05 and IDOR multi-tenant controls`

### Phase 3: Functional Completion
1. **Reader**:
   - Local TXT, DOCX (offline Mammoth), PDF (offline PDF.js) parser with error handling.
   - Font switcher (OpenDyslexic, Lexend, System), size, spacing, line height.
   - Neutral tint overlays, bionic reading, syllable hyphenation, reading ruler, focus mask.
   - Speech synthesis with word-boundary tracking, speed control, pause/resume.
   - Offline word lookup (syllables, phonetic breakdown, letter count) and add-to-flashcards.
   - State persistence across reloads.
2. **Writer**:
   - Draft autosave and restore.
   - Web Speech API dictation with fallback notification.
   - Heuristic spell check with suggestions.
   - Readability metrics (Flesch-Kincaid, word count, sentence count) and plain text export.
3. **Flashcards**:
   - Spaced Repetition System with 7 intervals (1m, 10m, 1d, 3d, 6d, 14d, 30d) and rating factors.
   - Starter deck preloaded.
   - Full keyboard shortcuts (`Space` flip, `1-4` rating, `N` new card).
4. **Accounts & Sync**:
   - Register, Login, Logout, Change Password.
   - Document and flashcard deck cloud synchronization with conflict resolution.
   - 100% functional in local-first mode when signed out.
5. **PWA & Offline**:
   - Versioned cache in `sw.js` precaching all local vendor assets.
   - Service worker update notification banner.
6. Commit: `feat: complete reader, writer, flashcards, sync, and offline capabilities`

### Phase 4: Test Suite & Quality Assurance
1. Server unit & integration tests (`test/server.test.js` using Node test runner with real HTTP requests):
   - Layer 01 malformed/oversized payloads & unknown fields rejection.
   - Layer 02 rate limiter with spoofed `X-Forwarded-For` headers.
   - Layer 03 password hashing & constant-time check.
   - Layer 04 anti-enumeration and error sanitization (dev vs prod).
   - Layer 05 session rotation, logout invalidation, CSRF protection.
   - Step 04 IDOR test: User A vs User B access isolation.
2. Playwright E2E browser test suite:
   - Full reader flow: import, font switch, tint, TTS.
   - Writer autosave and export.
   - Flashcards SRS review cycle and keyboard shortcuts.
   - Offline mode verification (network disabled in browser context).
   - Accessibility audit using `@axe-core/playwright`.
3. Commit: `test: add comprehensive server integration, IDOR, E2E, and a11y tests`

### Phase 5: Containerization & PostgreSQL Storage
1. Multi-stage `Dockerfile` for API (distroless/alpine, non-root `node` user, pinned SHA/version, `HEALTHCHECK`, no devDependencies).
2. Multi-stage `Dockerfile` for frontend (caching, unprivileged nginx).
3. `docker-compose.yml` linking API, PostgreSQL 16 (with init script/schema), and Frontend.
4. Database migrations & connection pool setup in `server/db.js` with fallback for isolated unit tests.
5. Commit: `feat: containerize application and implement PostgreSQL storage backend`

### Phase 6: Infrastructure as Code (Terraform for AWS)
1. Remote state configuration (S3 bucket + DynamoDB state locking).
2. VPC module (public & private subnets across 2 AZs, NAT gateways, least-privilege security groups).
3. Frontend: S3 private bucket with CloudFront Origin Access Control (OAC), custom CloudFront Security Response Headers Policy, and AWS WAF rate limiting.
4. API: AWS ECS Fargate behind Application Load Balancer with HTTPS listener, target group health checks, and autoscaling.
5. Database: Amazon RDS PostgreSQL (Multi-AZ in prod, encrypted with KMS, private subnets, automated backups).
6. Secrets: AWS Secrets Manager for database credentials and session secrets.
7. Observability: CloudWatch Logs log groups with retention, AWS CloudTrail, and AWS Budgets alarm.
8. Environments: `environments/dev` and `environments/prod` with isolated states and destroy targets.
9. Commit: `infra: add modular production Terraform configuration for AWS`

### Phase 7: Production CI/CD Pipeline
1. `.github/workflows/pr-checks.yml`:
   - Linting & syntax verification.
   - Unit and HTTP integration tests.
   - Playwright E2E and Axe-core accessibility checks.
   - Security scanning: `npm audit`, `gitleaks`, `hadolint`, container Trivy scan, Terraform `fmt`, `validate`, `tflint`, and `checkov`.
2. `.github/workflows/deploy.yml`:
   - AWS OIDC authentication (no static credentials).
   - Build & push container images to Amazon ECR tagged with commit SHA.
   - Automated deployment to `dev`.
   - Automated smoke tests & security headers verification on dev.
   - Manual approval gate for `prod`.
   - Automated rollback mechanism.
3. `.github/dependabot.yml` for automated dependency updates.
4. Commit: `ci: add GitHub Actions pipelines for security gates and AWS deployment`

### Phase 8: Observability & Operational Readiness
1. Endpoints `/api/health` (liveness) and `/api/ready` (readiness with PostgreSQL ping).
2. Structured JSON logging with `requestId`, HTTP method, status, duration, and zero credential leaks.
3. CloudWatch dashboard and alarm definitions for 5xx errors, latency, CPU/memory, and failed login spikes.
4. Synthetic uptime check configuration.
5. `docs/slo.md`: Service Level Objectives definition (99.5% availability, p95 API latency < 300ms).
6. Commit: `feat: implement structured logging, health/readiness probes, and SLOs`

### Phase 9: Documentation & Security Review Scripts
1. `README.md`: Architecture diagram, accurate feature descriptions, quick start with Docker, running tests.
2. `SECURITY.md`: Threat model (STRIDE matrix), security controls mapped to layers, vulnerability reporting policy.
3. `docs/adr/`: Architecture Decision Records:
   - `001-hosting-ecs-cloudfront.md`
   - `002-authentication-session-strategy.md`
   - `003-database-postgresql.md`
   - `004-password-hashing-scrypt.md`
   - `005-offline-pwa-storage.md`
4. `docs/runbook.md`: Standard operating procedures for deployment, rollback, secret rotation, disaster recovery, and incident response.
5. `docs/cost.md`: Monthly AWS cost estimation and FinOps controls.
6. `docs/security-review.md` & `scripts/security-review.sh`: 30-minute automated and manual security verification.
7. Commit: `docs: complete architecture records, runbooks, security audits, and accurate documentation`

---

## 4. Verification and Acceptance Criteria
- 100% of defect items resolved and proven.
- All integration tests pass against live HTTP endpoints.
- Playwright E2E and axe-core accessibility tests pass with zero critical/serious violations.
- Security review script (`scripts/security-review.sh`) exits 0 with all checks passing.
- No unverified medical/scientific claims in code or docs.
