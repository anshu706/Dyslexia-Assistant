import { useEffect, useRef, useState } from 'react';

const calmingTints = [
  {
    id: 'default',
    name: 'Midnight Dark',
    swatch: '#16181b',
    rgb: [0.09, 0.09, 0.11],
    weight: 0.0,
    tag: 'Base Ambient',
    desc: 'Deep restful dark background with gentle multi-spectrum aura.'
  },
  {
    id: 'sage',
    name: 'Sage Green',
    swatch: '#cde4d6',
    rgb: [0.22, 0.62, 0.44],
    weight: 0.95,
    tag: 'Glare Relief',
    desc: 'Clinically shown to reduce high-contrast glare, visual distortion, and ocular fatigue.'
  },
  {
    id: 'cream',
    name: 'Soft Cream',
    swatch: '#fbf6e8',
    rgb: [0.65, 0.58, 0.38],
    weight: 0.90,
    tag: 'Natural Sepia',
    desc: 'Gentle parchment tone that softens harsh light and promotes sustained reading flow.'
  },
  {
    id: 'blue',
    name: 'Sky Blue',
    swatch: '#cfe0ef',
    rgb: [0.24, 0.52, 0.82],
    weight: 0.95,
    tag: 'Motion Calmer',
    desc: 'Calms letter vibration, jitter, and swimming movements across the page.'
  },
  {
    id: 'lavender',
    name: 'Lavender',
    swatch: '#dfceef',
    rgb: [0.55, 0.36, 0.72],
    weight: 0.92,
    tag: 'Visual Rest',
    desc: 'Soft violet wavelength known in dyslexia research to ease perceptual visual stress.'
  },
  {
    id: 'peach',
    name: 'Soft Peach',
    swatch: '#ebd3c8',
    rgb: [0.70, 0.44, 0.28],
    weight: 0.90,
    tag: 'Edge Focus',
    desc: 'Comforting warm wavelength that sharpens character boundaries without fatigue.'
  },
  {
    id: 'rose',
    name: 'Soft Rose',
    swatch: '#ecd3de',
    rgb: [0.70, 0.38, 0.50],
    weight: 0.88,
    tag: 'Gentle Contrast',
    desc: 'Calms hypersensitivity to stark monitors and bright ambient room lighting.'
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    swatch: '#f9ecc8',
    rgb: [0.72, 0.58, 0.28],
    weight: 0.88,
    tag: 'Gentle Warmth',
    desc: 'Golden amber warmth that relieves evening eye strain and softens harsh white light.'
  }
];

const chapters = [
  {
    number: '01',
    title: 'Make the page quieter.',
    text: 'Shape type, spacing, and contrast around the way your eyes actually read with specialized dyslexia typography.',
    detail: 'Reader Workspace',
    view: 'reader',
    colorName: 'Sage Green',
    colorHex: '#283f7d',
    colorBg: '#cde4d6',
    badgeColor: '#1d2378'
  },
  {
    number: '02',
    title: 'Give thoughts room.',
    text: 'Write without fighting the cursor. Gentle phonetic spell-check and live speech dictation stay close when you need them.',
    detail: 'Writer Workspace',
    view: 'writer',
    colorName: 'Sky Blue',
    colorHex: '#3b60c5',
    colorBg: '#cfe0ef',
    badgeColor: '#1d2378'
  },
  {
    number: '03',
    title: 'Keep what matters.',
    text: 'Turn difficult words into small, repeatable moments of progress with spaced repetition flashcards.',
    detail: 'Flashcard Vault',
    view: 'flashcards',
    colorName: 'Lavender',
    colorHex: '#7c3aed',
    colorBg: '#dfceef',
    badgeColor: '#5b21b6'
  },
  {
    number: '04',
    title: 'Listen at your pace.',
    text: 'Follow along with natural speech, an active word bounding box, and Indian & global voices that never rush you.',
    detail: 'Speech Audio',
    view: 'reader',
    tts: true,
    colorName: 'Terracotta',
    colorHex: '#ec633d',
    colorBg: '#f6edda',
    badgeColor: '#c2410c'
  }
];

// Plamo Architectural Folder Tab component
function FolderTab({ label, side = 'left', fill = '#E2D2B3' }) {
  return (
    <div className={`tab-root ${side === 'left' ? 'tab-root--left' : 'tab-root--right'}`}>
      <svg viewBox="0 0 296.86 55.23" className="tab-svg" preserveAspectRatio="none">
        <path
          fill={fill}
          d="M.68,55.09c18,0,33.61-11.42,37.64-27.55h.01C42.39,11.43,58,0,75.98,0h145.6c18,0,33.61,11.42,37.64,27.55,4.05,16.12,19.66,27.55,37.64,27.55L0,55.23"
        />
      </svg>
      <span className="tab-label">{label}</span>
    </div>
  );
}

// Plamo Primary Action Button Component
function PlamoButton({ href, label, onClick, variant = 'primary', className = '' }) {
  const content = (
    <div className={`plamo-button ${variant} ${className}`}>
      <div className="plamo-button-icon">
        <svg viewBox="0 0 37 37" width="22" height="22" fill="none">
          <rect width="37" height="37" rx="3" fill="currentColor" />
          <rect x="9.5" y="8" width="20" height="1.5" rx="0.5" transform="rotate(90 9.5 8)" fill="white" fillOpacity="0.7" />
          <path d="M28 28C28 18.0589 19.9411 10 10 10" stroke="white" strokeOpacity="0.7" strokeDasharray="1.5 1.5" strokeWidth="1.5" />
          <path d="M32 28.8C32 28.9105 31.9105 29 31.8 29L9 29L9 27L31.8 27C31.9105 27 32 27.0895 32 27.2L32 28.8Z" fill="#F6EDDA" />
        </svg>
      </div>
      <div className="plamo-button-label">
        <span className="label-text">{label}</span>
        <span className="label-hover">{label}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="plamo-button-link">
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="plamo-button-link">
      {content}
    </button>
  );
}

function LandingPage() {
  const [activeTint, setActiveTint] = useState(calmingTints[1]); // default to Sage Green
  const [demoFont, setDemoFont] = useState('Lexend');
  const [demoSpaced, setDemoSpaced] = useState(true);
  const [demoBionic, setDemoBionic] = useState(true);
  const [demoWordBox, setDemoWordBox] = useState(true);
  const [demoSpeaking, setDemoSpeaking] = useState(false);
  const [spokenWordIndex, setSpokenWordIndex] = useState(-1);
  const [coords, setCoords] = useState({ x: '0.00', y: '0.00' });

  // Mouse coordinate tracker marginalia (Plamo signature HUD)
  useEffect(() => {
    const handlePointerMove = (e) => {
      const xNorm = ((e.clientX / window.innerWidth) * 100).toFixed(2);
      const yNorm = ((e.clientY / window.innerHeight) * 100).toFixed(2);
      setCoords({ x: xNorm, y: yNorm });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getWorkspaceUrl = (view = '', isTts = false) => {
    const tintParam = activeTint.id === 'sage' ? 'mint' : activeTint.id === 'default' ? 'dark' : activeTint.id;
    const params = new URLSearchParams();
    if (view) params.set('view', view);
    if (tintParam) params.set('tint', tintParam);
    if (isTts) params.set('tts', '1');
    return `app.html?${params.toString()}`;
  };

  const sampleWords = [
    'The', 'rhythm', 'of', 'reading', 'changes', 'the', 'moment', 'the', 'page',
    'stops', 'fighting', 'your', 'eyes.', 'With', 'gentle', 'pastel', 'tints,',
    'letters', 'settle', 'into', 'place,', 'allowing', 'your', 'mind', 'to',
    'absorb', 'meaning', 'effortlessly.'
  ];

  const toggleDemoTTS = () => {
    if (!('speechSynthesis' in window)) return;
    if (demoSpeaking) {
      window.speechSynthesis.cancel();
      setDemoSpeaking(false);
      setSpokenWordIndex(-1);
      return;
    }
    window.speechSynthesis.cancel();
    const text = sampleWords.join(' ');
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;

    utt.onboundary = (event) => {
      if (event.name === 'word') {
        let charAcc = 0;
        for (let i = 0; i < sampleWords.length; i++) {
          const wLen = sampleWords[i].length;
          if (charAcc <= event.charIndex && event.charIndex < charAcc + wLen + 1) {
            setSpokenWordIndex(i);
            break;
          }
          charAcc += wLen + 1;
        }
      }
    };

    utt.onend = () => {
      setDemoSpeaking(false);
      setSpokenWordIndex(-1);
    };
    utt.onerror = () => {
      setDemoSpeaking(false);
      setSpokenWordIndex(-1);
    };

    window.speechSynthesis.speak(utt);
    setDemoSpeaking(true);
  };

  return (
    <div className={`plamo-landing tint-theme-${activeTint.id}`}>
      {/* PLAMO DRAFTING MARGINALIA (Fixed HUD) */}
      <div className="coords-marginalia" aria-hidden="true">
        <div className="coord-item"><span>X</span> {coords.x}</div>
        <div className="coord-item"><span>Y</span> {coords.y}</div>
      </div>
      <div className="contact-marginalia" aria-hidden="true">
        <span>Dyslexia Assistant</span> · <em>Agentic Workspace</em>
      </div>

      {/* PLAMO FLOATING NAVIGATION */}
      <header className="plamo-nav-fixed">
        <div className="plamo-nav-shell">
          <nav className="plamo-nav">
            <a href="#top" className="plamo-brand">
              <div className="plamo-brand-icon">
                <svg viewBox="0 0 37 37" width="28" height="28" fill="none">
                  <rect width="37" height="37" rx="3" fill="#EC633D" />
                  <rect x="9.5" y="8" width="20" height="1.5" rx="0.5" transform="rotate(90 9.5 8)" fill="white" fillOpacity="0.4" />
                  <path d="M28 28C28 18.0589 19.9411 10 10 10" stroke="white" strokeOpacity="0.4" strokeDasharray="1 1" />
                  <path d="M32 28.8C32 28.9105 31.9105 29 31.8 29L9 29L9 27L31.8 27C31.9105 27 32 27.0895 32 27.2L32 28.8Z" fill="#F6EDDA" />
                </svg>
              </div>
              <div className="plamo-brand-text">
                <span className="brand-title">Dyslexia Assistant</span>
                <span className="brand-sub">Irlen & Reading Workspace</span>
              </div>
            </a>

            <ul className="plamo-nav-links">
              <li>
                <a href="#tints" className="nav-link">
                  <span>Calming Tints</span>
                  <span className="nav-underline" />
                </a>
              </li>
              <li>
                <a href="#simulator" className="nav-link">
                  <span>Live Simulator</span>
                  <span className="nav-underline" />
                </a>
              </li>
              <li>
                <a href="#practice" className="nav-link">
                  <span>4 Modes</span>
                  <span className="nav-underline" />
                </a>
              </li>
              <li>
                <a href="#philosophy" className="nav-link">
                  <span>Methodology</span>
                  <span className="nav-underline" />
                </a>
              </li>
            </ul>

            <div className="plamo-nav-actions">
              <PlamoButton href={getWorkspaceUrl()} label="Open Workspace" variant="primary" />
            </div>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* HERO SECTION - PLAMO DRAFTING BLUEPRINT */}
        <section className="plamo-hero bg-drafting-grid">
          <div className="plamo-hero-inner">
            <div className="hero-eyebrow">
              <span className="eyebrow-badge">BETA v2.4</span>
              <span className="eyebrow-handwritten">Calibrated for Irlen & Dyslexic Readers</span>
            </div>

            <h1 className="hero-title">
              Dyslexia Assistant, the New
              <br />
              <span className="hero-title-accent">Agentic Reading Workspace</span>
            </h1>

            <p className="hero-description">
              A quieter way to read, write, listen, and learn. Soften harsh contrast, stabilize dancing letters, and experience dyslexia-tested pastel overlays designed for real focus.
            </p>

            <div className="hero-actions">
              <PlamoButton href={getWorkspaceUrl()} label="Launch Workspace" variant="primary" />
              <a href="#simulator" className="plamo-btn-secondary">
                <span>Try Live Simulator ↓</span>
              </a>
            </div>

            {/* PLAMO INTERACTIVE WORKSPACE PREVIEW CARD */}
            <div className="hero-workspace-preview-card">
              <div className="preview-card-header">
                <div className="window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="preview-card-tab">
                  <span className="tab-file-icon">📄</span>
                  <span>workspace.da — Reader Sheet [Mode: Irlen Relaxed]</span>
                </div>
                <div className="preview-card-status">
                  <span className="status-live-dot" />
                  <span>Interactive Engine Ready</span>
                </div>
              </div>

              <div className="preview-card-body" style={{ backgroundColor: activeTint.swatch }}>
                <div className="preview-toolbar-mock">
                  <div className="mock-group">
                    <span className="mock-btn active">Aa Lexend</span>
                    <span className="mock-btn">Spaced: ON</span>
                    <span className="mock-btn active">Bionic: ON</span>
                    <span className="mock-btn active">Word Box: ON</span>
                  </div>
                  <div className="mock-group right">
                    <span className="mock-badge">Indian & Global Voices</span>
                    <a href={getWorkspaceUrl()} className="mock-launch-link">
                      Open in Full Workspace ↗
                    </a>
                  </div>
                </div>

                <div className="preview-sheet-paper">
                  <h3 className="preview-story-title">The Secret Garden — A Quieter Page</h3>
                  <p className="preview-story-p">
                    <b>Ma</b>ry <b>Len</b>nox <b>wa</b>s <b>bo</b>rn <b>in</b> <b>In</b>dia <b>an</b>d <b>ha</b>d <b>alw</b>ays <b>be</b>en <b>an</b> <b>ill-tem</b>pered <b>chi</b>ld. <b>He</b>r <b>par</b>ents <b>we</b>re <b>alw</b>ays <b>bu</b>sy <b>an</b>d <b>ha</b>d <b>lit</b>tle <b>ti</b>me <b>fo</b>r <b>he</b>r, <b>so</b> <b>sh</b>e <b>gr</b>ew <b>up</b> <b>alo</b>ne <b>an</b>d <b>cr</b>oss.
                  </p>
                  <div className="preview-focus-callout">
                    <span className="callout-corner tl" />
                    <span className="callout-corner tr" />
                    <span className="callout-corner bl" />
                    <span className="callout-corner br" />
                    <p>
                      Letters settle effortlessly into place when background glare is eliminated.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CALMING TINTS (PLAMO SHEET WITH FOLDER TAB) */}
        <section className="plamo-section" id="tints">
          <div className="plamo-sheet-wrapper">
            <div className="plamo-sheet bg-sheet-tan">
              <FolderTab label="01 · CALMING DYSLEXIA TINTS" side="left" fill="#E2D2B3" />

              <div className="sheet-content">
                <div className="sheet-header-center">
                  <div className="handwritten-tag">- Irlen Spectral Calibration -</div>
                  <h2 className="sheet-title">Optic Tints That Quiet the Whole Page</h2>
                  <p className="sheet-subtitle">
                    Dyslexia research shows specific pastel wavelengths reduce ocular distortion, soothe letter jitter, and prevent sensory overload.
                  </p>
                </div>

                {/* 8 CALMING TINTS PICKER GRID */}
                <div className="tints-card-grid" role="radiogroup" aria-label="Calming Reading Tints">
                  {calmingTints.map((tint) => {
                    const isSelected = activeTint.id === tint.id;
                    return (
                      <article
                        key={tint.id}
                        className={`tint-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setActiveTint(tint)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                      >
                        <div className="tint-card-top">
                          <span className="tint-tag">{tint.tag}</span>
                          <span
                            className="tint-color-sample"
                            style={{ backgroundColor: tint.swatch }}
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="tint-card-name">{tint.name}</h3>
                        <p className="tint-card-desc">{tint.desc}</p>
                        <div className="tint-card-footer">
                          <span className="tint-select-indicator">
                            {isSelected ? 'Active Tint ✓' : 'Select Tint'}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Active Tint Summary Strip */}
                <div className="active-tint-banner" style={{ borderColor: activeTint.swatch }}>
                  <div className="banner-left">
                    <span
                      className="banner-dot"
                      style={{ backgroundColor: activeTint.swatch }}
                    />
                    <div>
                      <strong>Active Calming Tone: {activeTint.name}</strong>
                      <span> · {activeTint.desc}</span>
                    </div>
                  </div>
                  <a href={getWorkspaceUrl('reader')} className="banner-cta">
                    Test this tint in Reader ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: LIVE SIMULATOR (PLAMO SHEET WITH FOLDER TAB ON RIGHT) */}
        <section className="plamo-section" id="simulator">
          <div className="plamo-sheet-wrapper">
            <div className="plamo-sheet bg-sheet-gold">
              <FolderTab label="02 · LIVE DYSLEXIA SIMULATOR" side="right" fill="#D5C097" />

              <div className="sheet-content">
                <div className="sheet-header-center">
                  <div className="handwritten-tag">- Real-Time Assistive Controls -</div>
                  <h2 className="sheet-title">Not a test to pass. A page that breathes.</h2>
                  <p className="sheet-subtitle">
                    Experience how specialized dyslexia fonts, relaxed spacing, bionic fixation, and the new <strong>Word Focus Box</strong> make reading feel natural.
                  </p>
                </div>

                {/* Interactive Simulator Deck */}
                <div className="simulator-paper-deck">
                  <div className="sim-toolbar">
                    <div className="sim-toolbar-title">
                      <span className="tool-dot" />
                      <span>ASSISTIVE CONTROLS</span>
                    </div>

                    <div className="sim-control-buttons">
                      <button
                        type="button"
                        className={`sim-btn ${demoFont === 'OpenDyslexic' ? 'active' : ''}`}
                        onClick={() => setDemoFont(demoFont === 'OpenDyslexic' ? 'Lexend' : 'OpenDyslexic')}
                      >
                        <span className="sim-btn-icon">Aa</span>
                        <span>{demoFont === 'OpenDyslexic' ? 'OpenDyslexic ✓' : 'Lexend Font'}</span>
                      </button>

                      <button
                        type="button"
                        className={`sim-btn ${demoSpaced ? 'active' : ''}`}
                        onClick={() => setDemoSpaced(!demoSpaced)}
                      >
                        <span className="sim-btn-icon">↔</span>
                        <span>{demoSpaced ? 'Relaxed Spacing ✓' : 'Standard Spacing'}</span>
                      </button>

                      <button
                        type="button"
                        className={`sim-btn ${demoBionic ? 'active' : ''}`}
                        onClick={() => setDemoBionic(!demoBionic)}
                      >
                        <span className="sim-btn-icon">B</span>
                        <span>{demoBionic ? 'Bionic Fixation ✓' : 'Bionic Off'}</span>
                      </button>

                      {/* NEW WORD TRACKING BOX TOGGLE */}
                      <button
                        type="button"
                        className={`sim-btn sim-btn-accent ${demoWordBox ? 'active' : ''}`}
                        onClick={() => setDemoWordBox(!demoWordBox)}
                        title="Toggle Word Tracking Box"
                      >
                        <span className="sim-btn-icon">[■]</span>
                        <span>{demoWordBox ? 'Word Box: ON ✓' : 'Word Box: OFF'}</span>
                      </button>

                      {/* LISTEN PREVIEW WITH WORD BOX TRACKING */}
                      <button
                        type="button"
                        className={`sim-btn sim-btn-audio ${demoSpeaking ? 'active' : ''}`}
                        onClick={toggleDemoTTS}
                        title="Listen with Word Tracking"
                      >
                        <span className="sim-btn-icon">{demoSpeaking ? '◼' : '🔊'}</span>
                        <span>{demoSpeaking ? 'Stop Speech' : 'Listen with Word Box'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Reading Surface */}
                  <div
                    className="sim-reading-surface"
                    style={{
                      backgroundColor: activeTint.swatch,
                      fontFamily: demoFont === 'OpenDyslexic' ? "'OpenDyslexic', sans-serif" : "'Lexend', sans-serif",
                      letterSpacing: demoSpaced ? '0.08em' : 'normal',
                      wordSpacing: demoSpaced ? '0.2em' : 'normal',
                      lineHeight: demoSpaced ? '2.3' : '1.7'
                    }}
                  >
                    <div className="surface-marginalia">
                      <span>FONT: {demoFont}</span>
                      <span>SPACING: {demoSpaced ? 'RELAXED' : 'NORMAL'}</span>
                      <span>WORD BOX: {demoWordBox ? 'ACTIVE' : 'DISABLED'}</span>
                    </div>

                    <p className="sim-reading-p">
                      {sampleWords.map((word, idx) => {
                        const isCurrentlyRead = demoSpeaking && spokenWordIndex === idx;
                        const boxedClass = isCurrentlyRead && demoWordBox ? 'sim-word-boxed' : '';
                        const readClass = isCurrentlyRead ? 'sim-word-reading' : '';

                        // Bionic bolding: bold first half
                        let wordContent = word;
                        if (demoBionic) {
                          const mid = Math.ceil(word.length / 2);
                          const boldPart = word.slice(0, mid);
                          const restPart = word.slice(mid);
                          wordContent = (
                            <>
                              <b>{boldPart}</b>
                              {restPart}
                            </>
                          );
                        }

                        return (
                          <span
                            key={idx}
                            className={`sim-word ${readClass} ${boxedClass}`}
                          >
                            {wordContent}{' '}
                          </span>
                        );
                      })}
                    </p>

                    <div className="sim-reading-footer">
                      <div className="footer-status">
                        <span className="indicator-badge">Irlen Comfort Shield</span>
                        <span>Selected tint: <strong>{activeTint.name}</strong></span>
                      </div>
                      <a href={getWorkspaceUrl('reader', true)} className="sim-open-btn">
                        Open in Full Reader →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: 4 WORKSPACE MODES (PLAMO BLUEPRINT TILES) */}
        <section className="plamo-section" id="practice">
          <div className="plamo-sheet-wrapper">
            <div className="plamo-sheet bg-sheet-ivory">
              <FolderTab label="03 · FOUR WORKSPACE MODES" side="left" fill="#FAF6EE" />

              <div className="sheet-content">
                <div className="sheet-header-center">
                  <div className="handwritten-tag">- Unified Accommodations -</div>
                  <h2 className="sheet-title">Built for Every Mode of Learning</h2>
                  <p className="sheet-subtitle">
                    A suite of calm tools carefully tailored to give neurodiverse minds effortless mastery over written text.
                  </p>
                </div>

                <div className="plamo-modes-grid">
                  {chapters.map((chapter) => (
                    <article key={chapter.number} className="plamo-mode-card">
                      <div className="card-marginalia">
                        <span className="card-number">{chapter.number}</span>
                        <span className="card-tag" style={{ color: chapter.colorHex }}>
                          {chapter.colorName}
                        </span>
                      </div>

                      <h3 className="card-title">{chapter.title}</h3>
                      <p className="card-text">{chapter.text}</p>

                      <div className="card-action-row">
                        <a
                          href={getWorkspaceUrl(chapter.view, chapter.tts)}
                          className="card-launch-btn"
                          style={{ borderColor: chapter.colorHex }}
                        >
                          <span>{chapter.detail}</span>
                          <span className="arrow">↗</span>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: METHODOLOGY / QUOTE (PLAMO BLUEPRINT BANNER) */}
        <section className="plamo-section" id="philosophy">
          <div className="plamo-quote-card">
            <div className="quote-blueprint-grid" />
            <div className="quote-inner">
              <span className="quote-mark">“</span>
              <h2 className="quote-heading">
                The right colour
                <br />
                <span className="quote-italic">quiets the whole page.</span>
              </h2>
              <p className="quote-body">
                Designed for dyslexic minds, neurodiverse readers, and everyone who values visual peace over screen glare.
              </p>
              <div className="quote-cta">
                <PlamoButton href={getWorkspaceUrl()} label="Launch Workspace Now" variant="primary" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* PLAMO FOOTER */}
      <footer className="plamo-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="plamo-brand-icon">
              <svg viewBox="0 0 37 37" width="24" height="24" fill="none">
                <rect width="37" height="37" rx="3" fill="#EC633D" />
                <path d="M28 28C28 18.0589 19.9411 10 10 10" stroke="white" strokeOpacity="0.5" strokeDasharray="1 1" />
              </svg>
            </div>
            <strong>DYSLEXIA ASSISTANT</strong>
            <span className="footer-version">v2.4 · AGENTIC WORKSPACE</span>
          </div>

          <div className="footer-links">
            <a href="#tints">Calming Tints</a>
            <a href="#simulator">Live Simulator</a>
            <a href="#practice">4 Modes</a>
            <a href={getWorkspaceUrl()}>Workspace</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-coords">
            <span>GRID: 16px</span> · <span>IRLEN-COMPLIANT</span> · <span>WEB SPEECH API</span>
          </div>
          <div className="footer-rights">
            <span>Dyslexia Assistant. A calmer way to read, write, listen, and learn.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
