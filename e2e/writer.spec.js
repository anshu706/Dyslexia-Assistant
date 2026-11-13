import { test, expect } from '@playwright/test';

test.describe('Writer Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    // Switch to writer view
    await page.locator('button[data-view="writer"]').click();
    await expect(page.locator('#view-writer')).toBeVisible();
  });

  test('Draft autosaves and restores on reload', async ({ page }) => {
    const editor = page.locator('#editor-textarea');
    await expect(editor).toBeVisible();

    const draftText = 'Autosaved writing draft from writer test.';
    await editor.fill(draftText);

    // Reload page
    await page.reload();
    await page.locator('button[data-view="writer"]').click();
    await expect(page.locator('#editor-textarea')).toHaveValue(draftText);
  });

  test('Calculates live readability statistics', async ({ page }) => {
    const editor = page.locator('#editor-textarea');
    await editor.fill('The quick brown fox jumps over the lazy dog. It was a pleasant afternoon.');

    const wordCount = page.locator('#stat-words');
    const charCount = page.locator('#stat-chars');
    await expect(wordCount).toHaveText('14');
    await expect(charCount).toHaveText('74');
  });

  test('Shows heuristic spell suggestion and applies correction', async ({ page }) => {
    const editor = page.locator('#editor-textarea');
    // Type a common dyslexic confusable spelling followed by space
    await editor.fill('I saw a frend ');

    const popover = page.locator('#suggestions-popover');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Heuristic Suggestion');
    await expect(popover).toContainText('friend');

    // Click replacement button
    await popover.locator('.suggestion-item[data-correct]').click();
    await expect(editor).toHaveValue('I saw a friend ');
    await expect(popover).toHaveClass(/hidden/);
  });
});

