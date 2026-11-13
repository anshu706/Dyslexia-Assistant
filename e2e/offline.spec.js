import { test, expect } from '@playwright/test';

test.describe('Offline and PWA Operations', () => {
  test('App shell and tools operate offline with network disabled', async ({ context, page }) => {
    // 1. Visit online to register service worker and cache assets
    await page.goto('/app.html');
    await expect(page.locator('#workspace')).toBeVisible();

    // Give service worker a brief moment to activate and cache
    await page.waitForTimeout(1000);

    // 2. Disconnect network
    await context.setOffline(true);

    // 3. Reload in offline mode
    await page.reload();

    // 4. Verify core UI elements and tools remain fully interactive offline
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#reader-content')).toBeVisible();

    // Switch to writer view offline
    await page.locator('button[data-view="writer"]').click();
    await expect(page.locator('#view-writer')).toBeVisible();

    const editor = page.locator('#writer-editor');
    await editor.fill('Offline writing test without internet connection.');
    await expect(page.locator('#word-count-num')).toHaveText('6');

    // Switch to flashcards view offline
    await page.locator('button[data-view="flashcards"]').click();
    await expect(page.locator('#view-flashcards')).toBeVisible();
    await expect(page.locator('.flashcard').first()).toBeVisible();

    // Re-enable network for subsequent tests
    await context.setOffline(false);
  });
});
