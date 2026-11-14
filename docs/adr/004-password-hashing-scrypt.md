# ADR 004 — Password Hashing: Node.js Built-in Scrypt with Unique Random Salts

**Status:** Accepted  
**Date:** 2026-11-13  
**Authors:** Senior Full-Stack & DevOps Engineering Team

---

## Context

Layer 03 of the Secure Vibe Coding guidelines dictates:
- *Never store passwords in plain text.*
- *Use a purpose-built password hash with a unique random salt per user.*
- *Use constant-time comparison to prevent timing side-channel attacks.*
- *Never invent custom cryptography.*

### Options Evaluated

| Algorithm | Pros | Cons | Verdict |
|---|---|---|---|
| **Argon2id (`argon2`)** | Winner of Password Hashing Competition; maximum memory-hardness resistance | Requires native binary compilation (node-gyp / C++ toolchains), creating cross-platform build friction on Windows / Alpine Docker containers | Secondary preference |
| **bcrypt (`bcrypt`)** | Widely used, mature | GPU-accelerated cracking vulnerabilities compared to memory-hard alternatives; native bindings | Outperformed by scrypt |
| **PBKDF2 (`crypto.pbkdf2`)** | Built into Node.js runtime | Lacks memory hardness; vulnerable to ASIC and FPGA brute-force hardware | Not recommended for new systems |
| **scrypt (`crypto.scrypt`)** | Native Node.js standard library (`node:crypto`), NIST approved, memory-hard, zero native compilation dependencies | Slightly slower on resource-constrained embedded devices | **Accepted** |

---

## Decision

We chose **`crypto.scrypt`** built into the standard Node.js runtime, augmented with constant-time equality comparisons and anti-enumeration timing defenses:

1. **Parameters & Key Derivation (`server/authService.js`):**
   - Salt: 16 bytes of cryptographically secure random bytes generated per hash (`crypto.randomBytes(16).toString('hex')`).
   - Key length: 64 bytes.
   - Cost parameters: $N=16384$, $r=8$, $p=1$, providing optimal memory-hardness and protection against ASIC attacks while maintaining sub-100ms verification latencies.
2. **Timing Attack Protection:**
   - Hash comparisons utilize `crypto.timingSafeEqual(storedHashBuffer, computedHashBuffer)` to prevent timing side-channel leaks.
   - Anti-enumeration timing pad: When a non-existent email is queried during login, the system computes an identical dummy scrypt hash over a randomized salt to normalize execution timing and prevent account discovery.
3. **Migration Readiness:**
   - The password hash column format records hash version prefixes. A migration pathway to Argon2id can be executed transparently on successful user logins without forcing password resets.

---

## Consequences

- **Security:** Fully compliant with OWASP and NIST recommendations for password storage.
- **Portability:** Zero external binary compilation dependencies (`node-gyp`), ensuring reliable builds across Windows local workstations, Alpine Docker images, and GitHub Actions runners.
- **Verification:** Proven with unit tests asserting non-plaintext storage, verification matching, and unique per-user salts across identical passwords.

