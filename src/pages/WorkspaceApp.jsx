/**
 * WorkspaceApp.jsx
 *
 * Phase 1: React shell for the vanilla-JS workspace.
 * Renders the workspace HTML inline and loads its CSS + JS programmatically
 * so all existing features (reader, writer, flashcards, audio, offline, etc.)
 * continue to work without modification.
 *
 * The vanilla JS files remain in /js/ and /vendor/.  Vite copies them into
 * dist/ via the copyStaticDirs plugin in vite.config.js, exactly as before.
 *
 * The <WorkspaceApp /> component is served at the React SPA route /app (and
 * /app/*), giving the project a single unified URL space.
 */

import { useEffect, useRef } from 'react';

// ─── CSS files the workspace needs ───────────────────────────────────────────
const WORKSPACE_CSS = [
  '/css/fonts.css',
  '/css/styles.css',
  '/css/accessibility.css',
  '/css/animations.css',
  '/css/ai-assistant.css',
];

// ─── Vendor + app scripts (order matters — mirrors app.html <script> order) ──
const WORKSPACE_SCRIPTS = [
  '/vendor/pdf.min.js',
  '/vendor/mammoth.browser.min.js',
  '/js/security.js',
  '/js/storage.js',
  '/js/dictionary.js',
  '/js/simplifier.js',
  '/js/audio.js',
  '/js/docs.js',
  '/js/pwa.js',
  '/js/stats.js',
  '/js/share.js',
  '/js/app.js',
  '/js/reader.js',
  '/js/speech.js',
  '/js/editor.js',
  '/js/flashcards.js',
  '/js/ai-assistant.js',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function injectStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve; // Don't block even if one file 404s in dev
    document.head.appendChild(link);
  });
}

function loadScriptSequentially(src) {
  return new Promise((resolve, reject) => {
    // Re-use an already-loaded script tag by checking for a matching marker
    if (document.querySelector(`script[data-ws-src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.wsSrc = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function loadScriptsInOrder(srcs) {
  for (const src of srcs) {
    await loadScriptSequentially(src);
  }
}

// ─── Workspace HTML body content (extracted from app.html) ───────────────────
// We render this via dangerouslySetInnerHTML inside a wrapper div.
// The vanilla JS files reference DOM IDs defined in this HTML string.
const WORKSPACE_HTML = `
  <a href="/" class="skip-link">Skip to workspace</a>
  <div class="noise-overlay"></div>

  <!-- PLAMO MARGINALIA HUD -->
  <div class="coords-marginalia" id="workspace-coords" aria-hidden="true">
    <div class="coord-item"><span>X</span> <span id="coord-x">0.00</span></div>
    <div class="coord-item"><span>Y</span> <span id="coord-y">0.00</span></div>
  </div>

  <div class="app-container">
    <!-- SIDEBAR -->
    <aside class="app-sidebar" aria-label="Application Tools">
      <div class="sidebar-header">
        <a href="/" class="logo-small plamo-logo-badge" title="Dyslexia Assistant Home">
          <div class="plamo-logo-tile">
            <svg viewBox="0 0 37 37" width="20" height="20" fill="none">
              <rect width="37" height="37" rx="3" fill="#EC633D"/>
              <path d="M28 28C28 18.0589 19.9411 10 10 10" stroke="white" stroke-opacity="0.6" stroke-dasharray="1.5 1.5"/>
            </svg>
          </div>
          <span>D.A.</span>
        </a>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-btn active" data-view="reader" aria-current="page" title="Reader View (Alt+1)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span>Read</span>
        </button>
        <button class="nav-btn" data-view="writer" title="Writer View (Alt+2)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span>Write</span>
        </button>
        <button class="nav-btn" data-view="flashcards" title="Flashcards View (Alt+3)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>Cards</span>
        </button>
        <button class="nav-btn" id="btn-view-progress" title="Reading Streaks &amp; Learning Progress">
          <span style="font-size: 1.15rem;" aria-hidden="true">🔥</span>
          <span>Progress</span>
          <span id="stat-streak-badge" style="margin-left: auto; font-size: 0.72rem; background: #fef3c7; color: #78350f; font-weight: 800; padding: 2px 7px; border-radius: 999px; border: 1px solid #d97706;">1d 🔥</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <button class="nav-btn" id="btn-trust-hub" title="WCAG 2.1 AA Compliance &amp; Educator Kit">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>Trust &amp; Kit</span>
        </button>
        <button class="nav-btn" id="btn-settings" title="Settings (Alt+S)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>

    <!-- MAIN WORKSPACE -->
    <main class="app-main" id="workspace" tabindex="-1">

      <!-- APP TOOLBAR -->
      <div class="app-toolbar" role="toolbar" aria-label="Workspace Tools">
        <div class="toolbar-group" id="toolbar-view-label">
          <span class="toolbar-label" id="current-view-label">Reader Mode</span>
        </div>

        <!-- READER TOOLS -->
        <div class="toolbar-group" id="reader-tools" role="group" aria-label="Reader Tools">
          <button class="tool-btn" id="btn-upload" title="Upload File (PDF, DOCX, TXT)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload
          </button>
          <button class="tool-btn" id="btn-paste" title="Paste Text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Paste
          </button>
          <button class="tool-btn btn-tool-share" id="btn-share-lesson" title="Create Teacher / Student Share Link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Share</span>
          </button>
          <button class="tool-btn" id="btn-reader-pdf" title="Print or Save as Clean Dyslexic PDF">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>PDF</span>
          </button>
          <div class="tool-divider" aria-hidden="true"></div>
          <button class="tool-btn" id="btn-tts-play" title="Text-to-Speech (Alt+P)" aria-label="Play text to speech">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Speak
          </button>
          <button class="tool-btn" id="btn-tts-stop" title="Stop Speech" style="display:none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            Stop
          </button>
          <div class="tool-divider" aria-hidden="true"></div>
          <button class="tool-btn" id="btn-bionic" title="Toggle Bionic Reading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7V4h16v3"></path>
              <path d="M9 20h6"></path>
              <path d="M12 4v16"></path>
            </svg>
            Bionic
          </button>
          <button class="tool-btn" id="btn-word-box" title="Toggle Word Box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M3 9h18M3 15h18M9 3v18"></path>
            </svg>
            Word Box
          </button>
          <button class="tool-btn" id="btn-line-guide" title="Toggle Line Guide">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            Guide
          </button>
        </div>

        <!-- WRITER TOOLS -->
        <div class="toolbar-group hidden" id="writer-tools" role="group" aria-label="Writer Tools">
          <button class="tool-btn" id="btn-new-doc" title="New Document">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            New
          </button>
          <button class="tool-btn" id="btn-save-doc" title="Save Document (Ctrl+S)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save
          </button>
          <button class="tool-btn" id="btn-export-doc" title="Export Document">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
          <div class="tool-divider" aria-hidden="true"></div>
          <button class="tool-btn" id="btn-toggle-docs-panel" title="Documents Panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg>
            Docs
          </button>
        </div>

        <!-- FLASHCARD TOOLS -->
        <div class="toolbar-group hidden" id="flashcard-tools" role="group" aria-label="Flashcard Tools">
          <button class="tool-btn" id="btn-add-card" title="Add Flashcard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="10" y1="11" x2="14" y2="11"></line>
            </svg>
            Add Card
          </button>
          <button class="tool-btn" id="btn-import-cards" title="Import Flashcards (CSV)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Import
          </button>
          <button class="tool-btn" id="btn-export-cards" title="Export Flashcards (CSV)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
          <button class="tool-btn" id="btn-reset-srs" title="Reset Spaced Repetition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 .49-3.6"></path>
            </svg>
            Reset
          </button>
        </div>

        <!-- GLOBAL TOOLS -->
        <div class="global-tools toolbar-group">
          <label class="tool-label" for="font-select">Font</label>
          <select class="tool-select" id="font-select" aria-label="Select reading font">
            <option value="OpenDyslexic">OpenDyslexic</option>
            <option value="Lexend">Lexend</option>
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
            <option value="RansomNote">Ransom Note</option>
          </select>
          <label class="tool-label" for="font-size-select">Size</label>
          <select class="tool-select" id="font-size-select" aria-label="Select font size">
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20" selected>20px</option>
            <option value="22">22px</option>
            <option value="24">24px</option>
            <option value="28">28px</option>
            <option value="32">32px</option>
          </select>
          <label class="tool-label" for="spacing-select">Spacing</label>
          <select class="tool-select" id="spacing-select" aria-label="Select letter spacing">
            <option value="0">Normal</option>
            <option value="1">+1px</option>
            <option value="2" selected>+2px</option>
            <option value="3">+3px</option>
            <option value="4">+4px</option>
          </select>
          <div class="tool-divider" aria-hidden="true"></div>
          <div id="offline-status-badge" class="tool-btn" style="cursor:default;pointer-events:none;display:inline-flex;align-items:center;gap:7px;" title="100% Offline-First — All data saved locally on your device">
            <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;" aria-hidden="true"></span>
            <span>Offline</span>
          </div>
          <button class="tool-btn" id="btn-pwa-install" title="Install Dyslexia Assistant as a desktop or mobile application" style="display:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Install App</span>
          </button>
        </div>
      </div>

      <!-- PWA In-App Promotion Banner -->
      <div id="pwa-install-banner" class="pwa-promo-banner" style="display: none;" role="region" aria-label="Install App Promotion">
        <div class="pwa-promo-content">
          <span style="font-size: 1.3rem;">⚡</span>
          <span><strong>Install Dyslexia Assistant</strong> for instant offline desktop/mobile access with zero latency.</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="btn-banner-install" class="btn btn-sm btn-accent">Install Now</button>
          <button type="button" id="btn-dismiss-install" class="icon-btn-sm" aria-label="Dismiss install banner">✕</button>
        </div>
      </div>

      <!-- VIEW PANELS -->

      <!-- READER PANEL -->
      <div class="view-panel" id="panel-reader">
        <div class="reader-container">
          <div class="reader-header">
            <div class="doc-meta" id="doc-meta">
              <span id="doc-title-display">No document loaded</span>
              <span class="doc-sep" aria-hidden="true">·</span>
              <span id="doc-word-count">0 words</span>
            </div>
            <div class="reader-controls">
              <select id="voice-select" class="tool-select" aria-label="Select TTS voice" style="max-width:160px;"></select>
              <input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="1" title="Speech rate" aria-label="Speech rate"/>
            </div>
          </div>
          <div
            id="reader-content"
            class="reader-content"
            role="article"
            aria-label="Reading content area"
            tabindex="0"
          >
            <div class="reader-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3;margin-bottom:16px;">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <p>Upload a PDF, DOCX, or TXT — or paste text to begin reading</p>
              <p style="font-size:0.85rem;opacity:0.6;margin-top:8px;">Supports OpenDyslexic &amp; Lexend fonts · Bionic reading · Word box · Line guide</p>
            </div>
          </div>
        </div>
      </div>

      <!-- WRITER PANEL -->
      <div class="view-panel hidden" id="panel-writer">
        <div class="writer-container">
          <div class="docs-panel hidden" id="docs-panel">
            <div class="docs-panel-header">
              <span style="font-weight:700;font-size:0.9rem;">My Documents</span>
              <button class="icon-btn-sm" id="btn-close-docs-panel" aria-label="Close documents panel">✕</button>
            </div>
            <div class="doc-search-wrap">
              <input type="search" id="doc-search" class="doc-search-input" placeholder="Search documents…" aria-label="Search documents"/>
            </div>
            <ul class="docs-list" id="docs-list" aria-label="Saved documents" role="listbox"></ul>
          </div>
          <div class="editor-wrap">
            <input type="text" id="doc-title" class="doc-title-input" placeholder="Document title…" aria-label="Document title"/>
            <div
              id="editor-content"
              class="editor-content"
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              aria-label="Document editor"
              spellcheck="true"
            ></div>
            <div class="editor-footer">
              <span id="editor-word-count" class="text-muted" style="font-size:0.8rem;">0 words</span>
              <span id="editor-status" class="text-muted" style="font-size:0.8rem;">Unsaved</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FLASHCARDS PANEL -->
      <div class="view-panel hidden" id="panel-flashcards">
        <div class="flashcards-container">
          <div class="fc-header">
            <div>
              <h2 class="fc-title">Flashcard Vault</h2>
              <p class="fc-subtitle text-muted" id="fc-deck-info">0 cards · Spaced repetition active</p>
            </div>
            <div class="fc-header-controls">
              <select id="fc-filter" class="tool-select" aria-label="Filter cards by status">
                <option value="all">All Cards</option>
                <option value="new">New</option>
                <option value="learning">Learning</option>
                <option value="review">Review</option>
              </select>
            </div>
          </div>

          <!-- Study Mode -->
          <div id="fc-study-mode" class="fc-study-mode hidden">
            <div class="fc-progress-wrap">
              <div class="fc-progress-bar" id="fc-progress-bar" style="width:0%;"></div>
            </div>
            <div class="fc-card-wrap">
              <div
                class="fc-card"
                id="fc-card"
                role="button"
                aria-label="Flashcard — click or press Space to flip"
                tabindex="0"
              >
                <div class="fc-card-inner">
                  <div class="fc-card-front" id="fc-front">
                    <span class="fc-card-label">FRONT</span>
                    <p id="fc-front-text"></p>
                  </div>
                  <div class="fc-card-back" id="fc-back">
                    <span class="fc-card-label">BACK</span>
                    <p id="fc-back-text"></p>
                  </div>
                </div>
              </div>
            </div>
            <div class="fc-rating-wrap" id="fc-rating-wrap" style="display:none;">
              <button class="fc-rate-btn" data-rating="1" aria-label="Rate: Again">Again</button>
              <button class="fc-rate-btn" data-rating="2" aria-label="Rate: Hard">Hard</button>
              <button class="fc-rate-btn" data-rating="3" aria-label="Rate: Good">Good</button>
              <button class="fc-rate-btn" data-rating="4" aria-label="Rate: Easy">Easy</button>
            </div>
          </div>

          <!-- Card Grid -->
          <div id="fc-grid" class="fc-grid"></div>
          <div class="fc-empty-state hidden" id="fc-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3;margin-bottom:16px;">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <p>No flashcards yet. Click <strong>Add Card</strong> to create your first card.</p>
          </div>
        </div>
      </div>

    </main>
  </div>

  <!-- FILE UPLOAD INPUT (hidden) -->
  <input type="file" id="file-input" accept=".pdf,.docx,.txt,.doc" class="visually-hidden" aria-hidden="true"/>

  <!-- SETTINGS MODAL -->
  <div id="settings-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="settings-modal-title" class="text-lg">Workspace Settings</h3>
        <button class="icon-btn-sm" id="close-settings-modal" aria-label="Close settings">✕</button>
      </div>
      <div class="modal-body">
        <div class="settings-section">
          <h4 class="settings-section-title">Reading Preferences</h4>
          <div class="settings-row">
            <label for="color-overlay-select">Colour Overlay</label>
            <select id="color-overlay-select" class="tool-select">
              <option value="none">None</option>
              <option value="cream">Soft Cream</option>
              <option value="sage">Sage Green</option>
              <option value="blue">Sky Blue</option>
              <option value="lavender">Lavender</option>
              <option value="peach">Soft Peach</option>
              <option value="rose">Soft Rose</option>
              <option value="amber">Warm Amber</option>
            </select>
          </div>
          <div class="settings-row">
            <label for="line-height-select">Line Height</label>
            <select id="line-height-select" class="tool-select">
              <option value="1.4">Compact (1.4)</option>
              <option value="1.6">Normal (1.6)</option>
              <option value="1.8" selected>Relaxed (1.8)</option>
              <option value="2.0">Spacious (2.0)</option>
              <option value="2.4">Extra (2.4)</option>
            </select>
          </div>
          <div class="settings-row">
            <label for="contrast-select">Contrast Mode</label>
            <select id="contrast-select" class="tool-select">
              <option value="normal">Normal</option>
              <option value="reduced">Reduced</option>
              <option value="high">High Contrast</option>
            </select>
          </div>
        </div>
        <div class="settings-section">
          <h4 class="settings-section-title">Audio</h4>
          <div class="settings-row">
            <label for="tts-volume">TTS Volume</label>
            <input type="range" id="tts-volume" min="0" max="1" step="0.05" value="1" aria-label="TTS Volume"/>
          </div>
        </div>
        <div class="settings-section">
          <h4 class="settings-section-title">Data</h4>
          <div class="settings-row">
            <label>Export All Data</label>
            <button class="btn" id="btn-export-all" style="padding:6px 14px;font-size:0.85rem;">Export JSON</button>
          </div>
          <div class="settings-row">
            <label>Clear All Data</label>
            <button class="btn" id="btn-clear-all" style="padding:6px 14px;font-size:0.85rem;color:#c2410c;">Clear Storage</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ADD FLASHCARD MODAL -->
  <div id="add-card-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="add-card-modal-title">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="add-card-modal-title" class="text-lg">Add Flashcard</h3>
        <button class="icon-btn-sm" id="close-add-card-modal" aria-label="Close add card modal">✕</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label for="new-card-front" style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:6px;">Front (Term / Question)</label>
          <input type="text" id="new-card-front" class="doc-search-input" placeholder="e.g. Phoneme" required/>
        </div>
        <div>
          <label for="new-card-back" style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:6px;">Back (Definition / Answer)</label>
          <textarea id="new-card-back" class="doc-search-input" rows="3" placeholder="e.g. The smallest unit of sound in a language." required style="resize:vertical;"></textarea>
        </div>
        <div>
          <label for="new-card-category" style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:6px;">Category (optional)</label>
          <input type="text" id="new-card-category" class="doc-search-input" placeholder="e.g. Reading Skills"/>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="cancel-add-card-btn" style="background:transparent;color:var(--text-muted);font-size:0.9rem;">Cancel</button>
        <button class="btn" id="submit-add-card-btn" style="padding:8px 24px;font-size:0.9rem;">Add Card</button>
      </div>
    </div>
  </div>

  <!-- PASTE TEXT MODAL -->
  <div id="paste-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="paste-modal-title">
    <div class="modal-card" style="max-width:600px;">
      <div class="modal-header">
        <h3 id="paste-modal-title" class="text-lg">Paste Text</h3>
        <button class="icon-btn-sm" id="close-paste-modal" aria-label="Close paste modal">✕</button>
      </div>
      <div class="modal-body">
        <label for="paste-textarea" style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:8px;">Paste your text below</label>
        <textarea
          id="paste-textarea"
          rows="10"
          class="doc-search-input"
          placeholder="Paste any text here to load it into the Reader…"
          style="width:100%;resize:vertical;"
          aria-label="Text to paste into reader"
        ></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn" id="cancel-paste-btn" style="background:transparent;color:var(--text-muted);font-size:0.9rem;">Cancel</button>
        <button class="btn" id="submit-paste-btn" style="padding:8px 24px;font-size:0.9rem;">Load into Reader</button>
      </div>
    </div>
  </div>

  <!-- PROGRESS & STREAK MODAL -->
  <div id="progress-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="progress-modal-title">
    <div class="modal-card" style="max-width: 580px;">
      <div class="modal-header">
        <h2 id="progress-modal-title" class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🔥</span> Your Learning &amp; Reading Streaks
        </h2>
        <button class="btn-icon close-modal" id="close-progress-modal" aria-label="Close Progress Modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="stats-metrics-grid">
          <div class="stat-metric-card">
            <div class="stat-metric-value" id="stat-streak-count">1</div>
            <div class="stat-metric-label">Day Streak 🔥</div>
          </div>
          <div class="stat-metric-card">
            <div class="stat-metric-value" id="stat-words-today">0</div>
            <div class="stat-metric-label">Words Today 📖</div>
          </div>
          <div class="stat-metric-card">
            <div class="stat-metric-value" id="stat-words-total">0</div>
            <div class="stat-metric-label">Total Words 📚</div>
          </div>
          <div class="stat-metric-card">
            <div class="stat-metric-value" id="stat-focus-minutes">0m</div>
            <div class="stat-metric-label">Focus Time ⏱️</div>
          </div>
          <div class="stat-metric-card">
            <div class="stat-metric-value" id="stat-cards-mastered">0</div>
            <div class="stat-metric-label">Mastered Pairs 🧠</div>
          </div>
        </div>
        <h3 style="font-size: 1rem; font-weight: 700; margin: 16px 0 10px 0; color: var(--text-primary);">
          🏅 Dyslexia Superpower Badges
        </h3>
        <div class="stat-badge-list" id="stat-badge-list"></div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-primary" onclick="window.DA_Stats &amp;&amp; window.DA_Stats.closeModal()">Keep Reading!</button>
      </div>
    </div>
  </div>

  <!-- TEACHER & STUDENT SHARE MODAL -->
  <div id="share-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
    <div class="modal-card" style="max-width: 520px;">
      <div class="modal-header">
        <h2 id="share-modal-title" class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🔗</span> Share Dyslexia-Friendly Lesson
        </h2>
        <button class="btn-icon close-modal" id="close-share-modal" aria-label="Close Share Modal">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
          Share this lesson directly with students, tutors, or classmates. When opened, it automatically loads with your chosen visual tint and typography accommodations!
        </p>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Preview</div>
        <div id="share-text-preview" style="font-size: 0.85rem; font-style: italic; background: var(--surface-warm); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 12px;">
          Lesson preview text...
        </div>
        <label for="share-link-input" style="font-size: 0.82rem; font-weight: 700;">Shareable Link</label>
        <div class="share-link-box">
          <input type="text" id="share-link-input" class="share-link-input" readonly />
          <button type="button" class="btn btn-primary" id="btn-copy-share-link">Copy Link</button>
        </div>
        <div class="share-buttons-row">
          <button type="button" class="btn-share-channel btn-share-wa" id="btn-share-whatsapp"><span>💬</span> WhatsApp</button>
          <button type="button" class="btn-share-channel btn-share-mail" id="btn-share-email"><span>✉️</span> Email Lesson</button>
        </div>
      </div>
    </div>
  </div>

  <!-- TRUST, SCHOOL KIT & WCAG 2.1 AA MODAL -->
  <div id="trust-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="trust-modal-title">
    <div class="modal-card" style="max-width: 620px;">
      <div class="modal-header">
        <h2 id="trust-modal-title" class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🛡️</span> Market Trust &amp; Educator School Kit
        </h2>
        <button class="btn-icon close-modal" id="close-trust-modal" aria-label="Close Trust Modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="trust-tabs" role="tablist">
          <button type="button" class="trust-tab-btn active" data-tab="wcag" role="tab" aria-selected="true">♿ WCAG 2.1 AA Certified</button>
          <button type="button" class="trust-tab-btn" data-tab="privacy" role="tab" aria-selected="false">🔒 Student Privacy</button>
          <button type="button" class="trust-tab-btn" data-tab="educator" role="tab" aria-selected="false">🏫 Educator Guide</button>
        </div>
        <div class="trust-tab-panel active" id="tab-panel-wcag" role="tabpanel">
          <p style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary);">
            Dyslexia Assistant is tested against strict WCAG 2.1 AA accessibility standards using automated Axe-core testing suites on every build.
          </p>
          <ul class="trust-check-list">
            <li class="trust-check-item">
              <span class="trust-check-icon">✓</span>
              <div><strong>High-Contrast Color Shield:</strong> Minimum 4.5:1 text-to-background contrast across all 8 calming reading tints.</div>
            </li>
            <li class="trust-check-item">
              <span class="trust-check-icon">✓</span>
              <div><strong>Full Keyboard Accessibility:</strong> Complete operation without a mouse (<kbd>Alt+1</kbd> Reader, <kbd>Alt+2</kbd> Writer, <kbd>Alt+3</kbd> Flashcards, <kbd>Space</kbd> Speech, <kbd>Esc</kbd> Close).</div>
            </li>
            <li class="trust-check-item">
              <span class="trust-check-icon">✓</span>
              <div><strong>Screen Reader Compliant:</strong> ARIA live regions announce syllable splits, definitions, and word-box focus points.</div>
            </li>
          </ul>
        </div>
        <div class="trust-tab-panel" id="tab-panel-privacy" role="tabpanel">
          <p style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary);">
            Built with zero-telemetry and student safety at its core. Compliant with COPPA &amp; FERPA standards for minors.
          </p>
          <ul class="trust-check-list">
            <li class="trust-check-item">
              <span class="trust-check-icon">✓</span>
              <div><strong>100% Offline-First:</strong> All text processing, dictionary lookups, phonetic spell checking, and audio synthesis run in the browser without sending student data to external servers.</div>
            </li>
            <li class="trust-check-item">
              <span class="trust-check-icon">✓</span>
              <div><strong>Zero Tracking Cookies &amp; Ads:</strong> No third-party trackers, advertisements, or behavioral profiling.</div>
            </li>
            <li class="trust-check-item">
              <span class="trust-check-icon">✓</span>
              <div><strong>Fully Offline:</strong> All data stays on your device. No accounts, no cloud sync, no server — your work is always yours.</div>
            </li>
          </ul>
        </div>
        <div class="trust-tab-panel" id="tab-panel-educator" role="tabpanel">
          <p style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary);">
            3-Minute Quickstart for Teachers, Special Education Tutors, and Parents:
          </p>
          <ul class="trust-check-list">
            <li class="trust-check-item">
              <span class="trust-check-icon">1.</span>
              <div><strong>Send Share Links:</strong> Click "Share" in Reader toolbar to send reading lessons directly with calming tint and OpenDyslexic font pre-selected.</div>
            </li>
            <li class="trust-check-item">
              <span class="trust-check-icon">2.</span>
              <div><strong>Smartboard Projection:</strong> Enable "Sage Green" or "Soft Cream" tint when projecting text to reduce classroom eye strain and letter vibration.</div>
            </li>
            <li class="trust-check-item">
              <span class="trust-check-icon">3.</span>
              <div><strong>Daily Flashcard Drills:</strong> Practice 5 minutes in "Cards" view daily to anchor tricky mirror letters like <em style="font-family: 'OpenDyslexic'; font-weight: bold;">b</em> and <em style="font-family: 'OpenDyslexic'; font-weight: bold;">d</em>.</div>
            </li>
          </ul>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-primary" onclick="document.getElementById('trust-modal') &amp;&amp; document.getElementById('trust-modal').classList.add('hidden')">Close</button>
      </div>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div id="toast-container" class="toast-container" aria-live="polite"></div>
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkspaceApp() {
  const containerRef = useRef(null);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    // Add app-body class to document body (removed on unmount)
    document.body.classList.add('app-body');
    // Update title
    document.title = 'Dyslexia Assistant | Workspace';

    // 1. Inject CSS stylesheets (idempotent)
    const cssPromises = WORKSPACE_CSS.map(injectStylesheet);

    Promise.all(cssPromises).then(async () => {
      // 2. Load scripts sequentially (once per session)
      if (!scriptsLoadedRef.current) {
        scriptsLoadedRef.current = true;
        try {
          await loadScriptsInOrder(WORKSPACE_SCRIPTS);
        } catch (err) {
          console.warn('[WorkspaceApp] Script load error:', err);
        }
      } else {
        // Scripts already in DOM — re-trigger app init if the global is exposed
        if (typeof window.__DA_reinit === 'function') {
          window.__DA_reinit();
        }
      }
    });

    return () => {
      // Cleanup: restore body class and title when navigating away
      document.body.classList.remove('app-body');
      document.title = 'Dyslexia Assistant | The Agentic Reading Workspace';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="workspace-react-root"
      dangerouslySetInnerHTML={{ __html: WORKSPACE_HTML }}
    />
  );
}
