import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const videoDir = resolve(__dirname, 'raw_videos');

fs.mkdirSync(videoDir, { recursive: true });

async function smoothMove(page, targetSelector, durationMs = 400) {
  const el = await page.$(targetSelector);
  if (!el) return;
  const box = await el.boundingBox();
  if (!box) return;
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  await page.evaluate(({ x, y }) => {
    let dot = document.getElementById('cursor-dot');
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'cursor-dot';
      document.body.appendChild(dot);
    }
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
  }, { x: targetX, y: targetY });

  await page.waitForTimeout(durationMs);
}

async function smoothClick(page, targetSelector) {
  try {
    await page.waitForSelector(targetSelector, { timeout: 4000 });
  } catch (err) {
    console.warn(`Selector not found: ${targetSelector}`);
    return;
  }
  await smoothMove(page, targetSelector, 350);
  await page.evaluate(() => {
    const dot = document.getElementById('cursor-dot');
    if (dot) dot.classList.add('clicking');
  });
  await page.waitForTimeout(100);
  await page.click(targetSelector, { timeout: 4000 });
  await page.evaluate(() => {
    const dot = document.getElementById('cursor-dot');
    if (dot) dot.classList.remove('clicking');
  });
  await page.waitForTimeout(400);
}

async function injectCursor(page) {
  await page.addStyleTag({ content: `
    #cursor-dot {
      position: fixed;
      width: 24px;
      height: 24px;
      border: 3px solid #EC633D;
      background: rgba(236, 99, 61, 0.45);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999999;
      transform: translate(-50%, -50%);
      transition: left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.15s ease, background 0.15s ease;
      box-shadow: 0 0 16px rgba(236, 99, 61, 0.7);
    }
    #cursor-dot.clicking {
      transform: translate(-50%, -50%) scale(0.65);
      background: rgba(236, 99, 61, 0.95);
      box-shadow: 0 0 28px rgba(236, 99, 61, 1);
    }
  `});
}

async function main() {
  console.log('Starting Playwright high-res interaction recorder...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // ==========================================
  // ACT 1: Landing Page Interactive Simulator
  // ==========================================
  console.log('Recording Act 1: Interactive Landing Simulator...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await injectCursor(page);
  await page.waitForTimeout(600);

  // Scroll smoothly to simulator deck
  await page.evaluate(() => {
    const deck = document.querySelector('.simulator-paper-deck');
    if (deck) deck.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(1000);

  // Cycle Font 1: OpenDyslexic
  const fontBtn = '.sim-btn:has(.sim-btn-icon:text("Aa"))';
  await smoothClick(page, fontBtn);
  await page.waitForTimeout(800);

  // Cycle Font 2: Ransom Note
  await smoothClick(page, fontBtn);
  await page.waitForTimeout(1200);

  // Toggle Relaxed Spacing
  const spacingBtn = '.sim-btn:has(.sim-btn-icon:text("↔"))';
  await smoothClick(page, spacingBtn);
  await page.waitForTimeout(800);

  // Toggle Bionic Reading
  const bionicBtn = '.sim-btn:has(.sim-btn-icon:text("B"))';
  await smoothClick(page, bionicBtn);
  await page.waitForTimeout(800);

  // Click Calming Tints (Sage Green, then Soft Peach, then Sky Blue)
  const tintButtons = await page.$$('.tint-pill-btn');
  if (tintButtons.length >= 3) {
    await tintButtons[1].click();
    await page.waitForTimeout(700);
    await tintButtons[2].click();
    await page.waitForTimeout(700);
    await tintButtons[0].click();
    await page.waitForTimeout(800);
  }

  // ==========================================
  // ACT 2: Pro Workspace - Reader
  // ==========================================
  console.log('Recording Act 2: Pro Workspace Reader...');
  await page.goto('http://localhost:4173/app.html', { waitUntil: 'networkidle' });
  await injectCursor(page);
  await page.waitForTimeout(600);

  // Load sample text
  const btnSample = '#btn-load-sample';
  if (await page.$(btnSample)) {
    await smoothClick(page, btnSample);
    await page.waitForTimeout(800);
  }

  // Cycle font in reader
  await smoothClick(page, '#tool-font');
  await page.waitForTimeout(800);
  await smoothClick(page, '#tool-font'); // Ransom note
  await page.waitForTimeout(1000);

  // Toggle Bionic in reader
  try {
    await smoothClick(page, '#tool-bionic');
    await page.waitForTimeout(800);
  } catch (e) { console.log('Bionic toggle skipped'); }

  // Toggle Tint in reader
  try {
    const tintBtn = await page.$('button[data-tint="mint"]') ? 'button[data-tint="mint"]' : '#tool-overlay';
    await smoothClick(page, tintBtn);
    await page.waitForTimeout(800);
  } catch (e) { console.log('Tint toggle skipped'); }

  // Toggle Focus Sound
  try {
    await smoothClick(page, '#tool-focus-sound');
    await page.waitForTimeout(800);
  } catch (e) { console.log('Focus sound toggle skipped'); }

  // ==========================================
  // ACT 3: Pro Workspace - Assisted Writer
  // ==========================================
  console.log('Recording Act 3: Pro Workspace Writer...');
  await smoothClick(page, 'button[data-view="writer"]');
  await page.waitForTimeout(800);

  // Click inside Editor
  await smoothClick(page, '#writer-editor');
  await page.evaluate(() => {
    const ed = document.getElementById('writer-editor');
    if (ed) ed.value = '';
  });

  // Type smoothly
  const textToType = 'Dyslexia Assistant removes letter crowding and cognitive reading fatigue.';
  for (const char of textToType) {
    await page.type('#writer-editor', char, { delay: 40 });
  }
  await page.waitForTimeout(1000);

  // ==========================================
  // ACT 4: Cognitive Flashcards
  // ==========================================
  console.log('Recording Act 4: Spaced Repetition Flashcards...');
  await smoothClick(page, 'button[data-view="flashcards"]');
  await page.waitForTimeout(800);

  // Flip Card 1
  const firstCard = '.flashcard';
  await smoothClick(page, firstCard);
  await page.waitForTimeout(1200);

  // Flip back or click next
  await smoothClick(page, firstCard);
  await page.waitForTimeout(800);

  console.log('Closing page to flush video...');
  await page.close();
  await context.close();
  await browser.close();

  console.log('Raw interaction recording complete!');
}

main().catch(err => {
  console.error('Recording error:', err);
  process.exit(1);
});
