import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits (Axe-Core)', () => {
  test('Landing page has zero serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });

  test('Workspace app has zero serious or critical accessibility violations', async ({ context, page }) => {
    // Grant service-workers permission or bypass controller change reload during scan
    await page.addInitScript(() => {
      // Stub controllerchange so automatic reload doesn't destroy execution context
      if ('serviceWorker' in navigator) {
        const origAddEventListener = navigator.serviceWorker.addEventListener.bind(navigator.serviceWorker);
        navigator.serviceWorker.addEventListener = function(type, listener, options) {
          if (type === 'controllerchange') return;
          return origAddEventListener(type, listener, options);
        };
      }
    });

    await page.goto('/app.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });
});
