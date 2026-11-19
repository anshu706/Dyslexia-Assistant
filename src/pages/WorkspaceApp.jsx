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
];

// ─── Vendor + app scripts (order matters — mirrors app.html <script> order) ──
const WORKSPACE_SCRIPTS = [
  '/vendor/pdf.min.js',
  '/vendor/mammoth.browser.min.js',
  '/js/security.js',
  '/js/storage.js',
  '/js/api.js',
  '/js/audio.js',
  '/js/docs.js',
  '/js/pwa.js',
  '/js/app.js',
  '/js/reader.js',
  '/js/speech.js',
  '/js/editor.js',
  '/js/flashcards.js',
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
      </nav>
      <div class="sidebar-footer">
        <!-- Account / Cloud Sync button -->
        <button
          class="nav-btn"
          id="btn-sidebar-account"
          title="Account & Cloud Sync"
          style="position:relative;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span id="sidebar-account-label">Offline</span>
          <span
            id="sidebar-status-dot"
            style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:#f59e0b;"
            aria-hidden="true"
          ></span>
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
          <button class="tool-btn" id="btn-account-sync" title="Account & Cloud Sync">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span id="toolbar-sync-label">Offline</span>
          </button>
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

  <!-- AUTH & SYNC MODAL -->
  <div id="auth-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
    <div class="modal-card" style="max-width:440px;">
      <div class="modal-header">
        <h3 id="auth-modal-title" class="text-lg">Account &amp; Cloud Sync</h3>
        <button class="icon-btn-sm" id="close-auth-modal" aria-label="Close modal">✕</button>
      </div>
      <div class="modal-body" id="auth-logged-out-view">
        <p class="text-muted" style="font-size:0.9rem;margin-bottom:16px;">
          Sign in to securely synchronize your reading documents, notes, and flashcards across all your devices.
        </p>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label for="auth-email" style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:6px;">Email Address</label>
            <input type="email" id="auth-email" class="doc-search-input" placeholder="name@example.com" autocomplete="email" required/>
          </div>
          <div>
            <label for="auth-password" style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:6px;">Password (min. 8 characters)</label>
            <input type="password" id="auth-password" class="doc-search-input" placeholder="••••••••" autocomplete="current-password" required/>
          </div>
          <div id="auth-error-msg" style="color:#c2410c;font-size:0.85rem;display:none;background:rgba(194,65,12,0.08);padding:8px 12px;border-radius:4px;border:1px solid rgba(194,65,12,0.2);"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:22px;">
          <button type="button" id="btn-login-submit" class="btn btn-primary" style="flex:1;padding:10px 16px;">Sign In</button>
          <button type="button" id="btn-register-submit" class="btn" style="flex:1;padding:10px 16px;">Create Account</button>
        </div>
      </div>
      <div class="modal-body" id="auth-logged-in-view" style="display:none;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#cde4d6;color:#166534;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;">✓</div>
          <div>
            <div style="font-weight:700;font-size:0.95rem;" id="logged-in-email">user@example.com</div>
            <div class="text-muted" style="font-size:0.8rem;">Cloud synchronization is active</div>
          </div>
        </div>
        <p class="text-muted" style="font-size:0.85rem;margin-bottom:20px;">
          Your documents and flashcards are protected with salted scrypt hashing and session authentication.
        </p>
        <div style="display:flex;gap:10px;">
          <button type="button" id="btn-sync-now" class="btn btn-primary" style="flex:1;padding:10px 16px;">Sync Now</button>
          <button type="button" id="btn-logout" class="btn" style="flex:1;padding:10px 16px;color:#c2410c;">Log Out</button>
        </div>
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
