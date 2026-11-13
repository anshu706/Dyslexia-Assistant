import { test, expect } from '@playwright/test';

test.describe('Reader Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
  });

  test('Font switcher updates body font class', async ({ page }) => {
    const btnFont = page.locator('#tool-font');
    await expect(btnFont).toBeVisible();

    const readerContent = page.locator('#reader-content');
    
    // Initial click cycles to Lexend
    await btnFont.click();
    await expect(readerContent).toHaveCSS('font-family', /Lexend/);

    // Next click cycles to System Sans
    await btnFont.click();
    await expect(readerContent).toHaveCSS('font-family', /system-ui/);
  });

  test('Pasting text loads into reader and persists on reload', async ({ page }) => {
    // Open paste modal
    await page.locator('#btn-paste-modal').click();
    await expect(page.locator('#paste-modal')).toBeVisible();

    // Type text
    const sampleText = 'Dyslexia Assistant provides accessible reading with personalized tints and typography.';
    await page.locator('#paste-textarea').fill(sampleText);
    await page.locator('#submit-paste-btn').click();

    // Modal should close and reader display sample text
    await expect(page.locator('#paste-modal')).toHaveClass(/hidden/);
    const readerContent = page.locator('#reader-content');
    await expect(readerContent).toContainText('Dyslexia Assistant');

    // Reload page and verify last document is restored
    await page.reload();
    await expect(page.locator('#reader-content')).toContainText('Dyslexia Assistant');
  });

  test('Word lookup shows syllables and pronunciation', async ({ page }) => {
    // Load sample text via paste modal
    await page.locator('#btn-paste-modal').click();
    await page.locator('#paste-textarea').fill('Reading accomplishment');
    await page.locator('#submit-paste-btn').click();

    const p = page.locator('#document-body p').first();
    await expect(p).toBeVisible();

    // Simulate word lookup by selecting 'Reading'
    await page.evaluate(() => {
      const pElem = document.querySelector('#document-body p');
      const range = document.createRange();
      range.setStart(pElem.firstChild, 0);
      range.setEnd(pElem.firstChild, 7); // 'Reading'
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      pElem.click();
    });

    // Lookup card should show syllables and count
    const lookupCard = page.locator('#word-lookup-card');
    await expect(lookupCard).toBeVisible();
    await expect(lookupCard).toContainText('reading');
    await expect(lookupCard).toContainText('Syllables:');
    await expect(lookupCard).toContainText('Letters: 7');
  });
});
