import { test, expect } from '@playwright/test';

test.describe('TTS Smart Auto-Scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 634 });

    // Controllable SpeechSynthesis harness so Chromium E2E tests can fire word boundaries cleanly
    await page.addInitScript(() => {
      window.__ttsHarness = {
        utterance: null,
        speaking: false,
        paused: false,
        emitWordByText(targetWord, occurrence = 1) {
          const utt = this.utterance;
          if (!utt || typeof utt.onboundary !== 'function') return false;
          const text = utt.text || '';
          let idx = -1;
          let from = 0;
          for (let n = 0; n < occurrence; n++) {
            idx = text.indexOf(targetWord, from);
            if (idx === -1) return false;
            from = idx + targetWord.length;
          }
          utt.onboundary({ name: 'word', charIndex: idx, charLength: targetWord.length });
          return true;
        }
      };

      window.SpeechSynthesisUtterance = function MockUtterance(text) {
        this.text = text;
        this.rate = 1;
        this.pitch = 1;
        this.lang = 'en-US';
        this.voice = null;
        this.onboundary = null;
        this.onend = null;
        this.onerror = null;
      };

      const fakeSpeech = {
        get speaking() { return window.__ttsHarness.speaking; },
        get paused() { return window.__ttsHarness.paused; },
        get pending() { return false; },
        onvoiceschanged: null,
        getVoices() {
          return [{ name: 'Mock English', lang: 'en-US', default: true, localService: true }];
        },
        speak(utt) {
          window.__ttsHarness.utterance = utt;
          window.__ttsHarness.speaking = true;
          window.__ttsHarness.paused = false;
        },
        pause() {
          window.__ttsHarness.paused = true;
        },
        resume() {
          window.__ttsHarness.paused = false;
        },
        cancel() {
          window.__ttsHarness.speaking = false;
          window.__ttsHarness.paused = false;
        }
      };

      Object.defineProperty(window, 'speechSynthesis', {
        value: fakeSpeech,
        configurable: true
      });
    });

    await page.goto('/app.html');
  });

  test('Auto-scrolls gently downward, never fights scroll-down, and never re-centers when scrolling up', async ({ page }) => {
    // 1. Load Sample Story
    console.log('Before load sample:', await page.evaluate(() => window.scrollY));
    await page.locator('#btn-load-sample').click();
    await expect(page.locator('#document-body')).toContainText('Mary Lennox was born in India');
    console.log('After load sample:', await page.evaluate(() => window.scrollY));

    // Click Listen
    await page.locator('#tts-play').click();
    await page.waitForFunction(() => Boolean(window.__ttsHarness?.utterance));
    console.log('After click listen:', await page.evaluate(() => {
      const tb = document.querySelector('.app-toolbar').getBoundingClientRect();
      const ws = document.getElementById('workspace');
      const mary = Array.from(document.querySelectorAll('.tts-word')).find(e => e.textContent === 'Mary').getBoundingClientRect();
      const dickon = Array.from(document.querySelectorAll('.tts-word')).find(e => e.textContent.includes('Dickon')).getBoundingClientRect();
      return {
        scrollY: window.scrollY,
        tbBottom: tb.bottom,
        wsScrollHeight: ws.scrollHeight,
        wsClientHeight: ws.clientHeight,
        docScrollHeight: document.scrollingElement.scrollHeight,
        docClientHeight: document.scrollingElement.clientHeight,
        maryTop: mary.top,
        maryBottom: mary.bottom,
        dickonTop: dickon.top
      };
    }));

    // Fire word boundary at the start ("Mary") — already visible, should NOT move story upwards
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Mary'));
    await page.waitForTimeout(300);
    const scrollAfterStart = await page.evaluate(() => window.scrollY);
    expect(scrollAfterStart).toBeLessThan(10);

    // 2. Advance speech down to a lower paragraph ("Dickon") so auto-scroll advances downward
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Dickon'));
    await page.waitForFunction(() => window.scrollY > 120, { timeout: 4000 });
    await page.waitForTimeout(700); // Allow smooth scroll to settle
    const scrollAfterAutoAdvance = await page.evaluate(() => window.scrollY);
    expect(scrollAfterAutoAdvance).toBeGreaterThan(120);

    // 3. User scrolls UP partially and all the way up — MUST NOT align back to center even after >2.5s
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, -180);
    await page.waitForTimeout(250);
    const scrollAfterPartialUp = await page.evaluate(() => window.scrollY);
    expect(scrollAfterPartialUp).toBeLessThan(scrollAfterAutoAdvance);

    // Wait past old 2s timeout while speaking lower words — must stay where user scrolled up
    await page.evaluate(() => window.__ttsHarness.emitWordByText('garden', 4));
    await page.waitForTimeout(2300);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(scrollAfterPartialUp + 5);

    // Now scroll UP further to top
    await page.mouse.wheel(0, -600);
    await page.waitForFunction(() => window.scrollY < 50, { timeout: 3000 });
    const scrollAfterUp = await page.evaluate(() => window.scrollY);

    await page.evaluate(() => window.__ttsHarness.emitWordByText('Colin'));
    await page.waitForTimeout(2300);
    const scrollAfterWaitingUp = await page.evaluate(() => window.scrollY);
    expect(scrollAfterWaitingUp).toBeLessThanOrEqual(scrollAfterUp + 5);

    // 4. User scrolls DOWN freely past/to bottom without being yanked back UP & features remain unblocked
    await page.mouse.wheel(0, 700);
    await page.waitForFunction(() => window.scrollY > 200, { timeout: 3000 });
    const scrollAfterDown = await page.evaluate(() => window.scrollY);

    // Earlier word boundary should NOT yank user back UP
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Lennox'));
    await page.waitForTimeout(800);
    const scrollStaysDown = await page.evaluate(() => window.scrollY);
    expect(scrollStaysDown).toBeGreaterThanOrEqual(scrollAfterDown - 5);

    // Toolbar features remain accessible and unblocked while scrolled down
    await page.locator('#tool-word-box').click();
    await expect(page.locator('#tool-word-box')).toContainText('Box: OFF');
    await page.locator('#tool-word-box').click();
    await expect(page.locator('#tool-word-box')).toContainText('Box: ON');
  });

  test('Resumes auto-scroll seamlessly when scrolling back down onto active spoken word', async ({ page }) => {
    await page.locator('#btn-load-sample').click();
    await page.locator('#tts-play').click();
    await page.waitForFunction(() => Boolean(window.__ttsHarness?.utterance));

    // Advance down to "Dickon" so page auto-scrolls down
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Dickon'));
    await page.waitForFunction(() => window.scrollY > 120, { timeout: 4000 });
    await page.waitForTimeout(700);

    // Scroll UP to top
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, -700);
    await page.waitForFunction(() => window.scrollY < 40, { timeout: 3000 });

    // Scroll back DOWN until "Dickon" is comfortably visible in viewport
    const targetDelta = await page.evaluate(() => {
      const dickon = Array.from(document.querySelectorAll('.tts-word')).find(el => el.textContent.includes('Dickon'));
      return dickon ? Math.max(0, dickon.getBoundingClientRect().top - 280) : 250;
    });
    await page.mouse.wheel(0, targetDelta);
    await page.waitForTimeout(400);

    const scrollBeforeNextAuto = await page.evaluate(() => window.scrollY);

    // Now advance down toward the very last line ("beginnings") — auto-scroll should resume downward!
    await page.evaluate(() => window.__ttsHarness.emitWordByText('beginnings'));
    await page.waitForFunction((prev) => window.scrollY > prev + 20, scrollBeforeNextAuto, { timeout: 4000 });
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBeforeNextAuto + 20);
  });
});
