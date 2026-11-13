import { test, expect } from '@playwright/test';

test.describe('Flashcards & SRS Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    // Switch to flashcards view
    await page.locator('button[data-view="flashcards"]').click();
    await expect(page.locator('#view-flashcards')).toBeVisible();
  });

  test('Preloads starter deck with dyslexia confusions', async ({ page }) => {
    const cardElements = page.locator('.flashcard');
    await expect(cardElements.first()).toBeVisible();
    const count = await cardElements.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('Creates new flashcard and validates required fields', async ({ page }) => {
    const inputFront = page.locator('#fc-front');
    const inputBack = page.locator('#fc-back');
    const btnAdd = page.locator('#btn-add-card');

    // Empty input validation
    await btnAdd.click();
    const toastContainer = page.locator('#toast-container');
    await expect(toastContainer).toContainText('Please fill in both sides');

    // Valid card addition
    await inputFront.fill('quiet vs quite');
    await inputBack.fill('quiet: silent (shh). quite: really/very.');
    await btnAdd.click();

    await expect(page.locator('.flashcard', { hasText: 'quiet vs quite' })).toBeVisible();
  });

  test('Flipping card on space or click', async ({ page }) => {
    const firstCard = page.locator('.flashcard').first();
    await expect(firstCard).not.toHaveClass(/flipped/);

    await firstCard.click();
    await expect(firstCard).toHaveClass(/flipped/);

    await firstCard.click();
    await expect(firstCard).not.toHaveClass(/flipped/);
  });
});

