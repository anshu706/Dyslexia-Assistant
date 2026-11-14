import { test, expect } from '@playwright/test';

test.describe('Writer Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    // Switch to writer view
    await page.locator('button[data-view="writer"]').click();
    await expect(page.locator('#view-writer')).toBeVisible();
  });

  test('Draft autosaves and restores on reload', async ({ page }) => {
    const editor = page.locator('#writer-editor');
    await expect(editor).toBeVisible();

    const draftText = 'Autosaved writing draft from writer test.';
    await editor.fill(draftText);

    // Reload page
    await page.reload();
    await page.locator('button[data-view="writer"]').click();
    await expect(page.locator('#writer-editor')).toHaveValue(draftText);
  });

  test('Calculates live readability statistics', async ({ page }) => {
    const editor = page.locator('#writer-editor');
    await editor.fill('The quick brown fox jumps over the lazy dog. It was a pleasant afternoon.');

    const wordCount = page.locator('#word-count-num');
    const charCount = page.locator('#char-count-num');
    await expect(wordCount).toHaveText('14');
    await expect(charCount).toHaveText('73');
  });

  test('Shows heuristic spell suggestion and applies correction', async ({ page }) => {
    const editor = page.locator('#writer-editor');
    // Type a common dyslexic confusable spelling followed by space
    await editor.fill('I saw a frend ');

    const popover = page.locator('#phonetic-suggestions');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Heuristic Suggestion');
    await expect(popover).toContainText('friend');

    // Click replacement button
    await popover.locator('.suggestion-item[data-correct]').click();
    await expect(editor).toHaveValue('I saw a friend ');
    await expect(popover).toHaveClass(/hidden/);
  });

  test('Multi-document manager creates new document and switches between them', async ({ page }) => {
    // 1. Verify initial document badge
    const badge = page.locator('#doc-count-badge');
    await expect(badge).toBeVisible();

    // 2. Click "+ New" document
    await page.locator('#btn-new-doc').click();
    const titleInput = page.locator('#doc-title-input');
    await expect(titleInput).toHaveValue('New Document');

    // Type content into the new document
    const editor = page.locator('#writer-editor');
    await editor.fill('Content of the second document.');

    // 3. Open Document Library Modal
    await page.locator('#btn-doc-library').click();
    const modal = page.locator('#doc-library-modal');
    await expect(modal).toBeVisible();

    // Verify at least 2 documents exist in library
    const items = modal.locator('.doc-item');
    expect(await items.count()).toBeGreaterThanOrEqual(2);

    // Close modal
    await page.locator('#close-doc-modal').click();
    await expect(modal).toHaveClass(/hidden/);
  });

  test('Ambient focus sound generator toggles on and off', async ({ page }) => {
    const soundBtn = page.locator('#tool-focus-sound');
    const label = page.locator('#focus-sound-label');
    await expect(soundBtn).toBeVisible();
    await expect(label).toHaveText('Sound: Off');

    // Toggle on
    await soundBtn.click();
    await expect(soundBtn).toHaveClass(/active/);
    await expect(label).toHaveText('Brown Noise');

    // Toggle off
    await soundBtn.click();
    await expect(soundBtn).not.toHaveClass(/active/);
    await expect(label).toHaveText('Sound: Off');
  });
});
