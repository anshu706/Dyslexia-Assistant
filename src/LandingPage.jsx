import { useEffect, useRef, useState } from 'react';

const calmingTints = [
  {
    id: 'default',
    name: 'Midnight',
    swatch: '#16181b',
    rgb: [0.0, 0.0, 0.0],
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
  }
];

const chapters = [
  {
    number: '01',
    title: 'Make the page quieter.',
    text: 'Shape type, spacing, and contrast around the way your eyes actually read.',
    detail: 'Reader',
    colorName: 'Sage Green',
    colorHex: '#4ade80',
    colorBg: 'rgba(74, 222, 128, 0.12)',
    badgeColor: '#86efac'
  },
  {
    number: '02',
    title: 'Give thoughts room.',
    text: 'Write without fighting the cursor. Gentle guidance stays close when you need it.',
    detail: 'Writer',
    colorName: 'Sky Blue',
    colorHex: '#38bdf8',
    colorBg: 'rgba(56, 189, 248, 0.12)',
    badgeColor: '#7dd3fc'
  },
  {
    number: '03',
    title: 'Keep what matters.',
    text: 'Turn difficult words into small, repeatable moments of progress with focused cards.',
    detail: 'Flashcards',
    colorName: 'Lavender',
    colorHex: '#c084fc',
    colorBg: 'rgba(192, 132, 252, 0.12)',
    badgeColor: '#d8b4fe'
  },
  {
    number: '04',
    title: 'Listen at your pace.',
    text: 'Follow along with speech, highlighted words, and controls that never rush you.',
    detail: 'Listen',
    colorName: 'Soft Peach',
    colorHex: '#fb923c',
    colorBg: 'rgba(251, 146, 60, 0.12)',
    badgeColor: '#fdba74'
  }
];

function LiquidField({ activeTint }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) return undefined;

    const vertexSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;
    const fragmentSource = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform vec2 pointer;
      uniform vec3 tintColor;
      uniform float tintWeight;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv.x *= resolution.x / resolution.y;
        vec2 p = vec2(pointer.x * resolution.x / resolution.y, pointer.y);
        float t = time * 0.15;

        // Gentle, non-disorienting waves
        float waveA = sin(uv.x * 2.6 + t * 0.8) * 0.09 + cos(uv.y * 3.2 - t * 0.6) * 0.07;
        float waveB = cos(uv.x * 3.4 - t * 0.5) * 0.08 + sin(uv.y * 2.4 + t * 0.7) * 0.07;

        // Pointer follower
        float distPointer = distance(uv, p);
        float glowPointer = smoothstep(0.72, 0.03, distPointer + waveA);

        // Ambient soothing bloom centers
        float sageDist = distance(uv, vec2(0.24 + sin(t * 0.38) * 0.08, 0.76 + cos(t * 0.28) * 0.08));
        float glowSage = smoothstep(0.82, 0.14, sageDist + waveB);

        float lavDist = distance(uv, vec2(0.84 + cos(t * 0.32) * 0.09, 0.32 + sin(t * 0.42) * 0.08));
        float glowLav = smoothstep(0.80, 0.12, lavDist + waveA);

        float peachDist = distance(uv, vec2(0.72 + sin(t * 0.44) * 0.07, 0.82 - cos(t * 0.34) * 0.07));
        float glowPeach = smoothstep(0.76, 0.15, peachDist + waveB);

        // Base slate tone
        vec3 base = vec3(0.024, 0.027, 0.033);

        // Dyslexia-friendly pastel blooms
        vec3 sageTone = vec3(0.18, 0.52, 0.36);
        vec3 skyTone = vec3(0.18, 0.46, 0.72);
        vec3 lavTone = vec3(0.46, 0.30, 0.64);
        vec3 peachTone = vec3(0.62, 0.38, 0.25);

        vec3 color = base;
        color += sageTone * glowSage * 0.44;
        color += skyTone * glowPointer * 0.50;
        color += lavTone * glowLav * 0.38;
        color += peachTone * glowPeach * 0.34;

        // Dynamic active tint enrichment
        if (tintWeight > 0.01) {
          color += tintColor * tintWeight * 0.32;
        }

        // Gentle highlight aura
        color += vec3(0.07, 0.08, 0.10) * pow(glowPointer, 3.2);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    const pointer = gl.getUniformLocation(program, 'pointer');
    const tintColorLoc = gl.getUniformLocation(program, 'tintColor');
    const tintWeightLoc = gl.getUniformLocation(program, 'tintWeight');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cursor = { x: 0.72, y: 0.62 };
    let frameId;
    let start = performance.now();

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.clientWidth * scale;
      canvas.height = canvas.clientHeight * scale;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const move = (event) => {
      cursor.x = event.clientX / window.innerWidth;
      cursor.y = 1 - event.clientY / window.innerHeight;
    };

    const draw = (now) => {
      if (!reducedMotion) frameId = requestAnimationFrame(draw);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reducedMotion ? 0 : (now - start) / 1000);
      gl.uniform2f(pointer, cursor.x, cursor.y);
      gl.uniform3f(tintColorLoc, activeTint.rgb[0], activeTint.rgb[1], activeTint.rgb[2]);
      gl.uniform1f(tintWeightLoc, activeTint.weight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', move, { passive: true });
    draw(performance.now());

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [activeTint]);

  return <canvas className="liquid-field" ref={canvasRef} aria-hidden="true" />;
}

function LandingPage() {
  const [activeTint, setActiveTint] = useState(calmingTints[1]); // default to Sage Green
  const [demoFont, setDemoFont] = useState('Lexend');
  const [demoSpaced, setDemoSpaced] = useState(true);
  const [demoBionic, setDemoBionic] = useState(true);

  return (
    <div className={`landing-page tint-theme-${activeTint.id}`}>
      <LiquidField activeTint={activeTint} />
      <div className="landing-noise" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-mark" href="#top" aria-label="Dyslexia Assistant home">
          <span>D.A.</span>
          <span className="landing-mark-badge" style={{ color: activeTint.swatch }}>
            ● {activeTint.name}
          </span>
        </a>
        <nav aria-label="Landing page navigation">
          <a href="#tints">Calming Tints</a>
          <a href="#simulator">Live Demo</a>
          <a href="#practice">4 Modes</a>
          <a href="app.html" className="nav-launch">
            Open workspace <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-kicker">
            <span>A gentle reading space</span>
            <span className="dot">·</span>
            <span className="kicker-accent" style={{ color: activeTint.swatch }}>
              {activeTint.tag}
            </span>
          </div>

          <div className="hero-copy">
            <p className="hero-index">01 / 04</p>
            <h1 id="landing-title">
              Reading,
              <br />
              <em>made gentler.</em>
            </h1>
            <p className="hero-description">
              A calmer way to read, write, listen, and learn. Soften contrast, stabilize dancing letters, and experience dyslexia-tested pastel overlays designed for real focus.
            </p>

            <div className="hero-actions">
              <a className="hero-cta" href="app.html">
                <span>Enter the workspace</span>
                <span aria-hidden="true">→</span>
              </a>
              <a className="hero-secondary" href="#simulator">
                <span>Try interactive demo ↓</span>
              </a>
            </div>

            {/* INTERACTIVE CALMING TINTS PICKER */}
            <div className="hero-tints-panel" id="tints">
              <div className="tints-header">
                <span className="tints-title">CALMING DYSLEXIA TINTS</span>
                <span className="tints-hint">Tap a color to rest your eyes</span>
              </div>
              <div className="tints-swatches" role="radiogroup" aria-label="Choose calming dyslexia tint">
                {calmingTints.map((tint) => (
                  <button
                    key={tint.id}
                    type="button"
                    className={`tint-swatch-chip ${activeTint.id === tint.id ? 'active' : ''}`}
                    onClick={() => setActiveTint(tint)}
                    title={`${tint.name} — ${tint.desc}`}
                  >
                    <span
                      className="tint-dot"
                      style={{ backgroundColor: tint.swatch }}
                      aria-hidden="true"
                    />
                    <span className="tint-label">{tint.name}</span>
                  </button>
                ))}
              </div>
              <div className="tint-active-note">
                <span className="tint-note-icon">✦</span>
                <p>
                  <strong>{activeTint.name}:</strong> {activeTint.desc}
                </p>
              </div>
            </div>
          </div>

          <div className="hero-note">
            <span className="note-line" style={{ background: activeTint.swatch }} />
            Tuned for focus · Irlen-friendly
          </div>
        </section>

        {/* SECTION 2: LIVE SIMULATOR / INTERACTIVE PREVIEW */}
        <section className="statement-section" id="simulator" aria-labelledby="sim-title">
          <div className="section-label">
            <span>LIVE INTERACTIVE PREVIEW</span>
            <span>EXPERIENCE CALMING ACCOMMODATIONS</span>
          </div>

          <div className="statement-grid">
            <div>
              <p id="sim-title" className="statement-lead">
                Not a test to pass.
                <br />
                <span>A page that breathes.</span>
              </p>
              <p className="statement-body">
                Dyslexia isn't about intelligence—it is about visual load and processing stress. Experience how pastel overlays, spaced lettering, and bionic fixation bolding make words hold still.
              </p>
            </div>

            {/* Interactive Dyslexia Card */}
            <div className="demo-preview-card" style={{ borderColor: activeTint.swatch }}>
              <div className="demo-toolbar">
                <span className="demo-badge">Reading Simulator</span>
                <div className="demo-controls">
                  <button
                    type="button"
                    className={`demo-btn ${demoFont === 'OpenDyslexic' ? 'active' : ''}`}
                    onClick={() => setDemoFont(demoFont === 'OpenDyslexic' ? 'Lexend' : 'OpenDyslexic')}
                  >
                    {demoFont === 'OpenDyslexic' ? 'Dyslexic Font ✓' : 'Standard Font'}
                  </button>
                  <button
                    type="button"
                    className={`demo-btn ${demoSpaced ? 'active' : ''}`}
                    onClick={() => setDemoSpaced(!demoSpaced)}
                  >
                    {demoSpaced ? 'Relaxed Spacing ✓' : 'Compact Spacing'}
                  </button>
                  <button
                    type="button"
                    className={`demo-btn ${demoBionic ? 'active' : ''}`}
                    onClick={() => setDemoBionic(!demoBionic)}
                  >
                    {demoBionic ? 'Bionic Focus ✓' : 'Bionic Off'}
                  </button>
                </div>
              </div>

              <div
                className={`demo-reader-surface tint-${activeTint.id === 'default' ? 'dark' : activeTint.id}`}
                style={{
                  fontFamily: demoFont === 'OpenDyslexic' ? "'OpenDyslexic', sans-serif" : "'Lexend', sans-serif",
                  letterSpacing: demoSpaced ? '0.09em' : 'normal',
                  wordSpacing: demoSpaced ? '0.22em' : 'normal',
                  lineHeight: demoSpaced ? '2.4' : '1.7'
                }}
              >
                {demoBionic ? (
                  <p>
                    <b>The</b> <b>rhy</b>thm <b>of</b> <b>read</b>ing <b>chan</b>ges <b>the</b> <b>mo</b>ment <b>the</b> <b>pa</b>ge <b>sto</b>ps <b>fig</b>hting <b>yo</b>ur <b>ey</b>es. <b>Wi</b>th <b>gen</b>tle <b>pas</b>tel <b>tin</b>ts, <b>let</b>ters <b>se</b>ttle <b>in</b>to <b>pla</b>ce, <b>all</b>owing <b>yo</b>ur <b>min</b>d <b>to</b> <b>ab</b>sorb <b>me</b>aning <b>eff</b>ortlessly.
                  </p>
                ) : (
                  <p>
                    The rhythm of reading changes the moment the page stops fighting your eyes. With gentle pastel tints, letters settle into place, allowing your mind to absorb meaning effortlessly.
                  </p>
                )}
              </div>

              <div className="demo-footer">
                <span>Color filter active: <strong>{activeTint.name}</strong></span>
                <a href="app.html" className="demo-launch-btn">
                  Open in Workspace →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: 4 MODES WITH CALMING COLOR ACCENTS */}
        <section className="chapter-section" id="practice" aria-labelledby="practice-title">
          <div className="section-label">
            <span id="practice-title">WAYS IN</span>
            <span>04 CALMING MODES OF SUPPORT</span>
          </div>

          <div className="chapter-list">
            {chapters.map((chapter) => (
              <article
                className="chapter-row"
                key={chapter.number}
                style={{ '--chapter-color': chapter.colorHex, '--chapter-bg': chapter.colorBg }}
              >
                <span className="chapter-number" style={{ color: chapter.colorHex }}>
                  {chapter.number}
                </span>
                <div className="chapter-main">
                  <div className="chapter-header-row">
                    <h2>{chapter.title}</h2>
                    <span className="chapter-palette-tag" style={{ color: chapter.badgeColor, backgroundColor: chapter.colorBg }}>
                      {chapter.colorName}
                    </span>
                  </div>
                  <p>{chapter.text}</p>
                </div>
                <a href="app.html" className="chapter-detail" style={{ color: chapter.colorHex }}>
                  <span>{chapter.detail}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 4: QUOTE SECTION */}
        <section className="quote-section" aria-labelledby="quote-title">
          <p className="quote-mark" aria-hidden="true" style={{ color: activeTint.swatch }}>
            “
          </p>
          <h2 id="quote-title">
            The right colour
            <br />
            <em>quiets the whole page.</em>
          </h2>
          <p className="quote-sub">
            Designed for dyslexic minds, neurodiverse readers, and everyone who values visual peace.
          </p>
          <a className="text-link" href="app.html" style={{ borderColor: activeTint.swatch }}>
            Launch Dyslexia Assistant <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <div>
          <strong>DYSLEXIA ASSISTANT</strong>
          <span>A QUIETER WAY TO READ, WRITE, AND LEARN.</span>
        </div>
        <div>
          <span>SOOTHING PASTEL OVERLAYS BUILT-IN</span>
          <a href="app.html">OPEN WORKSPACE →</a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
