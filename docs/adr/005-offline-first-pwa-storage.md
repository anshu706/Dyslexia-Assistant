# ADR 005 — Offline-First PWA Storage Architecture

**Status:** Accepted  
**Date:** 2026-11-13  
**Authors:** Senior Full-Stack & DevOps Engineering Team

---

## Context

The core product principle of Dyslexia Assistant is **100% functional offline capability**:
- Reading documents, custom typography adjustments, color tints, syllable division, bionic reading, text-to-speech reading box, writing drafts, and spaced repetition flashcards must operate completely without an internet connection.
- Prior implementations loaded PDF.js, Mammoth.js, Google Fonts, and cdnfonts from external CDNs. As a consequence, document imports and dyslexic fonts failed when offline or behind restricted corporate networks.

### Storage & Asset Choices Evaluated

| Component | CDN Loading | Vendored Local Assets (Chosen) |
|---|---|---|
| **Fonts (`OpenDyslexic`, `Lexend`)** | External Google Fonts & cdnfonts calls | 100% vendored locally in `public/fonts/` with `@font-face` definitions in `css/fonts.css` |
| **Parsing Libraries (`pdf.js`, `mammoth.js`)** | Cloudflare CDN & unpkg | Vendored in `public/vendor/` with strict SRI and local path imports |
| **Offline Cache Engine** | Network-first fallback | Versioned Service Worker cache (`dyslexia-assistant-v5`) with stale-while-revalidate |

---

## Decision

1. **Vendoring Strategy:**
   - Downloaded and placed all font assets (`OpenDyslexic-Regular`, `OpenDyslexic-Italic`, `OpenDyslexic-Bold`, `OpenDyslexic-BoldItalic`, and `lexend-[0-3].woff2`) directly into `fonts/` and `public/fonts/`.
   - Vendored `pdf.min.js`, `pdf.worker.min.js`, and `mammoth.browser.min.js` into `vendor/` and `public/vendor/`.
   - Zero runtime HTTP requests are made to third-party domains (eliminating tracking and network failures).
2. **Versioned Service Worker (`sw.js`):**
   - Precaches the entire application shell, styles, vendored scripts, and fonts during `install`.
   - Uses `self.skipWaiting()` and `self.clients.claim()` for seamless updates.
   - Provides a non-intrusive update prompt banner in `js/storage.js` when new versions are deployed.
3. **Data Persistence Tier (`js/storage.js`):**
   - Client-side documents, active drafts, user settings, and flashcards persist in browser `localStorage` and `IndexedDB`.
   - Bounded input limits prevent DOM and storage exhaustion attacks (e.g. 300,000 character maximum per document).

---

## Consequences

- **Reliability:** The application works flawlessly in airplane mode, rural classrooms, and offline environments.
- **Privacy & Compliance:** Complete eradication of third-party telemetry, font tracking scripts, and external CDNs, maintaining full user data sovereignty.
- **Verification:** Proven by automated Playwright E2E tests executing with simulated zero-network connectivity (`context.setOffline(true)`).

