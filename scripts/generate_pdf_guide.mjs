import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const screensDir = 'C:/Users/DELL/.gemini/antigravity/brain/00744cc5-075f-467a-97d4-7bb5d6eabdba/walkthrough_screens';
const outputHtmlPath = path.resolve('scripts/pdf_preview.html');
const outputPdfPath = path.resolve('Dyslexia_Assistant_Product_Guide.pdf');

function getBase64Image(filename) {
  const filePath = path.join(screensDir, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  return '';
}

const images = {
  hero: getBase64Image('01_landing_hero.png'),
  reader: getBase64Image('02_workspace_reader.png'),
  accommodations: getBase64Image('03_reader_sage_opendyslexic.png'),
  ruler: getBase64Image('04_reading_ruler_active.png'),
  share: getBase64Image('05_teacher_share_modal.png'),
  progress: getBase64Image('06_progress_streaks_modal.png'),
  writer: getBase64Image('07_writer_workspace.png'),
  flashcards: getBase64Image('08_flashcards_deck.png'),
  trust: getBase64Image('10_trust_school_kit.png'),
  owl: getBase64Image('11_lexi_owl_mascot_tour.png'),
};

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dyslexia Assistant - Comprehensive Product & Accessibility Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
    }

    .page {
      page-break-after: always;
      position: relative;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .cover-page {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 30px 10px 20px 10px;
      page-break-after: always;
    }

    .badge-market {
      display: inline-block;
      padding: 5px 12px;
      background-color: #e0e7ff;
      color: #3730a3;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .cover-title {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.15;
      color: #0f172a;
      margin: 0 0 14px 0;
      letter-spacing: -0.02em;
    }

    .cover-title span {
      color: #2563eb;
    }

    .cover-subtitle {
      font-size: 17px;
      color: #475569;
      margin: 0 0 25px 0;
      max-width: 650px;
      line-height: 1.45;
    }

    .cover-image-container {
      margin: 15px 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      border: 1px solid #cbd5e1;
    }

    .cover-image-container img {
      width: 100%;
      display: block;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 25px;
      padding-top: 18px;
      border-top: 2px solid #e2e8f0;
    }

    .meta-box {
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      border-left: 3px solid #2563eb;
    }

    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 3px;
      font-weight: 600;
    }

    .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    h1, h2, h3, h4 {
      color: #0f172a;
      letter-spacing: -0.01em;
      margin-top: 0;
    }

    h2 {
      font-size: 20px;
      font-weight: 800;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3 {
      font-size: 15px;
      font-weight: 700;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #1e3a8a;
    }

    p {
      margin: 0 0 10px 0;
      color: #334155;
    }

    .feature-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
      break-inside: avoid;
    }

    .screenshot-figure {
      margin: 12px 0 6px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      background: #000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      break-inside: avoid;
    }

    .screenshot-figure img {
      width: 100%;
      display: block;
    }

    .caption {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 4px;
      margin-bottom: 12px;
      text-align: center;
      font-style: italic;
    }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 10px 0;
    }

    .callout {
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      margin: 10px 0;
      break-inside: avoid;
    }

    .callout-blue {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
      color: #1e40af;
    }

    .callout-green {
      background-color: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #166534;
    }

    .callout-amber {
      background-color: #fffbeb;
      border-left: 4px solid #d97706;
      color: #92400e;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 11.5px;
      break-inside: avoid;
    }

    th, td {
      padding: 7px 10px;
      text-align: left;
      border: 1px solid #e2e8f0;
    }

    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    .tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 600;
      background: #e2e8f0;
      color: #334155;
    }

    .tag-green { background: #dcfce7; color: #15803d; }
    .tag-blue { background: #dbeafe; color: #1d4ed8; }
    .tag-amber { background: #fef3c7; color: #b45309; }

    ul, ol {
      margin: 4px 0 10px 20px;
      padding: 0;
      color: #334155;
    }

    li {
      margin-bottom: 4px;
    }

    .section-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 18px 0;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 5px;
      margin-bottom: 14px;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: COVER ==================== -->
  <div class="page cover-page">
    <div>
      <span class="badge-market">★ Official Product Architecture & User Manual</span>
      <h1 class="cover-title">Dyslexia Assistant<br><span>Universal Learning & Reading Workspace</span></h1>
      <p class="cover-subtitle">
        An offline-first, neurodiversity-focused web platform combining clinical reading accommodations, speech intelligence, spaced repetition, and educator lesson workflows.
      </p>

      <div class="cover-image-container">
        <img src="${images.hero}" alt="Dyslexia Assistant Landing & Interactive Simulator">
      </div>
    </div>

    <div>
      <div class="cover-meta-grid">
        <div class="meta-box">
          <div class="meta-label">Version</div>
          <div class="meta-value">1.0.0 Production</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Accessibility</div>
          <div class="meta-value">WCAG 2.1 AA Compliant</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Privacy Guarantee</div>
          <div class="meta-value">100% Offline / No Telemetry</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Live Deployment</div>
          <div class="meta-value">dyslexia-assistant.vercel.app</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 2: EXECUTIVE SUMMARY & PROBLEM STATEMENT ==================== -->
  <div class="page">
    <div class="header-bar">
      <span>Dyslexia Assistant &bull; Product Overview</span>
      <span>Executive Summary</span>
    </div>

    <h2>1. Executive Summary & Clinical Foundations</h2>

    <p>
      Dyslexia affects an estimated <strong>10% to 20% of the global population</strong>, representing the most prevalent neurodevelopmental learning difference. Common symptoms include visual crowding, dancing or vibrating letters, phonological processing lag, and severe eye strain triggered by high-contrast black text on stark white backgrounds.
    </p>

    <div class="grid-2col">
      <div class="callout callout-blue">
        <strong>The Problem with Conventional Software:</strong>
        <p style="margin-top: 4px; margin-bottom: 0;">
          Mainstream e-readers and word processors are designed for neurotypical readers. They lack contrast shields, ignore letter weighting, present overwhelming UI clutter, and require constant high-speed cloud connections that risk student data privacy.
        </p>
      </div>
      <div class="callout callout-green">
        <strong>The Dyslexia Assistant Solution:</strong>
        <p style="margin-top: 4px; margin-bottom: 0;">
          A calming, zero-distraction workspace equipped with scientifically proven fonts (Lexend, OpenDyslexic), 8 pastel tint overlays, bionic syllable breaking, reading rulers, and integrated audio synthesis.
        </p>
      </div>
    </div>

    <h2>2. Core Architectural Principles</h2>
    <table>
      <thead>
        <tr>
          <th>Pillar</th>
          <th>Implementation</th>
          <th>Clinical & Practical Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Offline-First Architecture</strong></td>
          <td>Service Worker PWA, IndexedDB & LocalStorage</td>
          <td>Zero student data leaves the browser. Works seamlessly in low-connectivity rural schools and air-gapped exams.</td>
        </tr>
        <tr>
          <td><strong>Visual Fatigue Elimination</strong></td>
          <td>8 Pastel Tints & High-Contrast Guard (>4.5:1)</td>
          <td>Softens harsh screen glare (Irlen syndrome), stabilizing ocular fixation and reducing reading headaches.</td>
        </tr>
        <tr>
          <td><strong>Cognitive Anchoring</strong></td>
          <td>OpenDyslexic Gravity Weights & Bionic Bold</td>
          <td>Anchors the bottom of characters, preventing mental rotation and flipping of confusing letters (b vs d, p vs q).</td>
        </tr>
        <tr>
          <td><strong>Auditory Reinforcement</strong></td>
          <td>SpeechSynthesis API & Focus Soundscapes</td>
          <td>Bridges the phoneme-grapheme divide through dual-modality reading and ambient noise masking.</td>
        </tr>
      </tbody>
    </table>

    <div class="screenshot-figure">
      <img src="${images.reader}" alt="Reader Sheet and Accommodation Suite">
    </div>
    <div class="caption">Figure 1: The primary Reader Sheet displaying the typography, tint selector, syllable splits, and voice toolbar.</div>
  </div>

  <!-- ==================== PAGE 3: THE READER SUITE & VISUAL ACCOMMODATIONS ==================== -->
  <div class="page">
    <div class="header-bar">
      <span>Dyslexia Assistant &bull; Visual Accommodations</span>
      <span>Reader Engine</span>
    </div>

    <h2>3. The Clinical Reader Engine</h2>
    <p>
      The core Reader module allows users to import raw text, documents (.txt, .pdf, .docx), or select from curated literature. The text is immediately transformed using personalized visual accommodations.
    </p>

    <div class="grid-2col">
      <div>
        <h3>Scientifically Backed Typography</h3>
        <ul>
          <li><strong>Lexend Deca:</strong> Engineered specifically to maximize reading speed by expanding character spacing.</li>
          <li><strong>OpenDyslexic:</strong> Weighted bottoms prevent letters from flipping or rotating in the reader's visual cortex.</li>
          <li><strong>Atkinson Hyperlegible:</strong> Distinct letterforms designed to eliminate character ambiguity.</li>
        </ul>

        <h3>Reading Ruler Focus Mask</h3>
        <p>
          Moving the mouse or arrow keys navigates a translucent focus window that dims lines above and below the active sentence. This isolates the reader's foveal field, eliminating ocular drifting.
        </p>
      </div>

      <div>
        <h3>Bionic & Syllable Processing</h3>
        <ul>
          <li><strong>Bionic Reading:</strong> Automatically bolds the first 3 letters of each word, guiding the eye through fixation saccades.</li>
          <li><strong>Syllable Splitting:</strong> Hyphenates complex, multisyllabic words (e.g., <em>com-pu-ta-tion-al</em>) to ease phonological decoding.</li>
          <li><strong>Word-Box Isolation:</strong> Isolates the active hovered word in a prominent contrast card.</li>
        </ul>
      </div>
    </div>

    <div class="screenshot-figure">
      <img src="${images.accommodations}" alt="Sage Green Tint and Anchored OpenDyslexic Typography">
    </div>
    <div class="caption">Figure 2: Active Sage Green calming tint with anchored OpenDyslexic letterforms and accommodation status toasts.</div>

    <div class="screenshot-figure">
      <img src="${images.ruler}" alt="Reading Ruler Focus Mask Active">
    </div>
    <div class="caption">Figure 3: Active Reading Ruler isolating the reading line while dimming peripheral text to prevent visual drift.</div>
  </div>

  <!-- ==================== PAGE 4: INTERACTIVE LEARNING & WRITING TOOLS ==================== -->
  <div class="page">
    <div class="header-bar">
      <span>Dyslexia Assistant &bull; Writing & Learning</span>
      <span>Writer & Flashcards</span>
    </div>

    <h2>4. Distraction-Free Writer & Readability Analyzer</h2>
    <p>
      Writing presents immense friction for individuals with dyslexia. Dyslexia Assistant's Writer provides a therapeutic writing space with assistive technology built directly into the editor.
    </p>

    <div class="grid-2col">
      <div>
        <h3>Key Writer Features:</h3>
        <ul>
          <li><strong>Speech-to-Text Dictation:</strong> Allows students to articulate their thoughts freely without being hindered by spelling struggles.</li>
          <li><strong>Auditory Proofreading ("Read Back"):</strong> High-fidelity local speech synthesis reads back drafted text so students can hear mistakes.</li>
          <li><strong>Real-time Readability Scoring:</strong> Live metrics compute Flesch-Kincaid Grade Level and reading duration.</li>
        </ul>
      </div>
      <div>
        <h3>Export & Interoperability:</h3>
        <ul>
          <li><strong>Clean PDF Export:</strong> Exports essays and homework to pristine print-ready PDFs stripping out all UI chrome.</li>
          <li><strong>Markdown Export:</strong> Exports structured text for documentation and school submissions.</li>
          <li><strong>Local Document Management:</strong> Autosaves drafts securely in browser storage.</li>
        </ul>
      </div>
    </div>

    <div class="screenshot-figure">
      <img src="${images.writer}" alt="Distraction-Free Dyslexia Writer Workspace">
    </div>
    <div class="caption">Figure 4: The Writer workspace showing word counts, grade level metrics, speech dictation, and export actions.</div>

    <div class="section-divider"></div>

    <h2>5. Spaced-Repetition Flashcard Vault</h2>
    <p>
      A dedicated flashcard system engineered specifically for confusable letter pairs and irregular English phonemes.
    </p>

    <div class="screenshot-figure">
      <img src="${images.flashcards}" alt="Spaced Repetition Flashcard Vault">
    </div>
    <div class="caption">Figure 5: Flashcard Vault preloaded with letter reversal starter decks (b vs d, p vs q, was vs saw, homophones).</div>
  </div>

  <!-- ==================== PAGE 5: CLASSROOM, TEACHERS & GAMIFICATION ==================== -->
  <div class="page">
    <div class="header-bar">
      <span>Dyslexia Assistant &bull; Educator Integration</span>
      <span>Sharing & Gamification</span>
    </div>

    <h2>6. Teacher & Student One-Click Lesson Sharing</h2>
    <p>
      Special education teachers and parents can create customized reading passages and instantly share them with students without requiring accounts or logins.
    </p>

    <div class="grid-2col">
      <div class="screenshot-figure">
        <img src="${images.share}" alt="Teacher Lesson Share Dialog">
      </div>
      <div>
        <h3>Zero-Setup Lesson Distribution</h3>
        <ul>
          <li><strong>Accommodation Presets Encoded in URL:</strong> The share engine embeds font size, tint, and typography directly into the URL query.</li>
          <li><strong>1-Click Instant Actions:</strong> Teachers can send links directly to parents or classroom groups via WhatsApp, Email, or LMS.</li>
          <li><strong>Frictionless Student Access:</strong> When the student clicks the link, the passage opens in Reader mode with the exact specified visual accommodations already configured.</li>
        </ul>
        <div class="callout callout-amber">
          <strong>FERPA & COPPA Aligned:</strong> Because the URL itself holds the encoded passage, no student identification or lesson data is logged or retained on any third-party server.
        </div>
      </div>
    </div>
    <div class="caption">Figure 6: One-click teacher lesson sharing modal with URL generation and instant messaging distribution.</div>

    <div class="section-divider"></div>

    <h2>7. Gamified Progress & Streak Tracking</h2>
    <p>
      Positive reinforcement is vital for dyslexic learners who frequently experience academic frustration. The progress engine turns daily reading into a rewarding journey.
    </p>

    <div class="grid-2col">
      <div>
        <h3>Empowering Superpower Badges:</h3>
        <ul>
          <li><strong>First Step:</strong> Unlocked upon completing the first reading session.</li>
          <li><strong>Page Turner:</strong> Reached after reading 500 cumulative words.</li>
          <li><strong>Focus Flame:</strong> Maintained through daily consecutive study streaks.</li>
          <li><strong>Super Scholar:</strong> Earned upon completing 2,000 words.</li>
          <li><strong>Deep Listener:</strong> Unlocked by completing 5 speech-assisted sessions.</li>
        </ul>
      </div>
      <div class="screenshot-figure">
        <img src="${images.progress}" alt="Gamified Progress and Superpower Badges">
      </div>
    </div>
    <div class="caption">Figure 7: Daily streak dashboard displaying words read, focus timer, and earned dyslexia superpower badges.</div>
  </div>

  <!-- ==================== PAGE 6: ONBOARDING, STANDARDS & KEYBOARD SHORTCUTS ==================== -->
  <div class="page">
    <div class="header-bar">
      <span>Dyslexia Assistant &bull; Accessibility & Compliance</span>
      <span>Standards & Guide</span>
    </div>

    <h2>8. Lexi the Wise Owl: Voice-Guided Onboarding</h2>
    <p>
      Complex assistive toolbars can overwhelm neurodivergent users. Lexi, our interactive owl mascot, provides an empathetic, 6-step spoken guided tour through the application.
    </p>

    <div class="grid-2col">
      <div class="screenshot-figure">
        <img src="${images.owl}" alt="Lexi the Wise Owl Interactive Mascot Tour">
      </div>
      <div>
        <h3>Inclusive Onboarding Design:</h3>
        <ul>
          <li><strong>Auditory + Visual Synchrony:</strong> Lexi speaks aloud using speech synthesis while simultaneously highlighting relevant buttons.</li>
          <li><strong>Gentle Pacing:</strong> Students can progress through the 6 tour cards at their own speed or skip at any point.</li>
          <li><strong>Non-Intrusive Testing Guards:</strong> The tour automatically respects automated screen reader contexts and testing environments.</li>
        </ul>
      </div>
    </div>
    <div class="caption">Figure 8: Lexi the Wise Owl guiding a new learner through tint selection and focus tools.</div>

    <div class="section-divider"></div>

    <h2>9. Compliance & Keyboard Accessibility Reference</h2>
    <div class="screenshot-figure">
      <img src="${images.trust}" alt="Market Trust & Educator School Kit Modal">
    </div>
    <div class="caption">Figure 9: Trust & School Kit modal validating WCAG 2.1 AA certification and student privacy guarantees.</div>

    <h3>Complete Keyboard Shortcut Map</h3>
    <table>
      <thead>
        <tr>
          <th>Shortcut</th>
          <th>Workspace Action</th>
          <th>Accessibility Benefit</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><kbd class="tag tag-blue">Alt + 1</kbd></td>
          <td>Switch to Reader Sheet</td>
          <td>Immediate return to reading without mouse navigation.</td>
        </tr>
        <tr>
          <td><kbd class="tag tag-blue">Alt + 2</kbd></td>
          <td>Switch to Writer Draft</td>
          <td>Rapid transition to note taking and essay drafting.</td>
        </tr>
        <tr>
          <td><kbd class="tag tag-blue">Alt + 3</kbd></td>
          <td>Switch to Flashcard Vault</td>
          <td>Quick access to letter practice and spaced repetition.</td>
        </tr>
        <tr>
          <td><kbd class="tag tag-green">Space</kbd></td>
          <td>Play / Pause Speech Engine</td>
          <td>Hands-free auditory control during long reading sessions.</td>
        </tr>
        <tr>
          <td><kbd class="tag tag-amber">Esc</kbd></td>
          <td>Close Any Active Modal / Overlay</td>
          <td>Instant escape hatch from modals, tours, and reading rulers.</td>
        </tr>
      </tbody>
    </table>

    <div class="callout callout-green" style="margin-top: 15px;">
      <strong>Summary:</strong> Dyslexia Assistant is fully verified and deployed for global classrooms, clinics, and independent learners at <strong>https://dyslexia-assistant.vercel.app/</strong>.
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(outputHtmlPath, htmlContent);
console.log('Saved HTML preview to', outputHtmlPath);

async function generatePdf() {
  console.log('Launching browser to render PDF...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  await page.pdf({
    path: outputPdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8px; font-family: sans-serif; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm;">
        <span>Dyslexia Assistant &bull; Product & Accessibility Guide</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '16mm',
      bottom: '16mm',
      left: '14mm',
      right: '14mm'
    }
  });

  await browser.close();
  const stats = fs.statSync(outputPdfPath);
  console.log(`Successfully generated PDF: ${outputPdfPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

generatePdf().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
