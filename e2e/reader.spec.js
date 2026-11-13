import { test, expect } from '@playwright/test';

test.describe('Reader Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
  });

  test('Font switcher updates body font class', async ({ page }) => {
    const fontSelect = page.locator('#font-select');
    await expect(fontSelect).toBeVisible();

    await fontSelect.selectOption('opendyslexic');
    const readerText = page.locator('#reader-display');
    await expect(readerText).toHaveClass(/font-opendyslexic/);

    await fontSelect.selectOption('lexend');
    await expect(readerText).toHaveClass(/font-lexend/);
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
    const readerDisplay = page.locator('#reader-display');
    await expect(readerDisplay).toContainText('Dyslexia Assistant');

    // Reload page and verify last document is restored
    await page.reload();
    await expect(page.locator('#reader-display')).toContainText('Dyslexia Assistant');
  });

  test('Clicking a word triggers word lookup card with syllables and count', async ({ page }) => {
    // Load sample text
    await page.locator('#btn-paste-modal').click();
    await page.locator('#paste-textarea').fill('Remarkable accomplishment');
    await page.locator('#submit-paste-btn').click();

    // Click on the word
    const wordSpan = page.locator('.reader-word', { hasText: 'Remarkable' }).first();
    await expect(wordSpan).toBeVisible();
    await wordSpan.click();

    // Lookup card should show syllables and count
    const lookupCard = page.locator('#word-lookup-card');
    await expect(lookupCard).toBeVisible();
    await expect(lookupCard).toContainText('remarkable');
    await expect(lookupCard).toContainText('Syllables:');
    await expect(lookupCard).toContainText('Letters: 10');
  });
});

