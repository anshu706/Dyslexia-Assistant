import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits (Axe-Core)', () => {
  test('Landing page has zero serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });

  test('Workspace app has zero serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/app.html');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });
});

