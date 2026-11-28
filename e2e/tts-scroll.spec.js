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
    await page.locator('#btn-load-sample').click();
    await expect(page.locator('#document-body')).toContainText('Mary Lennox was born in India');

    // Click Listen — capture baseline scroll position
    const scrollBeforeListen = await page.evaluate(() => window.scrollY);
    await page.locator('#tts-play').click();
    await page.waitForFunction(() => Boolean(window.__ttsHarness?.utterance));

    // 2. Fire word boundary at "Mary" — speech engine may auto-scroll if word is below viewport.
    //    Either way, scroll should be modest (not jump to end of document).
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Mary'));
    await page.waitForTimeout(500);
    const scrollAfterMary = await page.evaluate(() => window.scrollY);
    // Mary is near the top of the content; scroll should be <500 (not at page bottom)
    expect(scrollAfterMary).toBeLessThan(500);

    // 3. Advance speech to a much lower paragraph ("Dickon") — auto-scroll MUST advance downward
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Dickon'));
    await page.waitForFunction(() => window.scrollY > 120, { timeout: 4000 });
    // Wait for smooth scroll to fully settle (programmaticScrollUntil = 900ms)
    await page.waitForTimeout(1000);
    const scrollAfterDickon = await page.evaluate(() => window.scrollY);
    expect(scrollAfterDickon).toBeGreaterThan(120);

    // 4. User scrolls UP — auto-scroll must PAUSE immediately (not snap back)
    //    Use a large enough delta so the browser registers visible upward movement
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, -400);
    // Wait for the upward scroll to register
    await page.waitForFunction((prev) => window.scrollY < prev - 20, scrollAfterDickon, { timeout: 3000 });
    const scrollAfterPartialUp = await page.evaluate(() => window.scrollY);
    // Must have scrolled up meaningfully
    expect(scrollAfterPartialUp).toBeLessThan(scrollAfterDickon - 20);

    // 5. Fire more word boundaries — scroll must NOT re-center or move while user is scrolled up
    await page.evaluate(() => window.__ttsHarness.emitWordByText('garden', 4));
    await page.waitForTimeout(2300);  // wait past the old 2s debounce threshold
    const scrollAfterLowerWord = await page.evaluate(() => window.scrollY);
    expect(scrollAfterLowerWord).toBeLessThanOrEqual(scrollAfterPartialUp + 5);

    // 6. User scrolls UP further — the toolbar prevents reaching scrollY=0 on this layout,
    //    so only verify scroll went further up relative to previous position
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(500);
    const scrollAfterBigUp = await page.evaluate(() => window.scrollY);
    // Should be less than after partial up scroll
    expect(scrollAfterBigUp).toBeLessThan(scrollAfterPartialUp + 5);

    // 7. After big up-scroll, fire another boundary — still must NOT move
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Colin'));
    await page.waitForTimeout(2300);
    const scrollAfterWaitingUp = await page.evaluate(() => window.scrollY);
    expect(scrollAfterWaitingUp).toBeLessThanOrEqual(scrollAfterBigUp + 5);

    // 8. User scrolls DOWN freely — should not be yanked UP when earlier word boundary fires
    await page.mouse.wheel(0, 700);
    await page.waitForFunction(() => window.scrollY > 200, { timeout: 3000 });
    const scrollAfterDown = await page.evaluate(() => window.scrollY);

    // Firing an earlier word boundary (Lennox) should NOT yank scroll back up
    await page.evaluate(() => window.__ttsHarness.emitWordByText('Lennox'));
    await page.waitForTimeout(800);
    const scrollStaysDown = await page.evaluate(() => window.scrollY);
    expect(scrollStaysDown).toBeGreaterThanOrEqual(scrollAfterDown - 5);

    // 9. Toolbar features must remain accessible and unblocked while scrolled
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
    await page.waitForTimeout(500);
    const scrollAfterDickon = await page.evaluate(() => window.scrollY);

    // Scroll UP significantly — the toolbar means scrollY won't reach 0, but we can go up substantially
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, -700);
    await page.waitForTimeout(500);
    const scrollAfterUp = await page.evaluate(() => window.scrollY);
    // Verify we scrolled up from Dickon position
    expect(scrollAfterUp).toBeLessThan(scrollAfterDickon - 50);

    // Scroll back DOWN until "Dickon" is comfortably visible in viewport
    const scrollDelta = await page.evaluate(() => {
      const dickon = Array.from(document.querySelectorAll('.tts-word')).find(el => el.textContent.includes('Dickon'));
      return dickon ? Math.max(0, dickon.getBoundingClientRect().top - 280) : 250;
    });
    await page.mouse.wheel(0, scrollDelta);
    await page.waitForTimeout(400);

    const scrollBeforeNextAuto = await page.evaluate(() => window.scrollY);

    // Now advance down toward the very last line ("beginnings") — auto-scroll should resume downward!
    await page.evaluate(() => window.__ttsHarness.emitWordByText('beginnings'));
    await page.waitForFunction((prev) => window.scrollY > prev + 20, scrollBeforeNextAuto, { timeout: 4000 });
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBeforeNextAuto + 20);
  });
});
