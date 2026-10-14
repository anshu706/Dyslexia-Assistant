import { useEffect, useRef } from 'react';

const chapters = [
  { number: '01', title: 'Make the page quieter.', text: 'Shape type, spacing, and contrast around the way your eyes actually read.', detail: 'Reader' },
  { number: '02', title: 'Give thoughts room.', text: 'Write without fighting the cursor. Gentle guidance stays close when you need it.', detail: 'Writer' },
  { number: '03', title: 'Keep what matters.', text: 'Turn difficult words into small, repeatable moments of progress with focused cards.', detail: 'Flashcards' },
  { number: '04', title: 'Listen at your pace.', text: 'Follow along with speech, highlighted words, and controls that never rush you.', detail: 'Listen' }
];

function LiquidField() {
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
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv.x *= resolution.x / resolution.y;
        vec2 p = vec2(pointer.x * resolution.x / resolution.y, pointer.y);
        float t = time * 0.18;
        float waveA = sin(uv.x * 3.4 + t) * 0.09;
        float waveB = cos(uv.y * 4.8 - t * 1.2) * 0.07;
        float distanceFromLight = distance(uv, p);
        float glow = smoothstep(0.68, 0.0, distanceFromLight + waveA + waveB);
        float ember = smoothstep(0.55, 0.12, distance(uv, vec2(0.78, 0.68)));
        vec3 deep = vec3(0.012, 0.014, 0.019);
        vec3 blue = vec3(0.035, 0.13, 0.20);
        vec3 emberTone = vec3(0.38, 0.075, 0.025);
        vec3 color = deep + blue * glow * 0.55 + emberTone * ember * 0.22;
        color += vec3(0.06, 0.07, 0.08) * pow(glow, 4.0);
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    const pointer = gl.getUniformLocation(program, 'pointer');
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
  }, []);

  return <canvas className="liquid-field" ref={canvasRef} aria-hidden="true" />;
}

function LandingPage() {
  return (
    <div className="landing-page">
      <LiquidField />
      <div className="landing-noise" aria-hidden="true" />
      <header className="landing-nav">
        <a className="landing-mark" href="#top" aria-label="Dyslexia Assistant home">D.A.</a>
        <nav aria-label="Landing page navigation">
          <a href="#path">The path</a>
          <a href="#practice">Practice</a>
          <a href="app.html" className="nav-launch">Open workspace <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <main id="top">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-kicker">A reading space for different minds <span>·</span> 2026</div>
          <div className="hero-copy">
            <p className="hero-index">01 / 04</p>
            <h1 id="landing-title">Reading,<br /><em>made gentler.</em></h1>
            <p className="hero-description">A focused place to read, write, listen, and learn without asking your attention to work harder than it has to.</p>
            <a className="hero-cta" href="app.html"><span>Enter the workspace</span><span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-note"><span className="note-line" /> Built for focus, tuned for you</div>
        </section>

        <section className="statement-section" id="path" aria-labelledby="path-title">
          <div className="section-label"><span>THE PATH</span><span>READ · WRITE · REMEMBER</span></div>
          <div className="statement-grid">
            <p id="path-title" className="statement-lead">Not a test to pass.<br /><span>A place to begin.</span></p>
            <p className="statement-body">Dyslexia Assistant turns the blank page into a calmer surface. Adjust the words, hear them back, and build your own way through difficult moments.</p>
          </div>
        </section>

        <section className="chapter-section" id="practice" aria-labelledby="practice-title">
          <div className="section-label"><span id="practice-title">WAYS IN</span><span>04 MODES OF SUPPORT</span></div>
          <div className="chapter-list">
            {chapters.map((chapter) => (
              <article className="chapter-row" key={chapter.number}>
                <span className="chapter-number">{chapter.number}</span>
                <div className="chapter-main"><h2>{chapter.title}</h2><p>{chapter.text}</p></div>
                <span className="chapter-detail">{chapter.detail} <span aria-hidden="true">↗</span></span>
              </article>
            ))}
          </div>
        </section>

        <section className="quote-section" aria-labelledby="quote-title">
          <p className="quote-mark" aria-hidden="true">“</p>
          <h2 id="quote-title">The right setting<br /><em>changes the whole page.</em></h2>
          <a className="text-link" href="app.html">Find your setting <span aria-hidden="true">↗</span></a>
        </section>
      </main>

      <footer className="landing-footer">
        <div><strong>DYSLEXIA ASSISTANT</strong><span>READING IS A WAY IN.</span></div>
        <div><span>OPEN SOURCE EXPERIENCE</span><a href="app.html">BEGIN →</a></div>
      </footer>
    </div>
  );
}

export default LandingPage;
